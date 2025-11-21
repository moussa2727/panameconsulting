// AdminProcedureService.ts - VERSION FONCTIONNELLE OPTIMISÉE
import { useAuth } from '../../context/AuthContext';

// ✅ Enums alignés avec le backend
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
  DEMANDE_ADMISSION = 'DEMANDE ADMISSION', 
  DEMANDE_VISA = 'DEMANDE VISA',           
  PREPARATIF_VOYAGE = 'PREPARATIF VOYAGE'  
}

export interface Step {
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateMaj: string;
  dateCreation: string; 
  dateCompletion?: string; 
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
  updatedAt?: string;
  isDeleted: boolean;
  raisonRejet?: string;
  dateDerniereModification?: string;
  dateCompletion?: string;
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
      throw new Error('Session expirée - Veuillez vous reconnecter');
    }

    const makeRequest = async (currentToken: string): Promise<Response> => {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      });
      return response;
    };

    let response = await makeRequest(token);

    // Gestion du refresh token
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = this.getToken();
        if (newToken) {
          response = await makeRequest(newToken);
        } else {
          throw new Error('Session expirée');
        }
      } else {
        throw new Error('Session expirée');
      }
    }

    if (!response.ok) {
      let errorMessage = `Erreur ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response;
  }

  // ✅ CHARGEMENT DES PROCÉDURES
  async fetchProcedures(page: number = 1, limit: number = 50): Promise<ProceduresResponse> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/all?page=${page}&limit=${limit}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('❌ Erreur chargement procédures:', error);
      throw error;
    }
  }

  // ✅ VALIDATION DES RÈGLES MÉTIER
  private validateStepUpdate(procedure: Procedure, stepName: StepName, newStatus: StepStatus): void {
    const steps = procedure.steps;
    
    const currentStep = steps.find(s => s.nom === stepName);
    if (!currentStep) throw new Error('Étape non trouvée');

    // ❌ Impossible de modifier une étape terminée/annulée/rejetée
    if ([StepStatus.COMPLETED, StepStatus.CANCELLED, StepStatus.REJECTED].includes(currentStep.statut) && 
        currentStep.statut !== newStatus) {
      throw new Error(`Impossible de modifier une étape ${currentStep.statut.toLowerCase()}`);
    }

    // ✅ VALIDATION STRICTE DE L'ORDRE DES ÉTAPES
    if (stepName === StepName.DEMANDE_VISA) {
      const admission = steps.find(s => s.nom === StepName.DEMANDE_ADMISSION);
      if (!admission || admission.statut !== StepStatus.COMPLETED) {
        throw new Error('La demande d\'admission doit être terminée avant de modifier la demande de visa');
      }
    }
    
    if (stepName === StepName.PREPARATIF_VOYAGE) {
      const visa = steps.find(s => s.nom === StepName.DEMANDE_VISA);
      if (!visa || visa.statut !== StepStatus.COMPLETED) {
        throw new Error('La demande de visa doit être terminée avant de modifier les préparatifs de voyage');
      }
    }
  }

  // ✅ MISE À JOUR DU STATUT DE LA PROCÉDURE
  async updateProcedureStatus(procedureId: string, newStatus: ProcedureStatus): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ statut: newStatus }),
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur mise à jour procédure:', error);
      throw error;
    }
  }

  // ✅ MISE À JOUR D'ÉTAPE OPTIMISÉE
  async updateStepStatus(
    procedureId: string, 
    stepName: StepName, 
    newStatus: StepStatus, 
    raisonRefus?: string
  ): Promise<Procedure> {
    try {
      // ✅ OPTIMISATION : Récupérer seulement cette procédure pour validation
      const procedure = await this.getProcedureById(procedureId);
      
      if (!procedure) {
        throw new Error('Procédure non trouvée');
      }

      // ✅ VALIDATION STRICTE AVANT MISE À JOUR
      this.validateStepUpdate(procedure, stepName, newStatus);

      // ✅ VALIDATION : Raison requise pour le rejet
      if (newStatus === StepStatus.REJECTED && !raisonRefus) {
        throw new Error('La raison du refus est obligatoire');
      }

      const encodedStepName = encodeURIComponent(stepName);
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/steps/${encodedStepName}`;
      
      const updateData: any = { 
        statut: newStatus 
      };
      
      if (raisonRefus) {
        updateData.raisonRefus = raisonRefus;
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const updatedProcedure = await response.json();

      // ✅ GESTION AUTOMATIQUE DE L'ÉTAPE SUIVANTE
      if (newStatus === StepStatus.COMPLETED) {
        await this.activateNextStep(procedureId, stepName, updatedProcedure);
      }

      return updatedProcedure;
    } catch (error: any) {
      console.error('❌ Erreur mise à jour étape:', error);
      throw error;
    }
  }

  // ✅ RÉCUPÉRATION D'UNE PROCÉDURE SPÉCIFIQUE
  private async getProcedureById(procedureId: string): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur récupération procédure:', error);
      throw error;
    }
  }

  // ✅ ACTIVATION AUTOMATIQUE DE L'ÉTAPE SUIVANTE
  private async activateNextStep(procedureId: string, completedStepName: StepName, procedure: Procedure): Promise<void> {
    try {
      const stepOrder = [StepName.DEMANDE_ADMISSION, StepName.DEMANDE_VISA, StepName.PREPARATIF_VOYAGE];
      const currentIndex = stepOrder.indexOf(completedStepName);
      
      if (currentIndex < stepOrder.length - 1) {
        const nextStepName = stepOrder[currentIndex + 1];
        const nextStep = procedure.steps.find(s => s.nom === nextStepName);
        
        if (nextStep && nextStep.statut === StepStatus.PENDING) {
          console.log(`🔄 Activation automatique de: ${nextStepName}`);
          await this.updateStepStatus(procedureId, nextStepName, StepStatus.IN_PROGRESS);
        }
      }
    } catch (error) {
      console.warn('⚠️ Impossible d\'activer l\'étape suivante:', error);
    }
  }

  // ✅ SUPPRESSION DE PROCÉDURE
  async deleteProcedure(procedureId: string, reason?: string): Promise<void> {
    try {
      // Annuler les étapes non terminées avant suppression
      const procedure = await this.getProcedureById(procedureId);
      
      if (procedure) {
        for (const step of procedure.steps) {
          if (step.statut !== StepStatus.COMPLETED && step.statut !== StepStatus.CANCELLED) {
            try {
              await this.updateStepStatus(procedureId, step.nom, StepStatus.CANCELLED, 'Procédure supprimée');
            } catch (stepError) {
              console.warn(`⚠️ Impossible d'annuler l'étape ${step.nom}:`, stepError);
            }
          }
        }
      }

      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      
      await this.makeAuthenticatedRequest(url, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason || 'Supprimé par l\'administrateur' }),
      });
    } catch (error: any) {
      console.error('❌ Erreur suppression procédure:', error);
      throw error;
    }
  }

  // ✅ REJET DE PROCÉDURE
  async rejectProcedure(procedureId: string, reason: string): Promise<Procedure> {
    try {
      if (!reason.trim()) {
        throw new Error('La raison du rejet est obligatoire');
      }

      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/reject`;
      
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur rejet procédure:', error);
      throw error;
    }
  }
}

// ✅ HOOK PERSONNALISÉ
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