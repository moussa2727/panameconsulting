import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mail, User, Clock, CheckCircle, XCircle, Reply, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';

interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  message: string;
  isRead: boolean;
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactStats {
  total: number;
  unread: number;
  read: number;
  responded: number;
  thisMonth: number;
  lastMonth: number;
}

interface ApiResponse {
  data: Contact[];
  total: number;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AdminMessages: React.FC = () => {
  const { token, refreshToken, logout, isAuthenticated } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [replyText, setReplyText] = useState('');

  // Fonction sécurisée pour les appels API avec meilleure gestion des tokens
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    let currentToken = token;
    
    // Si pas de token, essayer de rafraîchir
    if (!currentToken) {
      console.log('🔑 Aucun token, tentative de rafraîchissement...');
      const refreshed = await refreshToken();
      if (refreshed) {
        currentToken = localStorage.getItem('token');
        if (!currentToken) {
          throw new Error('Session expirée');
        }
      } else {
        throw new Error('Session expirée');
      }
    }

    const makeRequest = async (userToken: string) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      return response;
    };

    let response = await makeRequest(currentToken);

    // Si 401, essayer de rafraîchir le token et réessayer
    if (response.status === 401) {
      console.log('🔄 Token expiré, tentative de rafraîchissement...');
      const refreshed = await refreshToken();
      if (refreshed) {
        const newToken = localStorage.getItem('token');
        if (newToken) {
          response = await makeRequest(newToken);
        } else {
          throw new Error('Session expirée');
        }
      } else {
        throw new Error('Session expirée');
      }
    }

    return response;
  }, [token, refreshToken]);

  const fetchContacts = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🚫 Utilisateur non authentifié');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', '1');
      queryParams.append('limit', '50');
      if (searchTerm) queryParams.append('search', searchTerm);
      if (filter === 'read') queryParams.append('isRead', 'true');
      if (filter === 'unread') queryParams.append('isRead', 'false');

      console.log('📡 Fetching contacts...');
      const response = await apiCall(
        `${API_URL}/api/contact?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors du chargement des messages`);
      }

      const data: ApiResponse = await response.json();
      console.log('✅ Contacts chargés:', data.data.length);
      
      const normalizedContacts = data.data.map(contact => ({
        ...contact,
        id: contact.id
      }));
      
      setContacts(normalizedContacts);
    } catch (error) {
      console.error('❌ Erreur fetchContacts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      
      if (errorMessage.includes('Session expirée')) {
        toast.error('Session expirée');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, searchTerm, filter, apiCall]);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      console.log('📊 Fetching stats...');
      const response = await apiCall(`${API_URL}/api/contact/stats`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        console.log('✅ Stats chargées:', data);
      }
    } catch (error) {
      console.error('❌ Erreur fetchStats:', error);
    }
  }, [isAuthenticated, apiCall]);

  const markAsRead = async (id: string) => {
    try {
      const response = await apiCall(`${API_URL}/api/contact/${id}/read`, {
        method: 'PATCH'
      });

      if (response.ok) {
        const result = await response.json();
        setContacts(prev => prev.map(contact =>
          contact.id === id ? result.contact : contact
        ));
        if (selectedContact?.id === id) {
          setSelectedContact(prev => prev ? { ...prev, isRead: true } : null);
        }
        toast.success('Message marqué comme lu');
        fetchStats();
      }
    } catch (error) {
      console.error('Erreur markAsRead:', error);
      toast.error('Erreur lors du marquage comme lu');
    }
  };

  const sendReply = async (contactId: string) => {
    if (!replyText.trim()) {
      toast.error('Le message de réponse ne peut pas être vide');
      return;
    }

    try {
      const response = await apiCall(`${API_URL}/api/contact/${contactId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: replyText })
      });

      if (response.ok) {
        const result = await response.json();
        setContacts(prev => prev.map(contact =>
          contact.id === contactId ? result.contact : contact
        ));
        setSelectedContact(result.contact);
        setReplyText('');
        toast.success('Réponse envoyée avec succès');
        fetchStats();
      } else {
        throw new Error('Erreur lors de l\'envoi de la réponse');
      }
    } catch (error) {
      console.error('Erreur sendReply:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'envoi');
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
      const response = await apiCall(`${API_URL}/api/contact/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setContacts(prev => prev.filter(contact => contact.id !== id));
        if (selectedContact?.id === id) {
          setSelectedContact(null);
        }
        toast.success('Message supprimé avec succès');
        fetchStats();
      }
    } catch (error) {
      console.error('Erreur deleteContact:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getSenderName = (contact: Contact): string => {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    }
    if (contact.firstName) return contact.firstName;
    if (contact.lastName) return contact.lastName;
    return contact.email.split('@')[0];
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Chargement initial
  useEffect(() => {
    console.log('🔐 État authentification:', { isAuthenticated, token: !!token });
    
    if (isAuthenticated) {
      console.log('✅ Utilisateur authentifié, chargement des données...');
      fetchContacts();
      fetchStats();
    }
  }, [isAuthenticated, fetchContacts, fetchStats]);

  // Rechargement quand les filtres changent
  useEffect(() => {
    if (isAuthenticated) {
      const timeoutId = setTimeout(() => {
        fetchContacts();
      }, 300);
        
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, filter, isAuthenticated, fetchContacts]);

  // Si non authentifié, afficher un message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Accès non autorisé</h2>
          <p className="text-slate-600">Veuillez vous connecter pour accéder aux messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {/* Header avec statistiques */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Messages de contact</h1>
        <p className="text-slate-600">Gérez les messages reçus via le formulaire de contact</p>
        
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
              <div className="text-sm text-slate-600">Non lus</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-emerald-600">{stats.read}</div>
              <div className="text-sm text-slate-600">Lus</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-purple-600">{stats.responded}</div>
              <div className="text-sm text-slate-600">Répondu</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des messages */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Filtres et recherche */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par email, nom ou message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'unread' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Non lus
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'read' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Lus
                </button>
              </div>
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p>Aucun message trouvé</p>
              </div>
            ) : (
              contacts.map(contact => (
                <div
                  key={contact.id}
                  className={`border-b border-slate-100 last:border-b-0 p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedContact?.id === contact.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  } ${!contact.isRead ? 'bg-slate-50' : ''}`}
                  onClick={() => {
                    setSelectedContact(contact);
                    if (!contact.isRead) {
                      markAsRead(contact.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {getSenderName(contact)}
                      </span>
                      {!contact.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {contact.adminResponse && (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {formatDate(contact.createdAt).split(' ')[0]}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-1">{contact.email}</div>
                  <p className="text-slate-700 line-clamp-2 text-sm">
                    {contact.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Détail du message */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {selectedContact ? (
            <div className="h-full flex flex-col">
              {/* En-tête */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-1">
                      {getSenderName(selectedContact)}
                    </h2>
                    <p className="text-slate-600">{selectedContact.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedContact.isRead ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-blue-500" />
                    )}
                    <span className="text-sm text-slate-500">
                      {formatDate(selectedContact.createdAt)}
                    </span>
                  </div>
                </div>

                {selectedContact.adminResponse && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="text-sm font-semibold text-emerald-800 mb-1">
                      ✓ Réponse envoyée le {selectedContact.respondedAt ? formatDate(selectedContact.respondedAt) : 'Date inconnue'}
                    </div>
                    <p className="text-emerald-700 text-sm">{selectedContact.adminResponse}</p>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedContact.message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-slate-200">
                {!selectedContact.adminResponse ? (
                  <>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Tapez votre réponse ici..."
                      className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => sendReply(selectedContact.id)}
                        disabled={!replyText.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        <Reply className="w-4 h-4" />
                        Envoyer la réponse
                      </button>
                      <button
                        onClick={() => deleteContact(selectedContact.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => deleteContact(selectedContact.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-slate-500">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p>Sélectionnez un message pour afficher son contenu</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;