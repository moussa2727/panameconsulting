import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Navigate, useNavigate } from 'react-router-dom';

interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  statut: 'En cours' | 'Refusée' | 'Annulée' | 'Terminée';
  steps: {
    nom: string;
    statut: 'En cours' | 'Refusé' | 'Terminé';
    raisonRefus?: string;
    dateMaj: string;
  }[];
  rendezVousId?: {
    _id: string;
    date: string;
    time: string;
    status: string;
  };
  createdAt: string;
}

interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  date: string;
  time: string;
}

export default function AdminProcedure() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [rendezvousList, setRendezvousList] = useState<Rendezvous[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState<{ statut: string; raisonRefus?: string }>({ statut: 'En cours' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProcedure, setNewProcedure] = useState({
    prenom: '',
    nom: '',
    email: '',
    destination: 'France',
    rendezVousId: '',
    steps: [
      { nom: "Demande d'Admission", statut: 'En cours' },
      { nom: "Demande de Visa", statut: 'En cours' },
      { nom: "Préparatifs de Voyage", statut: 'En cours' }
    ]
  });
  const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Vérification des permissions administrateur
  const hasAdminAccess = () => {
    return user && user.role === 'admin' && user.isActive;
  };

  const handleApiError = (error: any, defaultMessage: string) => {
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('Token')) {
        toast.error('Session expirée - Veuillez vous reconnecter');
        localStorage.removeItem('token');
        window.location.href = '/connexion';
        return;
      }
      toast.error(error.message);
    } else {
      toast.error(defaultMessage);
    }
  };

  const fetchProcedures = async () => {
    try {
      setLoading(true);
      let url = `${VITE_API_URL}/api/procedures?page=${currentPage}&limit=10`;
      
      if (selectedStatus !== 'all') {
        url += `&statut=${selectedStatus}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (response.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        localStorage.removeItem('token');
        window.location.href = '/connexion';
        return;
      }
      
      if (response.status === 403) {
        toast.error('Accès refusé : droits administrateur requis');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setProcedures(data.data || []);
      setTotalPages(Math.ceil(data.total / 10));
    } catch (error) {
      console.error('Erreur:', error);
      handleApiError(error, 'Erreur lors du chargement des procédures');
    } finally {
      setLoading(false);
    }
  };

  const fetchRendezvous = async () => {
    try {
      const response = await fetch(`${VITE_API_URL}/api/rendezvous?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (response.status === 403) {
        console.log('Accès aux rendez-vous non autorisé - Permission manquante');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setRendezvousList(data.data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous:', error);
    }
  };

  const handleStepUpdate = async (procedureId: string, stepName: string) => {
    if (!procedureId) {
      toast.error('ID de procédure manquant');
      return;
    }

    try {
      const response = await fetch(
        `${VITE_API_URL}/api/procedures/${procedureId}/steps/${encodeURIComponent(stepName)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify(stepForm),
        }
      );

      if (response.status === 403) {
        throw new Error('Droits administrateur requis pour modifier les étapes');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la mise à jour de l\'étape');
      }

      toast.success('Étape mise à jour avec succès');
      setEditingStep(null);
      setEditingProcedure(null);
      fetchProcedures();
    } catch (error) {
      console.error('Erreur:', error);
      handleApiError(error, 'Erreur lors de la mise à jour de l\'étape');
    }
  };

  const handleProcedureStatusUpdate = async (id: string, newStatus: string) => {
    if (!id) {
      toast.error('ID de procédure manquant');
      return;
    }

    try {
      const response = await fetch(`${VITE_API_URL}/api/procedures/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ statut: newStatus }),
      });

      if (response.status === 403) {
        throw new Error('Droits administrateur requis pour modifier le statut');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la mise à jour du statut');
      }

      toast.success('Statut de la procédure mis à jour');
      fetchProcedures();
    } catch (error) {
      console.error('Erreur:', error);
      handleApiError(error, 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteProcedure = async (id: string) => {
    if (!id) {
      toast.error('ID de procédure manquant');
      return;
    }

    try {
      const response = await fetch(`${VITE_API_URL}/api/procedures/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (response.status === 403) {
        throw new Error('Droits administrateur requis pour supprimer');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la suppression de la procédure');
      }

      toast.success('Procédure supprimée avec succès');
      setShowDeleteId(null);
      fetchProcedures();
    } catch (error) {
      console.error('Erreur:', error);
      handleApiError(error, 'Erreur lors de la suppression de la procédure');
    }
  };

  const handleCreateProcedure = async () => {
    try {
      if (!newProcedure.prenom || !newProcedure.nom || !newProcedure.email || !newProcedure.destination) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newProcedure.email)) {
        toast.error('Veuillez entrer une adresse email valide');
        return;
      }

      // Préparer les données à envoyer
      const procedureToCreate = {
        prenom: newProcedure.prenom,
        nom: newProcedure.nom,
        email: newProcedure.email,
        destination: newProcedure.destination,
        rendezVousId: newProcedure.rendezVousId || undefined,
        steps: newProcedure.steps
      };

      const response = await fetch(`${VITE_API_URL}/api/procedures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(procedureToCreate),
      });

      if (response.status === 403) {
        throw new Error('Droits administrateur requis pour créer des procédures');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur détaillée:', errorData);
        throw new Error(errorData.message || 'Erreur lors de la création de la procédure');
      }

      toast.success('Procédure créée avec succès');
      setShowCreateModal(false);
      setNewProcedure({
        prenom: '',
        nom: '',
        email: '',
        destination: 'France',
        rendezVousId: '',
        steps: [
          { nom: "Demande d'Admission", statut: 'En cours' },
          { nom: "Demande de Visa", statut: 'En cours' },
          { nom: "Préparatifs de Voyage", statut: 'En cours' }
        ]
      });
      fetchProcedures();
    } catch (error) {
      console.error('Erreur:', error);
      handleApiError(error, 'Erreur lors de la création de la procédure');
    }
  };

  const formatFrenchDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Terminée': return 'bg-green-100 text-green-800 border-green-200';
      case 'En cours': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Refusée': return 'bg-red-100 text-red-800 border-red-200';
      case 'Annulée': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'Terminé': return 'bg-green-100 text-green-800';
      case 'En cours': return 'bg-sky-100 text-sky-800';
      case 'Refusé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (hasAdminAccess()) {
      fetchProcedures();
      fetchRendezvous();
    } else if (!authLoading) {
      toast.error('Accès réservé aux administrateurs');
      navigate('/');
    }
  }, [currentPage, selectedStatus]);

  // Redirection si pas admin
  if (!authLoading && (!user || user.role !== 'admin' || !user.isActive)) {
    return <Navigate to="/" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6 bg-gradient-to-r from-sky-500 to-sky-600">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Gestion des Procédures</h1>
                <p className="text-sky-100 mt-2">Suivi des procédures étudiantes</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-sky-600 hover:bg-sky-50 px-4 py-2 rounded-lg font-medium transition duration-200 focus:outline-none focus:ring-none"
              >
                Créer une procédure
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-sky-700 mb-1">
                  Filtrer par statut
                </label>
                <select
                  id="status-filter"
                  className="w-full rounded-lg border border-sky-300 p-2 focus:outline-none focus:ring-none focus:border-sky-500 hover:border-sky-400"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">Tous les statuts</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminée">Terminée</option>
                  <option value="Refusée">Refusée</option>
                  <option value="Annulée">Annulée</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedStatus('all');
                    setCurrentPage(1);
                    fetchProcedures();
                  }}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-none"
                >
                  Actualiser
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {procedures.length === 0 ? (
                    <div className="text-center py-8 text-sky-500">
                      Aucune procédure trouvée
                    </div>
                  ) : (
                    procedures.map((procedure) => (
                      <div key={procedure._id} className="border border-sky-200 rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-sky-800">
                              {procedure.prenom} {procedure.nom}
                            </h3>
                            <p className="text-sm text-sky-600">{procedure.email}</p>
                            <p className="text-sm mt-1">
                              <span className="font-medium">Destination:</span> {procedure.destination}
                            </p>
                            {procedure.rendezVousId && (
                              <p className="text-sm">
                                <span className="font-medium">Rendez-vous:</span> {formatFrenchDate(procedure.rendezVousId.date)} à {procedure.rendezVousId.time}
                              </p>
                            )}
                            <p className="text-sm">
                              <span className="font-medium">Créée le:</span> {formatFrenchDate(procedure.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(procedure.statut)} mb-2`}>
                              {procedure.statut}
                            </span>
                            <button
                              onClick={() => setShowDeleteId(procedure._id)}
                              className="text-red-500 hover:text-red-700 text-sm focus:outline-none focus:ring-none rounded"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-sky-700 mb-2">Étapes de la procédure</h4>
                          <div className="space-y-3">
                            {procedure.steps.map((step) => (
                               <div key={step.nom} className="border-l-4 border-sky-200 pl-3 py-1">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-sky-800">{step.nom}</p>
                                    <p className="text-xs text-sky-500">
                                      Dernière mise à jour: {formatFrenchDate(step.dateMaj)}
                                    </p>
                                    {step.raisonRefus && (
                                      <p className="text-xs text-red-500 mt-1">
                                        Raison: {step.raisonRefus}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStepStatusColor(step.statut)}`}>
                                      {step.statut}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingProcedure(procedure);
                                        setEditingStep(step.nom);
                                        setStepForm({
                                          statut: step.statut,
                                          raisonRefus: step.raisonRefus
                                        });
                                      }}
                                      className="text-sky-600 hover:text-sky-800 text-sm"
                                    >
                                      Modifier
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end space-x-2">
                          {procedure.statut !== 'Terminée' && (
                            <button
                              onClick={() => handleProcedureStatusUpdate(procedure._id, 'Terminée')}
                              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 focus:outline-none focus:ring-none"
                            >
                              Terminer
                            </button>
                          )}
                          {procedure.statut !== 'Annulée' && (
                            <button
                              onClick={() => handleProcedureStatusUpdate(procedure._id, 'Annulée')}
                              className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 focus:outline-none focus:ring-none"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div>
                    <p className="text-sm text-sky-700">
                      Page <span className="font-medium">{currentPage}</span> sur <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg ${currentPage === 1 ? 'bg-sky-200 text-sky-400 cursor-not-allowed' : 'bg-sky-500 text-white hover:bg-sky-600'}`}
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg ${currentPage === totalPages ? 'bg-sky-200 text-sky-400 cursor-not-allowed' : 'bg-sky-500 text-white hover:bg-sky-600'}`}
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-sky-700 mb-4">Créer une nouvelle procédure</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-sky-300 p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={newProcedure.prenom}
                      onChange={(e) => setNewProcedure({...newProcedure, prenom: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-sky-300 p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={newProcedure.nom}
                      onChange={(e) => setNewProcedure({...newProcedure, nom: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Email *</label>
                    <input
                      type="email"
                      className="w-full rounded-lg border border-sky-300 p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={newProcedure.email}
                      onChange={(e) => setNewProcedure({...newProcedure, email: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Destination *</label>
                    <select
                      className="w-full rounded-lg border border-sky-300 p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={newProcedure.destination}
                      onChange={(e) => setNewProcedure({...newProcedure, destination: e.target.value})}
                      required
                    >
                      <option value="France">France</option>
                      <option value="Canada">Canada</option>
                      <option value="Maroc">Maroc</option>
                      <option value="Algérie">Algérie</option>
                      <option value="Chine">Chine</option>
                      <option value="Russie">Russie</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Rendez-vous associé (optionnel)</label>
                    <select
                      className="w-full rounded-lg border border-sky-300 p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={newProcedure.rendezVousId}
                      onChange={(e) => setNewProcedure({...newProcedure, rendezVousId: e.target.value})}
                    >
                      <option value="">Sélectionnez un rendez-vous</option>
                      {rendezvousList.map((rdv) => (
                        <option key={rdv._id} value={rdv._id}>
                          {rdv.firstName} {rdv.lastName} - {formatFrenchDate(rdv.date)} à {rdv.time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-sky-300 text-sky-600 rounded-lg hover:bg-sky-50 transition focus:outline-none focus:ring-none"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleCreateProcedure}
                      className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition focus:outline-none focus:ring-none"
                    >
                      Créer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingProcedure && editingStep && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-sky-700 mb-4">Modifier l'étape: {editingStep}</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Statut</label>
                    <select
                      className="w-full rounded-lg border border-sky-300 p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={stepForm.statut}
                      onChange={(e) => setStepForm({...stepForm, statut: e.target.value})}
                    >
                      <option value="En cours">En cours</option>
                      <option value="Terminé">Terminé</option>
                      <option value="Refusé">Refusé</option>
                    </select>
                  </div>

                  {stepForm.statut === 'Refusé' && (
                    <div>
                      <label className="block text-sm font-medium text-sky-700 mb-1">Raison du refus *</label>
                      <textarea
                        className="w-full rounded-lg border border-sky-300 p-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        rows={3}
                        value={stepForm.raisonRefus || ''}
                        onChange={(e) => setStepForm({...stepForm, raisonRefus: e.target.value})}
                        placeholder="Expliquez la raison du refus..."
                        required
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setEditingProcedure(null);
                        setEditingStep(null);
                      }}
                      className="px-4 py-2 border border-sky-300 text-sky-600 rounded-lg hover:bg-sky-50 transition focus:outline-none focus:ring-none"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleStepUpdate(editingProcedure._id, editingStep)}
                      className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition focus:outline-none focus:ring-none"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-bold text-sky-700 mb-2">Confirmer la suppression</h2>
                <p className="text-sm text-gray-600 mb-6">Êtes-vous sûr de vouloir supprimer cette procédure ? Cette action est irréversible.</p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteId(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition focus:outline-none focus:ring-none"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDeleteProcedure(showDeleteId!)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition focus:outline-none focus:ring-none"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}