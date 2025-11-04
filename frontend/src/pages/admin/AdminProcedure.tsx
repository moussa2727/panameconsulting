import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Eye, 
  FileText, 
  Home, 
  Play, 
  XCircle, 
  User, 
  MapPin,
  ChevronRight,
  BarChart3,
  RefreshCw,
  History
} from 'lucide-react';

interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  statut: 'En cours' | 'Refusée' | 'Annulée' | 'Terminée';
  steps: Array<{
    nom: string;
    statut: 'En attente' | 'En cours' | 'Refusé' | 'Terminé';
    raisonRefus?: string;
    dateMaj: string;
  }>;
  rendezVousId?: {
    _id: string;
    date: string;
    time: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
  progress: number;
  currentStep: any;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const UserProcedure: React.FC = () => {
  const { user, token, refreshToken } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'En cours':
        return { 
          label: 'En cours', 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: <Play className='w-4 h-4' /> 
        };
      case 'Terminée':
        return { 
          label: 'Terminée', 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: <CheckCircle className='w-4 h-4' /> 
        };
      case 'Refusée':
        return { 
          label: 'Refusée', 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: <XCircle className='w-4 h-4' /> 
        };
      case 'Annulée':
        return { 
          label: 'Annulée', 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: <XCircle className='w-4 h-4' /> 
        };
      default:
        return { 
          label: 'Inconnue', 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: <Eye className='w-4 h-4' /> 
        };
    }
  };

  const getStepStatusInfo = (status: string) => {
    switch (status) {
      case 'En attente':
        return { color: 'bg-gray-100 text-gray-800', icon: Clock };
      case 'En cours':
        return { color: 'bg-blue-100 text-blue-800', icon: Play };
      case 'Terminé':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'Refusé':
        return { color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchProcedures = useCallback(async () => {
    if (!user?.email || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/procedures/user?page=1&limit=50`, {
          headers: { 
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });
      };

      let response = await makeRequest(token);

      // Si token expiré, rafraîchir et réessayer
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          // Aucune procédure trouvée - ce n'est pas une erreur
          setProcedures([]);
          return;
        }
        throw new Error('Erreur lors du chargement de vos procédures');
      }

      const data = await response.json();
      setProcedures(data.data || []);
      
    } catch (error) {
      console.error('Erreur fetchProcedures:', error);
      if (error instanceof Error && !error.message.includes('404')) {
        toast.error(error.message || 'Erreur lors du chargement des procédures');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.email, token, refreshToken]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const stats = {
    inProgress: procedures.filter(p => p.statut === 'En cours').length,
    completed: procedures.filter(p => p.statut === 'Terminée').length,
    cancelled: procedures.filter(p => p.statut === 'Annulée').length,
    rejected: procedures.filter(p => p.statut === 'Refusée').length,
    total: procedures.length
  };

  const handleRefresh = () => {
    fetchProcedures();
  };

  const handleViewDetails = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setShowDetailsModal(true);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50'>
      {/* Navigation utilisateur améliorée */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Link 
                to="/" 
                className="flex items-center text-sky-600 hover:text-sky-700 transition-colors group"
              >
                <div className="p-2 bg-sky-100 rounded-lg group-hover:bg-sky-200 transition-colors">
                  <Home className="w-5 h-5" />
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Accueil</span>
              </Link>
              
              <nav className="flex space-x-1 md:space-x-2">
                {[
                  { to: '/user-profile', icon: User, label: 'Profil' },
                  { to: '/user-rendez-vous', icon: Calendar, label: 'Rendez-vous' },
                  { to: '/user-procedure', icon: FileText, label: 'Procédures', active: true },
                  { to: '/user-historique', icon: History, label: 'Historique' }
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center px-3 py-2 rounded-xl transition-all duration-200 ${
                      item.active 
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' 
                        : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors font-medium shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      <div className='py-8 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          {/* En-tête amélioré */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-2xl mb-4">
              <FileText className="w-8 h-8 text-sky-600" />
            </div>
            <h1 className='text-3xl md:text-4xl font-bold text-slate-800 mb-3'>Mes Procédures</h1>
            <p className='text-lg text-slate-600 max-w-2xl mx-auto'>
              Suivez l'avancement de vos procédures d'admission à l'étranger
            </p>
          </div>

          {/* Cartes statistiques améliorées */}
          <div className='grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8'>
            <div className='bg-white rounded-2xl p-6 shadow-sm border border-slate-200'>
              <div className="flex items-center justify-between">
                <div>
                  <p className='text-sm font-medium text-slate-600'>Total</p>
                  <p className='text-2xl font-bold text-slate-800 mt-1'>{stats.total}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className='bg-white rounded-2xl p-6 shadow-sm border border-slate-200'>
              <div className="flex items-center justify-between">
                <div>
                  <p className='text-sm font-medium text-slate-600'>En cours</p>
                  <p className='text-2xl font-bold text-slate-800 mt-1'>{stats.inProgress}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Play className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className='bg-white rounded-2xl p-6 shadow-sm border border-slate-200'>
              <div className="flex items-center justify-between">
                <div>
                  <p className='text-sm font-medium text-slate-600'>Terminées</p>
                  <p className='text-2xl font-bold text-slate-800 mt-1'>{stats.completed}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className='bg-white rounded-2xl p-6 shadow-sm border border-slate-200'>
              <div className="flex items-center justify-between">
                <div>
                  <p className='text-sm font-medium text-slate-600'>Annulées</p>
                  <p className='text-2xl font-bold text-slate-800 mt-1'>{stats.cancelled}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className='bg-white rounded-2xl p-6 shadow-sm border border-slate-200'>
              <div className="flex items-center justify-between">
                <div>
                  <p className='text-sm font-medium text-slate-600'>Refusées</p>
                  <p className='text-2xl font-bold text-slate-800 mt-1'>{stats.rejected}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Carte principale améliorée */}
          <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200'>
            <div className="px-6 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className='text-2xl font-bold text-slate-800'>Vos procédures</h2>
                  <p className='text-slate-600 mt-1'>Consultez le détail de chaque procédure</p>
                </div>
                <div className="text-sm text-slate-600">
                  {stats.total} procédure{stats.total > 1 ? 's' : ''} au total
                </div>
              </div>
            </div>

            {loading ? (
              <div className='flex justify-center py-16'>
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
                  <p className="text-slate-600">Chargement de vos procédures...</p>
                </div>
              </div>
            ) : procedures.length === 0 ? (
              <div className='text-center py-16 px-6'>
                <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className='text-2xl font-bold text-slate-800 mb-3'>Aucune procédure en cours</h3>
                <p className='text-slate-600 mb-8 max-w-md mx-auto'>
                  Vous n'avez pas encore de procédures d'admission. 
                  Prenez un rendez-vous pour commencer votre projet d'études à l'étranger.
                </p>
                <Link
                  to="/rendez-vous"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Calendar className="w-5 h-5" />
                  Prendre un rendez-vous
                </Link>
              </div>
            ) : (
              <div className='divide-y divide-slate-100'>
                {procedures.map((procedure) => {
                  const statusInfo = getStatusInfo(procedure.statut);
                  return (
                    <div key={procedure._id} className='p-6 hover:bg-slate-50/50 transition-colors group'>
                      <div className='flex flex-col lg:flex-row lg:items-start justify-between gap-4'>
                        <div className='flex-1'>
                          <div className='flex flex-col sm:flex-row sm:items-center gap-3 mb-3'>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-sky-600" />
                              </div>
                              <div>
                                <h3 className='text-xl font-bold text-slate-800'>
                                  {procedure.destination}
                                </h3>
                                <p className='text-slate-600 text-sm'>
                                  Créée le {formatDate(procedure.createdAt)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                                {statusInfo.icon}
                                <span>{statusInfo.label}</span>
                              </span>
                              
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                                <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                                <span>Progression: {procedure.progress}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Barre de progression */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                              <span>Avancement de votre procédure</span>
                              <span>{procedure.progress}% complété</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${procedure.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Étapes rapides */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {procedure.steps.slice(0, 3).map((step, index) => {
                              const stepConfig = getStepStatusInfo(step.statut);
                              const StepIcon = stepConfig.icon;
                              return (
                                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stepConfig.color}`}>
                                    <StepIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                      {step.nom}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      {step.statut}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="flex lg:flex-col gap-2 lg:items-end">
                          <button
                            onClick={() => handleViewDetails(procedure)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sky-600 hover:bg-sky-50 rounded-xl border border-sky-200 transition-colors font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Détails</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          
                          <div className="text-xs text-slate-500 text-right">
                            Dernière mise à jour: {formatDateTime(procedure.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de détails */}
      {showDetailsModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Détails de la procédure</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Informations générales</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Destination</p>
                    <p className="font-medium text-slate-800">{selectedProcedure.destination}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Statut global</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusInfo(selectedProcedure.statut).color}`}>
                      {getStatusInfo(selectedProcedure.statut).icon}
                      <span>{selectedProcedure.statut}</span>
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Progression</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${selectedProcedure.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {selectedProcedure.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Dates importantes</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Date de création</p>
                    <p className="font-medium text-slate-800">
                      {formatDateTime(selectedProcedure.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Dernière mise à jour</p>
                    <p className="font-medium text-slate-800">
                      {formatDateTime(selectedProcedure.updatedAt)}
                    </p>
                  </div>
                  {selectedProcedure.rendezVousId && (
                    <div>
                      <p className="text-sm text-slate-600">Rendez-vous associé</p>
                      <p className="font-medium text-slate-800">
                        {formatDate(selectedProcedure.rendezVousId.date)} à {selectedProcedure.rendezVousId.time}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-800 mb-4">Étapes détaillées</h3>
              <div className="space-y-3">
                {selectedProcedure.steps.map((step, index) => {
                  const stepConfig = getStepStatusInfo(step.statut);
                  const StepIcon = stepConfig.icon;
                  return (
                    <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stepConfig.color}`}>
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{step.nom}</p>
                          <p className="text-sm text-slate-600">
                            Dernière mise à jour: {formatDateTime(step.dateMaj)}
                          </p>
                          {step.raisonRefus && (
                            <p className="text-sm text-red-600 mt-1">
                              <strong>Raison du refus:</strong> {step.raisonRefus}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${stepConfig.color}`}>
                        {step.statut}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProcedure;