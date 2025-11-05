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
  X
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
}

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      phone: '+33 1 23 45 67 89',
      status: 'active'
    },
    {
      id: '2',
      name: 'Marie Martin',
      email: 'marie.martin@example.com',
      phone: '+33 1 34 56 78 90',
      status: 'active'
    },
    {
      id: '3',
      name: 'Pierre Bernard',
      email: 'pierre.bernard@example.com',
      phone: '+33 1 45 67 89 01',
      status: 'pending'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({ 
    name: '', 
    email: '', 
    phone: '', 
    status: 'active' 
  });
  const [editUser, setEditUser] = useState<User | null>(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  const getStatusIcon = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'pending':
        return '(inscrit)';
      case 'inactive':
        return 'Inactif';
      default:
        return '';
    }
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'inactive':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return '';
    }
  };

  const handleAddUser = () => {
    if (newUser.name && newUser.email && newUser.phone) {
      const user: User = {
        ...newUser,
        id: Date.now().toString()
      };
      setUsers([...users, user]);
      setNewUser({ name: '', email: '', phone: '', status: 'active' });
      setIsAddModalOpen(false);
    }
  };

  const handleEditUser = () => {
    if (editUser) {
      setUsers(users.map(user => 
        user.id === editUser.id ? editUser : user
      ));
      setEditUser(null);
      setIsEditModalOpen(false);
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setSelectedUser(null);
      setIsDeleteModalOpen(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditUser({ ...user });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Utilisateurs</h1>
        <p className="text-slate-600">Gérez les utilisateurs du système</p>
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
          <div className="md:col-span-4">UTILISATEUR</div>
          <div className="md:col-span-4">CONTACT</div>
          <div className="md:col-span-2">STATUT</div>
          <div className="md:col-span-2">ACTES</div>
        </div>

        {/* Users */}
        {filteredUsers.map((user) => (
          <div
            key={user.id}
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
                    <h3 className="font-semibold text-slate-800">{user.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                        {getStatusIcon(user.status)}
                        <span className="ml-1">{getStatusText(user.status)}</span>
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
                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none focus:border-rose-300 border border-transparent"
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
                  <span className="text-sm">{user.phone}</span>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4 flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-slate-800">{user.name}</span>
              </div>
              
              <div className="md:col-span-4 space-y-1">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{user.phone}</span>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(user.status)}`}>
                  {getStatusIcon(user.status)}
                  <span className="ml-1.5">{getStatusText(user.status)}</span>
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
                  className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 focus:ring-0 focus:outline-none focus:border-rose-300 border border-transparent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Nom complet</span>
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Ex: jean.dupont@example.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Téléphone</span>
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="Ex: +33 1 23 45 67 89"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  value={newUser.status}
                  onChange={(e) => setNewUser({ ...newUser, status: e.target.value as User['status'] })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="pending">(inscrit)</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editUser && (
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Nom complet</span>
                </label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email</span>
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Téléphone</span>
                </label>
                <input
                  type="tel"
                  value={editUser.phone}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  value={editUser.status}
                  onChange={(e) => setEditUser({ ...editUser, status: e.target.value as User['status'] })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-0 focus:outline-none focus:border-sky-500 transition-colors duration-200"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="pending">(inscrit)</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleEditUser}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
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
              <h2 className="text-xl font-bold text-slate-800">Supprimer l'utilisateur</h2>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-600 text-center">
                Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-slate-800">{selectedUser.name}</span> ?
              </p>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl hover:from-rose-600 hover:to-red-700 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-rose-300 border border-transparent"
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