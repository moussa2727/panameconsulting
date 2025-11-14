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
  saveFormDraft: (formId: string, data: any, options?: FormDraftOptions) => void;
  getFormDraft: (formId: string) => any;
  clearFormDraft: (formId: string) => void;
  saveRedirectPath: (path: string) => void;
  getRedirectPath: () => string | null;
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

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  message?: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

interface FormDraftOptions {
  encrypt?: boolean;
  ttl?: number;
  sensitiveFields?: string[];
}

// Clés autorisées pour le sessionStorage
const ALLOWED_SESSION_KEYS = {
  REDIRECT_PATH: 'auth_redirect_path',
  LOGIN_TIMESTAMP: 'login_timestamp',
  UI_PREFERENCES: 'ui_preferences',
  SESSION_METADATA: 'session_metadata',
  NAVIGATION_STATE: 'navigation_state',
  FORM_DRAFTS: 'form_drafts_',
  FILTERS_STATE: 'filters_state_',
  PASSWORD_RESET_HASH: 'password_reset_hash',
  RATE_LIMIT_INFO: 'rate_limit_info',
  FORM_DRAFTS_METADATA: 'form_drafts_metadata'
} as const;

// Clés interdites
const SENSITIVE_KEYS = [
  'user_email', 'user_password', 'user_id', 'user_role',
  'jwt_token', 'access_token', 'refresh_token', 'personal_data',
  'auth_token', 'credentials', 'password', 'email', 'token',
  'secret', 'private', 'key', 'bearer', 'authorization'
];

// Champs sensibles à supprimer automatiquement
const SENSITIVE_FORM_FIELDS = [
  'email', 'password', 'confirmPassword', 'currentPassword',
  'phone', 'telephone', 'mobile', 'phoneNumber',
  'address', 'street', 'city', 'zipCode', 'postalCode',
  'birthDate', 'birthday', 'socialSecurity',
  'idNumber', 'passport', 'securityAnswer', 'secretQuestion',
  'bankAccount', 'iban', 'bic', 'creditCard', 'cvv'
];

// Configuration de sécurité
const SECURITY_CONFIG = {
  MAX_SESSION_SIZE: 50 * 1024,
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000,
  SESSION_CLEANUP_INTERVAL: 30 * 60 * 1000,
  API_TIMEOUT: 15000,
  RATE_LIMIT_RETRY_DELAY: 60000,
  MAX_RETRY_ATTEMPTS: 2,
  FORM_DRAFT_TTL: 24 * 60 * 60 * 1000,
  MAX_FORM_DRAFT_SIZE: 10 * 1024,
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
  const rateLimitRetryCountRef = useRef<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const refreshTimeoutRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const cleanupIntervalRef = useRef<number | null>(null);
  const rateLimitRetryTimeoutRef = useRef<number | null>(null);

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // === FONCTIONS SESSIONSTORAGE SÉCURISÉES ===

  const safeJsonParse = <T,>(jsonString: string | null, defaultValue: T): T => {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const validateSessionKey = useCallback((key: string): boolean => {
    if (!key || typeof key !== 'string') return false;

    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
      console.warn(`🚨 Tentative de stockage de donnée sensible bloquée: ${key}`);
      return false;
    }
    
    const isAllowed = Object.values(ALLOWED_SESSION_KEYS).some(allowedKey => {
      if (key === allowedKey) return true;
      if (key.startsWith(ALLOWED_SESSION_KEYS.FORM_DRAFTS)) {
        const formId = key.replace(ALLOWED_SESSION_KEYS.FORM_DRAFTS, '');
        return formId.length > 0 && formId.length <= 100 && !formId.includes('..');
      }
      if (key.startsWith(ALLOWED_SESSION_KEYS.FILTERS_STATE)) {
        return true;
      }
      return false;
    });
    
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
      'secret', 'privateKey', 'apiKey', 'socialSecurity', 'phone',
      'telephone', 'address', 'birthDate', 'userId'
    ].map(k => k.toLowerCase()));

    const hasSensitiveData = Object.keys(data).some(key => 
      SENSITIVE_EXACT.has(key.toLowerCase())
    );

    if (hasSensitiveData) {
      console.warn('🚨 Données sensibles détectées dans sessionStorage');
      return false;
    }

    const checkDepth = (obj: any, depth = 0): boolean => {
      if (depth > 5) return false;
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

      const skipContentValidation = (
        key === ALLOWED_SESSION_KEYS.UI_PREFERENCES ||
        key === ALLOWED_SESSION_KEYS.SESSION_METADATA ||
        key === ALLOWED_SESSION_KEYS.LOGIN_TIMESTAMP ||
        key === ALLOWED_SESSION_KEYS.REDIRECT_PATH ||
        key === ALLOWED_SESSION_KEYS.RATE_LIMIT_INFO ||
        key === ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA ||
        key.startsWith(ALLOWED_SESSION_KEYS.FORM_DRAFTS) ||
        key.startsWith(ALLOWED_SESSION_KEYS.FILTERS_STATE)
      );

      if (!skipContentValidation && !validateSessionData(data)) {
        return;
      }
      
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
      const uiPreferences = getFromSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES);
      sessionStorage.clear();
      
      if (uiPreferences) {
        saveToSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES, uiPreferences);
      }
    } catch (error) {
      console.error('❌ Erreur sessionStorage (nettoyage):', error);
    }
  }, [getFromSession, saveToSession]);

  // === FONCTIONS DE REDIRECTION UNIFORMISÉES ===

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

const isValidRedirectPath = useCallback((path: string, user: User): boolean => {
  if (!path || typeof path !== 'string') return false;
  
  const allowedPaths = [
    '/', '/services', '/contact', '/a-propos', '/rendez-vous',
    '/mes-rendez-vous', '/mon-profil', '/ma-procedure'
  ];
  
  const adminPaths = [
    '/gestionnaire/statistiques', '/gestionnaire/utilisateurs',
    '/gestionnaire/messages', '/gestionnaire/procedures',
    '/gestionnaire/destinations', '/gestionnaire/rendez-vous',
    '/gestionnaire/profil'
  ];

  // 🔥 CORRECTION : Gestion explicite du type boolean pour user.isAdmin
  const isAllowed = allowedPaths.includes(path) || 
    ((user.role === 'admin' || user.isAdmin === true) && adminPaths.some(adminPath => path.startsWith(adminPath)));

  const isAuthRoute = [
    '/connexion', '/inscription', '/mot-de-passe-oublie'
  ].includes(path);

  return isAllowed && !isAuthRoute;
}, []);

  const getRoleBasedRedirect = useCallback((user: User): string => {
    const redirectPath = getRedirectPath();
    
    if (redirectPath && isValidRedirectPath(redirectPath, user)) {
      return redirectPath;
    }

    if (user.role === 'admin' || user.isAdmin) {
      return '/gestionnaire/statistiques';
    }
    
    return '/';
  }, [getRedirectPath, isValidRedirectPath]);

  // === FONCTIONS DE SÉCURITÉ DES BROUILLONS ===

  const sanitizeFormData = useCallback((data: any, sensitiveFields: string[] = SENSITIVE_FORM_FIELDS): any => {
    if (!data || typeof data !== 'object') return data;

    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    const removeSensitiveFields = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(sensitive => 
          lowerKey.includes(sensitive.toLowerCase())
        )) {
          delete obj[key];
          return;
        }
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          removeSensitiveFields(obj[key]);
        }
      });
    };
    
    removeSensitiveFields(sanitized);
    return sanitized;
  }, []);

  const validateFormDraftSize = useCallback((data: any): boolean => {
    try {
      const dataString = JSON.stringify(data);
      return new Blob([dataString]).size <= SECURITY_CONFIG.MAX_FORM_DRAFT_SIZE;
    } catch {
      return false;
    }
  }, []);

  const cleanupExpiredFormDrafts = useCallback((): void => {
    try {
      const now = Date.now();
      const metadata = getFromSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA) || {};
      
      Object.keys(metadata).forEach(key => {
        const draftMetadata = metadata[key];
        const ttl = draftMetadata.ttl || SECURITY_CONFIG.FORM_DRAFT_TTL;
        
        if (now - draftMetadata.createdAt > ttl) {
          removeFromSession(`${ALLOWED_SESSION_KEYS.FORM_DRAFTS}${key}`);
          delete metadata[key];
        }
      });
      
      saveToSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA, metadata);
    } catch (error) {
      console.error('❌ Erreur nettoyage brouillons expirés:', error);
    }
  }, [getFromSession, removeFromSession, saveToSession]);

  // === GESTION SÉCURISÉE DES BROUILLONS ===

  const saveFormDraft = useCallback((formId: string, data: any, options: FormDraftOptions = {}): void => {
    try {
      const { encrypt = false, ttl, sensitiveFields = SENSITIVE_FORM_FIELDS } = options;
      
      if (!formId || typeof formId !== 'string' || formId.length > 100) {
        console.warn('🚨 ID de formulaire invalide');
        return;
      }
      
      const sanitizedData = sanitizeFormData(data, sensitiveFields);
      
      if (!validateFormDraftSize(sanitizedData)) {
        console.warn('🚨 Brouillon trop volumineux');
        return;
      }
      
      const draftKey = `${ALLOWED_SESSION_KEYS.FORM_DRAFTS}${formId}`;
      
      saveToSession(draftKey, {
        data: sanitizedData,
        version: '1.0',
        sanitized: true
      });
      
      const metadata = getFromSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA) || {};
      metadata[formId] = {
        createdAt: Date.now(),
        ttl: ttl || SECURITY_CONFIG.FORM_DRAFT_TTL,
        size: new Blob([JSON.stringify(sanitizedData)]).size
      };
      
      saveToSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA, metadata);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde brouillon:', error);
    }
  }, [sanitizeFormData, validateFormDraftSize, saveToSession, getFromSession]);

  const getFormDraft = useCallback((formId: string): any => {
    try {
      if (!formId) return null;
      
      const draftKey = `${ALLOWED_SESSION_KEYS.FORM_DRAFTS}${formId}`;
      const draft = getFromSession(draftKey);
      
      if (!draft) return null;
      
      const metadata = getFromSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA) || {};
      const draftMetadata = metadata[formId];
      
      if (draftMetadata) {
        const ttl = draftMetadata.ttl || SECURITY_CONFIG.FORM_DRAFT_TTL;
        if (Date.now() - draftMetadata.createdAt > ttl) {
          removeFromSession(draftKey);
          delete metadata[formId];
          saveToSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA, metadata);
          return null;
        }
      }
      
      return draft.data || null;
    } catch (error) {
      console.error('❌ Erreur récupération brouillon:', error);
      return null;
    }
  }, [getFromSession, removeFromSession, saveToSession]);

  const clearFormDraft = useCallback((formId: string): void => {
    try {
      if (!formId) return;
      
      const draftKey = `${ALLOWED_SESSION_KEYS.FORM_DRAFTS}${formId}`;
      removeFromSession(draftKey);
      
      const metadata = getFromSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA) || {};
      delete metadata[formId];
      saveToSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA, metadata);
      
    } catch (error) {
      console.error('❌ Erreur suppression brouillon:', error);
    }
  }, [removeFromSession, getFromSession, saveToSession]);

  // === FONCTIONS CORE D'AUTHENTIFICATION ===

