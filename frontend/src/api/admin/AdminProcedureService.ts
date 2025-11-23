// AdminProcedureService.ts - VERSION SÉCURISÉE ET CORRIGÉE
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

  // ✅ MASQUAGE DES IDS SENSIBLES DANS LES LOGS
  private maskId(id: string): string {
    if (!id || id.length < 8) return '***';
    return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
  }

  private maskEmail(email: string): string {
    if (!email) return '***';
    const [name, domain] = email.split('@');
    if (!name || !domain) return '***';
    
    const maskedName = name.length > 2 
      ? name.substring(0, 2) + '*'.repeat(Math.max(name.length - 2, 1))
      : '*'.repeat(name.length);
      
    return `${maskedName}@${domain}`;
  }

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

  // ✅ RÉCUPÉRATION PROCÉDURE SANS LOGS SENSIBLES
  async getProcedureById(procedureId: string): Promise<Procedure> {
    try {
      if (!procedureId || procedureId.trim() === '') {
        throw new Error('ID de procédure invalide');
      }

      const url = `${this.VITE_API_URL}/api/procedures/${procedureId}`;
      
      console.log('🔍 Récupération procédure:', this.maskId(procedureId));

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      const procedure = await response.json();
      
      if (!procedure || !procedure._id) {
        throw new Error('Procédure non trouvée');
      }
      
      console.log('✅ Procédure récupérée:', this.maskId(procedure._id));
      return procedure;
      
    } catch (error: any) {
      console.error('❌ Erreur récupération procédure:', this.maskId(procedureId));
      throw new Error(`Impossible de récupérer la procédure: ${error.message}`);
    }
  }

  // ✅ RÉCUPÉRATION DES PROCÉDURES - VERSION SÉCURISÉE
  async fetchProcedures(
    page: number = 1, 
    limit: number = 50, 
    email?: string,
    destination?: string,
    statut?: ProcedureStatus
  ): Promise<ProceduresResponse> {
    try {
      console.log('📋 Chargement procédures - Page:', page, 'Limit:', limit);

      if (page < 1) throw new Error('Le numéro de page doit être supérieur à 0');
      if (limit < 1 || limit > 100) throw new Error('La limite doit être entre 1 et 100');

      let url = `${this.VITE_API_URL}/api/admin/procedures/all?page=${page}&limit=${limit}`;
      
      if (email && email.trim()) {
        url += `&email=${encodeURIComponent(email.toLowerCase().trim())}`;
      }
      
      if (destination && destination.trim()) {
        url += `&destination=${encodeURIComponent(destination.trim())}`;
      }
      
      if (statut) {
        url += `&statut=${encodeURIComponent(statut)}`;
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      const data: ProceduresResponse = await response.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Réponse invalide du serveur');
      }

      if (!Array.isArray(data.data)) {
        console.warn('⚠️ Structure de données inattendue');
        data.data = [];
      }

      // Validation sans logs sensibles
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((procedure: Procedure) => {
          try {
            this.validateProcedureData(procedure);
          } catch (validationError) {
            console.error('❌ Procédure invalide:', this.maskId(procedure._id));
          }
        });
      }

      console.log('✅ Chargement réussi - Total:', data.total, 'Pages:', data.totalPages);

      return data;

    } catch (error: any) {
      console.error('❌ Erreur chargement procédures');
      
      if (error.message.includes('Session expirée') || error.message.includes('non authentifié')) {
        throw error;
      }

      const errorResponse: ProceduresResponse = {
        data: [],
        total: 0,
        page: page,
        limit: limit,
        totalPages: 0
      };

      return errorResponse;
    }
  }

  // ✅ VALIDATION STRICTE IDENTIQUE AU BACKEND
  private validateStepUpdate(
    procedure: Procedure, 
    stepName: StepName, 
    newStatus: StepStatus
  ): { canUpdate: boolean; reason?: string } {
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

   async updateStepStatus(
    procedureId: string, 
    stepName: StepName, 
    newStatus: StepStatus, 
    raisonRefus?: string
  ): Promise<Procedure> {
    try {
      console.log('🔄 Mise à jour étape - Procédure:', this.maskId(procedureId), 'Étape:', stepName);

      // ✅ VALIDATION DES DONNÉES D'ENTRÉE
      if (!procedureId || !stepName || !newStatus) {
        throw new Error('Données manquantes pour la mise à jour');
      }

      // ✅ CORRECTION : Construction MINIMALE des données pour le backend
      const updateData: any = { 
        statut: newStatus 
      };
      
      // ✅ CORRECTION : Ajouter raisonRefus seulement si fournie et non vide
      if (raisonRefus && raisonRefus.trim() !== '') {
        updateData.raisonRefus = raisonRefus.trim();
      }

      console.log('📦 Données envoyées:', { 
        statut: newStatus,
        raisonRefus: raisonRefus ? 'présente' : 'absente'
      });

      // ✅ CORRECTION : Encodage robuste du nom d'étape
      const encodedStepName = encodeURIComponent(stepName);
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}/steps/${encodedStepName}`;

      console.log('🌐 URL appel API:', `${this.VITE_API_URL}/api/admin/procedures/${this.maskId(procedureId)}/steps/${stepName}`);

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      // ✅ CORRECTION : Vérification détaillée de la réponse
      if (!response.ok) {
        let errorDetail = `Erreur ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || errorData.error || errorDetail;
          console.error('❌ Détails erreur backend:', errorDetail);
        } catch (parseError) {
          errorDetail = await response.text() || errorDetail;
        }
        throw new Error(`Erreur serveur: ${errorDetail}`);
      }

      const updatedProcedure = await response.json();
      
      if (!updatedProcedure || !updatedProcedure._id) {
        throw new Error('Réponse invalide du serveur');
      }

      console.log('✅ Mise à jour réussie - Étape:', stepName);
      
      return updatedProcedure;

    } catch (error: any) {
      console.error('❌ Erreur mise à jour étape');
      
      // ✅ CORRECTION : Message d'erreur plus informatif
      let errorMessage = error.message;
      
      if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        errorMessage = 'Erreur interne du serveur. Veuillez réessayer.';
      } else if (error.message.includes('Validation')) {
        errorMessage = 'Erreur de validation des données.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // ✅ VALIDATION DES DONNÉES PROCÉDURE
  private validateProcedureData(procedure: Procedure): void {
    if (!procedure._id) {
      throw new Error('ID de procédure manquant');
    }
    
    if (!procedure.prenom || !procedure.nom || !procedure.email) {
      throw new Error('Informations utilisateur manquantes');
    }
    
    if (!procedure.destination) {
      throw new Error('Destination manquante');
    }
    
    if (!procedure.statut) {
      throw new Error('Statut de procédure manquant');
    }
    
    if (!procedure.steps || !Array.isArray(procedure.steps)) {
      throw new Error('Structure des étapes invalide');
    }
    
    // Validation de chaque étape
    procedure.steps.forEach((step: Step, index: number) => {
      if (!step.nom || !step.statut) {
        throw new Error(`Étape ${index} incomplète`);
      }
      
      if (!Object.values(StepName).includes(step.nom)) {
        throw new Error(`Nom d'étape invalide`);
      }
      
      if (!Object.values(StepStatus).includes(step.statut)) {
        throw new Error(`Statut d'étape invalide`);
      }
    });
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
      console.error('❌ Erreur mise à jour procédure:', this.maskId(procedureId));
      throw error;
    }
  }

  // ✅ SUPPRESSION DE PROCÉDURE
  async deleteProcedure(procedureId: string, reason?: string): Promise<void> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/${procedureId}`;
      
      await this.makeAuthenticatedRequest(url, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason || 'Supprimé par l\'administrateur' }),
      });
    } catch (error: any) {
      console.error('❌ Erreur suppression procédure:', this.maskId(procedureId));
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
      console.error('❌ Erreur rejet procédure:', this.maskId(procedureId));
      throw error;
    }
  }

  // ✅ RÉCUPÉRATION DES STATISTIQUES
  async getProceduresOverview(): Promise<any> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/stats`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur récupération statistiques');
      throw error;
    }
  }

  // ✅ CRÉATION DE PROCÉDURE DEPUIS RENDEZ-VOUS
  async createProcedureFromRendezvous(rendezVousId: string): Promise<Procedure> {
    try {
      const url = `${this.VITE_API_URL}/api/admin/procedures/create`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'POST',
        body: JSON.stringify({ rendezVousId }),
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur création procédure');
      throw error;
    }
  }

  // ✅ PROCÉDURES UTILISATEUR
  async getUserProcedures(email: string, page: number = 1, limit: number = 10): Promise<ProceduresResponse> {
    try {
      const url = `${this.VITE_API_URL}/api/procedures/user?page=${page}&limit=${limit}`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      return await response.json();
    } catch (error: any) {
      console.error('❌ Erreur récupération procédures utilisateur');
      throw error;
    }
  }
}

// ✅ HOOK PERSONNALISÉ SÉCURISÉ
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
    getProceduresOverview: apiService.getProceduresOverview.bind(apiService),
    createProcedureFromRendezvous: apiService.createProcedureFromRendezvous.bind(apiService),
    getUserProcedures: apiService.getUserProcedures.bind(apiService),
    getProcedureById: apiService.getProcedureById.bind(apiService),
  };
};

export default AdminProcedureApiService;