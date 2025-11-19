// AdminProcedureApi.ts
import { useAuth } from '../../context/AuthContext';

export interface Step {
  nom: string;
  statut: 'En attente' | 'En cours' | 'Terminé' | 'Rejeté' | 'Annulé';
  raisonRefus?: string;
  dateMaj: string;
}

export interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  destination: string;
  niveauEtude?: string;
  filiere?: string;
  statut: 'En cours' | 'Terminée' | 'Refusée' | 'Annulée';
  steps: Step[];
  rendezVousId?: any;
  createdAt: string;
  isDeleted: boolean;
  raisonRejet?: string;
}

export interface ProceduresResponse {
  data: Procedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class AdminProcedureApiService {
  private VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  constructor(private getToken: () => string | null, private refreshToken: () => Promise<boolean>) {}

  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    let token = this.getToken();
    
    if (!token) {
      throw new Error('Aucun token disponible');
    }

    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (response.status === 401) {
      // Token expiré, tentative de rafraîchissement
      const refreshed = await this.refreshToken();
      if (refreshed) {
        token = this.getToken();
        // Réessayer la requête avec le nouveau token
        return fetch(url, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          ...options,
        });
      } else {
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }
    }

    return response;
  }

  async fetchProcedures(page: number = 1, limit: number = 50): Promise<ProceduresResponse> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/all?page=${page}&limit=${limit}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur chargement procédures:', error);
      throw error;
    }
  }

  async updateProcedureStatus(procedureId: string, newStatus: Procedure['statut']): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ statut: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur mise à jour procédure:', error);
      throw error;
    }
  }

  async updateStepStatus(
    procedureId: string, 
    stepName: string, 
    newStatus: Step['statut'], 
    raisonRefus?: string
  ): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/steps/${encodeURIComponent(stepName)}`;
      
      const updateData: any = { statut: newStatus };
      if (raisonRefus) {
        updateData.raisonRefus = raisonRefus;
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'étape');
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur mise à jour étape:', error);
      throw error;
    }
  }

  async deleteProcedure(procedureId: string, reason?: string): Promise<void> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason || 'Supprimé par l\'administrateur' }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    }
  }

  async rejectProcedure(procedureId: string, reason: string): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/reject`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du rejet');
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur rejet:', error);
      throw error;
    }
  }
}

// Hook personnalisé pour utiliser le service API
export const useAdminProcedureApi = () => {
  const { token, refreshToken } = useAuth();

  const getToken = () => token;

  const apiService = new AdminProcedureApiService(getToken, refreshToken);

  return {
    fetchProcedures: apiService.fetchProcedures.bind(apiService),
    updateProcedureStatus: apiService.updateProcedureStatus.bind(apiService),
    updateStepStatus: apiService.updateStepStatus.bind(apiService),
    deleteProcedure: apiService.deleteProcedure.bind(apiService),
    rejectProcedure: apiService.rejectProcedure.bind(apiService),
  };
};

export default AdminProcedureApiService;