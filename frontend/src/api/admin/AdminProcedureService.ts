// AdminProcedureService.ts - VERSION FONCTIONNELLE OPTIMISÉE
import { useAuth } from '../../context/AuthContext';

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


private validateProcedureData(procedure: Procedure): void {
  if (!procedure._id) throw new Error('ID de procédure manquant');
  if (!procedure.steps || !Array.isArray(procedure.steps)) {
    throw new Error('Structure des étapes invalide');
  }
  
  // Vérifier que les noms d'étapes correspondent au backend
  procedure.steps.forEach(step => {
    if (!Object.values(StepName).includes(step.nom)) {
      console.warn(`⚠️ Nom d'étape non reconnu: "${step.nom}"`);
    }
  });
}

async fetchProcedures(page: number = 1, limit: number = 50): Promise<ProceduresResponse> {
  try {
    const url = `${this.VITE_API_URL}/api/admin/procedures/all?page=${page}&limit=${limit}`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'GET',
    });

    const data = await response.json();
    
    // ✅ VALIDATION DES DONNÉES REÇUES
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((procedure: Procedure) => {
        this.validateProcedureData(procedure);
      });
    }
    
    return data;
  } catch (error: any) {
    console.error('❌ Erreur chargement procédures:', error);
    throw error;
  }
}

private validateStepUpdate(
  procedure: Procedure, 
  stepName: StepName, 
  newStatus: StepStatus
): { canUpdate: boolean; reason?: string } { // ← TYPE DE RETOUR AJOUTÉ
  const steps = procedure.steps;
  
  const currentStep = steps.find(s => s.nom === stepName);
  if (!currentStep) {
    return { canUpdate: false, reason: 'Étape non trouvée' };
  }

  // ❌ Impossible de modifier une étape terminée/annulée/rejetée
  if ([StepStatus.COMPLETED, StepStatus.CANCELLED, StepStatus.REJECTED].includes(currentStep.statut) && 
      currentStep.statut !== newStatus) {
    return { 
      canUpdate: false, 
      reason: `Impossible de modifier une étape ${currentStep.statut.toLowerCase()}` 
    };
  }

  // ✅ VALIDATION STRICTE DE L'ORDRE DES ÉTAPES
  if (stepName === StepName.DEMANDE_VISA) {
    const admission = steps.find(s => s.nom === StepName.DEMANDE_ADMISSION);
    if (!admission || admission.statut !== StepStatus.COMPLETED) {
      return { 
        canUpdate: false, 
        reason: 'La demande d\'admission doit être terminée avant de modifier la demande de visa' 
      };
    }
  }
  
  if (stepName === StepName.PREPARATIF_VOYAGE) {
    const visa = steps.find(s => s.nom === StepName.DEMANDE_VISA);
    if (!visa || visa.statut !== StepStatus.COMPLETED) {
      return { 
        canUpdate: false, 
        reason: 'La demande de visa doit être terminée avant de modifier les préparatifs de voyage' 
      };
    }
  }

  return { canUpdate: true };
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


  async updateStepStatus(
  procedureId: string, 
  stepName: StepName, 
  newStatus: StepStatus, 
  raisonRefus?: string
): Promise<Procedure> {
  try {
    console.log('🔄 updateStepStatus DÉBUT', {
      procedureId,
      stepName,
      newStatus,
      raisonRefus: raisonRefus ? 'fournie' : 'non fournie'
    });

    // ✅ OPTIMISATION : Récupérer seulement cette procédure pour validation
    const procedure = await this.getProcedureById(procedureId);
    
    if (!procedure) {
      console.error('❌ Procédure non trouvée:', procedureId);
      throw new Error('Procédure non trouvée');
    }

    console.log('📋 Procédure récupérée:', {
      id: procedure._id,
      statutGlobal: procedure.statut,
      steps: procedure.steps.map(s => ({ nom: s.nom, statut: s.statut }))
    });

    // ✅ VALIDATION STRICTE AVANT MISE À JOUR
    const validation = this.validateStepUpdate(procedure, stepName, newStatus);
    console.log('✅ Validation étape:', validation);

    if (!validation.canUpdate) {
      throw new Error(validation.reason || 'Validation échouée');
    }

    // ✅ VALIDATION : Raison requise pour le rejet
    if (newStatus === StepStatus.REJECTED && !raisonRefus) {
      console.error('❌ Raison manquante pour rejet');
      throw new Error('La raison du refus est obligatoire');
    }

    const encodedStepName = encodeURIComponent(stepName);
    const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/steps/${encodedStepName}`;
    
    console.log('🌐 URL appel API:', url);
    
    const updateData: any = { 
      statut: newStatus 
    };
    
    if (raisonRefus) {
      updateData.raisonRefus = raisonRefus;
    }

    console.log('📦 Données envoyées:', updateData);

    const response = await this.makeAuthenticatedRequest(url, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    console.log('✅ Réponse API reçue, statut:', response.status);

    const updatedProcedure = await response.json();
    console.log('📋 Procédure mise à jour:', {
      id: updatedProcedure._id,
      statutGlobal: updatedProcedure.statut,
      steps: updatedProcedure.steps.map((s: { nom: any; statut: any; }) => ({ nom: s.nom, statut: s.statut }))
    });

    // ✅ GESTION AUTOMATIQUE DE L'ÉTAPE SUIVANTE
    console.log('🔍 Vérification activation étape suivante...');
    console.log('Condition:', {
      newStatus,
      shouldActivateNext: newStatus === StepStatus.COMPLETED
    });

    if (newStatus === StepStatus.COMPLETED) {
      console.log('🚀 Déclenchement activateNextStep...');
      await this.activateNextStep(procedureId, stepName, updatedProcedure);
    } else {
      console.log('⏸️  Aucune activation automatique (statut non COMPLETED)');
    }

    console.log('✅ updateStepStatus TERMINÉ avec succès');
    return updatedProcedure;

  } catch (error: any) {
    console.error('❌ ERREUR CRITIQUE updateStepStatus:', {
      procedureId,
      stepName, 
      newStatus,
      error: error.message,
      stack: error.stack
    });
    
    if (error instanceof Error && error.message.includes('Validation')) {
      throw error;
    }
    
    throw new Error(`Erreur lors de la mise à jour de l'étape: ${error.message}`);
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