const fetchUserData = useCallback(async (userToken: string): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

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
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const userData: User = await response.json();
    
    // 🔥 CORRECTION : Gestion explicite du type boolean
    const userWithRole: User = {
      ...userData,
      isAdmin: userData.role === 'admin' || userData.isAdmin === true
    };
    
    setUser(userWithRole);
      
  } catch (err: any) {
    console.error('❌ Erreur récupération données utilisateur:', err);
    if (err.name !== 'AbortError') {
      throw new Error('Impossible de récupérer les informations utilisateur');
    }
  }
}, [VITE_API_URL]);

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
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async (): Promise<boolean> => {
      try {
        const response = await fetch(`${VITE_API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            logout('/', true);
            return false;
          }
          throw new Error(`Erreur ${response.status}`);
        }

        const data = await response.json();
        
        if (data.loggedOut) {
          logout('/', true);
          return false;
        }

        if (!data.accessToken) {
          logout('/', true);
          return false;
        }

        try {
          const decoded = jwtDecode<JwtPayload>(data.accessToken);
          setToken(data.accessToken);
          
          await fetchUserData(data.accessToken);
          setupTokenRefresh(decoded.exp);
          
          return true;
        } catch (validationError) {
          console.error('❌ Token rafraîchi invalide:', validationError);
          logout('/', true);
          return false;
        }
      } catch (error: any) {
        console.error('❌ Erreur rafraîchissement token:', error);
        if (error.name !== 'AbortError') {
          logout('/', true);
        }
        return false;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    
    try {
      return await refreshPromise;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [VITE_API_URL, fetchUserData, setupTokenRefresh]);

  // === GESTION DU RATE LIMITING ===

  const getRateLimitInfo = useCallback((): { lastRetry: number; retryCount: number } => {
    return getFromSession(ALLOWED_SESSION_KEYS.RATE_LIMIT_INFO) || { lastRetry: 0, retryCount: 0 };
  }, [getFromSession]);

  const setRateLimitInfo = useCallback((info: { lastRetry: number; retryCount: number }) => {
    saveToSession(ALLOWED_SESSION_KEYS.RATE_LIMIT_INFO, info);
  }, [saveToSession]);

  const canRetryAfterRateLimit = useCallback((): boolean => {
    const rateLimitInfo = getRateLimitInfo();
    const now = Date.now();
    const timeSinceLastRetry = now - rateLimitInfo.lastRetry;
    
    return timeSinceLastRetry >= SECURITY_CONFIG.RATE_LIMIT_RETRY_DELAY && 
           rateLimitInfo.retryCount < SECURITY_CONFIG.MAX_RETRY_ATTEMPTS;
  }, [getRateLimitInfo]);

  const handleRateLimit = useCallback(async (operation: string): Promise<boolean> => {
    const rateLimitInfo = getRateLimitInfo();
    const now = Date.now();
    
    if (!canRetryAfterRateLimit()) {
      const nextRetryTime = rateLimitInfo.lastRetry + SECURITY_CONFIG.RATE_LIMIT_RETRY_DELAY;
      const waitTime = Math.ceil((nextRetryTime - now) / 1000);
      
      if (rateLimitInfo.retryCount >= SECURITY_CONFIG.MAX_RETRY_ATTEMPTS) {
        toast.error('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
        setError('Trop de tentatives. Veuillez patienter.');
        return false;
      }
      
      return new Promise((resolve) => {
        if (rateLimitRetryTimeoutRef.current) {
          window.clearTimeout(rateLimitRetryTimeoutRef.current);
        }
        
        rateLimitRetryTimeoutRef.current = window.setTimeout(() => {
          resolve(true);
        }, SECURITY_CONFIG.RATE_LIMIT_RETRY_DELAY);
      });
    }
    
    const newRetryCount = rateLimitInfo.retryCount + 1;
    setRateLimitInfo({
      lastRetry: now,
      retryCount: newRetryCount
    });
    
    return true;
  }, [getRateLimitInfo, canRetryAfterRateLimit, setRateLimitInfo]);

  const resetRateLimit = useCallback(() => {
    setRateLimitInfo({ lastRetry: 0, retryCount: 0 });
    if (rateLimitRetryTimeoutRef.current) {
      window.clearTimeout(rateLimitRetryTimeoutRef.current);
      rateLimitRetryTimeoutRef.current = null;
    }
    rateLimitRetryCountRef.current = 0;
  }, [setRateLimitInfo]);

  // === GESTION DES DONNÉES UTILISATEUR ===

  const updateUserProfile = useCallback((updates: Partial<User>): void => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

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
      const decoded = jwtDecode<JwtPayload>(savedToken);
      const isTokenExpired = decoded.exp * 1000 < Date.now();

      if (isTokenExpired) {
        const refreshed = await refreshTokenFunction();
        if (!refreshed) {
          await logout('/', true);
          return;
        }
      } else {
        try {
          await fetchUserData(savedToken);
          setupTokenRefresh(decoded.exp);
        } catch (fetchError: any) {
          if (fetchError.message?.includes('429') || fetchError.message?.includes('Too Many Requests')) {
            setupTokenRefresh(decoded.exp);
          } else {
            throw fetchError;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      
      if (error instanceof Error && 
          !error.message.includes('429') && 
          !error.message.includes('Too Many Requests') &&
          !error.message.includes('Timeout')) {
        await logout('/', true);
      } else {
        setIsLoading(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData, refreshTokenFunction, setupTokenRefresh, saveToSession]);

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

      if (response.status === 429) {
        const canRetry = await handleRateLimit('login');
        if (canRetry) {
          return login(email, password);
        } else {
          throw new Error('Trop de tentatives de connexion. Veuillez patienter.');
        }
      }

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur de connexion');
      }

      if (!data.accessToken || !data.user || !data.user.id) {
        throw new Error('Réponse d\'authentification invalide');
      }

      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);
      
      const userWithRole: User = {
      ...data.user,
      isAdmin: data.user.role === 'admin' || data.user.isAdmin === true
    };
      setUser(userWithRole);

      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      setupTokenRefresh(decoded.exp);
      
      saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
        sessionStart: Date.now(),
        sessionId: crypto.randomUUID?.(),
        userAgent: navigator.userAgent.substring(0, 100),
        hasActiveSession: true
      });

      resetRateLimit();

      // 🔥 REDIRECTION UNIFORMISÉE SELON LE RÔLE
      const redirectPath = getRoleBasedRedirect(userWithRole);
      
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
  }, [VITE_API_URL, navigate, setupTokenRefresh, saveToSession, handleRateLimit, resetRateLimit, getRoleBasedRedirect]);

  const register = useCallback(async (formData: RegisterFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
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

      if (response.status === 429) {
        const canRetry = await handleRateLimit('register');
        if (canRetry) {
          return register(formData);
        } else {
          throw new Error('Trop de tentatives d\'inscription. Veuillez patienter.');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.errors 
          ? Object.values(data.errors).join(', ') 
          : data.message || "Erreur lors de l'inscription";
        throw new Error(errorMsg);
      }

      resetRateLimit();

      await login(formData.email, formData.password);
      
    } catch (err: any) {
      const errorMessage = err.message || "Erreur lors de l'inscription";
      toast.error(errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, login, handleRateLimit, resetRateLimit]);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

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

      if (response.status === 429) {
        const canRetry = await handleRateLimit('forgotPassword');
        if (canRetry) {
          return forgotPassword(email);
        } else {
          throw new Error('Trop de demandes de réinitialisation. Veuillez patienter.');
        }
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l'envoi de l'email");
      }

      resetRateLimit();

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
  }, [VITE_API_URL, navigate, saveToSession, handleRateLimit, resetRateLimit]);

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
        body: JSON.stringify({ 
          token: resetToken, 
          newPassword,
          confirmPassword: newPassword 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const canRetry = await handleRateLimit('resetPassword');
        if (canRetry) {
          return resetPassword(resetToken, newPassword);
        } else {
          throw new Error('Trop de tentatives de réinitialisation. Veuillez patienter.');
        }
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la réinitialisation');
      }

      resetRateLimit();

      removeFromSession(ALLOWED_SESSION_KEYS.PASSWORD_RESET_HASH);
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
  }, [VITE_API_URL, navigate, removeFromSession, handleRateLimit, resetRateLimit]);

  const logout = useCallback(async (redirectPath?: string, silent?: boolean): Promise<void> => {
    const tokenToRevoke = token || localStorage.getItem('token');
    
    // Nettoyer tous les brouillons à la déconnexion
    const metadata = getFromSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA) || {};
    Object.keys(metadata).forEach(formId => {
      removeFromSession(`${ALLOWED_SESSION_KEYS.FORM_DRAFTS}${formId}`);
    });
    removeFromSession(ALLOWED_SESSION_KEYS.FORM_DRAFTS_METADATA);

    // Supprimer les tokens du stockage local
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    setToken(null);
    setUser(null);
    setError(null);

    resetRateLimit();

    // Nettoyer les cookies
    const cookies = [
      'access_token', 'refresh_token', 'token', 'auth_token'
    ];
    
    cookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      document.cookie = `${cookieName}=; Path=/; Domain=localhost; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    });

    // Nettoyer les timeouts
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (checkIntervalRef.current) {
      window.clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    if (rateLimitRetryTimeoutRef.current) {
      window.clearTimeout(rateLimitRetryTimeoutRef.current);
      rateLimitRetryTimeoutRef.current = null;
    }

    if (cleanupIntervalRef.current) {
      window.clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }

    // Appel API de déconnexion
    if (!silent && tokenToRevoke) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(`${VITE_API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${tokenToRevoke}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la déconnexion API:', error);
      }
    }

    // Mettre à jour les métadonnées de session
    saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
      sessionStart: Date.now(),
      sessionId: crypto.randomUUID?.(),
      userAgent: navigator.userAgent.substring(0, 100),
      hasActiveSession: false,
      loggedOutAt: new Date().toISOString()
    });

    // Nettoyer les données sensibles
    cleanupExpiredFormDrafts();
    
    // 🔥 REDIRECTION UNIFORMISÉE APRÈS DÉCONNEXION
    const finalRedirectPath = redirectPath || '/';
    
    navigate(finalRedirectPath, { 
      replace: true,
      state: {
        from: 'logout',
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(new Event('storage'));
  }, [VITE_API_URL, token, navigate, saveToSession, cleanupExpiredFormDrafts, removeFromSession, resetRateLimit, getFromSession]);

  // === EFFETS ET INITIALISATION ===

  const cleanupSensitiveData = useCallback((): void => {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sessionStorage.removeItem(key);
      }
    }
    
    cleanupExpiredFormDrafts();
  }, [cleanupExpiredFormDrafts]);

  useEffect(() => {
    cleanupSensitiveData();
    
    saveToSession(ALLOWED_SESSION_KEYS.UI_PREFERENCES, {
      theme: 'light',
      language: 'fr',
      notifications: true,
      sidebarCollapsed: false,
      savedAt: Date.now()
    });

    saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
      sessionStart: Date.now(),
      sessionId: crypto.randomUUID?.(),
      userAgent: navigator.userAgent.substring(0, 100),
      hasActiveSession: !!localStorage.getItem('token')
    });

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
      
      try {
        await checkAuth();
      } catch (error) {
        console.error('❌ Erreur initialisation auth:', error);
      }
    };

    initializeAuth();
    
    if (token && isMounted) {
      interval = window.setInterval(() => {
        checkAuth().catch(() => {});
      }, SECURITY_CONFIG.TOKEN_REFRESH_BUFFER * 4);
    }
    
    return () => {
      isMounted = false;
      if (interval) window.clearInterval(interval);
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
    saveFormDraft,
    getFormDraft,
    clearFormDraft,
    saveRedirectPath,
    getRedirectPath,
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

export const useSecureFormDraft = <T,>(formId: string, defaultValue: T) => {
  const { saveFormDraft, getFormDraft, clearFormDraft } = useAuth();
  
  const [draft, setDraft] = useState<T>(() => {
    return getFormDraft(formId) || defaultValue;
  });

  const setDraftData = useCallback((data: T, options?: FormDraftOptions): void => {
    setDraft(data);
    saveFormDraft(formId, data, options);
  }, [formId, saveFormDraft]);

  const clearDraft = useCallback((): void => {
    setDraft(defaultValue);
    clearFormDraft(formId);
  }, [formId, defaultValue, clearFormDraft]);

  return [draft, setDraftData, clearDraft] as const;
};