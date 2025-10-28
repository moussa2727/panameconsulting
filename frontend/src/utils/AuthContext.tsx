import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: (redirectPath?: string) => void;
  register: (data: RegisterFormData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
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
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  message?: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem('refreshToken'));
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true); // Initialisé à true

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const savedToken = localStorage.getItem('token');
        
        if (savedToken) {
          const decoded = jwtDecode<JwtPayload>(savedToken);
          
          // Vérifier si le token est expiré
          if (decoded.exp * 1000 < Date.now()) {
            await refreshTokenFunction();
          } else {
            await fetchUserData(savedToken);
          }
        } else {
          // Pas de token, on passe directement à l'état non connecté
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        // En cas d'erreur, on considère l'utilisateur comme non connecté
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

   const setupTokenRefresh = (exp: number) => {
    const refreshTime = (exp * 1000 - Date.now()) - 5 * 60 * 1000;
    if (refreshTime > 0) {
      const timeout = setTimeout(() => {
        refreshTokenFunction();
      }, refreshTime);
      return () => clearTimeout(timeout);
    }
  };

  const checkAdminAccess = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' && user.isActive;
  };

  
    const fetchUserData = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${VITE_API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include' // ← AJOUTÉ
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          // On tente de refresh, puis on rappelle fetchUserData avec le nouveau token
          await refreshTokenFunction();
          const newToken = localStorage.getItem('token');
          if (newToken) {
            await fetchUserData(newToken);
          }
          return;
        }
        throw new Error('Erreur de récupération du profil');
      }
  
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

 const refreshTokenFunction = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // ← IMPORTANT: Le refreshToken est automatiquement envoyé via les cookies
      });

      if (!response.ok) {
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }

      const data: RefreshResponse = await response.json();
      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);

      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      setupTokenRefresh(decoded.exp);

      await fetchUserData(data.accessToken);
    } catch (err) {
      handleAuthError(err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // ← IMPORTANT: Pour recevoir les cookies
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        let msg = 'Erreur de connexion';
        if (response.status === 401) msg = 'Email ou mot de passe incorrect';
        if (response.status === 429) msg = 'Trop de tentatives, réessayez plus tard';
        if (response.status >= 500) msg = 'Serveur indisponible, réessayez plus tard';
        throw new Error(data.message || msg);
      }

      // Stockez seulement l'accessToken dans localStorage
      localStorage.setItem('token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);

      // Le refreshToken est automatiquement stocké dans les cookies HTTP-only
      // Pas besoin de le gérer manuellement côté frontend

      const decoded = jwtDecode<JwtPayload>(data.accessToken);
      setupTokenRefresh(decoded.exp);

      // Redirection selon le rôle
      navigate(data.user.role === 'admin'
        ? '/gestionnaire/statistiques'
        : '/'
      );
    } catch (err) {
      handleAuthError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          telephone: formData.phone,
          password: formData.password,
        }),
        credentials: 'include' // ← AJOUTÉ
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.errors 
          ? Object.values(data.errors).join(', ') 
          : data.message || "Erreur lors de l'inscription";
        throw new Error(errorMsg);
      }

      // Auto-login après inscription
      await login(formData.email, formData.password);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l'envoi de l'email");
      }

      toast.success(`Un email de réinitialisation a été envoyé à ${email}`);
      navigate('/connexion');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la réinitialisation');
      }

      toast.success('Mot de passe réinitialisé avec succès');
      navigate('/connexion');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (redirectPath: string = '/') => {
    // Tentative de logout côté serveur (mais ne pas bloquer si ça échoue)
    if (token) {
      fetch(`${VITE_API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${token}`,
        },
        credentials: 'include' // ← AJOUTÉ
      }).catch(console.error);
    }

    // Nettoyage côté client
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    navigate(redirectPath);
  };

  const handleAuthError = (error: any) => {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Une erreur est survenue';
    
    setError(errorMessage);
    toast.error(errorMessage);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    refreshToken: refreshTokenFunction,
  };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};