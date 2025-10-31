import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';



import { toast } from 'react-toastify';

interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  statut: 'En cours' | 'Terminée' | 'Annulée' | 'Refusée';
  steps: Array<{
    nom: string;
    statut: string;
    dateMaj: string;
  }>;
  createdAt: string;
  progress: number;
}

interface ProcedureStats {
  total: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

const AdminProcedures: React.FC = () => {
  const { user, token } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [stats, setStats] = useState<ProcedureStats>({
    total: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [cancellingProcedure, setCancellingProcedure] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);

  const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchUserProcedures();
  }, [user]);

  const fetchUserProcedures = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      const response = await fetch(`${VITE_API_URL}/api/procedures/user/${user.email}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des procédures');
      }

      const data = await response.json();
      setProcedures(data.data || []);
      calculateStats(data.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger vos procédures');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (proceduresList: Procedure[]) => {
    const statsData: ProcedureStats = {
      total: proceduresList.length,
      inProgress: proceduresList.filter(p => p.statut === 'En cours').length,
      completed: proceduresList.filter(p => p.statut === 'Terminée').length,
      cancelled: proceduresList.filter(p => p.statut === 'Annulée').length
    };
    setStats(statsData);
  };

  const handleCancelClick = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    if (!selectedProcedure) return;

    try {
      setCancellingProcedure(selectedProcedure._id);
      
      const response = await fetch(`${VITE_API_URL}/api/procedures/${selectedProcedure._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user?.email,
          reason: 'Annulée par l\'utilisateur'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'annulation');
      }

      toast.success('Procédure annulée avec succès');
      await fetchUserProcedures(); // Recharger les données
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'annulation de la procédure');
    } finally {
      setCancellingProcedure(null);
      setShowCancelConfirm(false);
      setSelectedProcedure(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En cours': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Terminée': return 'bg-green-100 text-green-800 border-green-200';
      case 'Annulée': return 'bg-red-100 text-red-800 border-red-200';
      case 'Refusée': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepStatus = (steps: any[]) => {
    const currentStep = steps.find(step => step.statut === 'En cours');
    return currentStep ? currentStep.nom : 'Terminé';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-sky-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-sky-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-sky-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow">
              <div className="h-64 bg-sky-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-sky-900 mb-2">
            Mes Procédures
          </h1>
          <p className="text-sky-700">
            Suivez l'avancement de vos procédures en cours
          </p>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg border border-sky-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-sky-100 text-sky-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-sky-600">Total</p>
                <p className="text-2xl font-bold text-sky-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-sky-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-sky-100 text-sky-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-sky-600">En cours</p>
                <p className="text-2xl font-bold text-sky-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-green-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Terminées</p>
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-red-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-600">Annulées</p>
                <p className="text-2xl font-bold text-red-900">{stats.cancelled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des procédures en cours */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-sky-100">
            <h2 className="text-xl font-semibold text-sky-900">
              Procédures en cours ({stats.inProgress})
            </h2>
          </div>

          <div className="divide-y divide-sky-100">
            {procedures
              .filter(procedure => procedure.statut === 'En cours')
              .map((procedure) => (
                <div key={procedure._id} className="p-6 hover:bg-sky-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-sky-900">
                          {procedure.prenom} {procedure.nom}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(procedure.statut)}`}>
                          {procedure.statut}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-sky-700">
                        <div>
                          <span className="font-medium">Destination:</span>{' '}
                          {procedure.destination}
                        </div>
                        <div>
                          <span className="font-medium">Étape actuelle:</span>{' '}
                          {getStepStatus(procedure.steps)}
                        </div>
                        <div>
                          <span className="font-medium">Progression:</span>{' '}
                          {procedure.progress}%
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-sky-700 mb-1">
                          <span>Avancement</span>
                          <span>{procedure.progress}%</span>
                        </div>
                        <div className="w-full bg-sky-200 rounded-full h-2">
                          <div 
                            className="bg-sky-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${procedure.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6">
                      <button
                        onClick={() => handleCancelClick(procedure)}
                        disabled={cancellingProcedure === procedure._id}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {cancellingProcedure === procedure._id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Annulation...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Annuler
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            
            {procedures.filter(procedure => procedure.statut === 'En cours').length === 0 && (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-sky-900">Aucune procédure en cours</h3>
                <p className="mt-2 text-sm text-sky-600">
                  Vous n'avez actuellement aucune procédure en cours de traitement.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popover de confirmation d'annulation */}
      {showCancelConfirm && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmer l'annulation
                </h3>
                <p className="text-sm text-gray-500">
                  Êtes-vous sûr de vouloir annuler cette procédure ?
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>Procédure:</strong> {selectedProcedure.prenom} {selectedProcedure.nom} - {selectedProcedure.destination}
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Cette action est irréversible. Une fois annulée, la procédure ne pourra pas être reprise.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              >
                Retour
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancellingProcedure !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancellingProcedure ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProcedures;