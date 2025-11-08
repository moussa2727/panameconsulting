import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (redirectPath?: string, silent?: boolean) => void;
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  saveToSession: (key: string, data: any) => void;
  getFromSession: (key: string) => any;
  removeFromSession: (key: string) => void;
  clearSession: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
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

interface LoginResponse {
  accessToken: string;
  user: User;
  message?: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Clés autorisées pour le sessionStorage (whitelist)
const ALLOWED_SESSION_KEYS = {
  REDIRECT_PATH: 'auth_redirect_path',
  LOGIN_TIMESTAMP: 'login_timestamp',
  UI_PREFERENCES: 'ui_preferences',
  SESSION_METADATA: 'session_metadata',
  NAVIGATION_STATE: 'navigation_state',
  FORM_DRAFTS: 'form_drafts_',
  FILTERS_STATE: 'filters_state_',
  PASSWORD_RESET_HASH: 'password_reset_hash'
} as const;

// Clés interdites (blacklist)
const SENSITIVE_KEYS = [
  'user_email', 'user_password', 'user_id', 'user_role',
  'jwt_token', 'access_token', 'refresh_token', 'personal_data',
  'auth_token', 'credentials', 'password', 'email', 'token',
  'secret', 'private', 'key', 'bearer', 'authorization'
];

// Configuration de sécurité
const SECURITY_CONFIG = {
  MAX_SESSION_SIZE: 50 * 1024, // 50KB
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // 5 minutes
  SESSION_CLEANUP_INTERVAL: 30 * 60 * 1000, // 30 minutes
  API_TIMEOUT: 10000, // 10 seconds
} as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('❌ Erreur accès localStorage:', error);
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const refreshTimeoutRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const cleanupIntervalRef = useRef<number | null>(null);

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // === UTILITAIRES DE SÉCURITÉ ===

  const sanitizeData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'key'];
    const sanitized = { ...data };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  };

  const safeJsonParse = <T,>(jsonString: string | null, defaultValue: T): T => {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // === FONCTIONS SESSIONSTORAGE SÉCURISÉES ===

  const validateSessionKey = useCallback((key: string): boolean => {
    if (!key || typeof key !== 'string') return false;

    // Vérifier si la clé est dans la blacklist
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
      console.warn(`🚨 Tentative de stockage de donnée sensible bloquée: ${key}`);
      return false;
    }
    
    // Vérifier si la clé est dans la whitelist ou commence par un préfixe autorisé
    const isAllowed = Object.values(ALLOWED_SESSION_KEYS).some(allowedKey => 
      key === allowedKey || 
      key.startsWith(ALLOWED_SESSION_KEYS.FORM_DRAFTS) || 
      key.startsWith(ALLOWED_SESSION_KEYS.FILTERS_STATE)
    );
    
    if (!isAllowed) {
      console.warn(`🚨 Clé sessionStorage non autorisée bloquée: ${key}`);
      return false;
    }
    
    return true;
  }, []);

  const validateSessionData = useCallback((data: any): boolean => {
    if (!data || typeof data !== 'object') return true;

    const SENSITIVE_EXACT = new Set([
      'email', 'password', 'token', 'accessToken', 'refreshToken',
      'authorization', 'bearer', 'id', 'role', 'credentials',
      'secret', 'privateKey', 'apiKey'
    ].map(k => k.toLowerCase()));

    const hasSensitiveData = Object.keys(data).some(key => 
      SENSITIVE_EXACT.has(key.toLowerCase())
    );

    if (hasSensitiveData) {
      console.warn('🚨 Données sensibles détectées dans sessionStorage');
      return false;
    }

    // Vérifier la profondeur de l'objet (éviter les objets trop complexes)
    const checkDepth = (obj: any, depth = 0): boolean => {
      if (depth > 5) return false; // Profondeur maximale
      if (typeof obj !== 'object' || obj === null) return true;
      
      return Object.values(obj).every(value => checkDepth(value, depth + 1));
    };

    return checkDepth(data);
  }, []);

  const saveToSession = useCallback((key: string, data: any): void => {
    try {
      if (!validateSessionKey(key)) {
        return;
      }

      // Ne pas valider le contenu pour les clés whitelisted connues et sûres
      const skipContentValidation = (
        key === ALLOWED_SESSION_KEYS.UI_PREFERENCES ||
        key === ALLOWED_SESSION_KEYS.SESSION_METADATA ||
        key === ALLOWED_SESSION_KEYS.LOGIN_TIMESTAMP ||
        key === ALLOWED_SESSION_KEYS.REDIRECT_PATH ||
        key.startsWith(ALLOWED_SESSION_KEYS.FORM_DRAFTS) ||
        key.startsWith(ALLOWED_SESSION_KEYS.FILTERS_STATE)
      );

      if (!skipContentValidation && !validateSessionData(data)) {
        return;
      }
      
      // Limiter la taille des données
      const dataString = JSON.stringify(data);
      const dataSize = new Blob([dataString]).size;
      if (dataSize > SECURITY_CONFIG.MAX_SESSION_SIZE) {
        console.warn(`🚨 Données trop volumineuses pour sessionStorage: ${dataSize} bytes`);
        return;
      }
      
      sessionStorage.setItem(key, dataString);
    } catch (error) {
      console.error('❌ Erreur sessionStorage (sauvegarde):', error);
    }
  }, [validateSessionKey, validateSessionData]);

  const getFromSession = useCallback((key: string): any => {
    try {
      if (!validateSessionKey(key)) {
        return null;
      }
      
      const item = sessionStorage.getItem(key);
      return safeJsonParse(item, null);
    } catch (error) {
      console.error('❌ Erreur sessionStorage (récupération):', error);
      return null;
    }
  }, [validateSessionKey]);

  const removeFromSession = useCallback((key: string): void => {
    try {
      if (validateSessionKey(key)) {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error('❌ Erreur sessionStorage (suppression):', error);
    }
  }, [validateSessionKey]);

  const clearSession = useCallback((): void => {
    try {
      // Sauvegarder les préférences UI avant de tout effacer
      const uiPreferences = getFromSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES);
      sessionStorage.clear();
      
      // Restaurer les préférences UI si elles existaient
      if (uiPreferences) {
        saveToSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES, uiPreferences);
      }
    } catch (error) {
      console.error('❌ Erreur sessionStorage (nettoyage):', error);
    }
  }, [getFromSession, saveToSession]);

  const cleanupSensitiveData = useCallback((): void => {
    // Nettoyer toutes les clés sensibles potentielles
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sessionStorage.removeItem(key);
        console.debug(`🧹 Donnée sensible supprimée: ${key}`);
      }
    }
  }, []);

  // === GESTION DES TOKENS ET SESSIONS ===

  const setupTokenRefresh = useCallback((exp: number): void => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    const refreshTime = exp * 1000 - Date.now() - SECURITY_CONFIG.TOKEN_REFRESH_BUFFER;
    
    if (refreshTime > 0) {
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTokenFunction().catch(error => {
          console.error('❌ Erreur rafraîchissement automatique:', error);
        });
      }, refreshTime);
    }
  }, []);

  const refreshTokenFunction = useCallback(async (): Promise<boolean> => {
    // Éviter les rafraîchissements concurrents
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async (): Promise<boolean> => {
      try {
        console.log("🔄 Tentative de rafraîchissement du token...");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

        const response = await fetch(`${VITE_API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          
          if (data.loggedOut) {
            console.log("🔒 Session expirée, déconnexion...");
            logout('/', true);
            return false;
          }

          if (data.accessToken) {
            console.log("✅ Token rafraîchi avec succès");
            
            // Valider le nouveau token avant de le stocker
            try {
              const decoded = jwtDecode<JwtPayload>(data.accessToken);
              if (decoded.tokenType !== 'access') {
                throw new Error('Type de token invalide');
              }

              localStorage.setItem('token', data.accessToken);
              setToken(data.accessToken);
              
              await fetchUserData(data.accessToken);
              setupTokenRefresh(decoded.exp);
              
              return true;
            } catch (validationError) {
              console.error('❌ Token rafraîchi invalide:', validationError);
              logout('/', true);
              return false;
            }
          }
        } else {
          console.error("❌ Échec du rafraîchissement du token");
          logout('/', true);
          return false;
        }
      } catch (error:any) {
        console.error('❌ Erreur rafraîchissement token:', error);
        if (error.name !== 'AbortError') {
          logout('/', true);
        }
        return false;
      }
      return false;
    })();

    refreshInFlightRef.current = refreshPromise;
    
    try {
      return await refreshPromise;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [VITE_API_URL]);

  // === GESTION DES DONNÉES UTILISATEUR ===

  const fetchUserData = useCallback(async (userToken: string): Promise<void> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

      const response = await fetch(`${VITE_API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Erreur de récupération du profil');
      }

      const userData = await response.json();
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: userData.isActive,
        telephone: userData.telephone || userData.phone || '',
        lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : new Date()
      };
      
      setUser(mappedUser);
      
    } catch (err) {
      console.error('❌ Erreur fetchUserData:', err);
      throw err;
    }
  }, [VITE_API_URL]);

  const updateUserProfile = useCallback((updates: Partial<User>): void => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // === OPÉRATIONS D'AUTHENTIFICATION ===

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

      const response = await fetch(`${VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion');
      }

      // Valider la structure de la réponse
      if (!data.accessToken || !data.user || !data.user.id) {
        throw new Error('Réponse d\'authentification invalide');
      }

      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);

      // Configurer le rafraîchissement automatique
      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      setupTokenRefresh(decoded.exp);
      
      // Sauvegarder les métadonnées de session
      saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
        sessionStart: Date.now(),
        sessionId: crypto.randomUUID?.(),
        userAgent: navigator.userAgent.substring(0, 100),
        hasActiveSession: true
      });

      // Redirection basée sur le rôle
      const redirectPath = data.user.role === 'admin' 
        ? '/gestionnaire/statistiques' 
        : '/';
      
      navigate(redirectPath, { replace: true });
      
    } catch (err: any) {
      const errorMessage = err.name === 'AbortError' 
        ? 'Timeout de connexion' 
        : err.message || 'Erreur de connexion';
      
      toast.error(errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, navigate, setupTokenRefresh, saveToSession]);

  const register = useCallback(async (formData: RegisterFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validation côté client
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (formData.password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

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
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.errors 
          ? Object.values(data.errors).join(', ') 
          : data.message || "Erreur lors de l'inscription";
        throw new Error(errorMsg);
      }

      // Connexion automatique après inscription
      await login(formData.email, formData.password);
      
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, login]);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

      // Stocker un hash sécurisé de l'email
      const emailHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32));
      
      saveToSession(ALLOWED_SESSION_KEYS.PASSWORD_RESET_HASH, { 
        hash: emailHash, 
        timestamp: Date.now() 
      });

      const response = await fetch(`${VITE_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l'envoi de l'email");
      }

      toast.success(`Un email de réinitialisation a été envoyé à ${email}`);
      navigate('/connexion');
      
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, navigate, saveToSession]);

  const resetPassword = useCallback(async (resetToken: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (newPassword.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

      const response = await fetch(`${VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: resetToken, newPassword }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la réinitialisation');
      }

      removeFromSession(ALLOWED_SESSION_KEYS.PASSWORD_RESET_HASH);
      toast.success('Mot de passe réinitialisé avec succès');
      navigate('/connexion');
      
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, navigate, removeFromSession]);

  const logout = useCallback((redirectPath?: string, silent?: boolean): void => {
    const tokenToRevoke = token || localStorage.getItem('token');
    
    // Nettoyage immédiat des états locaux
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);

    // Annuler les timers
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (checkIntervalRef.current) {
      window.clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    // Appel API de déconnexion seulement si pas silencieux et token disponible
    if (!silent && tokenToRevoke) {
      fetch(`${VITE_API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${tokenToRevoke}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }).catch((error) => {
        console.warn('⚠️ Erreur lors de la déconnexion API:', error);
      });
    }

    // Mettre à jour les métadonnées de session
    saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
      sessionStart: Date.now(),
      sessionId: crypto.randomUUID?.(),
      userAgent: navigator.userAgent.substring(0, 100),
      hasActiveSession: false
    });

    // Nettoyer les données sensibles
    cleanupSensitiveData();
    
    navigate(redirectPath ?? '/', { replace: true });
  }, [VITE_API_URL, token, navigate, saveToSession, cleanupSensitiveData]);

  const handleAuthError = useCallback((error: any): void => {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Une erreur est survenue';
    
    setError(errorMessage);
    
    // Ne pas afficher les erreurs en mode silencieux
    if (!error.silent) {
      toast.error(errorMessage);
    }
  }, []);

  // === VÉRIFICATION D'AUTHENTIFICATION ===

  const checkAuth = useCallback(async (): Promise<void> => {
    const savedToken = localStorage.getItem('token');
    
    if (!savedToken) {
      saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
        sessionStart: Date.now(),
        sessionId: crypto.randomUUID?.(),
        userAgent: navigator.userAgent.substring(0, 100),
        hasActiveSession: false
      });
      setIsLoading(false);
      return;
    }

    try {
      // Vérifier si le token est expiré
      const decoded = jwtDecode<JwtPayload>(savedToken);
      const isTokenExpired = decoded.exp * 1000 < Date.now();

      if (isTokenExpired) {
        console.log("⏰ Token expiré, tentative de rafraîchissement...");
        const refreshed = await refreshTokenFunction();
        if (!refreshed) {
          console.log("❌ Impossible de rafraîchir le token, déconnexion...");
          logout('/', true);
          return;
        }
      } else {
        console.log("✅ Token valide, chargement des données utilisateur...");
        // Token valide, charger les données utilisateur
        await fetchUserData(savedToken);
        setupTokenRefresh(decoded.exp);
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      logout('/', true);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData, logout, refreshTokenFunction, setupTokenRefresh, saveToSession]);

  // === EFFETS ET INITIALISATION ===

  useEffect(() => {
    cleanupSensitiveData();
    
    // Initialiser les préférences UI par défaut
    saveToSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES, {
      theme: 'light',
      language: 'fr',
      notifications: true,
      sidebarCollapsed: false,
      savedAt: Date.now()
    });

    // Initialiser les métadonnées de session
    saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
      sessionStart: Date.now(),
      sessionId: crypto.randomUUID?.(),
      userAgent: navigator.userAgent.substring(0, 100),
      hasActiveSession: !!localStorage.getItem('token')
    });

    // Nettoyage périodique des données sensibles
    cleanupIntervalRef.current = window.setInterval(() => {
      cleanupSensitiveData();
    }, SECURITY_CONFIG.SESSION_CLEANUP_INTERVAL);

    return () => {
      if (cleanupIntervalRef.current) {
        window.clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [cleanupSensitiveData, saveToSession]);

  useEffect(() => {
    let isMounted = true;
    let interval: number | undefined;

    const initializeAuth = async () => {
      if (!isMounted) return;
      await checkAuth();
      
      if (isMounted && token) {
        // Vérification périodique de l'authentification
        interval = window.setInterval(() => {
          if (token) {
            checkAuth().catch(() => {});
          }
        }, SECURITY_CONFIG.TOKEN_REFRESH_BUFFER);
        checkIntervalRef.current = interval;
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
      if (interval) window.clearInterval(interval);
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [checkAuth, token]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    refreshToken: refreshTokenFunction,
    saveToSession,
    getFromSession,
    removeFromSession,
    clearSession,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useSecureSession = <T,>(key: string, defaultValue: T) => {
  const { saveToSession, getFromSession, removeFromSession } = useAuth();
  
  const [state, setState] = useState<T>(() => {
    return getFromSession(key) || defaultValue;
  });

  const setSessionState = useCallback((value: T): void => {
    setState(value);
    saveToSession(key, value);
  }, [key, saveToSession]);

  const clearSessionState = useCallback((): void => {
    setState(defaultValue);
    removeFromSession(key);
  }, [key, defaultValue, removeFromSession]);

  return [state, setSessionState, clearSessionState] as const;
};