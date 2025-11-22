import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminContactService, { Contact, ContactStats } from '../../api/admin/AdminContactService';
import { toast } from 'react-toastify';

// Icons (vous pouvez remplacer par vos propres icons)
const Icon = {
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  Reply: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
  Refresh: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Email: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
};

const AdminMessages: React.FC = () => {
  const { user } = useAuth();
  const contactService = AdminContactService();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  
  // États pour la pagination et filtres
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    isRead: undefined as boolean | undefined
  });
  
  const [totalContacts, setTotalContacts] = useState(0);

  // Charger les contacts
  const loadContacts = async () => {
    try {
      const response = await contactService.getAllContacts(filters);
      setContacts(response.data);
      setTotalContacts(response.total);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
    }
  };

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const statsData = await contactService.getContactStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  useEffect(() => {
    loadContacts();
    loadStats();
  }, [filters]);

  // Gestionnaires d'actions
  const handleMarkAsRead = async (id: string) => {
    try {
      await contactService.markAsRead(id);
      await loadContacts();
      await loadStats();
      toast.success('Message marqué comme lu');
    } catch (error) {
      toast.error('Erreur lors du marquage du message');
    }
  };

  const handleReply = async () => {
    if (!selectedContact || !replyMessage.trim()) return;
    
    try {
      await contactService.replyToMessage(selectedContact._id, replyMessage);
      await loadContacts();
      await loadStats();
      setIsReplyModalOpen(false);
      setReplyMessage('');
      toast.success('Réponse envoyée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la réponse');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;
    
    try {
      await contactService.deleteContact(id);
      await loadContacts();
      await loadStats();
      toast.success('Message supprimé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la suppression du message');
    }
  };

  const handleViewDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
    
    // Marquer comme lu si ce n'est pas déjà fait
    if (!contact.isRead) {
      await handleMarkAsRead(contact._id);
    }
  };

  const handleOpenReply = (contact: Contact) => {
    setSelectedContact(contact);
    setIsReplyModalOpen(true);
  };

  // Formatage de la date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination
  const totalPages = Math.ceil(totalContacts / filters.limit);
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="min-h-screen p-4">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-700 mb-2">
          Gestion des Messages
        </h1>
        <p className="text-blue-700">
          Gérez les messages des utilisateurs et répondez à leurs demandes
        </p>
      </div>

      {/* Cartes de statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Icon.Email />
              </div>
              <div className="ml-4">
                <p className="text-sm text-blue-600">Total Messages</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
            <div className="flex items-center">
              <div className="bg-red-100 p-2 rounded-lg">
                <Icon.Email />
              </div>
              <div className="ml-4">
                <p className="text-sm text-red-600">Non Lus</p>
                <p className="text-2xl font-bold text-red-900">{stats.unread}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg">
                <Icon.Check />
              </div>
              <div className="ml-4">
                <p className="text-sm text-green-600">Répondu</p>
                <p className="text-2xl font-bold text-green-900">{stats.responded}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Icon.Calendar />
              </div>
              <div className="ml-4">
                <p className="text-sm text-purple-600">Ce Mois</p>
                <p className="text-2xl font-bold text-purple-900">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre de filtres et recherche */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par nom, email ou message..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon.Search />
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex gap-2">
            <select
              value={filters.isRead === undefined ? '' : filters.isRead.toString()}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                isRead: e.target.value === '' ? undefined : e.target.value === 'true',
                page: 1 
              }))}
              className="px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 transition-colors"
            >
              <option value="">Tous les statuts</option>
              <option value="false">Non lus</option>
              <option value="true">Lus</option>
            </select>

            <button
              onClick={() => {
                setFilters({ page: 1, limit: 10, search: '', isRead: undefined });
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-none focus:border-blue-500 transition-colors"
            >
              <Icon.Refresh />
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des messages */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* En-tête du tableau */}
        <div className="px-4 py-3 bg-blue-500 text-white">
          <h2 className="text-lg font-semibold">Messages des Utilisateurs</h2>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-blue-200">
              {contacts.map((contact) => (
                <tr 
                  key={contact._id} 
                  className={`hover:bg-blue-50 transition-colors ${
                    !contact.isRead ? 'bg-blue-25' : ''
                  }`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Icon.User />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-900">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-sm text-blue-600">{contact.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-blue-900 line-clamp-2">
                      {contact.message}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm text-blue-600">
                      {formatDate(contact.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      contact.isRead 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {contact.isRead ? 'Lu' : 'Non lu'}
                    </span>
                    {contact.adminResponse && (
                      <span className="ml-1 inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                        Répondu
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(contact)}
                        className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-none transition-colors"
                        title="Voir les détails"
                      >
                        <Icon.Eye />
                      </button>
                      
                      <button
                        onClick={() => handleOpenReply(contact)}
                        className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-none transition-colors"
                        title="Répondre"
                      >
                        <Icon.Reply />
                      </button>
                      
                      {!contact.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(contact._id)}
                          className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-none transition-colors"
                          title="Marquer comme lu"
                        >
                          <Icon.Check />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(contact._id)}
                        className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-none transition-colors"
                        title="Supprimer"
                      >
                        <Icon.Trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <p className="text-sm text-blue-700 mb-2 sm:mb-0">
                Page {filters.page} sur {totalPages} • {totalContacts} messages
              </p>
              <div className="flex space-x-1">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="px-3 py-1 rounded border border-blue-300 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Précédent
                </button>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages}
                  className="px-3 py-1 rounded border border-blue-300 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {isDetailModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-blue-900 text-white">
              <h3 className="text-lg font-semibold">Détails du Message</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  De
                </label>
                <p className="text-blue-900">
                  {selectedContact.firstName} {selectedContact.lastName}
                </p>
                <p className="text-blue-600 text-sm">{selectedContact.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Date d'envoi
                </label>
                <p className="text-blue-900">
                  {formatDate(selectedContact.createdAt)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Message
                </label>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-900 whitespace-pre-wrap">
                    {selectedContact.message}
                  </p>
                </div>
              </div>

              {selectedContact.adminResponse && (
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    Votre réponse
                  </label>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-900 whitespace-pre-wrap">
                      {selectedContact.adminResponse}
                    </p>
                    <p className="text-green-600 text-sm mt-2">
                      Répondu le {formatDate(selectedContact.respondedAt!)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-blue-50 border-t border-blue-200 flex justify-end space-x-2">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-none transition-colors"
              >
                Fermer
              </button>
              {!selectedContact.adminResponse && (
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenReply(selectedContact);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-none transition-colors"
                >
                  Répondre
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de réponse */}
      {isReplyModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 bg-blue-900 text-white">
              <h3 className="text-lg font-semibold">Répondre au message</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-blue-900 font-medium">
                  À : {selectedContact.firstName} {selectedContact.lastName}
                </p>
                <p className="text-blue-600 text-sm">{selectedContact.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Votre réponse
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-none focus:border-blue-500 resize-none"
                  placeholder="Tapez votre réponse ici..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-blue-50 border-t border-blue-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsReplyModalOpen(false);
                  setReplyMessage('');
                }}
                className="px-4 py-2 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-none transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReply}
                disabled={!replyMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-none transition-colors"
              >
                Envoyer la réponse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;