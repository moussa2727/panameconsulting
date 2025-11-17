import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProcedures: number;
  pendingProcedures: number;
  totalRendezvous: number;
  todayRendezvous: number;
  unreadMessages: number;
  procedureStats: {
    byStatus: Array<{ _id: string; count: number }>;
    byDestination: Array<{ _id: string; count: number }>;
  };
}

const AdminDashboard = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'procedures' | 'messages'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [error, setError] = useState<string | null>(null);

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  // Fonction utilitaire pour le délai
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Fonction pour faire des requêtes authentifiées avec gestion du rate limiting
  const makeAuthenticatedRequest = async (url: string, retryCount = 0, options: RequestInit = {}): Promise<any> => {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 seconde
    const REQUEST_TIMEOUT = 10000; // 10 secondes

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          credentials: 'include', // ✅ Cookies HTTP Only envoyés automatiquement
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Gestion des erreurs 429 (Trop de requêtes)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 
            Math.min(BASE_DELAY * Math.pow(2, retryCount), 30000); // Max 30s delay
          
          if (retryCount >= MAX_RETRIES) {
            throw new Error('Trop de tentatives de requête. Veuillez réessayer plus tard.');
          }

          console.log(`⏳ Trop de requêtes. Nouvelle tentative dans ${retryAfter}ms...`);
          await delay(Number(retryAfter));
          return makeAuthenticatedRequest(url, retryCount + 1, options);
        }

        // Gestion des erreurs 401 (Non autorisé)
        if (response.status === 401) {
          console.log('🔐 Session expirée - Déconnexion...');
          logout();
          throw new Error('Session expirée - Veuillez vous reconnecter');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Erreur ${response.status}: ${response.statusText}`
          );
        }

        return await response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('La requête a expiré. Veuillez vérifier votre connexion et réessayer.');
        }
        throw error;
      }
    } catch (error: any) {
      console.error(`❌ Erreur requête ${url}:`, error);
      throw error;
    }
  };

  // Charger les statistiques du dashboard avec gestion des erreurs améliorée
  const fetchDashboardStats = async (): Promise<DashboardStats | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Valeurs par défaut
      const defaultStats: DashboardStats = {
        totalUsers: 0,
        activeUsers: 0,
        totalProcedures: 0,
        pendingProcedures: 0,
        totalRendezvous: 0,
        todayRendezvous: 0,
        unreadMessages: 0,
        procedureStats: {
          byStatus: [],
          byDestination: []
        }
      };

      // Vérifier que l'utilisateur est admin
      if (!user?.isAdmin) {
        throw new Error('Accès administrateur requis');
      }

      try {
        // Récupération des données en parallèle quand c'est possible
        const [usersData, rendezvousData, messagesData] = await Promise.allSettled([
          makeAuthenticatedRequest(`${VITE_API_URL}/api/users/stats`),
          makeAuthenticatedRequest(`${VITE_API_URL}/api/rendezvous?limit=1000`),
          makeAuthenticatedRequest(`${VITE_API_URL}/api/contact/stats`)
        ]);

        // Traitement des réponses
        const users = usersData.status === 'fulfilled' ? usersData.value : null;
        const rendezvous = rendezvousData.status === 'fulfilled' ? rendezvousData.value : null;
        const messages = messagesData.status === 'fulfilled' ? messagesData.value : null;

        // Calcul des rendez-vous du jour
        const today = new Date().toISOString().split('T')[0];
        const todayRendezvous = rendezvous?.data?.filter((rdv: any) => 
          rdv.date === today
        )?.length || 0;

        // Récupération des données des procédures
        let proceduresData = { total: 0, data: [] };
        let procedureStatsData = { byStatus: [], byDestination: [] };
        
        try {
          const [proceduresRes, statsRes] = await Promise.allSettled([
            makeAuthenticatedRequest(`${VITE_API_URL}/api/admin/procedures/all?limit=1`),
            makeAuthenticatedRequest(`${VITE_API_URL}/api/admin/procedures/stats`)
          ]);
          
          proceduresData = proceduresRes.status === 'fulfilled' ? proceduresRes.value : proceduresData;
          procedureStatsData = statsRes.status === 'fulfilled' ? statsRes.value : procedureStatsData;
        } catch (procedureError) {
          console.warn('⚠️ Statistiques procédures non disponibles:', procedureError);
        }

        // Calcul des procédures en attente
        const pendingProcedures = proceduresData?.data?.filter((proc: any) => 
          proc.statut === 'En cours'
        )?.length || 0;

        const statsData: DashboardStats = {
          totalUsers: users?.totalUsers || 0,
          activeUsers: users?.activeUsers || 0,
          totalProcedures: proceduresData?.total || proceduresData?.data?.length || 0,
          pendingProcedures,
          totalRendezvous: rendezvous?.total || rendezvous?.data?.length || 0,
          todayRendezvous,
          unreadMessages: messages?.unread || 0,
          procedureStats: procedureStatsData
        };

        setStats(statsData);
        return statsData;
      } catch (dataError) {
        console.warn('⚠️ Certaines données ne sont pas disponibles:', dataError);
        setStats(defaultStats);
        return defaultStats;
      }
    } catch (error) {
      console.error('❌ Erreur chargement dashboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(`Erreur lors du chargement des données: ${errorMessage}`);
      toast.error('Erreur lors du chargement des données');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadData = async () => {
      if (!isAuthenticated || !user?.isAdmin) return;
      
      try {
        await fetchDashboardStats();
      } catch (error) {
        if (isMounted && !abortController.signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          setError(`Impossible de charger les données: ${errorMessage}`);
          toast.error('Erreur lors du chargement des données');
        }
      }
    };

    loadData();

    // Nettoyage lors du démontage du composant
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [isAuthenticated, user]);

  // Fonction pour obtenir la couleur en fonction du statut
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'En cours': 'bg-blue-500',
      'Terminée': 'bg-green-500',
      'En attente': 'bg-yellow-500',
      'Annulée': 'bg-red-500',
      'Refusée': 'bg-red-500',
      'COMPLETED': 'bg-green-500',
      'IN_PROGRESS': 'bg-blue-500',
      'PENDING': 'bg-yellow-500',
      'REJECTED': 'bg-red-500',
      'CANCELLED': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  // Formatage des nombres
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Obtenir le nom d'affichage du statut
  const getStatusDisplayName = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminée',
      'PENDING': 'En attente',
      'REJECTED': 'Refusée',
      'CANCELLED': 'Annulée'
    };
    return statusMap[status] || status;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Accès non autorisé</h2>
          <p className="text-slate-600">Veuillez vous connecter pour accéder au tableau de bord.</p>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-ban text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Accès refusé</h2>
          <p className="text-slate-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* En-tête du dashboard */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Tableau de Bord Administrateur</h1>
          <p className="text-slate-600">
            Bienvenue, {user.firstName} {user.lastName}
          </p>
        </div>

        {/* Navigation par onglets */}
        <nav className="mb-8" aria-label="Navigation du tableau de bord">
          <div className="flex space-x-1 bg-white/50 rounded-2xl p-1 border border-slate-200/60 w-fit">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: 'chart-pie' },
              { id: 'procedures', label: 'Procédures', icon: 'tasks' },
              { id: 'messages', label: 'Messages', icon: 'envelope' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <i className={`fas fa-${tab.icon}`}></i>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Affichage des erreurs */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-circle text-red-500"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        {/* Contenu du tableau de bord */}
        {activeTab === 'overview' && stats && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Carte Utilisateurs */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-users text-blue-600 text-xl"></i>
                  </div>
                  <span className="text-sm font-medium text-slate-500">Utilisateurs</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">{formatNumber(stats.totalUsers)}</h3>
                  <p className="text-sm text-slate-500">
                    <span className="text-green-500 font-medium">+{stats.activeUsers} actifs</span> ce mois-ci
                  </p>
                </div>
              </div>

              {/* Carte Procédures */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-tasks text-green-600 text-xl"></i>
                  </div>
                  <span className="text-sm font-medium text-slate-500">Procédures</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">{formatNumber(stats.totalProcedures)}</h3>
                  <p className="text-sm text-slate-500">
                    <span className="text-yellow-500 font-medium">{stats.pendingProcedures} en cours</span>
                  </p>
                </div>
              </div>

              {/* Carte Rendez-vous */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-calendar-alt text-purple-600 text-xl"></i>
                  </div>
                  <span className="text-sm font-medium text-slate-500">Rendez-vous</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">{formatNumber(stats.totalRendezvous)}</h3>
                  <p className="text-sm text-slate-500">
                    <span className="text-blue-500 font-medium">{stats.todayRendezvous} aujourd'hui</span>
                  </p>
                </div>
              </div>

              {/* Carte Messages */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-envelope text-amber-600 text-xl"></i>
                  </div>
                  <span className="text-sm font-medium text-slate-500">Messages</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">
                    {stats.unreadMessages > 0 ? (
                      <span className="text-amber-600">{formatNumber(stats.unreadMessages)} non lus</span>
                    ) : (
                      '0 non lus'
                    )}
                  </h3>
                  <p className="text-sm text-slate-500">
                    <span className="font-medium">Messages non lus</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Graphiques et statistiques détaillées */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Graphique des procédures par statut */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Statut des procédures</h3>
                <div className="space-y-4">
                  {stats.procedureStats.byStatus.length > 0 ? (
                    stats.procedureStats.byStatus.map((item: any) => (
                      <div key={item._id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {getStatusDisplayName(item._id)}
                          </span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${getStatusColor(item._id)}`}
                            style={{ width: `${(item.count / Math.max(1, stats.totalProcedures)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                  )}
                </div>
              </div>

              {/* Graphique des procédures par destination */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Procédures par destination</h3>
                <div className="space-y-4">
                  {stats.procedureStats.byDestination.length > 0 ? (
                    stats.procedureStats.byDestination.map((item: any) => (
                      <div key={item._id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700 truncate max-w-[200px]">
                            {item._id || 'Non spécifié'}
                          </span>
                          <span className="text-slate-500">{item.count}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full bg-blue-500"
                            style={{ width: `${(item.count / Math.max(1, stats.totalProcedures)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Procédures */}
        {activeTab === 'procedures' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Gestion des procédures</h2>
            <div className="overflow-x-auto">
              <p className="text-slate-600">Fonctionnalité en cours de développement...</p>
            </div>
          </div>
        )}

        {/* Section Messages */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Messages non lus</h2>
            <div className="overflow-x-auto">
              <p className="text-slate-600">Fonctionnalité en cours de développement...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;