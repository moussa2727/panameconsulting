import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';

interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  statut: string;
  steps: Array<{
    nom: string;
    statut: string;
    dateMaj: string;
    raisonRefus?: string;
  }>;
  createdAt: string;
  rendezVousId?: {
    firstName: string;
    lastName: string;
    date: string;
    time: string;
    status: string;
  };
}

interface ProceduresResponse {
  data: Procedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const UserProcedure: React.FC = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { token, refreshToken, logout, isAuthenticated } = useAuth();
  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<any> => {
    try {
      let currentToken = localStorage.getItem('token') || token;
      
      if (!currentToken) {
        throw new Error('Aucun token d\'authentification disponible');
      }

      const requestOptions: RequestInit = {
        ...options,
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include' as RequestCredentials,
      };

      let response = await fetch(`${VITE_API_URL}${url}`, requestOptions);

      // Si token expiré, on essaie de le rafraîchir
      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshToken();
        
        if (refreshed) {
          currentToken = localStorage.getItem('token');
          
          if (!currentToken) {
            throw new Error('Échec du rafraîchissement du token');
          }

          requestOptions.headers = {
            ...requestOptions.headers,
            'Authorization': `Bearer ${currentToken}`,
          };
          
          response = await fetch(`${VITE_API_URL}${url}`, requestOptions);
          
          if (response.status === 401) {
            throw new Error('Session expirée, veuillez vous reconnecter');
          }
        } else {
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('❌ Erreur fetchWithAuth:', error);
      throw error;
    }
  };

  const fetchProcedures = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Récupération des procédures...', { isAuthenticated, hasToken: !!token });
      
      if (!isAuthenticated) {
        throw new Error('Vous devez être connecté pour voir vos procédures');
      }

      const response: ProceduresResponse = await fetchWithAuth(
        `/api/procedures/user?page=${pageNum}&limit=10`
      );
      
      console.log('✅ Procédures récupérées:', response.data.length);
      
      setProcedures(response.data);
      setTotalPages(response.totalPages);
      setPage(response.page);
      
    } catch (err: any) {
      console.error('❌ Erreur fetch procedures:', err);
      
      let errorMessage = err.message || 'Erreur lors de la récupération des procédures';
      
      if (err.message.includes('Session expirée') || err.message.includes('401')) {
        errorMessage = 'Votre session a expiré, veuillez vous reconnecter';
        toast.error(errorMessage);
      } else if (err.message.includes('token')) {
        errorMessage = 'Problème d\'authentification, veuillez vous reconnecter';
        toast.error(errorMessage);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const cancelProcedure = async (procedureId: string, reason?: string) => {
    try {
      setCancellingId(procedureId);
      
      console.log('🔄 Annulation de la procédure:', procedureId);
      
      await fetchWithAuth(`/api/procedures/${procedureId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
      
      toast.success('Procédure annulée avec succès');
      await fetchProcedures(page);
      
    } catch (err: any) {
      console.error('❌ Erreur annulation procédure:', err);
      
      let errorMessage = err.message || 'Erreur lors de l\'annulation de la procédure';
      
      if (err.message.includes('Session expirée') || err.message.includes('401')) {
        errorMessage = 'Votre session a expiré, veuillez vous reconnecter';
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProcedures();
    } else {
      setLoading(false);
      setError('Vous devez être connecté pour voir vos procédures');
    }
  }, [isAuthenticated]);

  const handleCancel = (procedure: Procedure) => {
    if (procedure.statut === 'Terminée' || procedure.statut === 'Annulée') {
      toast.warning('Cette procédure ne peut pas être annulée');
      return;
    }

    const reason = prompt('Veuillez indiquer la raison de l\'annulation :');
    if (reason && reason.trim().length >= 5) {
      cancelProcedure(procedure._id, reason.trim());
    } else if (reason !== null) {
      toast.error('La raison doit contenir au moins 5 caractères');
    }
  };

  const handleRetry = () => {
    if (isAuthenticated) {
      fetchProcedures();
    } else {
      toast.error('Veuillez vous reconnecter');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Chargement de vos procédures...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-red-800 font-medium">Erreur</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
        <div className="mt-4 flex space-x-3">
          <button
            onClick={handleRetry}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Réessayer
          </button>
          {error.includes('reconnecter') && (
            <button
              onClick={() => window.location.href = '/connexion'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Se reconnecter
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mes Procédures</h2>
        <button
          onClick={() => fetchProcedures()}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {procedures.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Aucune procédure</h3>
          <p className="mt-1 text-gray-500">Vous n'avez aucune procédure en cours.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {procedures.map((procedure) => (
              <div key={procedure._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Procédure pour {procedure.destination}
                    </h3>
                    <p className="text-gray-600">
                      {procedure.prenom} {procedure.nom} • {procedure.email}
                    </p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        procedure.statut === 'En cours' ? 'bg-blue-100 text-blue-800' :
                        procedure.statut === 'Terminée' ? 'bg-green-100 text-green-800' :
                        procedure.statut === 'Annulée' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {procedure.statut}
                      </span>
                    </div>
                    
                    {/* Étapes de la procédure */}
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Progression :</h4>
                      {procedure.steps.map((step, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            step.statut === 'Terminé' ? 'bg-green-500' :
                            step.statut === 'En cours' ? 'bg-blue-500' :
                            step.statut === 'Rejeté' ? 'bg-red-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="text-gray-700 flex-1">{step.nom}:</span>
                          <span className={`ml-2 ${
                            step.statut === 'Terminé' ? 'text-green-600 font-medium' :
                            step.statut === 'En cours' ? 'text-blue-600 font-medium' :
                            step.statut === 'Rejeté' ? 'text-red-600 font-medium' :
                            'text-gray-500'
                          }`}>
                            {step.statut}
                          </span>
                          {step.raisonRefus && (
                            <span className="ml-2 text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
                              Raison: {step.raisonRefus}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bouton d'annulation - seulement pour les procédures en cours */}
                  {procedure.statut === 'En cours' && (
                    <button
                      onClick={() => handleCancel(procedure)}
                      disabled={cancellingId === procedure._id}
                      className="ml-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition flex items-center"
                    >
                      {cancellingId === procedure._id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Annulation...
                        </>
                      ) : (
                        'Annuler'
                      )}
                    </button>
                  )}
                </div>
                
                <div className="mt-4 text-xs text-gray-500">
                  Créée le {new Date(procedure.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => fetchProcedures(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => fetchProcedures(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default UserProcedure;