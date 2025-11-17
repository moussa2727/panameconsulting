import { useState, useEffect} from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  useUserProcedures, 
  useProcedureDetails, 
  useCancelProcedure,
  Procedure,
  ProcedureStatus,
  StepStatus,
  StepName
} from '../../api/ProcedureService';

// === TYPES LOCAUX ===
interface Step {
  nom: StepName;
  statut: StepStatus;
  raisonRefus?: string;
  dateMaj: string;
  dateCreation: string;
}



// === FONCTIONS D'AFFICHAGE DÉCOMPOSÉES ===

/**
 * ✅ Fonction pour afficher le statut d'une procédure
 */
const getProcedureDisplayStatus = (status: ProcedureStatus): string => {
  const statusMap = {
    [ProcedureStatus.IN_PROGRESS]: 'En cours',
    [ProcedureStatus.COMPLETED]: 'Terminée',
    [ProcedureStatus.REJECTED]: 'Refusée',
    [ProcedureStatus.CANCELLED]: 'Annulée'
  };
  return statusMap[status] || status.toString();
};

/**
 * ✅ Fonction pour afficher le statut d'une étape
 */
const getStepDisplayStatus = (status: StepStatus): string => {
  const statusMap = {
    [StepStatus.PENDING]: 'En attente',
    [StepStatus.IN_PROGRESS]: 'En cours',
    [StepStatus.COMPLETED]: 'Terminée',
    [StepStatus.REJECTED]: 'Rejetée',
    [StepStatus.CANCELLED]: 'Annulée'
  };
  return statusMap[status] || status.toString();
};

/**
 * ✅ Fonction générique pour l'affichage (compatibilité)
 */
const getDisplayStatus = (status: ProcedureStatus | StepStatus): string => {
  if (Object.values(ProcedureStatus).includes(status as ProcedureStatus)) {
    return getProcedureDisplayStatus(status as ProcedureStatus);
  }
  return getStepDisplayStatus(status as StepStatus);
};

// === FONCTIONS DE COULEUR DÉCOMPOSÉES ===

/**
 * ✅ Couleur pour le statut d'une procédure
 */
