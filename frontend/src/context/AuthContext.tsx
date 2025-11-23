import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

// ===== INTERFACES ET TYPES =====
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (redirectPath?: string, silent?: boolean) => void;
  logoutAll: () => Promise<void>; 
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchUserProfile: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  saveToSession: (key: string, data: any) => void;
  getFromSession: (key: string) => any;
  removeFromSession: (key: string) => void;
  clearSession: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
  saveFormDraft: (formId: string, data: any, options?:{ expireInMs?: number }
  ) => void;
  getFormDraft: (formId: string) => any;
  clearFormDraft: (formId: string) => void;
  saveRedirectPath: (path: string) => void;
  getRedirectPath: () => string | null;
  getSessionTimeLeft: () => number;
}

interface User {
  telephone?: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  isAdmin?: boolean;
}

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  jti?: string;
  tokenType?: string;
}

// ===== CONSTANTES DE CONFIGURATION =====
const SESSION_CONFIG = {
  MAX_SESSION_DURATION_MS: 25 * 60 * 1000,
  TOKEN_REFRESH_BUFFER: 2 * 60 * 1000,
  ACCESS_TOKEN_DURATION: 15 * 60 * 1000,
  REFRESH_TOKEN_DURATION: 25 * 60 * 1000,
  API_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 2,
} as const;

const ALLOWED_SESSION_KEYS = {
  REDIRECT_PATH: 'auth_redirect_path',
  LOGIN_TIMESTAMP: 'login_timestamp',
  SESSION_START: 'session_start_time',
  UI_PREFERENCES: 'ui_preferences',
} as const;

// ===== CONTEXTE =====
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const refreshTimeoutRef = useRef<number | null>(null);
  const sessionCheckRef = useRef<number | null>(null);

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // ===== FONCTIONS UTILITAIRES =====
  const safeJsonParse = <T,>(jsonString: string | null, defaultValue: T): T => {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const getCookie = useCallback((name: string): string | null => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue || null;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // ===== GESTION SESSIONSTORAGE =====
  const validateSessionKey = useCallback((key: string): boolean => {
    if (!key || typeof key !== 'string') return false;
    return Object.values(ALLOWED_SESSION_KEYS).includes(key as any);
  }, []);

  const saveToSession = useCallback((key: string, data: any): void => {
    try {
      if (!validateSessionKey(key)) return;
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Silence
    }
  }, [validateSessionKey]);

  const getFromSession = useCallback((key: string): any => {
    try {
      if (!validateSessionKey(key)) return null;
      const item = sessionStorage.getItem(key);
      return safeJsonParse(item, null);
    } catch {
      return null;
    }
  }, [validateSessionKey]);

  const removeFromSession = useCallback((key: string): void => {
    try {
      if (validateSessionKey(key)) {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Silence
    }
  }, [validateSessionKey]);

  const clearSession = useCallback((): void => {
    try {
      const uiPreferences = getFromSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES);
      sessionStorage.clear();
      if (uiPreferences) {
        saveToSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES, uiPreferences);
      }
    } catch {
      // Silence
    }
  }, [getFromSession, saveToSession]);

  // ===== GESTION REDIRECTIONS =====
  const saveRedirectPath = useCallback((path: string): void => {
    if (path && typeof path === 'string') {
      saveToSession(ALLOWED_SESSION_KEYS.REDIRECT_PATH, path);
    }
  }, [saveToSession]);

  const getRedirectPath = useCallback((): string | null => {
    const path = getFromSession(ALLOWED_SESSION_KEYS.REDIRECT_PATH);
    removeFromSession(ALLOWED_SESSION_KEYS.REDIRECT_PATH);
    return path;
  }, [getFromSession, removeFromSession]);

  const getRoleBasedRedirect = useCallback((user: User): string => {
    const redirectPath = getRedirectPath();
    
    if (redirectPath && redirectPath.startsWith('/') && 
        !redirectPath.includes('connexion') && 
        !redirectPath.includes('inscription')) {
      return redirectPath;
    }

    return (user.role === 'admin' || user.isAdmin) 
      ? '/gestionnaire/statistiques' 
      : '/';
  }, [getRedirectPath]);

  // ===== GESTION BROUILLONS =====
  const saveFormDraft = useCallback((formId: string, data: any): void => {
    try {
      localStorage.setItem(`draft_${formId}`, JSON.stringify(data));
    } catch {
      // Silence
    }
  }, []);

  const getFormDraft = useCallback((formId: string): any => {
    try {
      const draft = localStorage.getItem(`draft_${formId}`);
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  }, []);

  const clearFormDraft = useCallback((formId: string): void => {
    try {
      localStorage.removeItem(`draft_${formId}`);
    } catch {
      // Silence
    }
  }, []);

  // ===== FONCTIONS CORE AUTHENTIFICATION =====
  const fetchUserData = useCallback(async (userToken: string): Promise<void> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SESSION_CONFIG.API_TIMEOUT);

      const response = await fetch(`${VITE_API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token invalide ou expiré');
        }
        throw new Error(`Erreur ${response.status}`);
      }

      const userData: User = await response.json();
      
      if (!userData.isActive) {
        const error = new Error('COMPTE_DESACTIVE');
        (error as any).code = 'COMPTE_DESACTIVE';
        throw error;
      }
      
      const userWithRole: User = {
        ...userData,
        isAdmin: userData.role === 'admin' || userData.isAdmin === true
      };
      
      setUser(userWithRole);
      
    } catch (err: any) {
      throw err;
    }
  }, [VITE_API_URL]);

  const isSessionExpired = useCallback((decoded: JwtPayload): boolean => {
    const tokenIssuedAt = decoded.iat * 1000;
    const now = Date.now();
    const sessionAge = now - tokenIssuedAt;
    
    return sessionAge > SESSION_CONFIG.MAX_SESSION_DURATION_MS;
  }, []);

  const getSessionTimeLeft = useCallback((): number => {
    if (!token) return 0;
    
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const tokenIssuedAt = decoded.iat * 1000;
      const sessionEnd = tokenIssuedAt + SESSION_CONFIG.MAX_SESSION_DURATION_MS;
      return Math.max(0, sessionEnd - Date.now());
    } catch {
      return 0;
    }
  }, [token]);

  const setupTokenRefresh = useCallback((exp: number): void => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    const refreshTime = exp * 1000 - Date.now() - SESSION_CONFIG.TOKEN_REFRESH_BUFFER;
    
    if (refreshTime > 0) {
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTokenFunction().catch(() => {
          // Silence
        });
      }, refreshTime);
    }
  }, []);

 const refreshTokenFunction = useCallback(async (): Promise<boolean> => {
  if (refreshInFlightRef.current) {
    return refreshInFlightRef.current;
  }

  const refreshPromise = (async (): Promise<boolean> => {
    try {
      let refreshToken: string | null = getCookie('refresh_token');
      
      if (!refreshToken) {
        await logout('/', true);
        return false;
      }

      const response = await fetch(`${VITE_API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        if (response.status === 401) {
          const data = await response.json();
          
          if (data.sessionExpired) {
            toast.info('Votre session a expiré après 25 minutes');
            await logout('/', true);
            return false;
          }
          
          if (data.loggedOut) {
            await logout('/', true);
            return false;
          }
        }
        
        await logout('/', true);
        return false;
      }

      const data = await response.json();
      
      if (data.loggedOut || data.sessionExpired) {
        await logout('/', true);
        return false;
      }

      if (!data.accessToken) {
        await logout('/', true);
        return false;
      }

      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      
      if (isSessionExpired(decoded)) {
        toast.info('Votre session a expiré après 25 minutes');
        await logout('/', true);
        return false;
      }
      
      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);
      
      await fetchUserData(data.accessToken);
      
      setupTokenRefresh(decoded.exp);
      
      return true;
      
    } catch (error: any) {
      await logout('/', true);
      return false;
    }
  })();

  refreshInFlightRef.current = refreshPromise;
  
  try {
    return await refreshPromise;
  } finally {
    refreshInFlightRef.current = null;
  }
}, [VITE_API_URL, fetchUserData, setupTokenRefresh, getCookie, isSessionExpired]);


  const logout = useCallback(async (redirectPath?: string, silent?: boolean): Promise<void> => {
  if (refreshTimeoutRef.current) {
    window.clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = null;
  }
  if (sessionCheckRef.current) {
    window.clearInterval(sessionCheckRef.current);
    sessionCheckRef.current = null;
  }

  if (token) {
    try {
      await fetch(`${VITE_API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch (error) {
      // Silence
    }
  }

  const ALL_TOKENS = ['token', 'access_token', 'refresh_token', 'auth_token'];
  ALL_TOKENS.forEach(tokenName => {
    localStorage.removeItem(tokenName);
  });

  clearSession();

  const cookiesToClear = ['refresh_token', 'access_token', 'token'];
  const hostname = window.location.hostname;
  
  cookiesToClear.forEach(cookieName => {
    document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    document.cookie = `${cookieName}=; Path=/; Domain=${hostname}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    
    if (hostname.includes('.')) {
      const mainDomain = hostname.split('.').slice(-2).join('.');
      document.cookie = `${cookieName}=; Path=/; Domain=.${mainDomain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    }
  });

  setToken(null);
  setUser(null);
  setError(null);

  const finalRedirectPath = redirectPath || '/';
  
  setTimeout(() => {
    navigate(finalRedirectPath, { 
      replace: true,
      state: { from: 'logout', timestamp: Date.now() }
    });
    
    if (!silent) {
      toast.info('Vous avez été déconnecté avec succès');
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, 150);
}, [navigate, clearSession, token, VITE_API_URL]);


  const logoutAll = useCallback(async (): Promise<void> => {
    if (!token || !user?.isAdmin) {
      toast.error('Droits administrateur requis');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/logout-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.message || 'Erreur inconnue');
      }

    } catch (error: any) {
      toast.error(`${error.message || 'Erreur lors de la déconnexion globale'}`);
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, token, user]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  
  try {
    const loginData = {
      email: email.trim().toLowerCase(),
      password: password
    };

    const response = await fetch(`${VITE_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
      credentials: 'include'
    });

    if (!response.ok) {
      let errorMessage = 'Erreur de connexion';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `Erreur ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

    const userWithRole: User = {
      ...data.user,
      isActive: true,
      isAdmin: data.user.role === 'admin' || data.user.isAdmin === true
    };

    localStorage.setItem('token', data.accessToken);
    setToken(data.accessToken);
    setUser(userWithRole);

      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      saveToSession(ALLOWED_SESSION_KEYS.SESSION_START, decoded.iat * 1000);
      
      setupTokenRefresh(decoded.exp);
      startSessionMonitoring();

      const redirectPath = getRoleBasedRedirect(userWithRole);
      navigate(redirectPath, { replace: true });
      
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, navigate, setupTokenRefresh, saveToSession, getRoleBasedRedirect]);

  const startSessionMonitoring = useCallback(() => {
    if (sessionCheckRef.current) {
      window.clearInterval(sessionCheckRef.current);
    }

    sessionCheckRef.current = window.setInterval(() => {
      const timeLeft = getSessionTimeLeft();
      
      if (timeLeft <= 0) {
        logout('/', true);
        return;
      }

      if (timeLeft <= 5 * 60 * 1000 && timeLeft > 4 * 60 * 1000) {
        toast.info(`Session expirera dans ${Math.round(timeLeft / (60 * 1000))} minutes`);
      }
    }, 30 * 1000);
  }, [getSessionTimeLeft, logout]);

  const register = useCallback(async (formData: RegisterFormData): Promise<void> => {
  setIsLoading(true);
  setError(null);

  try {
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Les mots de passe ne correspondent pas';
      toast.error(errorMsg, { toastId: 'password-mismatch' });
      throw new Error(errorMsg);
    }

    const response = await fetch(`${VITE_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase().trim(),
        telephone: formData.phone.trim(),
        password: formData.password,
      }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || "Erreur lors de l'inscription";
      toast.error(errorMsg, { toastId: 'register-error' });
      throw new Error(errorMsg);
    }

    await login(formData.email, formData.password);
    toast.success('Inscription réussie ! Bienvenue !', { toastId: 'register-success' });
    
  } catch (err: any) {
    const errorMessage = err.message || "Erreur lors de l'inscription";
    
    if (!err.message?.includes('Les mots de passe ne correspondent pas')) {
      toast.error(errorMessage, { toastId: 'register-error' });
    }
    
    setError(errorMessage);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, [VITE_API_URL, login]);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l'envoi de l'email");
      }

      toast.success(`Un email de réinitialisation a été envoyé à ${email}`);
      navigate('/connexion');
      
    } catch (err: any) {
      const errorMessage = err.message || "Erreur lors de la demande de réinitialisation";
      toast.error(errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, navigate]);

  const resetPassword = useCallback(async (resetToken: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: resetToken, 
          newPassword,
          confirmPassword: newPassword 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la réinitialisation');
      }

      toast.success('Mot de passe réinitialisé avec succès');
      navigate('/connexion');
      
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la réinitialisation';
      toast.error(errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, navigate]);

  const updateUserProfile = useCallback((updates: Partial<User>): void => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const fetchUserProfile = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      await fetchUserData(token);
    } catch {
    }
  }, [token, fetchUserData]);

  const checkAuth = useCallback(async (): Promise<void> => {
    const savedToken = localStorage.getItem('token');
    
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(savedToken);
      
      if (isSessionExpired(decoded)) {
        await logout('/', true);
        return;
      }

      const timeUntilExpiry = decoded.exp * 1000 - Date.now();

      if (timeUntilExpiry < SESSION_CONFIG.TOKEN_REFRESH_BUFFER) {
        const refreshed = await refreshTokenFunction();
        if (!refreshed) return;
      } else {
        await fetchUserData(savedToken);
        setupTokenRefresh(decoded.exp);
        startSessionMonitoring();
      }
    } catch {
      await logout('/', true);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData, refreshTokenFunction, setupTokenRefresh, logout, isSessionExpired, startSessionMonitoring]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!isMounted) return;
      await checkAuth();
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
      if (sessionCheckRef.current) {
        window.clearInterval(sessionCheckRef.current);
      }
    };
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    fetchUserProfile,
    error,
    login,
    logout,
    logoutAll,
    register,
    forgotPassword,
    resetPassword,
    refreshToken: refreshTokenFunction,
    saveToSession,
    getFromSession,
    removeFromSession,
    clearSession,
    updateUserProfile,
    saveFormDraft,
    getFormDraft,
    clearFormDraft,
    saveRedirectPath,
    getRedirectPath,
    getSessionTimeLeft,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};