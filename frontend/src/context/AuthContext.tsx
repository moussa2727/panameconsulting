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

interface FormDraftOptions {
  encrypt?: boolean;
  ttl?: number;
  sensitiveFields?: string[];
}

// ===== CONSTANTES DE CONFIGURATION =====
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

const SENSITIVE_KEYS = [
  'user_email', 'user_password', 'user_id', 'user_role',
  'jwt_token', 'access_token', 'refresh_token', 'personal_data',
  'auth_token', 'credentials', 'password', 'email', 'token',
  'secret', 'private', 'key', 'bearer', 'authorization'
];

const SENSITIVE_FORM_FIELDS = [
  'email', 'password', 'confirmPassword', 'currentPassword',
  'phone', 'telephone', 'mobile', 'phoneNumber',
  'address', 'street', 'city', 'zipCode', 'postalCode',
  'birthDate', 'birthday', 'socialSecurity',
  'idNumber', 'passport', 'securityAnswer', 'secretQuestion',
  'bankAccount', 'iban', 'bic', 'creditCard', 'cvv'
];

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

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

// ===== CONTEXTE =====
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // ===== ÉTATS =====
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

  // ===== RÉFÉRENCES =====
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);
  const rateLimitRetryCountRef = useRef<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const refreshTimeoutRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const cleanupIntervalRef = useRef<number | null>(null);
  const rateLimitRetryTimeoutRef = useRef<number | null>(null);

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
    } catch (error) {
      console.error('❌ Erreur lecture cookie:', error);
      return null;
    }
  }, []);

  // ===== DÉCLARATIONS AVANCÉES DES FONCTIONS PRINCIPALES =====
  const logout = useCallback(async (redirectPath?: string, silent?: boolean): Promise<void> => {
      const tokenToRevoke = token || localStorage.getItem('token');
      
      console.log('🔓 Début de la déconnexion complète...');

      // 1. Liste exhaustive de tous les tokens à supprimer
      const ALL_TOKENS = [
          'token', 'access_token', 'refresh_token', 'auth_token',
          'accessToken', 'refreshToken', 'jwt_token', 'jwt',
          'user_token', 'session_token', 'bearer_token'
      ];

      // 2. Supprimer tous les tokens du localStorage
      try {
          ALL_TOKENS.forEach(tokenName => {
              localStorage.removeItem(tokenName);
              localStorage.removeItem(tokenName.toLowerCase());
              localStorage.removeItem(tokenName.toUpperCase());
          });
          console.log('✅ Tous les tokens supprimés du localStorage');
      } catch (error) {
          console.warn('⚠️ Erreur suppression tokens localStorage:', error);
      }

      // 3. Supprimer tous les tokens du sessionStorage
      try {
          ALL_TOKENS.forEach(tokenName => {
              sessionStorage.removeItem(tokenName);
              sessionStorage.removeItem(tokenName.toLowerCase());
              sessionStorage.removeItem(tokenName.toUpperCase());
          });
          console.log('✅ Tous les tokens supprimés du sessionStorage');
      } catch (error) {
          console.warn('⚠️ Erreur suppression tokens sessionStorage:', error);
      }

      // 4. Nettoyer l'état React
      setToken(null);
      setUser(null);
      setError(null);
      console.log('✅ État React nettoyé');

      // 5. Réinitialiser le rate limiting
      resetRateLimit();

      // 6. Nettoyer TOUS les cookies de manière exhaustive
      try {
          const cookiesToClear = [
              'refresh_token', 'refreshToken', 'RefreshToken', 'Refresh_Token',
              'access_token', 'accessToken', 'AccessToken', 'Access_Token',
              'token', 'Token', 'auth_token', 'authToken', 'AuthToken',
              'jwt_token', 'jwtToken', 'JWTToken', 'JWT_Token',
              'session_token', 'sessionToken', 'refresh_Token', 'access_Token', 'SessionToken',
              'bearer_token', 'bearerToken', 'BearerToken',
              'user_token', 'userToken', 'UserToken',
              'cookie_consent', 'session_id', 'SessionId'
          ];
          
          const domain = window.location.hostname;
          const isLocalhost = domain === 'localhost' || domain === '127.0.0.1';
          
          cookiesToClear.forEach(cookieName => {
              // Suppression pour le chemin racine
              document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
              document.cookie = `${cookieName}=; Path=/; Domain=${domain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
              
              // Suppression pour le sous-domaine en production
              if (!isLocalhost) {
                  const baseDomain = domain.split('.').slice(-2).join('.');
                  document.cookie = `${cookieName}=; Path=/; Domain=.${baseDomain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                  document.cookie = `${cookieName}=; Path=/; Domain=.${domain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
              }
              
              // Suppression spécifique pour localhost
              if (isLocalhost) {
                  document.cookie = `${cookieName}=; Path=/; Domain=localhost; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
                  document.cookie = `${cookieName}=; Path=/; Domain=127.0.0.1; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
              }
          });
          console.log('✅ Tous les cookies nettoyés');
      } catch (error) {
          console.warn('⚠️ Erreur nettoyage cookies:', error);
      }

      // 7. Nettoyer les timeouts et intervalles
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
      console.log('✅ Timeouts nettoyés');

      // 8. Appel API de déconnexion (si pas silent et token présent)
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
              console.log('✅ Déconnexion API réussie');
          } catch (error) {
              console.warn('⚠️ Erreur lors de la déconnexion API:', error);
          }
      }

      // 9. Nettoyer les données sensibles supplémentaires
      try {
          cleanupExpiredFormDrafts();
          
          // Nettoyer toutes les données de session
          sessionStorage.clear();
          
          console.log('✅ SessionStorage complètement nettoyé');
      } catch (error) {
          console.warn('⚠️ Erreur nettoyage sessionStorage:', error);
      }

      // 10. Forcer un re-render et redirection
      const finalRedirectPath = redirectPath || '/connexion';
      
      console.log(`🔄 Redirection après déconnexion vers: ${finalRedirectPath}`);
      
      setTimeout(() => {
          // Navigation avec remplacement
          navigate(finalRedirectPath, { 
              replace: true,
              state: {
                  from: 'logout',
                  timestamp: Date.now(),
                  cleared: true
              }
          });
          
          // Déclencher des événements de stockage pour synchroniser d'autres onglets
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('localStorage'));
          window.dispatchEvent(new Event('sessionStorage'));
          
          if (!silent) {
              toast.info('Vous avez été déconnecté avec succès');
          }
          
          // Forcer un rechargement complet si nécessaire
          setTimeout(() => {
              window.location.reload();
          }, 100);
      }, 150);

  }, [VITE_API_URL, token, navigate]);

  
const logoutAll = useCallback(async (): Promise<void> => {
    if (!token || !user?.isAdmin) {
        toast.error('❌ Droits administrateur requis');
        return;
    }

    setIsLoading(true);

    try {
        console.log('🛡️ Admin initie la déconnexion globale des non-admins...');
        
        const response = await fetch(`${VITE_API_URL}/api/auth/logout-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Déconnexion globale réussie:', result.message);
            
            // ✅ AFFICHER LES STATISTIQUES
            toast.success(
                <div>
                    <div>✅ {result.message}</div>
                    <div style={{ fontSize: '0.8em', marginTop: '5px' }}>
                        {result.stats?.usersLoggedOut || 0} utilisateurs déconnectés<br/>
                        🛡️ Admin préservé
                    </div>
                </div>,
                { autoClose: 5000 }
            );

            // ✅ RAFRAÎCHIR LA PAGE POUR METTRE À JOUR L'INTERFACE
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } else {
            throw new Error(result.message || 'Erreur inconnue');
        }

    } catch (error: any) {
        console.error('❌ Erreur déconnexion globale:', error);
        toast.error(`❌ ${error.message || 'Erreur lors de la déconnexion globale'}`);
    } finally {
        setIsLoading(false);
    }
}, [VITE_API_URL, token, user]);

  // ===== GESTION SESSIONSTORAGE SÉCURISÉ =====
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
      if (!validateSessionKey(key)) return;

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

      if (!skipContentValidation && !validateSessionData(data)) return;
      
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
      if (!validateSessionKey(key)) return null;
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

  // ===== GESTION RATE LIMITING =====
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

    const isAdmin = user.role === 'admin' || user.isAdmin === true;
    const isAdminPath = isAdmin && adminPaths.some(adminPath => path.startsWith(adminPath));
    const isAllowed = allowedPaths.includes(path) || isAdminPath;

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

  // ===== GESTION BROUILLONS DE FORMULAIRES =====
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

  // ===== FONCTIONS CORE AUTHENTIFICATION =====
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

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '30';
        throw new Error(`429: Too Many Requests - Retry after ${retryAfter} seconds`);
      }

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Données utilisateur invalides');
        }
        if (response.status === 401) {
          throw new Error('Token invalide ou expiré');
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const userData: User = await response.json();
      
      const userWithRole: User = {
        ...userData,
        isAdmin: userData.role === 'admin' || userData.isAdmin === true
      };
      
      setUser(userWithRole);
      
    } catch (err: any) {
      console.error('❌ Erreur récupération données utilisateur:', err);
      throw err;
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
        console.log('🔄 Tentative de rafraîchissement du token...');
        
        // ✅ STRATÉGIE COMPATIBLE BACKEND : Essayer multiple sources
        let refreshToken: string | null = null;
        
        // 1. Essayer depuis les cookies (méthode préférée)
        refreshToken = getCookie('refresh_token');
        
        // 2. Fallback : depuis le localStorage (déprécié)
        if (!refreshToken) {
          console.warn('⚠️ Aucun refresh token dans les cookies, fallback localStorage');
          refreshToken = localStorage.getItem('refresh_token');
        }

        if (!refreshToken) {
          console.warn('❌ Aucun refresh token disponible');
          logout('/', true);
          return false;
        }

        console.log('📨 Envoi requête refresh avec token:', refreshToken.substring(0, 10) + '...');
        
        // ✅ ENVOI DANS LE BODY (compatible avec votre backend)
        const response = await fetch(`${VITE_API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken })
        });

        console.log('📩 Réponse refresh:', response.status);

        if (!response.ok) {
          if (response.status === 401) {
            console.warn('❌ Refresh token invalide ou expiré');
            logout('/', true);
            return false;
          }
          throw new Error(`Erreur ${response.status}`);
        }

        const data = await response.json();
        
        // ✅ GESTION DÉCONNEXION GLOBALE
        if (data.loggedOut) {
          console.log('🔒 Session expirée - déconnexion');
          logout('/', true);
          return false;
        }

        if (!data.accessToken) {
          console.warn('❌ Pas de nouveau access token reçu');
          logout('/', true);
          return false;
        }

        try {
          const decoded = jwtDecode<JwtPayload>(data.accessToken);
          console.log('✅ Nouveau token reçu, expiration:', new Date(decoded.exp * 1000));
          
          // ✅ Stocker le nouveau token
          localStorage.setItem('token', data.accessToken);
          setToken(data.accessToken);
          
          // ✅ Mettre à jour les données utilisateur
          await fetchUserData(data.accessToken);
          setupTokenRefresh(decoded.exp);
          
          console.log('✅ Token rafraîchi avec succès');
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
  }, [VITE_API_URL, fetchUserData, setupTokenRefresh, logout, getCookie]);

  // ===== FONCTIONS AUTH PRINCIPALES =====
  const login = useCallback(async (email: string, password: string, attempt = 1): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Tentative de connexion pour:', email);
      
      // ✅ FORMAT COMPATIBLE AVEC LocalAuthGuard
      const loginData = {
        email: email,
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

      console.log('📩 Réponse login:', response.status, response.statusText);

      // Gestion du rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 
                        Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), MAX_RETRY_DELAY);
        
        if (attempt >= MAX_RETRY_ATTEMPTS) {
          throw new Error('Trop de tentatives de connexion. Veuillez réessayer plus tard.');
        }

        console.log(`⏳ Trop de requêtes. Nouvelle tentative dans ${retryAfter}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter.toString())));
        return login(email, password, attempt + 1);
      }

      if (!response.ok) {
        let errorMessage = 'Erreur de connexion';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // ✅ VALIDATION STRICTE DE LA RÉPONSE
      if (!data.accessToken || !data.user) {
        console.error('❌ Structure réponse invalide:', data);
        throw new Error('Réponse d\'authentification invalide');
      }

      console.log('✅ Connexion réussie pour:', data.user.email);
      
      // ✅ Stocker le token
      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);

      // ✅ Mettre à jour l'utilisateur
      const userWithRole: User = {
        ...data.user,
        isAdmin: data.user.role === 'admin' || data.user.isAdmin === true
      };
      setUser(userWithRole);

      // ✅ Configurer le rafraîchissement automatique
      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      setupTokenRefresh(decoded.exp);
      
      // ✅ Sauvegarder les métadonnées de session
      saveToSession(ALLOWED_SESSION_KEYS.SESSION_METADATA, {
        sessionStart: Date.now(),
        sessionId: crypto.randomUUID?.(),
        userAgent: navigator.userAgent.substring(0, 100),
        hasActiveSession: true,
        lastLogin: new Date().toISOString()
      });

      resetRateLimit();

      // ✅ Redirection
      const redirectPath = getRoleBasedRedirect(userWithRole);
      console.log(`🔄 Redirection vers: ${redirectPath}`);
      navigate(redirectPath, { replace: true });
      
    } catch (err: any) {
      const errorMessage = err.name === 'AbortError' 
        ? 'Timeout de connexion' 
        : err.message || 'Erreur de connexion';
      
      console.error('❌ Erreur connexion:', errorMessage);
      toast.error(errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, navigate, setupTokenRefresh, saveToSession, resetRateLimit, getRoleBasedRedirect]);

  // ===== FONCTIONS AUTH SECONDAIRES =====
  const register = useCallback(async (formData: RegisterFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validation des données
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (formData.password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Format d\'email invalide');
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

      // Gestion du rate limiting
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

      // ✅ Connexion automatique après inscription
      console.log('✅ Inscription réussie, tentative de connexion automatique...');
      
      try {
        await login(formData.email, formData.password);
        toast.success('Inscription réussie ! Bienvenue !');
      } catch (loginError) {
        console.warn('Connexion automatique échouée, redirection vers login:', loginError);
        toast.success('Inscription réussie ! Veuillez vous connecter.');
        navigate('/connexion');
      }
      
    } catch (err: any) {
      const errorMessage = err.message || "Erreur lors de l'inscription";
      console.error('❌ Erreur inscription:', err);
      toast.error(errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [VITE_API_URL, login, handleRateLimit, resetRateLimit, navigate]);

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

  // ===== GESTION UTILISATEUR =====
  const updateUserProfile = useCallback((updates: Partial<User>): void => {
    setUser(prev => {
      if (!prev) return prev;
      
      let hasChanges = false;
      const newUser = { ...prev };
      
      Object.keys(updates).forEach(key => {
        const userKey = key as keyof User;
        if (prev[userKey] !== updates[userKey]) {
          (newUser as any)[userKey] = updates[userKey];
          hasChanges = true;
        }
      });
      
      return hasChanges ? newUser : prev;
    });
  }, []);

  const fetchUserProfile = useCallback(async (): Promise<void> => {
    if (!token) {
      console.warn('❌ Aucun token pour fetchUserProfile');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

      const response = await fetch(`${VITE_API_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Token invalide lors du fetch profile');
          await logout('/', true);
          return;
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      
      setUser(prev => {
        if (!prev) return userData;
        const hasChanges = JSON.stringify(prev) !== JSON.stringify(userData);
        return hasChanges ? userData : prev;
      });
      
    } catch (err: any) {
      console.warn('Erreur récupération profil:', err.message);
      
      if (err.name === 'AbortError') {
        console.warn('Timeout récupération profil');
      }
    }
  }, [VITE_API_URL, token, logout]);

  // ===== INITIALISATION ET VÉRIFICATION AUTH =====
  const checkAuth = useCallback(async (): Promise<void> => {
    const savedToken = localStorage.getItem('token');
    
    if (!savedToken) {
      console.log('🔍 Aucun token trouvé en localStorage');
      setIsLoading(false);
      return;
    }
  
    try {
      const decoded = jwtDecode<JwtPayload>(savedToken);
      const isTokenExpired = decoded.exp * 1000 < Date.now();
      const timeUntilExpiry = decoded.exp * 1000 - Date.now();
  
      console.log(`🔍 Vérification token - Expire dans: ${Math.round(timeUntilExpiry / 1000)}s`);
  
      if (isTokenExpired) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshTokenFunction();
        if (!refreshed) {
          console.log('❌ Échec rafraîchissement, déconnexion...');
          await logout('/', true);
          return;
        }
      } else if (timeUntilExpiry < SECURITY_CONFIG.TOKEN_REFRESH_BUFFER) {
        console.log('🔄 Token bientôt expiré, rafraîchissement anticipé...');
        const refreshed = await refreshTokenFunction();
        if (!refreshed) {
          console.warn('⚠️ Rafraîchissement anticipé échoué');
          await fetchUserData(savedToken);
          setupTokenRefresh(decoded.exp);
        }
      } else {
        console.log('✅ Token valide, récupération données utilisateur...');
        try {
          await fetchUserData(savedToken);
          setupTokenRefresh(decoded.exp);
        } catch (fetchError: any) {
          if (fetchError.message?.includes('429')) {
            console.warn('⚠️ Rate limit détecté, pause de 30 secondes');
            await new Promise(resolve => setTimeout(resolve, 30000));
          } else {
            console.error('❌ Erreur récupération données:', fetchError);
            throw fetchError;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('⚠️ Rate limit, réessai plus tard');
        setIsLoading(false);
        return;
      }
      
      if (error instanceof Error && !error.message.includes('Timeout')) {
        console.log('🔒 Erreur critique, déconnexion...');
        await logout('/', true);
      } else {
        console.warn('⚠️ Erreur non critique, continuation sans auth');
        setIsLoading(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData, refreshTokenFunction, setupTokenRefresh, logout]);

  // ===== EFFETS =====
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
      }, 30 * 60 * 1000);
    }
    
    return () => {
      isMounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, [checkAuth, token]);

  // ===== VALEUR DU CONTEXTE =====
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
};

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ===== HOOKS PERSONNALISÉS =====
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