const getProcedureStatusColor = (statut: ProcedureStatus) => {
  switch (statut) {
    case ProcedureStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case ProcedureStatus.COMPLETED:
      return 'bg-green-100 text-green-800 border-green-200';
    case ProcedureStatus.CANCELLED:
      return 'bg-red-100 text-red-800 border-red-200';
    case ProcedureStatus.REJECTED:
      return 'bg-red-100 text-red-800 border-red-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * ✅ Couleur pour le statut d'une étape
 */
const getStepStatusColor = (statut: StepStatus) => {
  switch (statut) {
    case StepStatus.PENDING: 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case StepStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case StepStatus.COMPLETED: 
      return 'bg-green-100 text-green-800 border-green-200';
    case StepStatus.CANCELLED: 
      return 'bg-red-100 text-red-800 border-red-200';
    case StepStatus.REJECTED: 
      return 'bg-red-100 text-red-800 border-red-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * ✅ Fonction générique pour la couleur (compatibilité)
 */
const getStatutColor = (statut: ProcedureStatus | StepStatus) => {
  if (Object.values(ProcedureStatus).includes(statut as ProcedureStatus)) {
    return getProcedureStatusColor(statut as ProcedureStatus);
  }
  return getStepStatusColor(statut as StepStatus);
};

// === COMPOSANT PRINCIPAL ===
const UserProcedure = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [procedureToCancel, setProcedureToCancel] = useState<Procedure | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const limit = 10;

  // Utilisation des hooks personnalisés
  const { 
    procedures: paginatedProcedures, 
    loading: proceduresLoading, 
    error: proceduresError, 
    refetch: refetchProcedures 
  } = useUserProcedures(currentPage, limit);

  const {
    procedure: detailedProcedure,
    loading: detailsLoading,
    error: detailsError,
    refetch: refetchDetails
  } = useProcedureDetails(selectedProcedure?._id || null);

  const { 
    cancelProcedure, 
    loading: cancelLoading 
  } = useCancelProcedure();

  // === EFFETS ===
  useEffect(() => {
    if (proceduresError && proceduresError.includes('Session expirée')) {
      logout();
    }
  }, [proceduresError, logout]);

  useEffect(() => {
    if (detailsError && detailsError.includes('Session expirée')) {
      logout();
    }
  }, [detailsError, logout]);

  // === GESTION DE LA SÉLECTION ===
  const handleSelectProcedure = async (procedure: Procedure) => {
    setSelectedProcedure(procedure);
  };

  // === ANNULATION DE PROCÉDURE ===
  const handleCancelProcedure = async () => {
    if (!procedureToCancel) return;

    try {
      const result = await cancelProcedure(procedureToCancel._id, cancelReason);
      
      if (result) {
        // Mettre à jour la liste des procédures
        await refetchProcedures();
        
        // Mettre à jour la procédure sélectionnée si c'est la même
        if (selectedProcedure?._id === procedureToCancel._id) {
          setSelectedProcedure(result);
        }

        setShowCancelModal(false);
        setProcedureToCancel(null);
        setCancelReason('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
    }
  };

  // === VÉRIFICATION DES RESTRICTIONS BACKEND ===
const canCancelProcedure = (procedure: Procedure): boolean => {
    // If the procedure is already CANCELLED or not IN_PROGRESS, it can't be cancelled
    if (procedure.statut !== ProcedureStatus.IN_PROGRESS) return false;
    
    // Check that no steps are COMPLETED
    const hasCompletedSteps = procedure.steps.some(step => 
      step.statut === StepStatus.COMPLETED
    );
    
    // Only allow cancellation if no steps are completed and not already deleted
    return !hasCompletedSteps && !procedure.isDeleted;
};

  // === FONCTIONS UTILITAIRES ===
  const getStepDisplayName = (stepName: StepName): string => {
    const stepNames = {
      [StepName.DEMANDE_ADMISSION]: 'Demande d\'admission',
      [StepName.DEMANDE_VISA]: 'Demande de visa',
      [StepName.PREPARATIF_VOYAGE]: 'Préparatifs de voyage'
    };
    return stepNames[stepName] || stepName.toString();
  };

  // === CALCUL DE PROGRESSION ===
  const getProgressStatus = (procedure: Procedure) => {
    const totalSteps = procedure.steps.length;
    const completedSteps = procedure.steps.filter(step => 
      step.statut === StepStatus.COMPLETED
    ).length;
    
    return {
      percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      completed: completedSteps,
      total: totalSteps
    };
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  // === RENDU ===
  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Accès non autorisé</h2>
          <p className="text-slate-600">Veuillez vous connecter pour accéder à vos procédures.</p>
          <a 
            href="/connexion" 
            className="inline-block mt-4 px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  const procedures = paginatedProcedures?.data || [];
  const totalPages = paginatedProcedures?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Mes Procédures
            </h1>
            <p className="text-slate-600 mt-1">
              Suivez l'avancement de vos démarches d'immigration
            </p>
          </div>
          
          <button 
            onClick={() => refetchProcedures()}
            disabled={proceduresLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`fas fa-sync-alt ${proceduresLoading ? 'animate-spin' : ''}`}></i>
            {proceduresLoading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {proceduresLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Chargement de vos procédures...</p>
          </div>
        ) : proceduresError ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Erreur de chargement</h3>
            <p className="text-slate-600 mb-4">{proceduresError}</p>
            <button 
              onClick={() => refetchProcedures()}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : procedures.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Liste des procédures */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Vos procédures ({procedures.length})
              </h2>
              
              {procedures.map((procedure) => {
                const progress = getProgressStatus(procedure);
                const canCancel = canCancelProcedure(procedure);
                
                return (
                  <div
                    key={procedure._id}
                    className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedProcedure?._id === procedure._id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleSelectProcedure(procedure)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-800 text-lg">
                            {procedure.destination}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getProcedureStatusColor(procedure.statut)}`}>
                            {getProcedureDisplayStatus(procedure.statut)}
                          </span>
                        </div>
                        
                        <div className="text-slate-600 text-sm space-y-1">
                          <p>Créée le {formatDate(procedure.createdAt)}</p>
                          {procedure.dateCompletion && (
                            <p>Terminée le {formatDate(procedure.dateCompletion)}</p>
                          )}
                        </div>
                      </div>
                      
                      {canCancel && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProcedureToCancel(procedure);
                            setShowCancelModal(true);
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors duration-200 flex items-center gap-2 w-fit"
                        >
                          <i className="fas fa-times"></i>
                          Annuler
                        </button>
                      )}
                    </div>

                    {/* Barre de progression */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>Avancement</span>
                        <span>{progress.completed}/{progress.total} étapes</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Étapes */}
                    <div className="space-y-2">
                      {procedure.steps.map((step, index) => (
                        <div key={step.nom} className="flex items-center gap-3 text-sm">
                          <div className={`w-2 h-2 rounded-full ${
                            step.statut === StepStatus.COMPLETED ? 'bg-green-500' :
                            step.statut === StepStatus.IN_PROGRESS ? 'bg-blue-500' :
                            step.statut === StepStatus.REJECTED ? 'bg-red-500' : 'bg-slate-300'
                          }`}></div>
                          <span className="text-slate-700 flex-1">
                            {getStepDisplayName(step.nom)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStepStatusColor(step.statut)}`}>
                            {getStepDisplayStatus(step.statut)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {procedure.raisonRejet && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">
                          <strong>Raison du rejet :</strong> {procedure.raisonRejet}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  <span className="text-slate-600 text-sm">
                    Page {currentPage} sur {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Détails de la procédure sélectionnée */}
            <div className="lg:col-span-1">
              {selectedProcedure ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sticky top-6">
                  {detailsLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-2xl">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Détails de la procédure
                    </h3>
                    <button
                      onClick={() => setSelectedProcedure(null)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">INFORMATIONS PERSONNELLES</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Nom :</strong> {selectedProcedure.prenom} {selectedProcedure.nom}</p>
                        <p><strong>Email :</strong> {selectedProcedure.email}</p>
                        {selectedProcedure.telephone && (
                          <p><strong>Téléphone :</strong> {selectedProcedure.telephone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">INFORMATIONS ACADÉMIQUES</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Destination :</strong> {selectedProcedure.destination}</p>
                        {selectedProcedure.niveauEtude && (
                          <p><strong>Niveau d'étude :</strong> {selectedProcedure.niveauEtude}</p>
                        )}
                        {selectedProcedure.filiere && (
                          <p><strong>Filière :</strong> {selectedProcedure.filiere}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">DATES IMPORTANTES</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Création :</strong> {formatDate(selectedProcedure.createdAt)}</p>
                        {selectedProcedure.dateCompletion && (
                          <p><strong>Terminaison :</strong> {formatDate(selectedProcedure.dateCompletion)}</p>
                        )}
                      </div>
                    </div>

                    {selectedProcedure.rendezVousId && typeof selectedProcedure.rendezVousId !== 'string' && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-2">RENDEZ-VOUS ASSOCIÉ</h4>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p><strong>Nom :</strong> {selectedProcedure.rendezVousId.firstName} {selectedProcedure.rendezVousId.lastName}</p>
                          <p><strong>Date :</strong> {formatDate(selectedProcedure.rendezVousId.date)}</p>
                          <p><strong>Statut :</strong> {selectedProcedure.rendezVousId.status}</p>
                        </div>
                      </div>
                    )}

                    {canCancelProcedure(selectedProcedure) && (
                      <button
                        onClick={() => {
                          setProcedureToCancel(selectedProcedure);
                          setShowCancelModal(true);
                        }}
                        disabled={cancelLoading}
                        className="w-full px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-times-circle"></i>
                        {cancelLoading ? 'Annulation...' : 'Annuler cette procédure'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-mouse-pointer text-slate-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    Sélectionnez une procédure
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Cliquez sur une procédure pour afficher ses détails complets
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-tasks text-blue-500 text-3xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">
              Aucune procédure en cours
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Vous n'avez aucune procédure d'immigration en cours. 
              Commencez par prendre un rendez-vous pour initier votre démarche.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/rendez-vous"
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-200 font-medium"
              >
                <i className="fas fa-calendar-plus mr-2"></i>
                Prendre un rendez-vous
              </a>
              <a
                href="/services"
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
              >
                <i className="fas fa-info-circle mr-2"></i>
                En savoir plus
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'annulation */}
      {showCancelModal && procedureToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Confirmer l'annulation
            </h3>
            <p className="text-slate-600 mb-4">
              Êtes-vous sûr de vouloir annuler votre procédure pour {procedureToCancel.destination} ?
            </p>
            
            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-slate-700 mb-2">
                Raison de l'annulation (optionnel)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Pourquoi souhaitez-vous annuler cette procédure ?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setProcedureToCancel(null);
                  setCancelReason('');
                }}
                disabled={cancelLoading}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200 disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={handleCancelProcedure}
                disabled={cancelLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    Annulation...
                  </>
                ) : (
                  <>
                    <i className="fas fa-times-circle"></i>
                    Confirmer l'annulation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton mobile flottant */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <button 
          onClick={() => refetchProcedures()}
          disabled={proceduresLoading}
          className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:bg-blue-600 disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt text-lg ${proceduresLoading ? 'animate-spin' : ''}`}></i>
        </button>
      </div>
    </div>
  );
};

export default UserProcedure;