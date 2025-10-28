import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
  Mail,
  RefreshCw,
  Calendar,
  ClipboardList,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface DashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    regularUsers: number;
  };
  rendezvous: {
    total: number;
    today: number;
    thisMonth: number;
    lastMonth: number;
  };
  procedures: {
    inProgress: number;
  };
  maintenance: {
    isActive: boolean;
    logoutUntil?: string;
  };
  messages?: {
    total: number;
    unread: number;
  };
}

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const end = endOfMonth > now ? now : endOfMonth;
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchStats = async () => {
    try {
      const { startDate, endDate } = getMonthRange();

      const [
        users,
        rendezvous,
        procedures,
        maintenance,
        messages
      ] = await Promise.all([
        fetch(`${VITE_API_URL}/api/users/stats`).then(res => res.json()),
        fetch(`${VITE_API_URL}/api/rendezvous/stats?startDate=${startDate}&endDate=${endDate}`).then(res => res.json()),
        fetch(`${VITE_API_URL}/api/procedures/stats`).then(res => res.json()).catch(() => ({ inProgress: 0 })),
        fetch(`${VITE_API_URL}/api/users/maintenance-status`).then(res => res.json()).catch(() => ({ isActive: false })),
        fetch(`${VITE_API_URL}/api/admin/contact/stats`).then(res => res.json()).catch(() => ({ total: 0, unread: 0 }))
      ]);

      setStats({
        users,
        rendezvous,
        procedures,
        maintenance,
        messages
      });
      setError(null);
    } catch (err: any) {
      console.error('Erreur lors du chargement des données:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      const res = await fetch(`${VITE_API_URL}/api/auth/logout-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur serveur (${res.status})`);
      }
      
      await fetchStats();
      alert('Tous les utilisateurs ont été déconnectés avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la déconnexion globale:', err);
      alert(err.message || 'Erreur lors de la déconnexion globale');
    } finally {
      setLogoutAllLoading(false);
      setShowLogoutConfirm(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <RefreshCw className='w-8 h-8 text-sky-500 animate-spin' />
        <span className='ml-2 text-sky-600'>Chargement des données...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen p-4'>
        <div className='text-center p-6 bg-white rounded-xl shadow-md max-w-md'>
          <AlertTriangle className='w-16 h-16 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>Erreur</h2>
          <p className='text-gray-600 mb-4'>{error}</p>
          <div className='flex gap-2 justify-center'>
            <button
              onClick={fetchStats}
              className='px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors'
            >
              Réessayer
            </button>
            <button
              onClick={() => navigate('/')}
              className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors'
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertTriangle className='w-16 h-16 text-amber-500 mx-auto mb-4' />
          <p className='text-gray-600'>Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <main className='min-h-screen bg-gray-50 p-4'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <section aria-labelledby="dashboard-title">
          <div className='bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl shadow-lg p-6 mb-6'>
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
              <div>
                <h1 id="dashboard-title" className='text-2xl md:text-3xl font-bold text-white'>
                  Dashboard Administrateur
                </h1>
                <p className='text-sky-100 mt-1'>
                  Panneau d'administration système
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button
                  onClick={fetchStats}
                  aria-label="Actualiser les données"
                  disabled={loading}
                  className='flex items-center gap-2 px-4 py-2 bg-white text-sky-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50'
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  disabled={logoutAllLoading || loading}
                  className='flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50'
                >
                  <LogOut className='w-4 h-4' />
                  {logoutAllLoading ? 'Déconnexion...' : 'Déconnecter Tous'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Statut de maintenance */}
        <div className='bg-white rounded-xl shadow-md p-6 mb-6 border border-sky-100'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-3'>
              {stats.maintenance.isActive ? (
                <AlertTriangle className='w-6 h-6 text-red-500' />
              ) : (
                <CheckCircle className='w-6 h-6 text-green-500' />
              )}
              <div>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Statut de maintenance
                </h3>
                <p className='text-gray-600'>
                  {stats.maintenance.isActive
                    ? 'Mode maintenance actif'
                    : 'Système opérationnel'}
                </p>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                stats.maintenance.isActive
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {stats.maintenance.isActive ? 'Actif' : 'Inactif'}
            </div>
          </div>
          {stats.maintenance.logoutUntil && (
            <div className='mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg'>
              <div className='flex items-center gap-2 text-amber-800'>
                <Clock className='w-4 h-4' />
                <span className='text-sm'>
                  Déconnexion forcée jusqu'au{' '}
                  {new Date(stats.maintenance.logoutUntil).toLocaleString(
                    'fr-FR',
                    {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Grille de statistiques */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'>
          {/* Carte Utilisateurs */}
          <div className='bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-sky-100'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 bg-sky-100 rounded-lg'>
                <Users className='w-6 h-6 text-sky-600' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900'>Utilisateurs</h3>
            </div>
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-600'>Total</span>
                <span className='text-2xl font-bold text-sky-600'>
                  {stats.users.totalUsers}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-sm text-gray-500'>Actifs</p>
                  <p className='font-medium text-green-600'>{stats.users.activeUsers}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Inactifs</p>
                  <p className='font-medium text-amber-600'>{stats.users.inactiveUsers}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Admins</p>
                  <p className='font-medium text-sky-600'>{stats.users.adminUsers}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Normaux</p>
                  <p className='font-medium text-gray-600'>{stats.users.regularUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Carte Rendez-vous */}
          <div className='bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-emerald-100'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 bg-emerald-100 rounded-lg'>
                <Calendar className='w-6 h-6 text-emerald-600' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900'>Rendez-vous</h3>
            </div>
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-600'>Total</span>
                <span className='text-2xl font-bold text-emerald-600'>
                  {stats.rendezvous.total}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-sm text-gray-500'>Aujourd&apos;hui</p>
                  <p className='font-medium text-amber-600'>{stats.rendezvous.today}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Ce mois</p>
                  <p className='font-medium text-emerald-600'>{stats.rendezvous.thisMonth}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Mois dernier</p>
                  <p className='font-medium text-gray-600'>{stats.rendezvous.lastMonth}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Carte Procédures */}
          <div className='bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-violet-100'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 bg-violet-100 rounded-lg'>
                <ClipboardList className='w-6 h-6 text-violet-600' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900'>Procédures</h3>
            </div>
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-600'>En cours</span>
                <span className='text-2xl font-bold text-violet-600'>
                  {stats.procedures.inProgress}
                </span>
              </div>
              <div className='mt-6 text-center'>
                <div className="radial-progress text-violet-600"
                  style={{ "--value": 70, "--size": "3rem", "--thickness": "2px" } as React.CSSProperties}>
                  <span className='text-xs text-gray-500'>En traitement</span>
                </div>
              </div>
            </div>
          </div>

          {/* Carte Contacts */}
          <div className='bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-amber-100'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 bg-amber-100 rounded-lg'>
                <Mail className='w-6 h-6 text-amber-600' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900'>Messages</h3>
            </div>
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-600'>Total</span>
                <span className='text-2xl font-bold text-amber-600'>
                  {stats.messages?.total ?? 0}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-sm text-gray-500'>Non lus</p>
                  <p className='font-medium text-amber-600'>{stats.messages?.unread ?? 0}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500'>Répondus</p>
                  <p className='font-medium text-emerald-600'>{(stats.messages?.total ?? 0) - (stats.messages?.unread ?? 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <section aria-labelledby="quick-actions-title" className='mb-8'>
          <h2 id="quick-actions-title" className='text-xl font-bold text-gray-900 mb-4'>Actions rapides</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {[
              {
                title: 'Gérer les rendez-vous',
                icon: Calendar,
                color: 'emerald',
                count: stats.rendezvous.today,
                action: () => navigate('/gestionnaire/rendez-vous')
              },
              {
                title: 'Gérer les procédures',
                icon: ClipboardList,
                color: 'violet',
                count: stats.procedures.inProgress,
                action: () => navigate('/gestionnaire/procedures')
              },
              {
                title: 'Gérer les utilisateurs',
                icon: Users,
                color: 'sky',
                count: stats.users.totalUsers,
                action: () => navigate('/gestionnaire/utilisateurs')
              }
            ].map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className={`flex items-center gap-4 p-4 bg-${item.color}-50 hover:bg-${item.color}-100 rounded-xl transition-colors border border-${item.color}-200`}
              >
                <div className={`p-3 rounded-lg bg-${item.color}-100`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                </div>
                <div className="flex flex-col text-left">
                  <span className={`text-lg font-semibold text-${item.color}-700`}>{item.title}</span>
                  <span className={`text-sm text-${item.color}-500`}>{item.count}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Confirmation déconnexion globale */}
        {showLogoutConfirm && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
            <div className='bg-white rounded-xl shadow-xl max-w-md w-full'>
              <div className='p-6'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='w-10 h-10 rounded-full bg-red-100 flex items-center justify-center'>
                    <LogOut className='w-5 h-5 text-red-600' />
                  </div>
                  <h3 className='text-lg font-semibold text-gray-900'>Déconnexion globale</h3>
                </div>
                <p className='text-sm text-gray-600 mb-6'>
                  Êtes-vous sûr de vouloir déconnecter tous les utilisateurs ? 
                  Cette action est irréversible et active le mode maintenance.
                </p>
                <div className='flex justify-end gap-2'>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className='px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors'
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleLogoutAll}
                    disabled={logoutAllLoading}
                    className='px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50'
                  >
                    {logoutAllLoading ? 'Traitement...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminDashboard;