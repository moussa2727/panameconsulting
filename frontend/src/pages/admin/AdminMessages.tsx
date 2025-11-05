import { useState } from 'react';

interface Message {
  id: string;
  sender: string;
  priority: 'urgent' | 'normal' | 'low';
  email: string;
  subject: string;
  content: string;
  date: string;
  time: string;
  unread: boolean;
}

const AdminMessages = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'Marie Martin',
      priority: 'normal',
      email: 'marie.martin@example.com',
      subject: 'Demande de congés',
      content: 'Bonjour, je souhaiterais poser des congés du 15 au 25 mars. Merci de confirmer la disponibilité.',
      date: '10/03/2024',
      time: '10:30',
      unread: true,
    },
    {
      id: '2',
      sender: 'Pierre Bernard',
      priority: 'urgent',
      email: 'pierre.bernard@example.com',
      subject: 'Problème technique urgent',
      content: 'Le serveur principal présente des dysfonctionnements. Intervention nécessaire rapidement.',
      date: '09/03/2024',
      time: '16:45',
      unread: true,
    },
    {
      id: '3',
      sender: 'Service RH',
      priority: 'normal',
      email: 'rh@example.com',
      subject: 'Formation obligatoire',
      content: 'Rappel : formation sécurité obligatoire le 20 mars. Merci de confirmer votre présence.',
      date: '08/03/2024',
      time: '11:20',
      unread: false,
    },
    {
      id: '4',
      sender: 'Direction',
      priority: 'low',
      email: 'direction@example.com',
      subject: 'Réunion équipe',
      content: 'Réunion d\'équipe prévue vendredi 15 mars à 14h en salle de conférence.',
      date: '07/03/2024',
      time: '09:15',
      unread: false,
    }
  ]);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const unreadCount = messages.filter(msg => msg.unread).length;

  const filteredMessages = messages.filter(msg => {
    if (filter === 'unread') return msg.unread;
    if (filter === 'urgent') return msg.priority === 'urgent';
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'normal': return 'Normal';
      case 'low': return 'Faible';
      default: return priority;
    }
  };

  const markAsRead = (id: string) => {
    setMessages(messages.map(msg => 
      msg.id === id ? { ...msg, unread: false } : msg
    ));
  };

  const markAllAsRead = () => {
    setMessages(messages.map(msg => ({ ...msg, unread: false })));
  };

  const deleteMessage = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id));
    if (selectedMessage?.id === id) {
      setSelectedMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
    
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Messages List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              Tous les messages
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                filter === 'unread'
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              Non lus ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                filter === 'urgent'
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              Urgents
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`border-b border-slate-100 last:border-b-0 transition-all duration-200 cursor-pointer hover:bg-slate-50/70 ${
                  selectedMessage?.id === message.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                } ${message.unread ? 'bg-slate-50' : ''}`}
                onClick={() => {
                  setSelectedMessage(message);
                  if (message.unread) {
                    markAsRead(message.id);
                  }
                }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800 truncate">
                            {message.sender}
                          </h3>
                          {message.unread && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {message.date} • {message.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getPriorityColor(message.priority)}`}>
                          {getPriorityText(message.priority)}
                        </span>
                        <span className="text-slate-600 text-sm truncate">
                          {message.email}
                        </span>
                      </div>

                      <h4 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                        {message.subject}
                      </h4>
                      <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredMessages.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-inbox text-slate-400 text-xl"></i>
                </div>
                <p>Aucun message trouvé</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {selectedMessage ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {selectedMessage.sender}
                      </h2>
                      <p className="text-slate-600">{selectedMessage.email}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500 whitespace-nowrap">
                    {selectedMessage.date} • {selectedMessage.time}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getPriorityColor(selectedMessage.priority)}`}>
                    {getPriorityText(selectedMessage.priority)}
                  </span>
                  <h1 className="text-lg font-semibold text-slate-800 flex-1">
                    {selectedMessage.subject}
                  </h1>
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.content}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-slate-200 bg-slate-50/50">
                <div className="flex flex-wrap gap-3">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2">
                    <i className="fas fa-reply"></i>
                    Répondre
                  </button>
                  <button 
                    onClick={() => selectedMessage.unread && markAsRead(selectedMessage.id)}
                    className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 ${
                      selectedMessage.unread
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <i className={`fas ${selectedMessage.unread ? 'fa-envelope-open' : 'fa-envelope'}`}></i>
                    {selectedMessage.unread ? 'Marquer comme lu' : 'Marquer comme non lu'}
                  </button>
                  <button 
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 ml-auto"
                  >
                    <i className="fas fa-trash"></i>
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                  <i className="fas fa-envelope-open text-slate-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Aucun message sélectionné
                </h3>
                <p className="text-slate-500 text-sm">
                  Cliquez sur un message pour afficher son contenu
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <button className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:bg-blue-600">
          <i className="fas fa-edit text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default AdminMessages;