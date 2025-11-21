// AdminContactService.ts
import { toast } from 'react-toastify';

export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'READ' | 'REPLIED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  total: number;
  pending: number;
  read: number;
  replied: number;
  archived: number;
}

class RateLimitManager {
  private requests: Map<string, number> = new Map();
  private readonly MAX_REQUESTS = 10;
  private readonly TIME_WINDOW = 60000; // 1 minute

  canMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const key = `${endpoint}_${Math.floor(now / this.TIME_WINDOW)}`;
    
    const currentCount = this.requests.get(key) || 0;
    
    if (currentCount >= this.MAX_REQUESTS) {
      return false;
    }
    
    this.requests.set(key, currentCount + 1);
    
    // Nettoyage des anciennes entrées
    setTimeout(() => {
      this.requests.delete(key);
    }, this.TIME_WINDOW * 2);
    
    return true;
  }

  getRetryAfter(): number {
    return this.TIME_WINDOW;
  }
}

export class AdminContactService {
  private token: string | null = null;
  private baseURL: string;
  private rateLimitManager: RateLimitManager;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    this.rateLimitManager = new RateLimitManager();
    this.initializeToken();
  }

  private initializeToken(): void {
    try {
      this.token = localStorage.getItem('token');
    } catch (error) {
      console.error('❌ Erreur accès localStorage:', error);
    }
  }

  private async makeRequestWithRetry(
    endpoint: string, 
    options: RequestInit = {},
    retryCount = 0
  ): Promise<Response> {
    const maxRetries = 3;
    
    if (!this.rateLimitManager.canMakeRequest(endpoint)) {
      const retryAfter = this.rateLimitManager.getRetryAfter();
      console.warn(`⏳ Rate limit atteint pour ${endpoint}, attente de ${retryAfter}ms`);
      
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return this.makeRequestWithRetry(endpoint, options, retryCount + 1);
      } else {
        throw new Error('Trop de tentatives, veuillez réessayer plus tard');
      }
    }

    if (!this.token) {
      throw new Error('Token non disponible');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include' as RequestCredentials
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);

      // Gestion du rate limiting serveur
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '30';
        console.warn(`⏳ Rate limiting serveur, retry after ${retryAfter}s`);
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
          return this.makeRequestWithRetry(endpoint, options, retryCount + 1);
        }
      }

      // Gestion token expiré
      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await this.refreshToken();
        if (refreshed && this.token) {
          requestOptions.headers = {
            ...requestOptions.headers,
            'Authorization': `Bearer ${this.token}`
          };
          return this.makeRequestWithRetry(endpoint, requestOptions, retryCount + 1);
        } else {
          throw new Error('Session expirée - Veuillez vous reconnecter');
        }
      }

      return response;

    } catch (error) {
      console.error(`❌ Erreur requête ${endpoint}:`, error);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`🔄 Nouvelle tentative dans ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(endpoint, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });

      if (!response.ok) return false;

      const data = await response.json();
      
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        this.token = data.accessToken;
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur rafraîchissement token:', error);
      return false;
    }
  }

  private getRefreshToken(): string | null {
    try {
      // Essayer les cookies d'abord
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('refresh_token='))
        ?.split('=')[1];
      
      if (cookieValue) return cookieValue;

      // Fallback localStorage
      return localStorage.getItem('refresh_token');
    } catch (error) {
      console.error('❌ Erreur récupération refresh token:', error);
      return null;
    }
  }

  // Méthodes pour les contacts
  async getAllContacts(page = 1, limit = 20): Promise<{ contacts: Contact[]; total: number }> {
    try {
      const response = await this.makeRequestWithRetry(`/api/contact?page=${page}&limit=${limit}`);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Vous n\'avez pas les permissions nécessaires');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Erreur ${response.status} lors de la récupération des contacts`
        );
      }

      const data = await response.json();
      return {
        contacts: data.contacts || data.data || [],
        total: data.total || data.count || 0
      };

    } catch (error) {
      console.error('❌ Erreur getAllContacts:', error);
      throw error;
    }
  }

  async getContactStats(): Promise<ContactStats> {
    try {
      const response = await this.makeRequestWithRetry('/api/contact/stats');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors de la récupération des statistiques'
        );
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Erreur getContactStats:', error);
      throw error;
    }
  }

  async updateContactStatus(contactId: string, status: Contact['status']): Promise<Contact> {
    try {
      const response = await this.makeRequestWithRetry(`/api/contact/${contactId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contact non trouvé');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors de la mise à jour du statut'
        );
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Erreur updateContactStatus:', error);
      throw error;
    }
  }

  async deleteContact(contactId: string): Promise<void> {
    try {
      const response = await this.makeRequestWithRetry(`/api/contact/${contactId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contact non trouvé');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors de la suppression'
        );
      }

    } catch (error) {
      console.error('❌ Erreur deleteContact:', error);
      throw error;
    }
  }

  // Méthodes utilitaires
  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
    try {
      localStorage.removeItem('token');
    } catch (error) {
      console.error('❌ Erreur suppression token localStorage:', error);
    }
  }
}

export const useAdminContactService = () => {
  return new AdminContactService();
};

export default AdminContactService;