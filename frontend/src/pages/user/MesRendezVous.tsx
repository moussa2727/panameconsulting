import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const { user, isAuthenticated } = useAuth();
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
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/rendezvous/user?email=${user?.email}&page=${page}&limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'annulation du rendez-vous');
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
    return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const canCancel = (rdv: Rendezvous) => {
    const date = new Date(`${rdv.date}T${rdv.time}:00`);
    return date.getTime() - Date.now() >= 24 * 60 * 60 * 1000;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-sky-600">Mes rendez-vous</h2>
            <button
              onClick={() => navigate('/rendez-vous')}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Nouveau rendez-vous
            </button>
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
              <p className="text-gray-500">Vous n'avez aucun rendez-vous programmé</p>
              <button
                onClick={() => navigate('/rendez-vous')}
                className="mt-6 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                Prendre un rendez-vous
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-hidden">
                <div className="hidden sm:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heure</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rendezvous.map(rdv => (
                        <tr key={rdv._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-sky-500" />
                              {formatDate(rdv.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-sky-500" />
                              {rdv.time}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{rdv.destination}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${rdv.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                                rdv.status === 'Terminé' ? 'bg-blue-100 text-blue-800' :
                                rdv.status === 'Annulé' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'}`}>
                              {rdv.status}
                            </span>
                            {rdv.avisAdmin && (
                              <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                {rdv.avisAdmin}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {rdv.status === 'En attente' || rdv.status === 'Confirmé' ? (
                              <button
                                onClick={() => canCancel(rdv) ? setConfirmId(rdv._id) : toast.info('Annulation possible au moins 24h avant')}
                                disabled={!canCancel(rdv)}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md ${canCancel(rdv) ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                <XCircle className="w-4 h-4" /> Annuler
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">Aucune action</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Version mobile */}
                <div className="sm:hidden">
                  {rendezvous.map(rdv => (
                    <div key={rdv._id} className="border-b border-gray-200 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-sky-600">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{formatDate(rdv.date)}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                          ${rdv.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                            rdv.status === 'Terminé' ? 'bg-blue-100 text-blue-800' :
                            rdv.status === 'Annulé' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                          {rdv.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{rdv.time}</span>
                      </div>
                      
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">Destination:</span>
                        <p className="text-gray-600">{rdv.destination}</p>
                      </div>
                      
                      {rdv.avisAdmin && (
                        <div className="mb-3">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {rdv.avisAdmin}
                          </span>
                        </div>
                      )}
                      
                      <div className="mt-3">
                        {rdv.status === 'En attente' || rdv.status === 'Confirmé' ? (
                          <button
                            onClick={() => canCancel(rdv) ? setConfirmId(rdv._id) : toast.info('Annulation possible au moins 24h avant')}
                            disabled={!canCancel(rdv)}
                            className={`w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm ${canCancel(rdv) ? 'text-red-600 hover:bg-red-50 border border-red-200' : 'text-gray-400 cursor-not-allowed border border-gray-200'}`}
                          >
                            <XCircle className="w-4 h-4" /> Annuler le rendez-vous
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">Aucune action disponible</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Précédent
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {page} sur {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmation d'annulation */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer l'annulation</h3>
            <p className="text-sm text-gray-600 mb-4">Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmId(null)} 
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleCancel(confirmId)} 
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesRendezVous;