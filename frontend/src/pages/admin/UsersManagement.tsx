import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  User,
  CheckCircle,
  Clock,
  XCircle,
  X,
  Shield,
  ShieldOff,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
  role: 'ADMIN' | 'USER';
}

interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  telephone?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
  password?: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const UsersManagement: React.FC = () => {
  const { user: currentUser, token, refreshToken, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [newUser, setNewUser] = useState<CreateUserDto>({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    telephone: '', 
    password: '',
    role: 'USER'
  });

  const [editUser, setEditUser] = useState<UpdateUserDto>({});
  const [passwordField, setPasswordField] = useState('');

  // Fonction utilitaire pour les requêtes avec gestion du token
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    let currentToken = token;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include' as RequestCredentials
    };

    let response = await fetch(url, requestOptions);

    // Si le token a expiré, on tente de le rafraîchir
    if (response.status === 401) {
      console.log('Token expiré, tentative de rafraîchissement...');
      try {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Récupérer le nouveau token depuis le localStorage
          currentToken = localStorage.getItem('token');
          if (currentToken) {
            // Refaire la requête avec le nouveau token
            requestOptions.headers = {
              ...requestOptions.headers,
              'Authorization': `Bearer ${currentToken}`
            };
            response = await fetch(url, requestOptions);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Impossible de rafraîchir le token');
        }
      } catch (refreshError) {
        console.error('Erreur lors du rafraîchissement:', refreshError);
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }
    }

    return response;
  };

  const fetchUsers = async () => {
    if (!token) {
      console.error('Token non disponible');
      toast.error('Session expirée, veuillez vous reconnecter');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/api/users`);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Vous n\'avez pas les permissions nécessaires');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || `Erreur ${response.status} lors de la récupération des utilisateurs`);
      }

      const data = await response.json();
      setUsers(data.data || data || []);

    } catch (error) {
      console.error('Erreur fetchUsers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(errorMessage);
      
      // Rediriger si session expirée
      if (errorMessage.includes('Session expirée')) {
        setTimeout(() => {
          logout('/', true);
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Création d'un utilisateur
  const handleAddUser = async () => {
    if (!token) {
      toast.error('Token non disponible');
      return;
    }

    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.telephone || !newUser.password) {
      toast.error('Tous les champs obligatoires doivent être remplis');
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création');
      }

      const createdUser = await response.json();
      
      // Mise à jour optimiste de l'état local
      setUsers(prev => [...prev, createdUser.user]);
      
      // Réinitialiser le formulaire
      setNewUser({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        telephone: '', 
        password: '',
        role: 'USER'
      });

      setIsAddModalOpen(false);
      toast.success('Utilisateur créé avec succès');

    } catch (error) {
      console.error('Erreur handleAddUser:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  // Modification d'un utilisateur
  const handleEditUser = async () => {
    if (!token || !selectedUser) {
      toast.error('Données manquantes');
      return;
    }

    try {
      const updateData: UpdateUserDto = { ...editUser };
      
      // Inclure le mot de passe seulement s'il est fourni
      if (passwordField) {
        updateData.password = passwordField;
      }

      const response = await makeAuthenticatedRequest(`${API_URL}/api/users/${selectedUser._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }

      const updatedUser = await response.json();
      
      // Mise à jour optimiste de l'état local
      setUsers(prev => prev.map(user => 
        user._id === selectedUser._id ? { ...user, ...updatedUser } : user
      ));

      setEditUser({});
      setPasswordField('');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      
      toast.success('Utilisateur modifié avec succès');

    } catch (error) {
      console.error('Erreur handleEditUser:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  // Suppression d'un utilisateur
  const handleDeleteUser = async () => {
    if (!token || !selectedUser) {
      toast.error('Données manquantes');
      return;
    }

    // Empêcher l'auto-suppression
    if (selectedUser._id === currentUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/api/users/${selectedUser._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }

      // Mise à jour optimiste de l'état local
      setUsers(prev => prev.filter(user => user._id !== selectedUser._id));

      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      toast.success('Utilisateur supprimé avec succès');

    } catch (error) {
      console.error('Erreur handleDeleteUser:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  // Basculer le statut actif/inactif
  const handleToggleStatus = async (user: User) => {
    if (!token) {
      toast.error('Token non disponible');
      return;
    }

    // Empêcher la désactivation de son propre compte
    if (user._id === currentUser?.id) {
      toast.error('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/api/users/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }

      const updatedUser = await response.json();
      
      // Mise à jour optimiste de l'état local
      setUsers(prev => prev.map(u => 
        u._id === user._id ? { ...u, ...updatedUser } : u
      ));

      toast.success(`Utilisateur ${!user.isActive ? 'activé' : 'désactivé'} avec succès`);

    } catch (error) {
      console.error('Erreur handleToggleStatus:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUser({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      telephone: user.telephone,
      role: user.role,
      isActive: user.isActive
    });
    setPasswordField('');
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.telephone.includes(searchTerm)
  );

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? 
      <CheckCircle className="w-4 h-4 text-emerald-500" /> : 
      <XCircle className="w-4 h-4 text-rose-500" />;
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Actif' : 'Inactif';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 
      'bg-emerald-50 text-emerald-700 border-emerald-200' : 
      'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getRoleIcon = (role: string) => {
    return role === 'ADMIN' ? 
      <Shield className="w-4 h-4 text-blue-500" /> : 
      <User className="w-4 h-4 text-slate-500" />;
  };

  const getRoleText = (role: string) => {
    return role === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  };

  const getRoleColor = (role: string) => {
    return role === 'ADMIN' ? 
      'bg-blue-50 text-blue-700 border-blue-200' : 
      'bg-slate-50 text-slate-700 border-slate-200';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Initialisation
  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Gestion des utilisateurs</h1>
        <p className="text-slate-600">Gérez les utilisateurs et leurs permissions</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200 placeholder-slate-400"
        />
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {/* Desktop Table Header */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
          <div className="md:col-span-3">UTILISATEUR</div>
          <div className="md:col-span-3">CONTACT</div>
          <div className="md:col-span-2">ROLE</div>
          <div className="md:col-span-2">STATUT</div>
          <div className="md:col-span-2">ACTIONS</div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <User className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user._id}
              className="border-b border-slate-100 last:border-b-0 p-4 hover:bg-slate-50 transition-colors duration-150"
            >
              {/* Mobile Layout */}
              <div className="md:hidden space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1">{getRoleText(user.role)}</span>
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.isActive)}`}>
                          {getStatusIcon(user.isActive)}
                          <span className="ml-1">{getStatusText(user.isActive)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(user)}
                      disabled={user._id === currentUser?.id}
                      className={`p-2 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none border border-transparent ${
                        user._id === currentUser?.id
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 focus:border-rose-300'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 pl-13">
                  <div className="flex items-center space-x-3 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{user.telephone}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600 text-xs">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Créé le {formatDate(user.createdAt)}</span>
                  </div>
                </div>

                {/* Toggle Status Button - Mobile */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => handleToggleStatus(user)}
                    disabled={user._id === currentUser?.id}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      user._id === currentUser?.id
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : user.isActive
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {user.isActive ? 'Désactiver' : 'Activer'} l'utilisateur
                  </button>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-3 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 block">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-slate-500 text-sm">
                      Créé le {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
                
                <div className="md:col-span-3 space-y-1">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{user.telephone}</span>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                    {getRoleIcon(user.role)}
                    <span className="ml-1.5">{getRoleText(user.role)}</span>
                  </span>
                </div>

                <div className="md:col-span-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(user.isActive)}`}>
                    {getStatusIcon(user.isActive)}
                    <span className="ml-1.5">{getStatusText(user.isActive)}</span>
                  </span>
                </div>
                
                <div className="md:col-span-2 flex space-x-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(user)}
                    disabled={user._id === currentUser?.id}
                    className={`p-2 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none border border-transparent ${
                      user._id === currentUser?.id
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 focus:border-rose-300'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(user)}
                    disabled={user._id === currentUser?.id}
                    className={`p-2 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none border border-transparent ${
                      user._id === currentUser?.id
                        ? 'text-slate-400 cursor-not-allowed'
                        : user.isActive
                        ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 focus:border-rose-300'
                        : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 focus:border-emerald-300'
                    }`}
                    title={user.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {user.isActive ? <ShieldOff className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent flex items-center justify-center space-x-2"
      >
        <Plus className="w-5 h-5" />
        <span>Ajouter un utilisateur</span>
      </button>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Ajouter un utilisateur</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prénom *</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="Jean"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nom *</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Dupont"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="jean.dupont@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Téléphone *</label>
                <input
                  type="tel"
                  value={newUser.telephone}
                  onChange={(e) => setNewUser({ ...newUser, telephone: e.target.value })}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mot de passe *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
                <p className="text-xs text-slate-500">
                  Doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rôle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'ADMIN' | 'USER' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                >
                  <option value="USER">Utilisateur</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Modifier l'utilisateur</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prénom</label>
                  <input
                    type="text"
                    value={editUser.firstName || ''}
                    onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nom</label>
                  <input
                    type="text"
                    value={editUser.lastName || ''}
                    onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editUser.email || ''}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Téléphone</label>
                <input
                  type="tel"
                  value={editUser.telephone || ''}
                  onChange={(e) => setEditUser({ ...editUser, telephone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordField}
                  onChange={(e) => setPasswordField(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
                <p className="text-xs text-slate-500">
                  Doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rôle</label>
                <select
                  value={editUser.role || 'USER'}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as 'ADMIN' | 'USER' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                >
                  <option value="USER">Utilisateur</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  value={editUser.isActive ? 'true' : 'false'}
                  onChange={(e) => setEditUser({ ...editUser, isActive: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                >
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleEditUser}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                <h2 className="text-xl font-bold text-slate-800">Supprimer l'utilisateur</h2>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-600 text-center">
                Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-slate-800">{selectedUser.firstName} {selectedUser.lastName}</span> ?
              </p>
              {selectedUser._id === currentUser?.id && (
                <p className="text-rose-600 text-sm text-center mt-2">
                  ⚠️ Vous ne pouvez pas supprimer votre propre compte
                </p>
              )}
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={selectedUser._id === currentUser?.id}
                className={`flex-1 px-4 py-3 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none border border-transparent ${
                  selectedUser._id === currentUser?.id
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 focus:border-rose-300'
                }`}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;