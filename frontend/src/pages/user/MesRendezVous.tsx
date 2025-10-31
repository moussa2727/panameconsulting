import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, User, FileText, Home, XCircle, History } from 'lucide-react';

interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  status: string;
  destination: string;
  avisAdmin?: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MesRendezVous = () => {
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
    } else {
      fetchRendezvous();
    }
  }, [isAuthenticated, navigate, page]);

  const fetchRendezvous = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/rendezvous/user?email=${user.email}&page=${page}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des rendez-vous');
      }
      
      const data = await response.json();
      setRendezvous(data.data);
      setTotalPages(Math.ceil(data.total / 5));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'annulation du rendez-vous');
      }
      
      toast.success('Rendez-vous annulé avec succès');
      fetchRendezvous();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setConfirmId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const canCancel = (rdv: Rendezvous) => {
    const now = new Date();
    const rendezvousDateTime = new Date(`${rdv.date}T${rdv.time}`);
    
    const timeDiff = rendezvousDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return hoursDiff >= 2;
  };

  const getTimeRemainingMessage = (rdv: Rendezvous) => {
    const now = new Date();
    const rendezvousDateTime = new Date(`${rdv.date}T${rdv.time}`);
    const timeDiff = rendezvousDateTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 2 && hoursDiff > 0) {
      const minutesRemaining = Math.floor((timeDiff / (1000 * 60)) % 60);
      const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
      
      if (hoursRemaining > 0) {
        return `Annulation possible dans ${hoursRemaining}h ${minutesRemaining}min`;
      } else {
        return `Annulation possible dans ${minutesRemaining}min`;
      }
    }
    
    return null;
  };

  const getStatusBadge = (status: string, avisAdmin?: string) => {
    return (
      <div className="flex flex-col gap-1">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${status === 'Confirmé' ? 'bg-green-100 text-green-800' :
            status === 'Terminé' ? 'bg-blue-100 text-blue-800' :
            status === 'Annulé' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'}`}>
          {status}
        </span>
        {avisAdmin && (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            {avisAdmin}
          </span>
        )}
      </div>
    );
  };

  // Si non authentifié, ne rien afficher le temps de la redirection
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation utilisateur */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4 md:space-x-6">
              <Link to="/" className="flex items-center text-sky-600 hover:text-sky-700 transition-colors">
                <Home className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Accueil</span>
              </Link>
              <nav className="flex space-x-2 md:space-x-4">
                <Link to="/user-profile" className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <User className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Mon Profil</span>
                </Link>
                <Link to="/user-rendez-vous" className="flex items-center px-2 py-2 md:px-3 bg-sky-100 text-sky-700 rounded-md">
                  <Calendar className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Mes Rendez-vous</span>
                </Link>
                <Link to="/user-procedure" className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <FileText className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Mes Procédures</span>
                </Link>
                <Link to="/user-historique" className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <History className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline text-sm md:text-base">Historique</span>
                </Link>
              </nav>
            </div>
            <button
              onClick={() => navigate('/rendez-vous')}
              className="px-3 py-2 md:px-4 md:py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-sm flex items-center gap-2 text-sm md:text-base"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden xs:inline">Nouveau</span>
            </button>
          </div>
        </div>
      </div>

      <div className="py-6 md:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* En-tête */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-sky-600">Mes Rendez-vous</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
              Consultez et gérez vos rendez-vous programmés
            </p>
          </div>

          {/* Carte principale */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-sky-600">Rendez-vous à venir</h2>
                  <p className="text-gray-600 text-sm md:text-base">Vos prochains rendez-vous programmés</p>
                </div>
                <button
                  onClick={() => navigate('/user-historique')}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sky-600 hover:bg-sky-50 rounded-lg border border-sky-200 transition-colors w-full sm:w-auto"
                >
                  <History className="w-4 h-4" />
                  <span>Voir l'historique</span>
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500"></div>
              </div>
            ) : rendezvous.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-4">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun rendez-vous</h3>
                <p className="text-gray-500 mb-6">Vous n'avez aucun rendez-vous programmé</p>
                <button
                  onClick={() => navigate('/rendez-vous')}
                  className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
                >
                  Prendre un rendez-vous
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-hidden">
                  {/* Version desktop */}
                  <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heure</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rendezvous.map(rdv => {
                          const timeRemainingMessage = getTimeRemainingMessage(rdv);
                          return (
                            <tr key={rdv._id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-sky-500" />
                                  <span className="text-sm">{formatDate(rdv.date)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-sky-500" />
                                  <span className="text-sm">{rdv.time}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {rdv.destination}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {getStatusBadge(rdv.status, rdv.avisAdmin)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {(rdv.status === 'En attente' || rdv.status === 'Confirmé') ? (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => canCancel(rdv) ? setConfirmId(rdv._id) : toast.info('Annulation possible seulement 2h avant le rendez-vous')}
                                      disabled={!canCancel(rdv)}
                                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm ${canCancel(rdv) ? 'text-red-600 hover:bg-red-50 border border-red-200' : 'text-gray-400 cursor-not-allowed border border-gray-200'}`}
                                    >
                                      <XCircle className="w-4 h-4" /> Annuler
                                    </button>
                                    {timeRemainingMessage && (
                                      <span className="text-xs text-gray-500 max-w-[150px]">{timeRemainingMessage}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Aucune action</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Version mobile */}
                  <div className="md:hidden">
                    <div className="divide-y divide-gray-200">
                      {rendezvous.map(rdv => {
                        const timeRemainingMessage = getTimeRemainingMessage(rdv);
                        return (
                          <div key={rdv._id} className="p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2 text-sky-600">
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium text-sm">{formatDate(rdv.date)}</span>
                              </div>
                              {getStatusBadge(rdv.status, rdv.avisAdmin)}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{rdv.time}</span>
                              </div>
                              
                              <div>
                                <span className="text-sm font-medium text-gray-700">Destination:</span>
                                <p className="text-gray-600 text-sm">{rdv.destination}</p>
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              {(rdv.status === 'En attente' || rdv.status === 'Confirmé') ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => canCancel(rdv) ? setConfirmId(rdv._id) : toast.info('Annulation possible seulement 2h avant le rendez-vous')}
                                    disabled={!canCancel(rdv)}
                                    className={`w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm ${canCancel(rdv) ? 'text-red-600 hover:bg-red-50 border border-red-200' : 'text-gray-400 cursor-not-allowed border border-gray-200'}`}
                                  >
                                    <XCircle className="w-4 h-4" /> Annuler le rendez-vous
                                  </button>
                                  {timeRemainingMessage && (
                                    <span className="text-xs text-gray-500 text-center block">{timeRemainingMessage}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm text-center block">Aucune action disponible</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden xs:inline">Précédent</span>
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {page} sur {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="hidden xs:inline">Suivant</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation d'annulation */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer l'annulation</h3>
            <p className="text-sm text-gray-600 mb-4">Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button 
                onClick={() => setConfirmId(null)} 
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors order-2 sm:order-1"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleCancel(confirmId)} 
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors order-1 sm:order-2"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesRendezVous;