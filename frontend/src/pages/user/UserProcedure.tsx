import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Home, 
  User, 
  FileText, 
  Calendar, 
  History, 
  MapPin, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  XCircle,
  CheckCircle,
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react';

interface ProcedureStep {
  nom: string;
  statut: 'En attente' | 'En cours' | 'Terminé' | 'Refusé' | 'Annulé';
  dateMaj: string;
  raisonRefus?: string;
}

interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  statut: 'En cours' | 'Terminée' | 'Rejetée' | 'Annulée';
  steps: ProcedureStep[];
  createdAt: string;
  updatedAt: string;
  rendezVousId?: {
    firstName: string;
    lastName: string;
    date: string;
    time: string;
    status: string;
  };
}

interface UserProcedureProps {
  procedure?: Procedure;
  onProcedureUpdate?: () => void;
  loading?: boolean;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const UserProcedure: React.FC<UserProcedureProps> = ({ 
  procedure, 
  onProcedureUpdate, 
  loading = false 
}) => {
  const { user, token, isAuthenticated, refreshToken } = useAuth();
  const navigate = useNavigate();
  const [isCancelPopoverOpen, setIsCancelPopoverOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userProcedures, setUserProcedures] = useState<Procedure[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentToken, setCurrentToken] = useState<string | null>(token);
  const [refreshing, setRefreshing] = useState(false);

  // Synchroniser le token courant
  useEffect(() => {
    setCurrentToken(token);
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
    } else if (!procedure) {
      fetchUserProcedures();
    }
  }, [isAuthenticated, navigate, procedure, page]);

