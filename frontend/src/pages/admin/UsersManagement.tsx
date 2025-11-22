import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  CheckCircle,
  XCircle,
  X,
  Shield,
  ShieldOff,
  AlertTriangle,
  RefreshCw,
  User,
  Eye,
  EyeOff,
  Key,
  Calendar,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminUserService, { User as UserType, UserStats, CreateUserDto, UpdateUserDto } from '../../api/admin/AdminUserService';
import { toast } from 'react-toastify';

interface User extends UserType {}

const UsersManagement: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const userService = new AdminUserService();
  
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [newUser, setNewUser] = useState<CreateUserDto>({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    telephone: '', 
    password: '',
    role: 'user'
  });

  const [editUser, setEditUser] = useState<UpdateUserDto>({});
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États pour la validation en temps réel
  const [profileErrors, setProfileErrors] = useState<{ [key: string]: string }>({});
  const [profileTouched, setProfileTouched] = useState<{ [key: string]: boolean }>({});

  // Charger les utilisateurs avec gestion d'erreur
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await userService.getAllUsers();
      setUsers(usersData);
      
      toast.success(`✅ ${usersData.length} utilisateurs chargés`);
    } catch (error: any) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      
      const errorMessage = error.message || 'Erreur lors du chargement des utilisateurs';
      
      if (errorMessage.includes('Session expirée') || errorMessage.includes('401')) {
        toast.error('🔒 Session expirée - Redirection...');
        setTimeout(() => logout('/', true), 2000);
      } else if (errorMessage.includes('403')) {
        toast.error('🚫 Accès refusé - Droits administrateur requis');
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const statsData = await userService.getUserStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('❌ Erreur statistiques:', error);
      toast.warning('⚠️ Statistiques partielles');
    }
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  // Validation email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation téléphone
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Validation mot de passe
  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  // Validation en temps réel pour le profil
  const validateProfileField = (name: string, value: string) => {
    let error = '';

    if (name === 'email' && value && !validateEmail(value)) {
      error = 'Format d\'email invalide';
    }

    if (name === 'telephone' && value && !validatePhone(value)) {
      error = 'Format de téléphone invalide';
    }

    setProfileErrors(prev => ({
      ...prev,
      [name]: error
    }));

    return !error;
  };

  // Gestion des changements de profil dans le modal d'édition
  const handleProfileChange = (field: keyof UpdateUserDto, value: string) => {
    const newData = {
      ...editUser,
      [field]: value
    };
    
    setEditUser(newData);
    setProfileTouched(prev => ({ ...prev, [field]: true }));
    
    // Validation en temps réel
    validateProfileField(field, value);
  };

  // Validation finale avant soumission
  const validateProfileBeforeSubmit = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (editUser.email && !validateEmail(editUser.email)) {
      errors.email = 'Format d\'email invalide';
    }

    if (editUser.telephone && !validatePhone(editUser.telephone)) {
      errors.telephone = 'Format de téléphone invalide';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Création d'un utilisateur
  const handleAddUser = async () => {
    if (!newUser.firstName?.trim() || !newUser.lastName?.trim()) {
      toast.error('❌ Le prénom et le nom sont obligatoires');
      return;
    }

    if (!newUser.email || !validateEmail(newUser.email)) {
      toast.error('❌ Format d\'email invalide');
      return;
    }

    if (!newUser.telephone || !validatePhone(newUser.telephone)) {
      toast.error('❌ Format de téléphone invalide');
      return;
    }

    if (!newUser.password || !validatePassword(newUser.password)) {
      toast.error('❌ Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      const createdUser = await userService.createUser(newUser);
      
      setUsers(prev => [...prev, createdUser]);
      await loadStats();
      
      setNewUser({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        telephone: '', 
        password: '',
        role: 'user'
      });

      setIsAddModalOpen(false);
      toast.success('✅ Utilisateur créé avec succès');

    } catch (error: any) {
      console.error('❌ Erreur création utilisateur:', error);
      
      if (error.message?.includes('déjà utilisé')) {
        toast.error('❌ Cet email ou téléphone est déjà utilisé');
      } else {
        toast.error(`❌ ${error.message || 'Erreur lors de la création'}`);
      }
    }
  };

  // Modification d'un utilisateur
  const handleEditUser = async () => {
    if (!selectedUser) {
      toast.error('❌ Données manquantes');
      return;
    }

    // Validation finale avant soumission
    if (!validateProfileBeforeSubmit()) {
      toast.error('❌ Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    // Vérifier qu'au moins un champ a été modifié
    const hasChanges = (editUser.email && editUser.email !== selectedUser.email) || 
                      (editUser.telephone && editUser.telephone !== selectedUser.telephone);

    if (!hasChanges) {
      toast.error('❌ Aucune modification détectée');
      return;
    }

    console.log('🔄 Début modification utilisateur:', {
      userId: selectedUser._id,
      currentEmail: selectedUser.email,
      currentTelephone: selectedUser.telephone,
      newData: editUser
    });

    try {
      const updateData: UpdateUserDto = {};
      
      if (editUser.email && editUser.email !== selectedUser.email) {
        updateData.email = editUser.email;
      }
      
      if (editUser.telephone && editUser.telephone !== selectedUser.telephone) {
        updateData.telephone = editUser.telephone;
      }

      console.log('📤 Données à envoyer pour mise à jour:', updateData);
      
      const updatedUser = await userService.updateUser(selectedUser._id, updateData);
      
      console.log('✅ Utilisateur modifié avec succès:', updatedUser);
      
      // Mettre à jour la liste localement
      setUsers(prev => prev.map(user => 
        user._id === selectedUser._id ? { ...user, ...updatedUser } : user
      ));

      await loadStats();

      // Réinitialiser les états
      setEditUser({});
      setProfileErrors({});
      setProfileTouched({});
      setIsEditModalOpen(false);
      setSelectedUser(null);
      
      toast.success('✅ Utilisateur modifié avec succès');

    } catch (error: any) {
      console.error('❌ Erreur détaillée modification:', error);
      
      const errorMessage = error.message || 'Erreur lors de la modification';
      
      if (errorMessage.includes('non trouvé')) {
        toast.error('❌ Utilisateur introuvable - rechargement de la liste...');
        await loadUsers();
      } else if (errorMessage.includes('déjà utilisé')) {
        toast.error('❌ Cet email ou téléphone est déjà utilisé');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        toast.error('🔒 Session expirée - Reconnexion nécessaire');
        setTimeout(() => logout('/', true), 2000);
      } else if (errorMessage.includes('Aucune donnée utilisateur')) {
        toast.error('❌ Réponse invalide du serveur');
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
    }
  };

  // Réinitialisation du mot de passe par l'admin
  const handleAdminResetPassword = async () => {
    if (!selectedUser) {
      toast.error('❌ Données manquantes');
      return;
    }

    if (!passwordData.newPassword || !validatePassword(passwordData.newPassword)) {
      toast.error('❌ Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.error('❌ Les mots de passe ne correspondent pas');
      return;
    }

    try {
      await userService.adminResetPassword(selectedUser._id, {
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword
      });
      
      setPasswordData({
        newPassword: '',
        confirmNewPassword: ''
      });
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
      
      toast.success('✅ Mot de passe réinitialisé avec succès');

    } catch (error: any) {
      console.error('❌ Erreur réinitialisation mot de passe:', error);
      
      const errorMessage = error.message || 'Erreur lors de la réinitialisation du mot de passe';
      
      if (errorMessage.includes('Session expirée') || errorMessage.includes('401')) {
        toast.error('🔒 Session expirée - Veuillez vous reconnecter');
        setTimeout(() => logout('/', true), 2000);
      } else if (errorMessage.includes('403')) {
        toast.error('🚫 Accès refusé - Droits administrateur requis');
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
    }
  };

  // Suppression d'un utilisateur
  const handleDeleteUser = async () => {
    if (!selectedUser) {
      toast.error('❌ Données manquantes');
      return;
    }

    if (selectedUser._id === currentUser?.id) {
      toast.error('🚫 Vous ne pouvez pas supprimer votre propre compte');
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      return;
    }

    try {
      await userService.deleteUser(selectedUser._id);
      
      setUsers(prev => prev.filter(user => user._id !== selectedUser._id));
      await loadStats();

      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      toast.success('✅ Utilisateur supprimé avec succès');

    } catch (error: any) {
      console.error('❌ Erreur suppression utilisateur:', error);
      toast.error(`❌ ${error.message || 'Erreur lors de la suppression'}`);
    }
  };

  // Basculer le statut actif/inactif
  const handleToggleStatus = async (user: User) => {
    if (user._id === currentUser?.id) {
      toast.error('🚫 Vous ne pouvez pas désactiver votre propre compte');
      return;
    }

    try {
      const updatedUser = await userService.toggleUserStatus(user._id);
      
      setUsers(prev => prev.map(u => 
        u._id === user._id ? { ...u, ...updatedUser } : u
      ));

      await loadStats();

      toast.success(`✅ Utilisateur ${!user.isActive ? 'activé' : 'désactivé'} avec succès`);

    } catch (error: any) {
      console.error('❌ Erreur changement statut:', error);
      toast.error(`❌ ${error.message || 'Erreur lors du changement de statut'}`);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUser({
      email: user.email,
      telephone: user.telephone
    });
    setProfileErrors({});
    setProfileTouched({});
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setPasswordData({
      newPassword: '',
      confirmNewPassword: ''
    });
    setIsPasswordModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Réinitialiser le formulaire d'édition
  const resetEditForm = () => {
    if (selectedUser) {
      setEditUser({
        email: selectedUser.email,
        telephone: selectedUser.telephone
      });
    }
    setProfileErrors({});
    setProfileTouched({});
  };

  // Vérifier si le formulaire d'édition a des modifications
  const hasEditChanges = () => {
    if (!selectedUser) return false;
    return (editUser.email && editUser.email !== selectedUser.email) || 
           (editUser.telephone && editUser.telephone !== selectedUser.telephone);
  };

  // Filtrage sécurisé des utilisateurs
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.telephone.includes(searchTerm)
    );
  });

  // Icônes et couleurs pour les statuts
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
    return role === 'admin' ? 
      <Shield className="w-4 h-4 text-blue-500" /> : 
      <User className="w-4 h-4 text-gray-500" />;
  };

  const getRoleText = (role: string) => {
    return role === 'admin' ? 'Administrateur' : 'Utilisateur';
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 
      'bg-blue-50 text-blue-700 border-blue-200' : 
      'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Masquage partiel des données sensibles
  const maskEmail = (email: string): string => {
    const [name, domain] = email.split('@');
    if (name.length <= 2) return email;
    return `${name.substring(0, 2)}***@${domain}`;
  };

  const maskPhone = (phone: string): string => {
    if (phone.length <= 4) return phone;
    return `${phone.substring(0, phone.length - 4)}****`;
  };

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          <Shield className="w-8 h-8 inline-block mr-2 text-blue-500" />
          Gestion des Utilisateurs - Admin
        </h1>
        <p className="text-gray-600">
          Interface d'administration pour gérer les utilisateurs du système
        </p>
      </div>

      {/* Cartes de statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-blue-500 p-2 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Utilisateurs Actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-rose-500 p-2 rounded-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Utilisateurs Inactifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactiveUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-purple-500 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Administrateurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="bg-gray-500 p-2 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Utilisateurs Réguliers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.regularUsers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre de recherche et actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-none hover:border-blue-600 focus:border-blue-500 transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                loadUsers();
                loadStats();
                toast.info('🔄 Actualisation en cours...');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-none transition-all duration-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:block">Actualiser</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:block">Nouvel utilisateur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {/* En-tête du tableau */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h2 className="text-lg font-semibold flex items-center">
            <User className="w-5 h-5 mr-2" />
            Liste des Utilisateurs
            <span className="ml-2 text-blue-200 text-sm font-normal">
              ({filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''})
            </span>
          </h2>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  <User className="w-4 h-4 inline mr-1" />
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Rôle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                    <p className="text-gray-600 mt-2">Chargement sécurisé des utilisateurs...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Aucun utilisateur trouvé</p>
                    {searchTerm && (
                      <p className="text-gray-400 text-sm mt-1">
                        Aucun résultat pour "{searchTerm}"
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr 
                    key={user._id} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {user._id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm" title={user.email}>
                            {maskEmail(user.email)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm" title={user.telephone}>
                            {maskPhone(user.telephone)}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1.5">{getRoleText(user.role)}</span>
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(user.isActive)}`}>
                        {getStatusIcon(user.isActive)}
                        <span className="ml-1.5">{getStatusText(user.isActive)}</span>
                      </span>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent p-2 rounded-lg transition-all duration-200"
                          title="Modifier l'utilisateur"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openPasswordModal(user)}
                          className="text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-600 focus:ring-none focus:outline-none focus:border-green-500 border border-transparent p-2 rounded-lg transition-all duration-200"
                          title="Réinitialiser le mot de passe"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => openDeleteModal(user)}
                          disabled={user._id === currentUser?.id}
                          className={`p-2 rounded-lg transition-all duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent ${
                            user._id === currentUser?.id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 focus:border-rose-500'
                          }`}
                          title={user._id === currentUser?.id ? "Impossible de supprimer votre compte" : "Supprimer l'utilisateur"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={user._id === currentUser?.id}
                          className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 border border-transparent ${
                            user._id === currentUser?.id
                              ? 'text-gray-400 cursor-not-allowed'
                              : user.isActive
                              ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 focus:ring-rose-500'
                              : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500'
                          }`}
                          title={
                            user._id === currentUser?.id 
                              ? "Impossible de modifier votre statut" 
                              : user.isActive 
                                ? "Désactiver l'utilisateur" 
                                : "Activer l'utilisateur"
                          }
                        >
                          {user.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'ajout d'utilisateur */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-gray-300 max-w-md w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-500" />
                Nouvel Utilisateur
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 flex items-center">
                    <User className="w-3 h-3 mr-1 text-gray-400" />
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="Jean"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 flex items-center">
                    <User className="w-3 h-3 mr-1 text-gray-400" />
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Dupont"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Mail className="w-3 h-3 mr-1 text-gray-400" />
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="jean.dupont@example.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-gray-400" />
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={newUser.telephone}
                  onChange={(e) => setNewUser({ ...newUser, telephone: e.target.value })}
                  placeholder="+33 1 23 45 67 89"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Key className="w-3 h-3 mr-1 text-gray-400" />
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 8 caractères"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 rounded-r-lg"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Doit contenir au moins 8 caractères
                </p>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Shield className="w-3 h-3 mr-1 text-gray-400" />
                  Rôle
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-2 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200 flex items-center justify-center gap-1"
              >
                <User className="w-3 h-3" />
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification d'utilisateur */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-gray-300 max-w-md w-full shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Edit className="w-5 h-5 mr-2 text-blue-500" />
                Modifier l'utilisateur
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Email et téléphone modifiables
                </span>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {/* Informations utilisateur */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700">
                  Modification de: <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">ID: {selectedUser._id}</p>
              </div>

              {/* ❌ CHAMPS NON MODIFIABLES - Affichage lecture seule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 flex items-center">
                    <User className="w-3 h-3 mr-1 text-gray-400" />
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={selectedUser.firstName}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">Non modifiable</p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 flex items-center">
                    <User className="w-3 h-3 mr-1 text-gray-400" />
                    Nom
                  </label>
                  <input
                    type="text"
                    value={selectedUser.lastName}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">Non modifiable</p>
                </div>
              </div>
              
              {/* ✅ CHAMP MODIFIABLE - Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Mail className="w-3 h-3 mr-1 text-gray-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={editUser.email || ''}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200 ${
                    profileErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="nouvel@email.com"
                />
                {profileTouched.email && profileErrors.email && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {profileErrors.email}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Actuel: {selectedUser.email}
                </p>
              </div>
              
              {/* ✅ CHAMP MODIFIABLE - Téléphone */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-gray-400" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={editUser.telephone || ''}
                  onChange={(e) => handleProfileChange('telephone', e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200 ${
                    profileErrors.telephone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+33 1 23 45 67 89"
                />
                {profileTouched.telephone && profileErrors.telephone && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {profileErrors.telephone}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Actuel: {selectedUser.telephone}
                </p>
              </div>

              {/* ℹ️ Message d'information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-start">
                  <Info className="w-3 h-3 text-blue-500 mt-0.5 mr-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-800 font-medium">Informations</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Seuls l'email et le téléphone peuvent être modifiés. Pour changer le statut, utilisez le bouton Activer/Désactiver.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={resetEditForm}
                disabled={!hasEditChanges()}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleEditUser}
                disabled={!hasEditChanges() || Object.keys(profileErrors).some(key => profileErrors[key])}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent flex items-center justify-center gap-1 ${
                  !hasEditChanges() || Object.keys(profileErrors).some(key => profileErrors[key])
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 focus:border-blue-500'
                }`}
              >
                <Edit className="w-3 h-3" />
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de réinitialisation du mot de passe */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-gray-300 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Key className="w-5 h-5 mr-2 text-green-500" />
                Réinitialiser le mot de passe
              </h2>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Réinitialisation du mot de passe</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Vous êtes sur le point de modifier le mot de passe de <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>.
                      En tant qu'administrateur, vous n'avez pas besoin du mot de passe actuel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Key className="w-3 h-3 mr-1 text-gray-400" />
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Minimum 8 caractères"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 rounded-r-lg"
                  >
                    {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Doit contenir au moins 8 caractères
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center">
                  <Key className="w-3 h-3 mr-1 text-gray-400" />
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmNewPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                    placeholder="Confirmer le mot de passe"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 rounded-r-lg"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleAdminResetPassword}
                disabled={!passwordData.newPassword || !passwordData.confirmNewPassword || passwordData.newPassword !== passwordData.confirmNewPassword}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent flex items-center justify-center gap-1 ${
                  !passwordData.newPassword || !passwordData.confirmNewPassword || passwordData.newPassword !== passwordData.confirmNewPassword
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600 focus:border-green-500'
                }`}
              >
                <Key className="w-3 h-3" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-gray-300 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-gray-900">Confirmation de suppression</h2>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 text-center">
                Êtes-vous sûr de vouloir supprimer définitivement <span className="font-semibold text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</span> ?
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">
                Cette action est irréversible et supprimera toutes les données associées.
              </p>
              {selectedUser._id === currentUser?.id && (
                <p className="text-rose-600 text-xs text-center mt-2 bg-rose-50 p-2 rounded border border-rose-200">
                  ⚠️ Vous ne pouvez pas supprimer votre propre compte
                </p>
              )}
            </div>
            
            <div className="flex space-x-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={selectedUser._id === currentUser?.id}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:border-blue-600 focus:ring-none focus:outline-none focus:border-blue-500 border border-transparent flex items-center justify-center gap-1 ${
                  selectedUser._id === currentUser?.id
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-rose-500 text-white hover:bg-rose-600 focus:border-rose-500'
                }`}
              >
                <Trash2 className="w-3 h-3" />
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