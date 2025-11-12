import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock4,
  MoreVertical,
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';

// Types strictement alignés avec le backend
interface Step {
  nom: string;
  statut: 'En attente' | 'En cours' | 'Terminé' | 'Rejeté' | 'Annulé';
  raisonRefus?: string;
  dateMaj: string;
}

interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  statut: 'En cours' | 'Terminée' | 'Refusée' | 'Annulée';
  steps: Step[];
  rendezVousId: {
    _id: string;
    firstName: string;
    lastName: string;
    date: string;
    time: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProceduresResponse {
  data: Procedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CancelProcedureRequest {
  reason?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const UserProcedure: React.FC = () => {
  const { user, token } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  // Fonction pour récupérer les procédures
  const fetchProcedures = async (showRefresh = false): Promise<void> => {
    if (!user || !token) {
      setError('Authentification requise');
      setLoading(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '50',
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(
        `${API_URL}/api/procedures/user?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expirée - Veuillez vous reconnecter');
          return;
        }
        throw new Error(`Erreur ${response.status} - Impossible de charger les procédures`);
      }

      const data: ProceduresResponse = await response.json();
      setProcedures(data.data);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur fetchProcedures:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Erreur de connexion - Vérifiez votre connexion internet');
      } else {
        setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour annuler une procédure
  const cancelProcedure = async (procedureId: string, reason?: string) => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return;
    }

    setCancelling(true);
    try {
      const cancelData: CancelProcedureRequest = {};
      if (reason?.trim()) {
        cancelData.reason = reason.trim();
      }

      const response = await fetch(
        `${API_URL}/api/procedures/${procedureId}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cancelData),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expirée - Veuillez vous reconnecter');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur ${response.status} lors de l'annulation`);
      }

      // Recharger les procédures après annulation
      await fetchProcedures();
      setShowCancelModal(false);
      setSelectedProcedure(null);
      setCancelReason('');
    } catch (err) {
      console.error('❌ Erreur cancelProcedure:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'annulation');
    } finally {
      setCancelling(false);
    }
  };

  // Effet pour charger les procédures au montage
  useEffect(() => {
    if (user && token) {
      fetchProcedures();
    }
  }, [user, token]);

  // Fonction de rafraîchissement manuel
  const handleRefresh = () => {
    fetchProcedures(true);
  };

  // Fonction pour gérer l'annulation
  const handleCancelProcedure = () => {
    if (selectedProcedure) {
      cancelProcedure(selectedProcedure._id, cancelReason);
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  // Fonction pour formater l'heure
  const formatTime = (timeString: string) => {
    return timeString;
  };

  // Couleurs et icônes selon le statut
  const getStatusConfig = (statut: Procedure['statut']) => {
    switch (statut) {
      case 'En cours':
        return { color: 'text-blue-600 bg-blue-50', icon: Clock4, label: 'En Cours' };
      case 'Terminée':
        return { color: 'text-green-600 bg-green-50', icon: CheckCircle, label: 'Terminée' };
      case 'Refusée':
        return { color: 'text-red-600 bg-red-50', icon: XCircle, label: 'Refusée' };
      case 'Annulée':
        return { color: 'text-gray-600 bg-gray-50', icon: XCircle, label: 'Annulée' };
      default:
        return { color: 'text-gray-600 bg-gray-50', icon: Clock4, label: statut };
    }
  };

  // Filtrage côté client pour la recherche
  const filteredProcedures = procedures.filter(procedure => {
    const matchesSearch = filters.search === '' || 
      procedure.destination.toLowerCase().includes(filters.search.toLowerCase()) ||
      `${procedure.prenom} ${procedure.nom}`.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || procedure.statut === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Authentification requise
          </h3>
          <p className="text-gray-600">
            Veuillez vous connecter pour accéder à vos procédures.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de vos procédures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes Procédures</h1>
              <p className="text-gray-600 text-sm mt-1">
                {procedures.length > 0 ? `${procedures.length} procédure(s) trouvée(s)` : 'Suivez vos démarches'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filtres et recherche */}
          {procedures.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par destination ou nom..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-2 overflow-x-auto pb-2">
                {[
                  { value: 'all', label: 'Toutes', count: procedures.length },
                  { value: 'En cours', label: 'En Cours', count: procedures.filter(p => p.statut === 'En cours').length },
                  { value: 'Terminée', label: 'Terminées', count: procedures.filter(p => p.statut === 'Terminée').length },
                  { value: 'Annulée', label: 'Annulées', count: procedures.filter(p => p.statut === 'Annulée').length },
                  { value: 'Refusée', label: 'Refusées', count: procedures.filter(p => p.statut === 'Refusée').length },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFilters(prev => ({ ...prev, status: filter.value }))}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      filters.status === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      filters.status === filter.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {filteredProcedures.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {procedures.length === 0 ? 'Aucune procédure' : 'Aucun résultat'}
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              {procedures.length === 0 
                ? 'Vous n\'avez pas encore de procédures en cours. Vos procédures apparaîtront ici après vos rendez-vous.'
                : 'Aucune procédure ne correspond à votre recherche.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProcedures.map((procedure) => {
              const StatusIcon = getStatusConfig(procedure.statut).icon;
              
              return (
                <div
                  key={procedure._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* En-tête de la procédure */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <MapPin className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {procedure.destination}
                          </h3>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{procedure.prenom} {procedure.nom}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{procedure.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(procedure.statut).color}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span>{getStatusConfig(procedure.statut).label}</span>
                        </div>
                        
                        {procedure.statut === 'En cours' && (
                          <button
                            onClick={() => {
                              setSelectedProcedure(procedure);
                              setShowCancelModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Annuler la procédure"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informations du rendez-vous */}
                  {procedure.rendezVousId && (
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                        Rendez-vous associé
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(procedure.rendezVousId.date)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatTime(procedure.rendezVousId.time)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Étapes de la procédure */}
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <GraduationCap className="w-4 h-4 mr-2 text-blue-600" />
                      Étapes de la procédure
                    </h4>
                    <div className="space-y-3">
                      {procedure.steps.map((step, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            step.statut === 'Terminé' 
                              ? 'bg-green-100 text-green-600' 
                              : step.statut === 'En cours'
                              ? 'bg-blue-100 text-blue-600'
                              : step.statut === 'Rejeté'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {step.nom.toLowerCase().replace(/_/g, ' ')}
                              </span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                step.statut === 'Terminé' 
                                  ? 'bg-green-50 text-green-700' 
                                  : step.statut === 'En cours'
                                  ? 'bg-blue-50 text-blue-700'
                                  : step.statut === 'Rejeté'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-gray-50 text-gray-600'
                              }`}>
                                {step.statut}
                              </span>
                            </div>
                            
                            {step.raisonRefus && (
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                                {step.raisonRefus}
                              </p>
                            )}
                            
                            <p className="text-xs text-gray-500">
                              Dernière mise à jour: {formatDate(step.dateMaj)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pied de carte */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Créée le {formatDate(procedure.createdAt)}</span>
                      <span>Dernière mise à jour: {formatDate(procedure.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal d'annulation */}
      {showCancelModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Annuler la procédure
            </h3>
            
            <p className="text-gray-600 mb-4">
              Êtes-vous sûr de vouloir annuler votre procédure pour {selectedProcedure.destination} ? 
              Cette action est irréversible.
            </p>

            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-2">
                Raison de l'annulation (optionnelle)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Pourquoi souhaitez-vous annuler cette procédure ?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cancelReason.length}/500 caractères
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedProcedure(null);
                  setCancelReason('');
                }}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={handleCancelProcedure}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {cancelling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>{cancelling ? 'Annulation...' : 'Confirmer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProcedure;