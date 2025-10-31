import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';

interface ContactMessage {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  message: string;
  isRead: boolean;
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
}

interface MessagesResponse {
  data: ContactMessage[];
  total: number;
}

const AdminMessages: React.FC = () => {
  const { token, logout, user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Fonction de débogage du token
  const debugToken = () => {
    if (!token) {
      console.error('❌ Aucun token disponible');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 Token payload:', payload);
      console.log('🔍 Token expiration:', new Date(payload.exp * 1000));
      console.log('🔍 Token role:', payload.role);
      console.log('🔍 Token est expiré?', Date.now() >= payload.exp * 1000);
    } catch (e) {
      console.error('❌ Erreur décodage token:', e);
    }
  };

  const fetchMessages = async (page: number = 1, filterType: string = 'unread') => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Debug - User:', user);
      console.log('🔍 Debug - Token exists:', !!token);
      debugToken();

      if (!token) {
        throw new Error('Token manquant - Veuillez vous reconnecter');
      }

      if (user?.role !== 'admin') {
        throw new Error('Accès réservé aux administrateurs');
      }

      const isReadParam = filterType === 'all' ? undefined : filterType === 'read';
      
      const url = new URL(`${VITE_API_URL}/api/admin/contact`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '10');
      if (isReadParam !== undefined) {
        url.searchParams.append('isRead', isReadParam.toString());
      }

      console.log('🔍 Debug - Full URL:', url.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      console.log('🔍 Debug - Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          let errorMessage = 'Non autorisé (401)';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Ignorer si pas de JSON
          }
          throw new Error(errorMessage);
        }
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: MessagesResponse = await response.json();
      console.log('🔍 Debug - Data received:', data);
      
      setMessages(data.data);
      setTotalPages(Math.ceil(data.total / 10));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      console.error('❌ Fetch error:', err);
      setError(errorMessage);
      
      if (errorMessage.includes('Non autorisé') || errorMessage.includes('Token manquant')) {
        setTimeout(() => {
          logout('/connexion', true);
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 AdminMessages mounted - User:', user);
    debugToken();
    
    if (token && user) {
      fetchMessages(currentPage, filter);
    }
  }, [currentPage, filter, token, user]);

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const response = await fetch(
        `${VITE_API_URL}/api/admin/contact/${messageId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du marquage comme lu');
      }

      const result = await response.json();
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? result.contact : msg
      ));

      if (selectedMessage?._id === messageId) {
        setSelectedMessage(result.contact);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du marquage');
    }
  };

  const handleReply = async (messageId: string) => {
    if (!replyText.trim()) {
      setError('Veuillez saisir une réponse');
      return;
    }

    try {
      setReplying(true);
      const response = await fetch(
        `${VITE_API_URL}/api/admin/contact/${messageId}/reply`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reply: replyText }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de la réponse');
      }

      const result = await response.json();
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? result.contact : msg
      ));

      if (selectedMessage?._id === messageId) {
        setSelectedMessage(result.contact);
      }

      setReplyText('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de la réponse');
    } finally {
      setReplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateMobile = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
    if (!message.isRead) {
      handleMarkAsRead(message._id);
    }
  };

  const closeMessage = () => {
    setIsModalOpen(false);
    setSelectedMessage(null);
    setReplyText('');
  };

  // Fermer la modal avec la touche Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMessage();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  if (loading && messages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header avec info de débogage en développement */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Debug:</strong> User: {user?.email} | Role: {user?.role} | 
              Token: {token ? '✓' : '✗'} | Admin: {user?.role === 'admin' ? '✓' : '✗'}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Messages de contact</h1>
          <p className="text-gray-600 text-sm sm:text-base">Gérez les messages reçus via le formulaire de contact</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 sm:mb-6 px-4 py-3 rounded-lg text-sm sm:text-base ${
            error.includes('Non autorisé') 
              ? 'bg-red-50 border border-red-200 text-red-700' 
              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
          }`}>
            <div className="flex items-center gap-2">
              {error.includes('Non autorisé') ? (
                <>
                  <span>🔒</span>
                  <span>{error}. Redirection...</span>
                </>
              ) : (
                <>
                  <span>⚠️</span>
                  <span>{error}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Filtres et statistiques - Version Mobile Optimisée */}
        <div className="mb-4 sm:mb-6">
          {/* Filtres en boutons scrollables horizontaux sur mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:overflow-visible sm:mx-0 sm:px-0">
            <div className="flex gap-2 flex-nowrap min-w-max">
              <button
                onClick={() => { setFilter('unread'); setCurrentPage(1); }}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${
                  filter === 'unread'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                📩 Non lus
              </button>
              <button
                onClick={() => { setFilter('read'); setCurrentPage(1); }}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${
                  filter === 'read'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                ✓ Lus
              </button>
              <button
                onClick={() => { setFilter('all'); setCurrentPage(1); }}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                📋 Tous
              </button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mt-3 flex justify-between items-center">
            <div className="text-xs sm:text-sm text-gray-600">
              {messages.length} message{messages.length > 1 ? 's' : ''}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </div>
          </div>
        </div>

        {/* Liste des messages - Version Mobile Optimisée */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {messages.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 text-4xl sm:text-6xl mb-3 sm:mb-4">📭</div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">Aucun message</h3>
              <p className="text-gray-600 text-sm sm:text-base px-4">
                {filter === 'unread' 
                  ? "Vous n'avez aucun message non lu" 
                  : filter === 'read'
                  ? "Vous n'avez aucun message lu"
                  : "Aucun message n'a été trouvé"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`p-4 sm:p-6 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100 ${
                    !message.isRead ? 'bg-sky-50 border-l-2 sm:border-l-4 border-l-sky-500' : ''
                  }`}
                  onClick={() => openMessage(message)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3 mb-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* Avatar mobile */}
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-semibold text-sm sm:text-base">
                        {message.firstName?.[0]?.toUpperCase() || message.email[0].toUpperCase()}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {message.firstName} {message.lastName}
                          </h3>
                          <div className="flex gap-1 flex-wrap">
                            {!message.isRead && (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                Nouveau
                              </span>
                            )}
                            {message.adminResponse && (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Répondu
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs sm:text-sm truncate">{message.email}</p>
                      </div>
                    </div>
                    
                    <div className="text-right ml-10 sm:ml-0">
                      <div className="text-xs sm:text-sm text-gray-500">
                        <span className="sm:hidden">{formatDateMobile(message.createdAt)}</span>
                        <span className="hidden sm:inline">{formatDate(message.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Message preview - version mobile tronquée */}
                  <p className="text-gray-700 text-sm sm:text-base line-clamp-2 sm:line-clamp-3 mb-2">
                    {message.message}
                  </p>
                  
                  {/* Badge de réponse sur mobile */}
                  {message.adminResponse && (
                    <div className="sm:hidden mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-50 text-green-700 border border-green-200">
                        ✓ Répondu
                      </span>
                    </div>
                  )}
                  
                  {/* Réponse complète sur desktop */}
                  {message.adminResponse && (
                    <div className="hidden sm:block mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Votre réponse</span>
                        <span className="text-xs text-gray-500">
                          {message.respondedAt && formatDate(message.respondedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{message.adminResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Mobile Optimisée */}
        {totalPages > 1 && (
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-2 items-center justify-between">
            <div className="text-xs sm:text-sm text-gray-500 sm:order-1">
              Page {currentPage} sur {totalPages}
            </div>
            
            <div className="flex gap-1 sm:gap-2 order-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm sm:text-base flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Précédent</span>
              </button>
              
              {/* Pages réduites sur mobile */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage === 1) {
                    pageNum = i + 1;
                  } else if (currentPage === totalPages) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = currentPage - 1 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 sm:w-10 h-8 sm:h-10 border rounded-lg text-sm sm:text-base ${
                        currentPage === pageNum
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 3 && currentPage < totalPages - 1 && (
                  <span className="w-8 h-8 flex items-center justify-center text-gray-500">...</span>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm sm:text-base flex items-center gap-1"
              >
                <span className="hidden sm:inline">Suivant</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Modal Mobile First */}
        {isModalOpen && selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl flex flex-col">
              {/* Header sticky */}
              <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl sm:rounded-t-lg z-10">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-semibold">
                      {selectedMessage.firstName?.[0]?.toUpperCase() || selectedMessage.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                        {selectedMessage.firstName} {selectedMessage.lastName}
                      </h2>
                      <p className="text-gray-600 text-sm sm:text-base truncate">{selectedMessage.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeMessage}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 text-xs sm:text-sm text-gray-500">
                  Reçu le {formatDate(selectedMessage.createdAt)}
                </div>
              </div>

              {/* Content scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Message :</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedMessage.message}</p>
                  </div>
                </div>

                {selectedMessage.adminResponse ? (
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Votre réponse :</h3>
                    <div className="bg-sky-50 p-4 rounded-lg border border-sky-200">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedMessage.adminResponse}</p>
                      <div className="mt-2 text-xs sm:text-sm text-sky-600">
                        Répondu le {selectedMessage.respondedAt && formatDate(selectedMessage.respondedAt)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Répondre :</h3>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Réponse à votre message..."
                      className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Footer sticky */}
              {!selectedMessage.adminResponse && (
                <div className="p-4 sm:p-6 border-t border-gray-200 bg-white sticky bottom-0">
                  <div className="flex gap-3">
                    <button
                      onClick={closeMessage}
                      className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleReply(selectedMessage._id)}
                      disabled={replying || !replyText.trim()}
                      className="flex-1 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {replying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Envoi...
                        </>
                      ) : (
                        'Envoyer'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;