  const fetchUserProcedures = async (retryCount = 0): Promise<void> => {
    if (!user?.email) return;
    
    setIsLoadingProcedures(true);
    try {
      const makeRequest = async (requestToken: string): Promise<Response> => {
        console.log('🔑 Utilisation du token pour fetch procedures:', requestToken?.substring(0, 20) + '...');
        return fetch(
          `${API_URL}/api/procedures/user?email=${encodeURIComponent(user.email)}&page=${page}&limit=5`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${requestToken}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        );
      };

      // Utiliser le token courant
      let effectiveToken = currentToken || localStorage.getItem('token');
      if (!effectiveToken) {
        console.warn('❌ Aucun token disponible');
        throw new Error('Token non disponible');
      }

      console.log('📡 Début de la requête procedures...');
      let response = await makeRequest(effectiveToken);

      // Gestion du 401 - Token expiré
      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshToken();
        if (refreshed) {
          // Récupérer le nouveau token depuis le localStorage
          const newToken = localStorage.getItem('token');
          console.log('🔄 Nouveau token récupéré:', newToken?.substring(0, 20) + '...');
          
          if (newToken) {
            setCurrentToken(newToken);
            // Réessayer avec le nouveau token
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Réponse erreur:', errorText);
        throw new Error(`Erreur ${response.status} lors de la récupération des procédures`);
      }
      
      const data = await response.json();
      console.log('✅ Procédures récupérées:', data.data?.length || 0);
      setUserProcedures(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / 5));
    } catch (error) {
      console.error('💥 Erreur fetchUserProcedures:', error);
      
      // Tentative de reprise
      if (retryCount < 2) {
        console.log(`🔄 Tentative de reprise ${retryCount + 1}/2...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchUserProcedures(retryCount + 1);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      
      if (errorMessage.includes('Session expirée') || errorMessage.includes('401')) {
        toast.error('Session expirée. Redirection...');
        setTimeout(() => navigate('/connexion'), 2000);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoadingProcedures(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserProcedures();
  };

  const handleCancelProcedure = async (procId: string) => {
    if (!cancelReason.trim() || cancelReason.length < 5) {
      toast.error('Veuillez fournir une raison d\'annulation (au moins 5 caractères)');
      return;
    }

    setIsCancelling(true);
    try {
      const makeRequest = async (requestToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/procedures/${procId}/cancel`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${requestToken}`,
          },
          body: JSON.stringify({
            reason: cancelReason.trim()
          }),
          credentials: 'include'
        });
      };

      let effectiveToken = currentToken || localStorage.getItem('token');
      if (!effectiveToken) {
        throw new Error('Token non disponible');
      }

      let response = await makeRequest(effectiveToken);

      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            setCurrentToken(newToken);
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'annulation');
      }

      toast.success('Procédure annulée avec succès');
      setIsCancelPopoverOpen(false);
      setCancelReason('');
      onProcedureUpdate?.();
      fetchUserProcedures();
    } catch (error: any) {
      console.error('💥 Erreur annulation:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      setIsCancelling(false);
    }
  };

  // Fonctions utilitaires
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Terminée': return 'bg-green-100 text-green-800 border-green-200';
      case 'En cours': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Rejetée': return 'bg-red-100 text-red-800 border-red-200';
      case 'Annulée': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'Terminé': return 'bg-green-500';
      case 'En cours': return 'bg-sky-500 animate-pulse';
      case 'Refusé': return 'bg-red-500';
      case 'Annulé': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getStepStatusText = (status: string) => {
    switch (status) {
      case 'Terminé': return 'Terminé';
      case 'En cours': return 'En cours';
      case 'Refusé': return 'Refusé';
      case 'Annulé': return 'Annulé';
      default: return 'En attente';
    }
  };

  const formatStepName = (stepName: string) => {
    if (!stepName) return 'Étape inconnue';
    return stepName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const canCancel = (proc: Procedure) => {
    return proc.statut === 'En cours' && user?.email === proc.email;
  };

  const getProgressPercentage = (steps: ProcedureStep[]) => {
    const completed = steps.filter(step => step.statut === 'Terminé').length;
    return steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;
  };

  // Valeurs par défaut sécurisées pour une procédure unique
  const safeProcedure = procedure ? {
    _id: procedure._id || '',
    prenom: procedure.prenom || 'Non renseigné',
    nom: procedure.nom || 'Non renseigné',
    email: procedure.email || '',
    destination: procedure.destination || 'Non spécifiée',
    statut: procedure.statut || 'En cours',
    steps: procedure.steps || [],
    createdAt: procedure.createdAt || new Date().toISOString(),
    updatedAt: procedure.updatedAt || new Date().toISOString(),
    rendezVousId: procedure.rendezVousId
  } : null;

  const proceduresToDisplay = procedure ? [procedure] : userProcedures;

  // État de chargement
  if (loading || isLoadingProcedures) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header commun */}
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
              
              <div className="flex items-center gap-3">
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu de chargement */}
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-2xl mb-4 animate-pulse">
                <FileText className="w-8 h-8 text-sky-600" />
              </div>
              <div className="h-8 bg-slate-200 rounded-lg w-64 mx-auto mb-3 animate-pulse"></div>
              <div className="h-4 bg-slate-200 rounded w-96 mx-auto animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              <div className="p-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="border-b border-slate-100 last:border-b-0 pb-4 mb-4 last:mb-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="h-4 bg-slate-200 rounded"></div>
                          <div className="h-4 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-10 bg-slate-200 rounded w-20"></div>
                        <div className="h-10 bg-slate-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // État vide
  if (!procedure && userProcedures.length === 0 && !isLoadingProcedures) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header commun */}
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
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* État vide */}
        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-16 px-6">
              <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-sky-100 text-sky-600 mb-6">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Aucune procédure en cours</h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Vos procédures de visa apparaîtront ici une fois votre rendez-vous confirmé avec nos conseillers.
              </p>
              <button
                onClick={() => navigate('/rendez-vous')}
                className="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              >
                Prendre un rendez-vous
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header commun identique à MesRendezVous */}
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
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* En-tête amélioré */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 rounded-2xl mb-4">
              <FileText className="w-8 h-8 text-sky-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-3">
              {procedure ? 'Détails de la Procédure' : 'Mes Procédures'}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Suivez l'avancement de vos démarches de visa en temps réel
            </p>
          </div>

          {/* Statistiques rapides */}
          {!procedure && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { 
                  label: 'Total', 
                  value: userProcedures.length, 
                  color: 'bg-blue-500',
                  icon: FileText
                },
                { 
                  label: 'En cours', 
                  value: userProcedures.filter(p => p.statut === 'En cours').length, 
                  color: 'bg-sky-500',
                  icon: TrendingUp
                },
                { 
                  label: 'Terminées', 
                  value: userProcedures.filter(p => p.statut === 'Terminée').length, 
                  color: 'bg-green-500',
                  icon: CheckCircle
                },
                { 
                  label: 'Annulées', 
                  value: userProcedures.filter(p => p.statut === 'Annulée').length, 
                  color: 'bg-red-500',
                  icon: XCircle
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color.replace('bg-', 'bg-')} bg-opacity-10`}>
                      <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Liste des procédures */}
          <div className="space-y-6">
            {proceduresToDisplay.map((proc) => (
              <div key={proc._id} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                {/* En-tête de la procédure */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold text-slate-800">
                          Procédure {proc.destination}
                        </h3>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(proc.statut)}`}>
                          {proc.statut}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-sky-500" />
                          <span>{proc.prenom} {proc.nom}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-sky-500" />
                          <span>{proc.destination}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-sky-500" />
                          <span>Créée le {formatDate(proc.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-sky-500" />
                          <span>Progression: {getProgressPercentage(proc.steps)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-sky-600 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors duration-200 border border-sky-200"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {isDetailsOpen ? 'Masquer' : 'Détails'}
                      </button>

                      {canCancel(proc) && (
                        <button
                          onClick={() => {
                            setIsCancelPopoverOpen(true);
                            setCancelReason('');
                          }}
                          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors duration-200 border border-red-200"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Détails des étapes */}
                {isDetailsOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-sky-500" />
                        Progression de la procédure
                      </h4>

                      {proc.steps.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                          <p className="text-sm">Aucune étape disponible</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4 mb-6">
                            {proc.steps.map((step, index) => (
                              <div key={step.nom || `step-${index}`} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex-shrink-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepStatusColor(step.statut)}`}>
                                    <span className="text-xs font-semibold text-white">
                                      {index + 1}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                    <h5 className="text-base font-medium text-slate-900">
                                      {formatStepName(step.nom)}
                                    </h5>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      step.statut === 'Terminé' ? 'bg-green-100 text-green-800' :
                                      step.statut === 'En cours' ? 'bg-sky-100 text-sky-800' :
                                      step.statut === 'Refusé' ? 'bg-red-100 text-red-800' :
                                      'bg-slate-100 text-slate-800'
                                    }`}>
                                      {getStepStatusText(step.statut)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center text-sm text-slate-500">
                                    <Clock className="w-4 h-4 mr-1" />
                                    Dernière mise à jour: {formatDate(step.dateMaj)}
                                  </div>

                                  {step.raisonRefus && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                      <strong className="font-medium">Raison du refus:</strong> {step.raisonRefus}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Barre de progression */}
                          <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center justify-between text-sm text-slate-700 mb-3">
                              <span className="font-medium">Progression globale</span>
                              <span>
                                {proc.steps.filter(step => step.statut === 'Terminé').length} / {proc.steps.length} étapes
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-sky-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: `${getProgressPercentage(proc.steps)}%`
                                }}
                              ></div>
                            </div>
                            <div className="text-right text-sm text-slate-500 mt-2">
                              {getProgressPercentage(proc.steps)}% complété
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {!procedure && totalPages > 1 && (
            <div className="flex items-center justify-center mt-8">
              <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-slate-50 rounded-xl border border-slate-300 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Précédent</span>
                </button>
                
                <div className="flex items-center gap-1 mx-4">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        page === pageNum
                          ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-slate-50 rounded-xl border border-slate-300 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'annulation */}
      {isCancelPopoverOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmer l'annulation</h3>
            <p className="text-slate-600 mb-4">
              Êtes-vous sûr de vouloir annuler cette procédure ? Cette action est irréversible.
            </p>
            
            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-slate-700 mb-2">
                Raison de l'annulation *
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Veuillez indiquer la raison de l'annulation (minimum 5 caractères)..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                rows={3}
                minLength={5}
                maxLength={500}
              />
              <div className="text-xs text-slate-500 mt-1 text-right">
                {cancelReason.length}/500 caractères
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button 
                onClick={() => {
                  setIsCancelPopoverOpen(false);
                  setCancelReason('');
                }} 
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium order-2 sm:order-1"
              >
                Retour
              </button>
              <button 
                onClick={() => proceduresToDisplay[0] && handleCancelProcedure(proceduresToDisplay[0]._id)} 
                disabled={isCancelling || cancelReason.length < 5}
                className="px-6 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-red-200 order-1 sm:order-2"
              >
                {isCancelling ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Annulation...
                  </span>
                ) : (
                  'Confirmer l\'annulation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProcedure;