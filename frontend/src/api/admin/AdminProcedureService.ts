// AdminProcedureApi.ts - VERSION FINALE CORRIGÉE
import { useAuth } from '../../context/AuthContext';

// ✅ Enums avec espaces comme dans la base de données
export enum StepStatus {
  PENDING = 'En attente',
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminé',
  REJECTED = 'Rejeté',
  CANCELLED = 'Annulé'
}

export enum ProcedureStatus {
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Refusée',
  CANCELLED = 'Annulée'
}

export enum StepName {
  DEMANDE_ADMISSION = 'DEMANDE ADMISSION', // ✅ AVEC espaces
  DEMANDE_VISA = 'DEMANDE VISA',           // ✅ AVEC espaces
  PREPARATIF_VOYAGE = 'PREPARATIF VOYAGE'  // ✅ AVEC espaces
}

export interface Step {
  nom: StepName;
  statut: StepStatus;
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
  statut: ProcedureStatus;
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

  const baseOptions: RequestInit = {
    credentials: 'include' as RequestCredentials,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(url, {
      ...baseOptions,
      ...options,
    });

    // ✅ Gestion améliorée des erreurs 400
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Requête invalide - Vérifiez les données envoyées');
    }

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        token = this.getToken();
        const retryResponse = await fetch(url, {
          ...baseOptions,
          ...options,
          headers: {
            ...baseOptions.headers,
            'Authorization': `Bearer ${token}`,
          },
        });
        return retryResponse;
      } else {
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur ${response.status} - ${options.method} ${url}`);
      throw new Error(`Erreur ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error: any) {
    console.error('❌ Erreur réseau:', error.message);
    throw error;
  }
}

  async fetchProcedures(page: number = 1, limit: number = 50): Promise<ProceduresResponse> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/all?page=${page}&limit=${limit}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur chargement procédures');
      throw error;
    }
  }

  async updateProcedureStatus(procedureId: string, newStatus: ProcedureStatus): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ statut: newStatus }),
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur mise à jour procédure');
      throw error;
    }
  }

// CORRECTION DE LA MÉTHODE updateStepStatus
async updateStepStatus(
  procedureId: string, 
  stepName: StepName, 
  newStatus: StepStatus, 
  raisonRefus?: string
): Promise<Procedure> {
  try {
    // ✅ ENCODAGE CORRECT
    const encodedStepName = encodeURIComponent(stepName);
    const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/steps/${encodedStepName}`;
    
    // ✅ CONSTRUCTION DES DONNÉES
    const updateData: any = { 
      statut: newStatus
    };
    
    if (raisonRefus) {
      updateData.raisonRefus = raisonRefus;
    }

    console.log('📤 Mise à jour étape - URL:', url);
    console.log('📤 Données envoyées:', JSON.stringify(updateData, null, 2));
    console.log('📤 Étape originale:', stepName);
    console.log('📤 Étape encodée:', encodedStepName);

    const response = await this.makeAuthenticatedRequest(url, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    console.log('✅ Étape mise à jour avec succès:', data);
    return data;
  } catch (error: any) {
    console.error('❌ Erreur détaillée mise à jour étape:', {
      procedureId,
      stepName,
      newStatus,
      raisonRefus,
      error: error.message
    });
    throw error;
  }
}
  async deleteProcedure(procedureId: string, reason?: string): Promise<void> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      
      console.log('🗑️  Suppression procédure');
      
      await this.makeAuthenticatedRequest(url, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason || 'Supprimé par l\'administrateur' }),
      });
    } catch (error: any) {
      console.error('❌ Erreur suppression');
      throw error;
    }
  }

  async rejectProcedure(procedureId: string, reason: string): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/reject`;
      
      console.log('❌ Rejet procédure');
      
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur rejet');
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