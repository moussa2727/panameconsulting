// procedure.service.ts (hooks corrigés - sans logs utilisateur)
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
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

// ==================== SERVICE ====================

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
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        if (response.status === 403) {
          throw new Error('Accès non autorisé');
        }
        if (response.status === 429) {
          throw new Error('Trop de requêtes. Veuillez patienter.');
        }
        throw new Error(`Erreur ${response.status}: Impossible de récupérer les procédures`);
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
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        if (response.status === 403) {
          throw new Error('Accès non autorisé à cette procédure');
        }
        if (response.status === 404) {
          throw new Error('Procédure non trouvée');
        }
        throw new Error(`Erreur ${response.status}: Impossible de récupérer les détails`);
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
   * ✅ Annuler une procédure
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
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        if (response.status === 403) {
          throw new Error('Vous ne pouvez annuler que vos propres procédures');
        }
        if (response.status === 404) {
          throw new Error('Procédure non trouvée');
        }
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Procédure déjà finalisée');
        }
        throw new Error(`Erreur ${response.status}: Impossible d'annuler la procédure`);
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
   * ✅ Récupérer toutes les procédures (Admin seulement)
   */
  static async fetchAllProcedures(
    page: number = 1,
    limit: number = 10,
    email?: string
  ): Promise<PaginatedProcedures> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      let url = `${VITE_API_URL}/api/admin/procedures/all?page=${page}&limit=${limit}`;
      if (email) {
        url += `&email=${encodeURIComponent(email)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        if (response.status === 403) {
          throw new Error('Accès administrateur requis');
        }
        throw new Error(`Erreur ${response.status}: Impossible de récupérer les procédures`);
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
   * ✅ Rejeter une procédure (Admin seulement)
   */
  static async rejectProcedure(
    procedureId: string,
    reason: string
  ): Promise<Procedure> {
    if (!procedureId) {
      throw new Error('ID de procédure manquant');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/admin/procedures/${procedureId}/reject`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ reason }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        if (response.status === 403) {
          throw new Error('Accès administrateur requis');
        }
        if (response.status === 404) {
          throw new Error('Procédure non trouvée');
        }
        throw new Error(`Erreur ${response.status}: Impossible de rejeter la procédure`);
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

// ==================== CUSTOM HOOKS ====================

/**
 * ✅ Hook pour récupérer les procédures de l'utilisateur avec pagination
 */
export const useUserProcedures = (page: number = 1, limit: number = 10) => {
  const { isAuthenticated } = useAuth();
  const [procedures, setProcedures] = useState<PaginatedProcedures | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcedures = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ProcedureApiService.fetchUserProcedures(page, limit);
      setProcedures(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des procédures';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, limit]);

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
  const { isAuthenticated } = useAuth();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!isAuthenticated || !procedureId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ProcedureApiService.fetchProcedureDetails(procedureId);
      setProcedure(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des détails';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, procedureId]);

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
 * ✅ Hook pour annuler une procédure
 */
export const useCancelProcedure = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const cancelProcedure = useCallback(async (
    procedureId: string,
    reason?: string
  ): Promise<Procedure | null> => {
    if (!isAuthenticated) {
      toast.error('Vous devez être connecté pour annuler une procédure');
      return null;
    }

    setLoading(true);

    try {
      const data = await ProcedureApiService.cancelProcedure(procedureId, reason);
      toast.success('Procédure annulée avec succès');
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de l\'annulation';
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  return {
    cancelProcedure,
    loading
  };
};

/**
 * ✅ Hook pour les fonctionnalités admin
 */
export const useAdminProcedures = (page: number = 1, limit: number = 10, email?: string) => {
  const { isAuthenticated, user } = useAuth();
  const [procedures, setProcedures] = useState<PaginatedProcedures | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProcedures = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ProcedureApiService.fetchAllProcedures(page, limit, email);
      setProcedures(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des procédures';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, page, limit, email]);

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
 * ✅ Hook pour rejeter une procédure (Admin)
 */
export const useRejectProcedure = () => {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const rejectProcedure = useCallback(async (
    procedureId: string,
    reason: string
  ): Promise<Procedure | null> => {
    if (!isAuthenticated || user?.role !== 'admin') {
      toast.error('Accès administrateur requis');
      return null;
    }

    setLoading(true);

    try {
      const data = await ProcedureApiService.rejectProcedure(procedureId, reason);
      toast.success('Procédure rejetée avec succès');
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du rejet de la procédure';
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  return {
    rejectProcedure,
    loading
  };
};

// ==================== EXPORT ====================

export default ProcedureApiService;