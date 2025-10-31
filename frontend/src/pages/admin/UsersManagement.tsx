import {
  CheckCircle,
  Edit,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
  XCircle,
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
  const { user, isLoading: authLoading, token } = useAuth();
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

    if (!authLoading && (!user || user.role !== 'admin')) {
      return <Navigate to="/" replace />;
    }
    useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
      fetchStats();
      fetchMaintenanceStatus();
    }
  }, [user]);

   const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users`,
        {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/stats`,
        {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/maintenance-status`,
        {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/maintenance-mode`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled }),
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newUser),
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/${editingUser._id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editForm),
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/${userId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/${userId}/toggle-status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/logout-all`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/check-access/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR');
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
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* En-tête avec actions */}
        <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-semibold text-gray-900'>
                  Gestion des utilisateurs
                </h2>
                <p className='text-sm text-gray-600 mt-1'>
                  Gérez les comptes utilisateurs et leurs permissions
                </p>
              </div>
              <div className='flex space-x-3'>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className='flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors focus:outline-none focus:ring-none'
                >
                  <UserPlus className='w-4 h-4 mr-2' />
                  Ajouter un utilisateur
                </button>
                <button
                  onClick={() => {
                    fetchUsers();
                    fetchStats();
                    fetchMaintenanceStatus();
                  }}
                  className='flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors focus:outline-none focus:ring-none'
                >
                  <RefreshCw className='w-4 h-4 mr-2' />
                  Actualiser
                </button>
                <button
                  onClick={() => setShowLogoutAllModal(true)}
                  className='flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-none'
                >
                  <LogOut className='w-4 h-4 mr-2' />
                  Déconnecter tous
                </button>
                <button
                  onClick={() => toggleMaintenanceMode(!maintenanceMode)}
                  className={`flex items-center px-4 py-2 ${
                    maintenanceMode ? 'bg-green-500' : 'bg-yellow-500'
                  } text-white rounded-lg hover:${
                    maintenanceMode ? 'bg-green-600' : 'bg-yellow-600'
                  } transition-colors focus:outline-none focus:ring-none`}
                >
                  {maintenanceMode ? (
                    <>
                      <CheckCircle className='w-4 h-4 mr-2' />
                      Désactiver maintenance
                    </>
                  ) : (
                    <>
                      <XCircle className='w-4 h-4 mr-2' />
                      Activer maintenance
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className='px-6 py-4 border-b border-gray-200 bg-gray-50'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              <div className='bg-white p-4 rounded-lg shadow'>
                <h3 className='text-sm font-medium text-gray-500'>Total</h3>
                <p className='text-2xl font-semibold text-gray-900'>
                  {stats.totalUsers}
                </p>
              </div>
              <div className='bg-white p-4 rounded-lg shadow'>
                <h3 className='text-sm font-medium text-gray-500'>Actifs</h3>
                <p className='text-2xl font-semibold text-green-600'>
                  {stats.activeUsers}
                </p>
              </div>
              <div className='bg-white p-4 rounded-lg shadow'>
                <h3 className='text-sm font-medium text-gray-500'>Inactifs</h3>
                <p className='text-2xl font-semibold text-red-600'>
                  {stats.totalUsers - stats.activeUsers}
                </p>
              </div>
              <div className='bg-white p-4 rounded-lg shadow'>
                <h3 className='text-sm font-medium text-gray-500'>Admins</h3>
                <p className='text-2xl font-semibold text-blue-600'>
                  {stats.adminUsers}
                </p>
              </div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className='px-6 py-4 border-b border-gray-200'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              {/* Barre de recherche */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Rechercher un utilisateur...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                />
              </div>

              {/* Filtre par rôle */}
              <div>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                >
                  <option value='all'>Tous les rôles</option>
                  <option value='admin'>Administrateurs</option>
                  <option value='user'>Utilisateurs</option>
                </select>
              </div>

              {/* Filtre par statut */}
              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                >
                  <option value='all'>Tous les statuts</option>
                  <option value='active'>Actifs</option>
                  <option value='inactive'>Inactifs</option>
                </select>
              </div>

              {/* Compteur */}
              <div className='flex items-center justify-center'>
                <span className='text-sm text-gray-600'>
                  {filteredUsers.length} utilisateur
                  {filteredUsers.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Liste des utilisateurs */}
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
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
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Déconnexion jusqu'à
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredUsers.map(user => (
                  <tr key={user._id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center text-sm font-semibold'>
                          {user.firstName.charAt(0).toUpperCase()}
                          {user.lastName.charAt(0).toUpperCase()}
                        </div>
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900'>
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {formatDate(user.createdAt)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {user.logoutUntil ? formatDateTime(user.logoutUntil) : 'N/A'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex items-center justify-end space-x-2'>
                        <button
                          onClick={() => handleToggleStatus(user._id)}
                          className={`p-2 rounded-lg transition-colors ${
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
                          className='p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors'
                          title='Modifier'
                        >
                          <Edit className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => checkUserAccess(user._id)}
                          className='p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors'
                          title='Vérifier accès'
                        >
                          <Eye className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(user._id)}
                          className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
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
        </div>

        {/* Modal d'ajout d'utilisateur */}
        {isAddingUser && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Ajouter un utilisateur
                </h3>
                <button
                  onClick={() => setIsAddingUser(false)}
                  className='text-gray-400 hover:text-gray-600'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                      required
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                  >
                    <option value='user'>Utilisateur</option>
                    <option value='admin'>Administrateur</option>
                  </select>
                </div>
                <div className='flex justify-end space-x-3 pt-4'>
                  <button
                    type='button'
                    onClick={() => setIsAddingUser(false)}
                    className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
                  >
                    Annuler
                  </button>
                  <button
                    type='submit'
                    className='px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors'
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
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Modifier l'utilisateur
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className='text-gray-400 hover:text-gray-600'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                  >
                    <option value='user'>Utilisateur</option>
                    <option value='admin'>Administrateur</option>
                  </select>
                </div>
                <div className='flex justify-end space-x-3 pt-4'>
                  <button
                    type='button'
                    onClick={() => setEditingUser(null)}
                    className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
                  >
                    Annuler
                  </button>
                  <button
                    type='submit'
                    className='px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors'
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
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center mb-4'>
                <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4'>
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
                  className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteUser(showDeleteModal)}
                  className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de déconnexion tous */}
        {showLogoutAllModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center mb-4'>
                <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4'>
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
                  className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
                >
                  Annuler
                </button>
                <button
                  onClick={handleLogoutAll}
                  className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
                >
                  Déconnecter tous
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;