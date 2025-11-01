// AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  FileText, 
  LogOut, 
  BarChart3,
  TrendingUp,
  Mail
} from 'lucide-react';
import { toast } from 'react-toastify'; // Ajouter l'import manquant
import { useNavigate } from 'react-router-dom'; // Ajouter pour la navigation

const AdminDashboard = () => {
  const { token, logout, refreshToken, user } = useAuth();
  const navigate = useNavigate(); // Initialiser navigate

  const [stats, setStats] = useState({
    users: { totalUsers: 0, activeUsers: 0, adminUsers: 0 },
    contacts: { total: 0, unread: 0, responded: 0 },
    rendezvous: { total: 0, today: 0, thisMonth: 0 },
    procedures: { totalCount: 0, inProgressCount: 0, completedCount: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Ajouter l'état manquant

  const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Fonction pour récupérer les statistiques
  const fetchWithAuth = async (url) => {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (res.status === 401 && typeof refreshToken === 'function') {
      const refreshed = await refreshToken();
      if (refreshed) {
        return fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }
      await new Promise(r => setTimeout(r, 500));
      return fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    }
    return res;
  };

  const fetchStats = async () => {
    if (!token) return;
    
    try {
      setRefreshing(true);

      // Vérifier que l'utilisateur est admin
      if (user && user.role !== 'admin') {
        logout('/connexion');
        return;
      }

      const [usersResponse, contactsResponse, rendezvousResponse, proceduresResponse] = await Promise.all([
        fetchWithAuth(`${VITE_API_URL}/api/users/stats`),
        fetchWithAuth(`${VITE_API_URL}/api/admin/contact/stats`),
        fetchWithAuth(`${VITE_API_URL}/api/rendezvous/stats/dashboard`),
        fetchWithAuth(`${VITE_API_URL}/api/procedures/dashboard-stats`),
      ]);

      const usersData = usersResponse?.ok
        ? await usersResponse.json()
        : { totalUsers: 0, activeUsers: 0, adminUsers: 0 };
        
      const contactsData = contactsResponse?.ok
        ? await contactsResponse.json()
        : { total: 0, unread: 0, responded: 0 };
        
      const rendezvousData = rendezvousResponse?.ok
        ? await rendezvousResponse.json()
        : { total: 0, today: 0, thisMonth: 0 };
        
      const proceduresData = proceduresResponse?.ok
        ? await proceduresResponse.json()
        : { totalCount: 0, inProgressCount: 0, completedCount: 0 };

      setStats({
        users: usersData,
        contacts: contactsData,
        rendezvous: rendezvousData,
        procedures: proceduresData,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${VITE_API_URL}/api/auth/logout-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la déconnexion générale');
      }

      const result = await response.json();
      
      toast.success(
        `Déconnexion générale réussie ! ${result.stats?.usersLoggedOut || 0} utilisateurs déconnectés`,
        { autoClose: 5000 }
      );
      
      setLogoutAllOpen(false);
      
    } catch (error) {
      console.error('Erreur LogoutAll:', error);
      toast.error(error.message || 'Erreur lors de la déconnexion générale');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  useEffect(() => {
    if (user && user.role === 'admin' && token) {
      fetchStats();
    } else if (!token) {
      // If no token, redirect to login
      logout('/connexion');
    }
  }, [token, user]);

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'sky', loading: cardLoading }) => (
    <div className={`bg-white rounded-xl p-4 shadow-lg border-l-4 border-${color}-500 transition-all duration-300 hover:shadow-xl`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          {cardLoading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 ml-4`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const QuickAction = ({ icon: Icon, title, description, onClick, color = 'sky' }) => (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-lg border border-gray-200 hover:border-${color}-300 transition-all duration-200 active:scale-95 text-left w-full`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg bg-${color}-100 flex-shrink-0`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{title}</h3>
          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{description}</p>
        </div>
      </div>
    </button>
  );

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">
            Accès non autorisé
          </div>
          <p className="text-gray-600 mt-2">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contenu Principal */}
      <main className="flex-1 pb-8">
        <div className="px-4 lg:px-8 py-6">
          {/* En-tête */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Tableau de bord administrateur
              </h1>
              <p className="text-gray-600 mt-2">
                Vue d'ensemble de votre plateforme
              </p>
            </div>
            
            {/* Boutons desktop */}
            <div className="hidden lg:flex items-center space-x-3 mt-4 lg:mt-0">
              <button
                onClick={() => setLogoutAllOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Déconnecter tous</span>
              </button>
              
              <button
                onClick={() => logout('/connexion')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Se déconnecter</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
              icon={Users} 
              title="Utilisateurs" 
              value={stats.users.totalUsers}
              subtitle={`${stats.users.activeUsers} actifs`}
              color="sky"
              loading={loading}
            />
            <StatCard 
              icon={Calendar} 
              title="Rendez-vous" 
              value={stats.rendezvous.total}
              subtitle={`${stats.rendezvous.today} aujourd'hui`}
              color="emerald"
              loading={loading}
            />
            <StatCard 
              icon={MessageSquare} 
              title="Messages" 
              value={stats.contacts.total}
              subtitle={`${stats.contacts.unread} non lus`}
              color="amber"
              loading={loading}
            />
            <StatCard 
              icon={FileText} 
              title="Procédures" 
              value={stats.procedures.totalCount}
              subtitle={`${stats.procedures.inProgressCount} en cours`}
              color="violet"
              loading={loading}
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 text-sky-600 mr-2" />
              Actions rapides
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickAction
                icon={Users}
                title="Gérer les utilisateurs"
                description="Voir et modifier les comptes utilisateurs"
                onClick={() => handleNavigation('/admin/utilisateurs')}
                color="sky"
              />
              <QuickAction
                icon={Calendar}
                title="Rendez-vous"
                description="Gérer les rendez-vous programmés"
                onClick={() => handleNavigation('/admin/rendezvous')}
                color="emerald"
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
                color="violet"
              />
            </div>
          </div>

          {/* Boutons mobiles supplémentaires */}
          <div className="lg:hidden flex flex-col space-y-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setLogoutAllOpen(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              disabled={isLoading}
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Déconnecter tous les utilisateurs</span>
            </button>
            
            <button
              onClick={() => logout('/connexion')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Se déconnecter</span>
            </button>
          </div>
        </div>
      </main>

      {/* Logout All Confirmation Popover */}
      {logoutAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => !isLoading && setLogoutAllOpen(false)}
          />
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Déconnexion générale
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir déconnecter tous les utilisateurs ? Cette action est irréversible et forcera tous les utilisateurs à se reconnecter.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setLogoutAllOpen(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleLogoutAll}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
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