import {
  CheckCircle,
  Edit,
  Eye,
  EyeOff,
  Filter,
  LogOut,
  MoreVertical,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
  XCircle,
  Users,
  Shield,
  Ban,
  Activity,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../utils/AuthContext';
import { Navigate } from 'react-router-dom';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  logoutUntil?: string;
}

interface NewUser {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
  role: string;
}

const UsersManagement: React.FC = () => {
  const { user, isLoading: authLoading, token, refreshToken, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0
  });
  const [newUser, setNewUser] = useState<NewUser>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    password: '',
    role: 'user',
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    role: 'user',
  });

  const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

  const fetchWithAuth = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${VITE_API_URL}${path}`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      ...options,
    });
    if (res.status === 401 && typeof refreshToken === 'function') {
      const refreshed = await refreshToken();
      if (refreshed) {
        return fetch(`${VITE_API_URL}${path}`, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            ...(options.headers || {}),
          },
          ...options,
        });
      }
    }
    return res;
  };

  if (!authLoading && (!user || user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (user && user.role === 'admin') {
      (async () => {
        // Auth pre-check to ensure valid access token before bulk calls
        const meRes = await fetchWithAuth(`/api/auth/me`);
        if (!meRes.ok) {
          const refreshed = await (typeof refreshToken === 'function' ? refreshToken() : Promise.resolve(false));
          if (!refreshed) {
            logout('/connexion');
            return;
          }
        }

        // Load users first (admin protected), then the rest in parallel
        await fetchUsers();
        await Promise.all([fetchStats(), fetchMaintenanceStatus()]);
      })();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/users`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error(
          'Erreur lors du chargement des utilisateurs:',
          response.statusText
        );
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth(`/api/users/stats`);

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await fetchWithAuth(`/api/users/maintenance-status`);

      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.isActive);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du statut de maintenance:', error);
    }
  };

  const toggleMaintenanceMode = async (enabled: boolean) => {
    try {
      const response = await fetchWithAuth(`/api/users/maintenance-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setMaintenanceMode(enabled);
        alert(`Mode maintenance ${enabled ? 'activé' : 'désactivé'}`);
      } else {
        const data = await response.json();
        alert(data.message || "Erreur lors de la modification du mode maintenance");
      }
    } catch (error) {
      console.error('Erreur lors de la modification du mode maintenance:', error);
      alert('Erreur de connexion');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth(`/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        const addedUser = await response.json();
        setUsers([...users, addedUser]);
        setIsAddingUser(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          telephone: '',
          password: '',
          role: 'user',
        });
        fetchStats();
        alert('Utilisateur ajouté avec succès');
      } else {
        const data = await response.json();
        alert(data.message || "Erreur lors de l'ajout de l'utilisateur");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      alert('Erreur de connexion');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetchWithAuth(`/api/users/${editingUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(
          users.map(user => (user._id === editingUser._id ? updatedUser : user))
        );
        setEditingUser(null);
        fetchStats();
        alert('Utilisateur mis à jour avec succès');
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur de connexion');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetchWithAuth(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter(user => user._id !== userId));
        setShowDeleteModal(null);
        fetchStats();
        alert('Utilisateur supprimé avec succès');
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur de connexion');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const response = await fetchWithAuth(`/api/users/${userId}/toggle-status`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(user => (user._id === userId ? updatedUser : user)));
        fetchStats();
        alert('Statut utilisateur mis à jour');
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur de connexion');
    }
  };

  const handleLogoutAll = async () => {
    try {
      const response = await fetchWithAuth(`/api/auth/logout-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        setShowLogoutAllModal(false);
        fetchStats();
        alert(`Déconnexion réussie: ${result.message}`);
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de la déconnexion');
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      alert('Erreur de connexion');
    }
  };

  const checkUserAccess = async (userId: string) => {
    try {
      const response = await fetchWithAuth(`/api/users/check-access/${userId}`);

      if (response.ok) {
        const data = await response.json();
        alert(`L'utilisateur ${data.hasAccess ? 'a' : 'n\'a pas'} accès`);
      } else {
        const data = await response.json();
        alert(data.message || 'Erreur lors de la vérification');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      alert('Erreur de connexion');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.telephone &&
        user.telephone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && user.role === 'admin') ||
      (roleFilter === 'user' && user.role === 'user');

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-sky-50'>
        <div className='text-center'>
          <FaSpinner className='animate-spin text-sky-600 text-4xl mx-auto' />
          <p className='mt-4 text-sky-700 font-medium'>
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-sky-50'>
        <div className='text-center'>
          <FaSpinner className='animate-spin text-sky-600 text-4xl mx-auto' />
          <p className='mt-4 text-sky-700 font-medium'>
            Chargement des données...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 py-4 px-3 sm:px-4 lg:px-6'>
      <div className='max-w-7xl mx-auto'>
        {/* En-tête avec actions */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6'>
          <div className='p-4 sm:p-6 border-b border-gray-100'>
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0'>
              <div className='flex-1'>
                <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>
                  Gestion des utilisateurs
                </h1>
                <p className='text-sm sm:text-base text-gray-600 mt-1 sm:mt-2'>
                  Gérez les comptes utilisateurs et leurs permissions
                </p>
              </div>
              
              {/* Actions principales - Desktop */}
              <div className='hidden lg:flex flex-wrap gap-2'>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className='flex items-center px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all duration-200 active:scale-95 shadow-sm'
                >
                  <UserPlus className='w-4 h-4 mr-2' />
                  Ajouter
                </button>
                <button
                  onClick={() => {
                    fetchUsers();
                    fetchStats();
                    fetchMaintenanceStatus();
                  }}
                  className='flex items-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 active:scale-95'
                >
                  <RefreshCw className='w-4 h-4 mr-2' />
                  Actualiser
                </button>
                <button
                  onClick={() => setShowLogoutAllModal(true)}
                  className='flex items-center px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 active:scale-95 border border-red-200'
                >
                  <LogOut className='w-4 h-4 mr-2' />
                  Déconnecter tous
                </button>
                <button
                  onClick={() => toggleMaintenanceMode(!maintenanceMode)}
                  className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-95 border ${
                    maintenanceMode 
                      ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' 
                      : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                  }`}
                >
                  {maintenanceMode ? (
                    <>
                      <Shield className='w-4 h-4 mr-2' />
                      Désactiver maintenance
                    </>
                  ) : (
                    <>
                      <Ban className='w-4 h-4 mr-2' />
                      Activer maintenance
                    </>
                  )}
                </button>
              </div>

              {/* Actions principales - Mobile */}
              <div className='lg:hidden flex flex-wrap gap-2'>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className='flex-1 flex items-center justify-center px-3 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all duration-200 active:scale-95 shadow-sm'
                >
                  <UserPlus className='w-4 h-4' />
                </button>
                <button
                  onClick={() => {
                    fetchUsers();
                    fetchStats();
                    fetchMaintenanceStatus();
                  }}
                  className='flex-1 flex items-center justify-center px-3 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 active:scale-95'
                >
                  <RefreshCw className='w-4 h-4' />
                </button>
                <button
                  onClick={() => setShowLogoutAllModal(true)}
                  className='flex-1 flex items-center justify-center px-3 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 active:scale-95 border border-red-200'
                >
                  <LogOut className='w-4 h-4' />
                </button>
                <button
                  onClick={() => toggleMaintenanceMode(!maintenanceMode)}
                  className={`flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-95 border ${
                    maintenanceMode 
                      ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' 
                      : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                  }`}
                >
                  {maintenanceMode ? <Shield className='w-4 h-4' /> : <Ban className='w-4 h-4' />}
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className='p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50'>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4'>
              <div className='bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100'>
                <div className='flex items-center space-x-2'>
                  <Users className='w-4 h-4 text-gray-400' />
                  <h3 className='text-xs font-medium text-gray-500'>Total</h3>
                </div>
                <p className='text-xl sm:text-2xl font-bold text-gray-900 mt-1'>
                  {stats.totalUsers}
                </p>
              </div>
              <div className='bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100'>
                <div className='flex items-center space-x-2'>
                  <Activity className='w-4 h-4 text-green-400' />
                  <h3 className='text-xs font-medium text-gray-500'>Actifs</h3>
                </div>
                <p className='text-xl sm:text-2xl font-bold text-green-600 mt-1'>
                  {stats.activeUsers}
                </p>
              </div>
              <div className='bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100'>
                <div className='flex items-center space-x-2'>
                  <Ban className='w-4 h-4 text-red-400' />
                  <h3 className='text-xs font-medium text-gray-500'>Inactifs</h3>
                </div>
                <p className='text-xl sm:text-2xl font-bold text-red-600 mt-1'>
                  {stats.totalUsers - stats.activeUsers}
                </p>
              </div>
              <div className='bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100'>
                <div className='flex items-center space-x-2'>
                  <Shield className='w-4 h-4 text-blue-400' />
                  <h3 className='text-xs font-medium text-gray-500'>Admins</h3>
                </div>
                <p className='text-xl sm:text-2xl font-bold text-blue-600 mt-1'>
                  {stats.adminUsers}
                </p>
              </div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className='p-4 sm:p-6 border-b border-gray-100'>
            <div className='flex flex-col space-y-3'>
              {/* Barre de recherche */}
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5' />
                <input
                  type='text'
                  placeholder='Rechercher un utilisateur...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2.5 text-sm sm:text-base border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 bg-white'
                />
              </div>

              {/* Filtres - Desktop */}
              <div className='hidden sm:flex space-x-3'>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className='flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 bg-white'
                >
                  <option value='all'>Tous les rôles</option>
                  <option value='admin'>Administrateurs</option>
                  <option value='user'>Utilisateurs</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className='flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 bg-white'
                >
                  <option value='all'>Tous les statuts</option>
                  <option value='active'>Actifs</option>
                  <option value='inactive'>Inactifs</option>
                </select>
              </div>

              {/* Filtres - Mobile */}
              <div className='sm:hidden flex space-x-3'>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className='flex items-center px-3 py-2.5 text-sm border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 bg-white'
                >
                  <Filter className='w-4 h-4 mr-2' />
                  Filtres
                </button>
              </div>

              {/* Filtres dépliants - Mobile */}
              {showFilters && (
                <div className='sm:hidden grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl'>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className='px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white'
                  >
                    <option value='all'>Tous les rôles</option>
                    <option value='admin'>Administrateurs</option>
                    <option value='user'>Utilisateurs</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className='px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white'
                  >
                    <option value='all'>Tous les statuts</option>
                    <option value='active'>Actifs</option>
                    <option value='inactive'>Inactifs</option>
                  </select>
                </div>
              )}

              {/* Compteur */}
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 font-medium'>
                  {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Liste des utilisateurs */}
          <div className='overflow-hidden'>
            {/* Desktop Table */}
            <div className='hidden lg:block overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Utilisateur
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Contact
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Rôle
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Statut
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Date d'inscription
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-100'>
                  {filteredUsers.map(user => (
                    <tr key={user._id} className='hover:bg-gray-50/50 transition-colors duration-150'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm'>
                            {user.firstName.charAt(0).toUpperCase()}
                            {user.lastName.charAt(0).toUpperCase()}
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-semibold text-gray-900'>
                              {user.firstName} {user.lastName}
                            </div>
                            <div className='text-sm text-gray-500'>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {user.telephone || 'Non renseigné'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {user.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {formatDate(user.createdAt)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex items-center justify-end space-x-1'>
                          <button
                            onClick={() => handleToggleStatus(user._id)}
                            className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                              user.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {user.isActive ? (
                              <XCircle className='w-4 h-4' />
                            ) : (
                              <CheckCircle className='w-4 h-4' />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditForm({
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                telephone: user.telephone || '',
                                role: user.role,
                              });
                            }}
                            className='p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 hover:scale-105'
                            title='Modifier'
                          >
                            <Edit className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => checkUserAccess(user._id)}
                            className='p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:scale-105'
                            title='Vérifier accès'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(user._id)}
                            className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105'
                            title='Supprimer'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className='lg:hidden space-y-3 p-4'>
              {filteredUsers.map(user => (
                <div key={user._id} className='bg-white rounded-xl shadow-sm border border-gray-100 p-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-start space-x-3 flex-1'>
                      <div className='w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm flex-shrink-0'>
                        {user.firstName.charAt(0).toUpperCase()}
                        {user.lastName.charAt(0).toUpperCase()}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center space-x-2 mb-1'>
                          <h3 className='text-sm font-semibold text-gray-900 truncate'>
                            {user.firstName} {user.lastName}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </div>
                        <p className='text-sm text-gray-600 truncate mb-1'>{user.email}</p>
                        <p className='text-xs text-gray-500 mb-2'>{user.telephone || 'Téléphone non renseigné'}</p>
                        <div className='flex items-center space-x-2'>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.isActive ? 'Actif' : 'Inactif'}
                          </span>
                          <span className='text-xs text-gray-500'>
                            Inscrit le {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu mobile */}
                    <div className='relative'>
                      <button
                        onClick={() => setMobileMenuOpen(mobileMenuOpen === user._id ? null : user._id)}
                        className='p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors'
                      >
                        <MoreVertical className='w-4 h-4' />
                      </button>
                      
                      {mobileMenuOpen === user._id && (
                        <div className='absolute right-0 top-8 z-10 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1'>
                          <button
                            onClick={() => {
                              handleToggleStatus(user._id);
                              setMobileMenuOpen(null);
                            }}
                            className={`w-full flex items-center px-4 py-2 text-sm ${
                              user.isActive ? 'text-red-600' : 'text-green-600'
                            } hover:bg-gray-50`}
                          >
                            {user.isActive ? (
                              <>
                                <XCircle className='w-4 h-4 mr-2' />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <CheckCircle className='w-4 h-4 mr-2' />
                                Activer
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditForm({
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                telephone: user.telephone || '',
                                role: user.role,
                              });
                              setMobileMenuOpen(null);
                            }}
                            className='w-full flex items-center px-4 py-2 text-sm text-sky-600 hover:bg-gray-50'
                          >
                            <Edit className='w-4 h-4 mr-2' />
                            Modifier
                          </button>
                          <button
                            onClick={() => {
                              checkUserAccess(user._id);
                              setMobileMenuOpen(null);
                            }}
                            className='w-full flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-gray-50'
                          >
                            <Eye className='w-4 h-4 mr-2' />
                            Vérifier accès
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteModal(user._id);
                              setMobileMenuOpen(null);
                            }}
                            className='w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-50'
                          >
                            <Trash2 className='w-4 h-4 mr-2' />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* État vide */}
            {filteredUsers.length === 0 && (
              <div className='text-center py-12'>
                <Users className='w-12 h-12 text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>Aucun utilisateur trouvé</h3>
                <p className='text-gray-500 mb-4'>
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                    ? 'Aucun utilisateur ne correspond à vos critères de recherche.'
                    : 'Commencez par ajouter votre premier utilisateur.'}
                </p>
                {!searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
                  <button
                    onClick={() => setIsAddingUser(true)}
                    className='inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors'
                  >
                    <UserPlus className='w-4 h-4 mr-2' />
                    Ajouter un utilisateur
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'ajout d'utilisateur */}
      {isAddingUser && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-xl font-semibold text-gray-900'>
                Ajouter un utilisateur
              </h3>
              <button
                onClick={() => setIsAddingUser(false)}
                className='text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors'
              >
                <X className='w-6 h-6' />
              </button>
            </div>
            <form onSubmit={handleAddUser} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Prénom *
                </label>
                <input
                  type='text'
                  value={newUser.firstName}
                  onChange={e =>
                    setNewUser({ ...newUser, firstName: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Nom *
                </label>
                <input
                  type='text'
                  value={newUser.lastName}
                  onChange={e =>
                    setNewUser({ ...newUser, lastName: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Email *
                </label>
                <input
                  type='email'
                  value={newUser.email}
                  onChange={e =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Téléphone
                </label>
                <input
                  type='tel'
                  value={newUser.telephone}
                  onChange={e =>
                    setNewUser({ ...newUser, telephone: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Mot de passe *
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={e =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 pr-10'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1'
                  >
                    {showPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Rôle
                </label>
                <select
                  value={newUser.role}
                  onChange={e =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                >
                  <option value='user'>Utilisateur</option>
                  <option value='admin'>Administrateur</option>
                </select>
              </div>
              <div className='flex justify-end space-x-3 pt-6 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={() => setIsAddingUser(false)}
                  className='px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 active:scale-95'
                >
                  Annuler
                </button>
                <button
                  type='submit'
                  className='px-6 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all duration-200 active:scale-95 shadow-sm'
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de modification d'utilisateur */}
      {editingUser && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-auto'>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-xl font-semibold text-gray-900'>
                Modifier l'utilisateur
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className='text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors'
              >
                <X className='w-6 h-6' />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Prénom *
                </label>
                <input
                  type='text'
                  value={editForm.firstName}
                  onChange={e =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Nom *
                </label>
                <input
                  type='text'
                  value={editForm.lastName}
                  onChange={e =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Email *
                </label>
                <input
                  type='email'
                  value={editForm.email}
                  onChange={e =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Téléphone
                </label>
                <input
                  type='tel'
                  value={editForm.telephone}
                  onChange={e =>
                    setEditForm({ ...editForm, telephone: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Rôle
                </label>
                <select
                  value={editForm.role}
                  onChange={e =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className='w-full px-4 py-3 border border-gray-200 rounded-xl hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200'
                >
                  <option value='user'>Utilisateur</option>
                  <option value='admin'>Administrateur</option>
                </select>
              </div>
              <div className='flex justify-end space-x-3 pt-6 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={() => setEditingUser(null)}
                  className='px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 active:scale-95'
                >
                  Annuler
                </button>
                <button
                  type='submit'
                  className='px-6 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all duration-200 active:scale-95 shadow-sm'
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-auto'>
            <div className='flex items-center mb-4'>
              <div className='w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4'>
                <Trash2 className='w-6 h-6 text-red-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Supprimer l'utilisateur
                </h3>
                <p className='text-sm text-gray-600'>
                  Cette action est irréversible
                </p>
              </div>
            </div>
            <p className='text-gray-700 mb-6'>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette
              action ne peut pas être annulée.
            </p>
            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowDeleteModal(null)}
                className='px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 active:scale-95'
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteModal)}
                className='px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 active:scale-95 shadow-sm'
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de déconnexion tous */}
      {showLogoutAllModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-auto'>
            <div className='flex items-center mb-4'>
              <div className='w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4'>
                <LogOut className='w-6 h-6 text-red-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Déconnecter tous les utilisateurs
                </h3>
                <p className='text-sm text-gray-600'>Action critique</p>
              </div>
            </div>
            <p className='text-gray-700 mb-6'>
              Êtes-vous sûr de vouloir déconnecter tous les utilisateurs ? Le
              site sera inaccessible pendant 24h pour les utilisateurs non-administrateurs.
            </p>
            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowLogoutAllModal(false)}
                className='px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 active:scale-95'
              >
                Annuler
              </button>
              <button
                onClick={handleLogoutAll}
                className='px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 active:scale-95 shadow-sm'
              >
                Déconnecter tous
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;