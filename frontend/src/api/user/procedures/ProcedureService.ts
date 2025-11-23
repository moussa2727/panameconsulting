// ProcedureService.ts - VERSION CORRIGÉE POUR ERREUR 401
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

// ==================== TYPES ====================

export enum ProcedureStatus {
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Rejetée',
  CANCELLED = 'Annulée'
}

export enum StepStatus {
  PENDING = 'En attente',
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  REJECTED = 'Rejetée',
  CANCELLED = 'Annulée'
}

export enum StepName {
  DEMANDE_ADMISSION = 'Demande d\'admission',
  DEMANDE_VISA = 'Demande de visa',
  PREPARATIF_VOYAGE = 'Préparatifs de voyage'
}

export interface ProcedureStep {
  nom: StepName;
  statut: StepStatus;
  dateCreation: Date;
  dateMaj: Date;
  raisonRefus?: string;
  commentaires?: string;
}

export interface RendezvousInfo {
  _id: string;
  firstName: string;
  lastName: string;
  date: Date;
  time: string;
  status: string;
  avisAdmin?: string;
}

export interface Procedure {
  _id: string;
  rendezVousId: RendezvousInfo | string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  destination: string;
  niveauEtude: string;
  filiere: string;
  statut: ProcedureStatus;
  steps: ProcedureStep[];
  raisonRejet?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletionReason?: string;
  dateCompletion?: Date;
  dateDerniereModification?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedProcedures {
  data: Procedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CancelProcedureDto {
  reason?: string;
}

// ==================== SERVICE API ====================

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_TIMEOUT = 15000;

class ProcedureApiService {
  
  /**
   * ✅ Récupérer les procédures de l'utilisateur connecté
   */
  static async fetchUserProcedures(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedProcedures> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/procedures/user?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // ✅ CORRECTION: Créer une erreur avec le statut pour mieux la traiter
        const error = new Error(`HTTP ${response.status}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        
        if (response.status === 401) {
          (error as any).isSessionExpired = true;
        }
        
        throw error;
      }

      const data: PaginatedProcedures = await response.json();
      return data;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Délai de connexion dépassé');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * ✅ Récupérer les détails d'une procédure spécifique
   */
  static async fetchProcedureDetails(
    procedureId: string
  ): Promise<Procedure> {
    if (!procedureId) {
      throw new Error('ID de procédure manquant');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/procedures/${procedureId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // ✅ CORRECTION: Créer une erreur avec le statut pour mieux la traiter
        const error = new Error(`HTTP ${response.status}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        
        if (response.status === 401) {
          (error as any).isSessionExpired = true;
        }
        
        throw error;
      }

      const data: Procedure = await response.json();
      return data;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Délai de connexion dépassé');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * ✅ Annuler une procédure (User seulement)
   */
  static async cancelProcedure(
    procedureId: string,
    reason?: string
  ): Promise<Procedure> {
    if (!procedureId) {
      throw new Error('ID de procédure manquant');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/procedures/${procedureId}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ reason } as CancelProcedureDto),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // ✅ CORRECTION: Créer une erreur avec le statut pour mieux la traiter
        const error = new Error(`HTTP ${response.status}`);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        
        if (response.status === 401) {
          (error as any).isSessionExpired = true;
        }
        
        throw error;
      }

      const data: Procedure = await response.json();
      return data;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Délai de connexion dépassé');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ==================== CUSTOM HOOKS USER SEULEMENT ====================

/**
 * ✅ Hook pour récupérer les procédures de l'utilisateur avec pagination
 */
export const useUserProcedures = (page: number = 1, limit: number = 10) => {
  const [procedures, setProcedures] = useState<PaginatedProcedures | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await ProcedureApiService.fetchUserProcedures(page, limit);
      setProcedures(data);
    } catch (err: any) {
      let errorMessage = 'Erreur lors du chargement des procédures';
      
      // ✅ CORRECTION: Gestion améliorée des erreurs HTTP
      if (err.isSessionExpired) {
        errorMessage = 'SESSION_EXPIRED';
      } else if (err.status === 403) {
        errorMessage = 'Accès non autorisé';
      } else if (err.status === 404) {
        errorMessage = 'Aucune procédure trouvée';
      } else if (err.status === 429) {
        errorMessage = 'Trop de requêtes. Veuillez patienter.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // ✅ NE PAS NETTOYER LA CONSOLE - Laisser l'erreur 401 visible
      console.log('🔍 Erreur dans useUserProcedures:', {
        message: err.message,
        status: err.status,
        statusText: err.statusText,
        isSessionExpired: err.isSessionExpired
      });
      
      // ✅ Afficher toast seulement pour les erreurs non liées à la session
      if (errorMessage !== 'SESSION_EXPIRED') {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  return {
    procedures,
    loading,
    error,
    refetch: fetchProcedures
  };
};

/**
 * ✅ Hook pour récupérer les détails d'une procédure
 */
export const useProcedureDetails = (procedureId: string | null) => {
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!procedureId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ProcedureApiService.fetchProcedureDetails(procedureId);
      setProcedure(data);
    } catch (err: any) {
      let errorMessage = 'Erreur lors du chargement des détails';
      
      // ✅ CORRECTION: Gestion améliorée des erreurs HTTP
      if (err.isSessionExpired) {
        errorMessage = 'SESSION_EXPIRED';
      } else if (err.status === 403) {
        errorMessage = 'Accès non autorisé à cette procédure';
      } else if (err.status === 404) {
        errorMessage = 'Procédure non trouvée';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // ✅ NE PAS NETTOYER LA CONSOLE - Laisser l'erreur 401 visible
      console.log('🔍 Erreur dans useProcedureDetails:', {
        message: err.message,
        status: err.status,
        statusText: err.statusText,
        isSessionExpired: err.isSessionExpired
      });
      
      // ✅ Afficher toast seulement pour les erreurs non liées à la session
      if (errorMessage !== 'SESSION_EXPIRED') {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [procedureId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    procedure,
    loading,
    error,
    refetch: fetchDetails
  };
};

/**
 * ✅ Hook pour annuler une procédure (User seulement)
 */
export const useCancelProcedure = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const cancelProcedure = useCallback(async (
    procedureId: string,
    reason?: string
  ): Promise<Procedure | null> => {
    setLoading(true);

    try {
      const data = await ProcedureApiService.cancelProcedure(procedureId, reason);
      toast.success('Procédure annulée avec succès');
      return data;
    } catch (err: any) {
      let errorMessage = 'Erreur lors de l\'annulation';
      
      // ✅ CORRECTION: Gestion améliorée des erreurs HTTP
      if (err.isSessionExpired) {
        errorMessage = 'SESSION_EXPIRED';
      } else if (err.status === 403) {
        errorMessage = 'Vous ne pouvez annuler que vos propres procédures';
      } else if (err.status === 404) {
        errorMessage = 'Procédure non trouvée';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // ✅ NE PAS NETTOYER LA CONSOLE - Laisser l'erreur 401 visible
      console.log('🔍 Erreur dans useCancelProcedure:', {
        message: err.message,
        status: err.status,
        statusText: err.statusText,
        isSessionExpired: err.isSessionExpired
      });
      
      // ✅ Afficher toast seulement pour les erreurs non liées à la session
      if (errorMessage !== 'SESSION_EXPIRED') {
        toast.error(errorMessage);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cancelProcedure,
    loading
  };
};

// ==================== FONCTIONS UTILITAIRES POUR LE FRONTEND ====================

/**
 * ✅ Vérifie si une procédure peut être annulée
 */
export const canCancelProcedure = (procedure: Procedure): boolean => {
  if (procedure.statut !== ProcedureStatus.IN_PROGRESS) return false;
  if (procedure.isDeleted) return false;
  
  const hasCompletedSteps = procedure.steps.some((step: ProcedureStep) => 
    step.statut === StepStatus.COMPLETED
  );
  
  return !hasCompletedSteps;
};

/**
 * ✅ Calcule la progression d'une procédure
 */
export const getProgressStatus = (procedure: Procedure): { 
  percentage: number; 
  completed: number; 
  total: number 
} => {
  const totalSteps = procedure.steps.length;
  const completedSteps = procedure.steps.filter((step: ProcedureStep) => 
    step.statut === StepStatus.COMPLETED
  ).length;
  
  return {
    percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
    completed: completedSteps,
    total: totalSteps
  };
};

/**
 * ✅ Formate une date pour l'affichage
 */
export const formatProcedureDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
};

/**
 * ✅ Obtient le nom d'affichage d'une étape
 */
export const getStepDisplayName = (stepName: StepName): string => {
  const stepNames: Record<StepName, string> = {
    [StepName.DEMANDE_ADMISSION]: 'Demande d\'admission',
    [StepName.DEMANDE_VISA]: 'Demande de visa',
    [StepName.PREPARATIF_VOYAGE]: 'Préparatifs de voyage'
  };
  return stepNames[stepName] || stepName.toString();
};

/**
 * ✅ Obtient le statut d'affichage d'une procédure
 */
export const getProcedureDisplayStatus = (status: ProcedureStatus): string => {
  const statusMap: Record<ProcedureStatus, string> = {
    [ProcedureStatus.IN_PROGRESS]: 'En cours',
    [ProcedureStatus.COMPLETED]: 'Terminée',
    [ProcedureStatus.REJECTED]: 'Refusée',
    [ProcedureStatus.CANCELLED]: 'Annulée'
  };
  return statusMap[status] || status.toString();
};

/**
 * ✅ Obtient le statut d'affichage d'une étape
 */
export const getStepDisplayStatus = (status: StepStatus): string => {
  const statusMap: Record<StepStatus, string> = {
    [StepStatus.PENDING]: 'En attente',
    [StepStatus.IN_PROGRESS]: 'En cours',
    [StepStatus.COMPLETED]: 'Terminée',
    [StepStatus.REJECTED]: 'Rejetée',
    [StepStatus.CANCELLED]: 'Annulée'
  };
  return statusMap[status] || status.toString();
};

/**
 * ✅ Obtient la couleur du statut d'une procédure
 */
export const getProcedureStatusColor = (statut: ProcedureStatus): string => {
  switch (statut) {
    case ProcedureStatus.IN_PROGRESS:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case ProcedureStatus.COMPLETED:
      return 'bg-green-50 text-green-700 border-green-200';
    case ProcedureStatus.CANCELLED:
      return 'bg-red-50 text-red-700 border-red-200';
    case ProcedureStatus.REJECTED:
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default: 
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

/**
 * ✅ Obtient la couleur du statut d'une étape
 */
export const getStepStatusColor = (statut: StepStatus): string => {
  switch (statut) {
    case StepStatus.PENDING: 
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case StepStatus.IN_PROGRESS:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case StepStatus.COMPLETED: 
      return 'bg-green-50 text-green-700 border-green-200';
    case StepStatus.CANCELLED: 
      return 'bg-red-50 text-red-700 border-red-200';
    case StepStatus.REJECTED: 
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default: 
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// ==================== EXPORT ====================

export default ProcedureApiService;