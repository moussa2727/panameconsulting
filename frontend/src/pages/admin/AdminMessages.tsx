import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiMail, 
  FiSearch, 
  FiFilter, 
  FiCheck, 
  FiEye, 
  FiEyeOff, 
  FiSend, 
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiMessageSquare,
  FiUser,
  FiCalendar,
  FiArrowLeft,
  FiArrowRight
} from 'react-icons/fi';
import { useAuth } from '../../utils/AuthContext';

interface ContactMessage {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  status: 'new' | 'read' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageStats {
  total: number;
  unread: number;
  read: number;
  responded: number;
  thisMonth: number;
  lastMonth: number;
}

const AdminMessages: React.FC = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Charger les messages et statistiques
  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/contact`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/contact/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  // Fonctions de gestion des messages
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/contact/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setMessages(messages.map(msg => 
          msg._id === id ? { ...msg, isRead: true, status: 'read' } : msg
        ));
        fetchStats();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      // Implémentation backend nécessaire pour marquer comme non-lu
      // Pour l'instant, mise à jour locale
      setMessages(messages.map(msg => 
        msg._id === id ? { ...msg, isRead: false, status: 'new' } : msg
      ));
      fetchStats();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/contact/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyText }),
      });
      
      if (response.ok) {
        setReplyingTo(null);
        setReplyText('');
        fetchMessages();
        fetchStats();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/contact/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setMessages(messages.filter(msg => msg._id !== id));
        setSelectedMessages(selectedMessages.filter(msgId => msgId !== id));
        fetchStats();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Actions groupées
  const markSelectedAsRead = () => {
    selectedMessages.forEach(id => markAsRead(id));
    setSelectedMessages([]);
  };

  const markSelectedAsUnread = () => {
    selectedMessages.forEach(id => markAsUnread(id));
    setSelectedMessages([]);
  };

  // Filtrage et recherche
  const filteredMessages = useMemo(() => {
    return messages.filter(message => {
      const matchesSearch = 
        message.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.message.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || message.priority === priorityFilter;
      const matchesRead = readFilter === 'all' || 
        (readFilter === 'read' && message.isRead) || 
        (readFilter === 'unread' && !message.isRead);

      return matchesSearch && matchesStatus && matchesPriority && matchesRead;
    });
  }, [messages, searchTerm, statusFilter, priorityFilter, readFilter]);

  // Tri
  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[aValue as keyof typeof priorityOrder];
        bValue = priorityOrder[bValue as keyof typeof priorityOrder];
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredMessages, sortBy, sortOrder]);

  // Pagination
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedMessages.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedMessages, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedMessages.length / itemsPerPage);

  // Sélection/désélection de tous les messages de la page
  const toggleSelectAll = () => {
    if (selectedMessages.length === paginatedMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(paginatedMessages.map(msg => msg._id));
    }
  };

  // Toggle de sélection individuelle
  const toggleMessageSelection = (id: string) => {
    setSelectedMessages(prev =>
      prev.includes(id)
        ? prev.filter(msgId => msgId !== id)
        : [...prev, id]
    );
  };

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'read': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Fonction pour obtenir la couleur de la priorité
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec statistiques */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">
            Messages de contact
          </h1>
          
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              <StatCard 
                title="Total" 
                value={stats.total} 
                color="bg-sky-500" 
              />
              <StatCard 
                title="Non lus" 
                value={stats.unread} 
                color="bg-blue-500" 
              />
              <StatCard 
                title="Lus" 
                value={stats.read} 
                color="bg-green-500" 
              />
              <StatCard 
                title="Répondu" 
                value={stats.responded} 
                color="bg-emerald-500" 
              />
              <StatCard 
                title="Ce mois" 
                value={stats.thisMonth} 
                color="bg-purple-500" 
              />
              <StatCard 
                title="Mois dernier" 
                value={stats.lastMonth} 
                color="bg-gray-500" 
              />
            </div>
          )}
        </div>

        {/* Barre de contrôle */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Recherche */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher dans les messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded border border-gray-300 bg-gray-50 focus:border-sky-500 hover:border-sky-400 transition-colors"
                />
              </div>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded border border-gray-300 bg-gray-50 focus:border-sky-500 hover:border-sky-400 transition-colors"
              >
                <option value="all">Tous les statuts</option>
                <option value="new">Nouveau</option>
                <option value="read">Lu</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolu</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded border border-gray-300 bg-gray-50 focus:border-sky-500 hover:border-sky-400 transition-colors"
              >
                <option value="all">Toutes priorités</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>

              <select
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value)}
                className="px-3 py-2 rounded border border-gray-300 bg-gray-50 focus:border-sky-500 hover:border-sky-400 transition-colors"
              >
                <option value="all">Tous</option>
                <option value="read">Lus</option>
                <option value="unread">Non lus</option>
              </select>
            </div>
          </div>

          {/* Actions groupées */}
          {selectedMessages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-sky-50 rounded-lg border border-sky-200">
              <span className="text-sm text-sky-800 font-medium">
                {selectedMessages.length} message(s) sélectionné(s)
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={markSelectedAsRead}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  <FiCheck className="w-4 h-4" />
                  Marquer comme lu
                </button>
                <button
                  onClick={markSelectedAsUnread}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  <FiEyeOff className="w-4 h-4" />
                  Marquer non lu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Liste des messages */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* En-tête du tableau */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedMessages.length === paginatedMessages.length && paginatedMessages.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 text-sky-500 focus:border-sky-500"
              />
            </div>
            <div className="col-span-3">Expéditeur</div>
            <div className="col-span-3">Sujet</div>
            <div 
              className="col-span-2 flex items-center gap-1 cursor-pointer"
              onClick={() => {
                setSortBy('priority');
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}
            >
              Priorité
              {sortBy === 'priority' && (
                sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />
              )}
            </div>
            <div 
              className="col-span-2 flex items-center gap-1 cursor-pointer"
              onClick={() => {
                setSortBy('createdAt');
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}
            >
              Date
              {sortBy === 'createdAt' && (
                sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />
              )}
            </div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Messages */}
          {paginatedMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FiMail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun message trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedMessages.map((message) => (
                <MessageItem
                  key={message._id}
                  message={message}
                  isSelected={selectedMessages.includes(message._id)}
                  onSelect={() => toggleMessageSelection(message._id)}
                  isExpanded={expandedMessage === message._id}
                  onToggleExpand={() => setExpandedMessage(
                    expandedMessage === message._id ? null : message._id
                  )}
                  isReplying={replyingTo === message._id}
                  onStartReply={() => setReplyingTo(message._id)}
                  onCancelReply={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  replyText={replyText}
                  onReplyTextChange={setReplyText}
                  onSendReply={() => sendReply(message._id)}
                  onMarkAsRead={() => markAsRead(message._id)}
                  onMarkAsUnread={() => markAsUnread(message._id)}
                  onDelete={() => deleteMessage(message._id)}
                  getStatusColor={getStatusColor}
                  getPriorityColor={getPriorityColor}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Page {currentPage} sur {totalPages} • {sortedMessages.length} message(s)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant de carte de statistique
const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ 
  title, 
  value, 
  color 
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 text-center">
    <div className={`inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full ${color} text-white mb-2`}>
      <span className="text-sm md:text-base font-bold">{value}</span>
    </div>
    <div className="text-xs md:text-sm text-gray-600 font-medium">{title}</div>
  </div>
);

// Composant d'élément de message
const MessageItem: React.FC<{
  message: ContactMessage;
  isSelected: boolean;
  onSelect: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isReplying: boolean;
  onStartReply: () => void;
  onCancelReply: () => void;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSendReply: () => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onDelete: () => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}> = ({
  message,
  isSelected,
  onSelect,
  isExpanded,
  onToggleExpand,
  isReplying,
  onStartReply,
  onCancelReply,
  replyText,
  onReplyTextChange,
  onSendReply,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  getStatusColor,
  getPriorityColor,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors ${!message.isRead ? 'bg-blue-50' : ''}`}>
      {/* Version mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="rounded border-gray-300 text-sky-500 focus:border-sky-500 mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">
                {message.firstName} {message.lastName}
              </div>
              <div className="text-sm text-gray-500">{message.email}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">{formatDate(message.createdAt)}</div>
            <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getPriorityColor(message.priority)}`}>
              {message.priority}
            </span>
          </div>
        </div>

        <div className="font-medium text-gray-800">{message.subject}</div>
        
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getStatusColor(message.status)}`}>
            {message.status === 'new' ? 'Nouveau' : 
             message.status === 'read' ? 'Lu' :
             message.status === 'in_progress' ? 'En cours' : 'Résolu'}
          </span>
          {!message.isRead && (
            <span className="inline-block px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
              Non lu
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onToggleExpand}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            <FiMessageSquare className="w-4 h-4" />
            {isExpanded ? 'Réduire' : 'Détails'}
          </button>
          <button
            onClick={onStartReply}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-sky-300 text-sky-600 rounded hover:bg-sky-50 transition-colors"
          >
            <FiSend className="w-4 h-4" />
            Répondre
          </button>
        </div>
      </div>

      {/* Version desktop */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
        <div className="col-span-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 text-sky-500 focus:border-sky-500"
          />
        </div>
        
        <div className="col-span-3">
          <div className="flex items-center gap-2">
            <FiUser className="w-4 h-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">
                {message.firstName} {message.lastName}
              </div>
              <div className="text-sm text-gray-500 truncate">{message.email}</div>
            </div>
          </div>
        </div>
        
        <div className="col-span-3">
          <div className="font-medium text-gray-800 truncate">{message.subject}</div>
        </div>
        
        <div className="col-span-2">
          <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getPriorityColor(message.priority)}`}>
            {message.priority}
          </span>
        </div>
        
        <div className="col-span-2">
          <div className="text-sm text-gray-600">{formatDate(message.createdAt)}</div>
        </div>
        
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Détails"
            >
              <FiMessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={onStartReply}
              className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
              title="Répondre"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Détails du message (expandable) */}
      {isExpanded && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <div className="mt-1">
                <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getStatusColor(message.status)}`}>
                  {message.status === 'new' ? 'Nouveau' : 
                   message.status === 'read' ? 'Lu' :
                   message.status === 'in_progress' ? 'En cours' : 'Résolu'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Priorité</label>
              <div className="mt-1">
                <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getPriorityColor(message.priority)}`}>
                  {message.priority}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <div className="mt-1 text-sm text-gray-600">
                <FiCalendar className="w-4 h-4 inline mr-1" />
                {formatDate(message.createdAt)}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">Message</label>
            <div className="mt-1 p-3 bg-white rounded border border-gray-200 text-gray-700 whitespace-pre-wrap">
              {message.message}
            </div>
          </div>

          {message.adminResponse && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">Réponse envoyée</label>
              <div className="mt-1 p-3 bg-green-50 rounded border border-green-200 text-gray-700 whitespace-pre-wrap">
                {message.adminResponse}
              </div>
              {message.respondedAt && (
                <div className="text-xs text-gray-500 mt-1">
                  Répondu le {formatDate(message.respondedAt)}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            {!message.isRead ? (
              <button
                onClick={onMarkAsRead}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <FiCheck className="w-4 h-4" />
                Marquer comme lu
              </button>
            ) : (
              <button
                onClick={onMarkAsUnread}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                <FiEyeOff className="w-4 h-4" />
                Marquer non lu
              </button>
            )}
            
            <button
              onClick={onStartReply}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-sky-300 text-sky-600 rounded hover:bg-sky-50 transition-colors"
            >
              <FiSend className="w-4 h-4" />
              Répondre
            </button>
            
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors ml-auto"
            >
              <FiTrash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Formulaire de réponse */}
      {isReplying && (
        <div className="mt-4 p-4 bg-sky-50 rounded-lg border border-sky-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Réponse à {message.firstName} {message.lastName}
          </label>
          <textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Tapez votre réponse ici..."
            rows={4}
            className="w-full p-3 rounded border border-gray-300 bg-white focus:border-sky-500 hover:border-sky-400 transition-colors resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={onSendReply}
              disabled={!replyText.trim()}
              className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Envoyer la réponse
            </button>
            <button
              onClick={onCancelReply}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;