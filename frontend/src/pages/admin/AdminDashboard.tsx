import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  FileText, 
  LogOut, 
  BarChart3,
  TrendingUp,
  Mail,
  Shield,
  Settings,
  RefreshCw,
  AlertCircle,
  LucideIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Types
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
}

interface ContactStats {
  total: number;
  unread: number;
  responded: number;
}

interface RendezvousStats {
  total: number;
  today: number;
  thisMonth: number;
  confirmed: number;
  pending: number;
}

interface ProcedureStats {
  totalCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
}

interface AllStats {
  users: UserStats;
  contacts: ContactStats;
  rendezvous: RendezvousStats;
  procedures: ProcedureStats;
}

interface ProcedureDataPoint {
  date: string;
  count: number;
}

interface ApiError {
  message: string;
  status?: number;
}

// Configuration Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard: React.FC = () => {
  const { user, token, logout, refreshToken, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // États
  const [stats, setStats] = useState<AllStats>({
    users: { totalUsers: 0, activeUsers: 0, adminUsers: 0 },
    contacts: { total: 0, unread: 0, responded: 0 },
    rendezvous: { total: 0, today: 0, thisMonth: 0, confirmed: 0, pending: 0 },
    procedures: { totalCount: 0, inProgressCount: 0, completedCount: 0, cancelledCount: 0 }
  });
  
  const [procedureChartData, setProcedureChartData] = useState<ProcedureDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Vérification de sécurité au montage
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'admin') {
      console.warn(' Accès non autorisé - Redirection vers la page de connexion');
      logout('/connexion');
      return;
    }
  }, [isAuthenticated, user, logout]);

  // Fonction de fetch sécurisée avec gestion du token
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('Token non disponible');
    }

    let currentToken = token;
    let retryCount = 0;
    const maxRetries = 2;

    const makeRequest = async (authToken: string): Promise<Response> => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include' as RequestCredentials,
      });

      // Si token expiré, on tente de le rafraîchir
      if (response.status === 401 && retryCount < maxRetries) {
        retryCount++;
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            currentToken = newToken;
            return makeRequest(newToken);
          }
        }
        
        throw new Error('Échec du rafraîchissement du token');
      }

      return response;
    };

    return makeRequest(currentToken);
  }, [token, refreshToken]);

  // Chargement des statistiques
  const fetchStats = useCallback(async () => {
    if (!token || !user || user.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const endpoints = [
        { url: `${VITE_API_URL}/api/users/stats`, key: 'users' },
        { url: `${VITE_API_URL}/api/contact/stats`, key: 'contacts' },
        { url: `${VITE_API_URL}/api/rendezvous/stats/dashboard`, key: 'rendezvous' },
        { url: `${VITE_API_URL}/api/procedures/dashboard-stats`, key: 'procedures' },
      ];

      const results = await Promise.allSettled(
        endpoints.map(endpoint => 
          fetchWithAuth(endpoint.url).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
        )
      );

      const newStats: AllStats = { ...stats };
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const endpoint = endpoints[index];
          newStats[endpoint.key as keyof AllStats] = {
            ...newStats[endpoint.key as keyof AllStats],
            ...result.value
          };
        } else {
          console.warn(`Échec du chargement des stats ${endpoints[index].key}:`, result.reason);
        }
      });

      setStats(newStats);

    } catch (err) {
      const error = err as ApiError;
      console.error('❌ Erreur lors du chargement des statistiques:', error);
      setError(error.message || 'Erreur de chargement des données');
      
      if (error.message.includes('token') || error.message.includes('authentification')) {
        toast.error('Session expirée - Reconnexion nécessaire');
        logout('/connexion');
      }
    } finally {
      setLoading(false);
    }
  }, [token, user, fetchWithAuth, VITE_API_URL, logout]);

  // Chargement des données du graphique
  const fetchProcedureChartData = useCallback(async (range: 'week' | 'month' | 'year') => {
    if (!token) return;

    try {
      const response = await fetchWithAuth(
        `${VITE_API_URL}/api/procedures/stats-by-range?range=${range}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setProcedureChartData(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du graphique:', error);
    }
  }, [token, fetchWithAuth, VITE_API_URL]);

  // Rafraîchissement manuel
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchProcedureChartData(timeRange)
    ]);
    setRefreshing(false);
    toast.success('Données actualisées');
  };

  // Déconnexion de tous les utilisateurs
  const handleLogoutAll = async () => {
    if (!token) return;

    setIsLoggingOutAll(true);
    try {
      const response = await fetchWithAuth(`${VITE_API_URL}/api/auth/logout-all`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la déconnexion générale');
      }

      const result = await response.json();
      
      toast.success(
        `Déconnexion générale réussie ! ${result.stats?.usersLoggedOut || 0} utilisateurs déconnectés`,
        { autoClose: 5000 }
      );
      
      setLogoutAllOpen(false);
    } catch (error) {
      console.error('Erreur LogoutAll:', error);
      toast.error('Erreur lors de la déconnexion générale');
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  // Navigation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Configuration des graphiques
  const chartData = useMemo(() => {
    const labels = procedureChartData.map(d => {
      const date = new Date(d.date);
      return timeRange === 'week' 
        ? date.toLocaleDateString('fr-FR', { weekday: 'short' })
        : timeRange === 'month'
        ? date.getDate().toString()
        : date.toLocaleDateString('fr-FR', { month: 'short' });
    });
    
    const data = procedureChartData.map(d => d.count);
    
    return {
      labels,
      datasets: [
        {
          label: 'Procédures créées',
          data,
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };
  }, [procedureChartData, timeRange]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: 'rgb(100, 116, 139)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgb(100, 116, 139)',
        },
      },
    },
  };

  // Effets
  useEffect(() => {
    if (user?.role === 'admin' && token) {
      fetchStats();
      fetchProcedureChartData(timeRange);
    }
  }, [user, token, timeRange, fetchStats, fetchProcedureChartData]);

  // Composants UI
  interface StatCardProps {
    icon: LucideIcon;
    title: string;
    value: number;
    subtitle?: string;
    trend?: number;
    color: 'blue' | 'green' | 'amber' | 'purple' | 'red';
    loading?: boolean;
  }

  const StatCard: React.FC<StatCardProps> = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    trend,
    color = 'blue',
    loading = false 
  }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 border-blue-200',
      green: 'from-emerald-500 to-emerald-600 border-emerald-200',
      amber: 'from-amber-500 to-amber-600 border-amber-200',
      purple: 'from-purple-500 to-purple-600 border-purple-200',
      red: 'from-red-500 to-red-600 border-red-200',
    };

    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-6 border shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}>
        <div className="flex items-start justify-between text-white">
          <div className="flex-1">
            <p className="text-blue-100 text-sm font-medium mb-2">{title}</p>
            
            {loading ? (
              <div className="h-8 bg-white/20 rounded-lg animate-pulse mb-2"></div>
            ) : (
              <p className="text-3xl font-bold mb-2">
                {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
              </p>
            )}
            
            {subtitle && !loading && (
              <p className="text-blue-100/80 text-sm">{subtitle}</p>
            )}
            
            {trend !== undefined && !loading && (
              <div className={`flex items-center mt-2 text-xs ${
                trend >= 0 ? 'text-green-200' : 'text-red-200'
              }`}>
                <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  interface QuickActionProps {
    icon: LucideIcon;
    title: string;
    description: string;
    onClick: () => void;
    color: 'blue' | 'green' | 'amber' | 'purple';
  }

  const QuickAction: React.FC<QuickActionProps> = ({ 
    icon: Icon, 
    title, 
    description, 
    onClick, 
    color = 'blue' 
  }) => {
    const colorClasses = {
      blue: 'border-blue-200 hover:border-blue-300 bg-blue-50',
      green: 'border-emerald-200 hover:border-emerald-300 bg-emerald-50',
      amber: 'border-amber-200 hover:border-amber-300 bg-amber-50',
      purple: 'border-purple-200 hover:border-purple-300 bg-purple-50',
    };

    const iconColors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-emerald-600 bg-emerald-100',
      amber: 'text-amber-600 bg-amber-100',
      purple: 'text-purple-600 bg-purple-100',
    };

    return (
      <button
        onClick={onClick}
        className={`w-full text-left rounded-2xl p-5 border-2 transition-all duration-200 hover:shadow-lg active:scale-95 ${colorClasses[color]}`}
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-xl ${iconColors[color]} flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
      </button>
    );
  };

  // Écran de chargement
  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // Vérification des permissions
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                <p className="text-gray-600 text-sm">Administration de la plateforme</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="font-medium">Actualiser</span>
              </button>
              
              <button
                onClick={() => setLogoutAllOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Déconnecter tous</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <StatCard 
            icon={Users}
            title="Utilisateurs"
            value={stats.users.totalUsers}
            subtitle={`${stats.users.activeUsers} actifs`}
            trend={5}
            color="blue"
            loading={loading}
          />
          <StatCard 
            icon={Calendar}
            title="Rendez-vous"
            value={stats.rendezvous.total}
            subtitle={`${stats.rendezvous.today} aujourd'hui`}
            trend={12}
            color="green"
            loading={loading}
          />
          <StatCard 
            icon={MessageSquare}
            title="Messages"
            value={stats.contacts.total}
            subtitle={`${stats.contacts.unread} non lus`}
            trend={-2}
            color="amber"
            loading={loading}
          />
          <StatCard 
            icon={FileText}
            title="Procédures"
            value={stats.procedures.totalCount}
            subtitle={`${stats.procedures.inProgressCount} en cours`}
            trend={8}
            color="purple"
            loading={loading}
          />
        </div>

        {/* Quick Actions & Chart Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {/* Quick Actions */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 text-blue-600 mr-2" />
                Actions rapides
              </h2>
              
              <div className="space-y-3">
                <QuickAction
                  icon={Users}
                  title="Gérer les utilisateurs"
                  description="Voir et modifier les comptes utilisateurs"
                  onClick={() => handleNavigation('/admin/utilisateurs')}
                  color="blue"
                />
                <QuickAction
                  icon={Calendar}
                  title="Rendez-vous"
                  description="Gérer les rendez-vous programmés"
                  onClick={() => handleNavigation('/admin/rendezvous')}
                  color="green"
                />
                <QuickAction
                  icon={Mail}
                  title="Messages"
                  description="Répondre aux messages de contact"
                  onClick={() => handleNavigation('/admin/messages')}
                  color="amber"
                />
                <QuickAction
                  icon={TrendingUp}
                  title="Procédures"
                  description="Suivi des procédures en cours"
                  onClick={() => handleNavigation('/admin/procedures')}
                  color="purple"
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-3 sm:mb-0">
                  <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
                  Évolution des procédures
                </h2>
                
                <div className="flex space-x-2">
                  {(['week', 'month', 'year'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        timeRange === range 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {range === 'week' ? 'Semaine' : range === 'month' ? 'Mois' : 'Année'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-64 lg:h-80">
                {procedureChartData.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    {loading ? 'Chargement des données...' : 'Aucune donnée disponible'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Erreur de chargement</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Logout All Modal */}
      {logoutAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isLoggingOutAll && setLogoutAllOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Déconnexion générale
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Cette action déconnectera immédiatement tous les utilisateurs. Êtes-vous sûr de vouloir continuer ?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setLogoutAllOpen(false)}
                disabled={isLoggingOutAll}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleLogoutAll}
                disabled={isLoggingOutAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoggingOutAll ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;