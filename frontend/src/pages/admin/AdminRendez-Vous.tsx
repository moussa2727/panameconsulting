import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';

interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
  status: string;
  avisAdmin?: string;
  createdAt: string;
}

interface CreateRendezvousForm {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  destination: string;
  destinationAutre: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre: string;
  date: string;
  time: string;
}

const AdminRendezVous: React.FC = () => {
  const { user, token } = useAuth();
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', avisAdmin: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateRendezvousForm>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    destination: 'France',
    destinationAutre: '',
    niveauEtude: 'Licence',
    filiere: 'Informatique',
    filiereAutre: '',
    date: '',
    time: '09:00'
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const fetchRendezvous = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/rendezvous?page=1&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Erreur lors du chargement');
      
      const data = await response.json();
      setRendezvous(data.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des rendez-vous');
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  const fetchAvailableData = useCallback(async () => {
    try {
      const [datesResponse, slotsResponse] = await Promise.all([
        fetch(`${API_URL}/api/rendezvous/available-dates`),
        createForm.date ? fetch(`${API_URL}/api/rendezvous/available-slots?date=${createForm.date}`) : null
      ]);

      const dates = await datesResponse.json();
      setAvailableDates(dates);

      if (slotsResponse) {
        const slots = await slotsResponse.json();
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error fetching available data:', error);
    }
  }, [createForm.date, API_URL]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRendezvous();
    }
  }, [user, token, fetchRendezvous]);

  useEffect(() => {
    if (showCreateForm) {
      fetchAvailableData();
    }
  }, [showCreateForm, fetchAvailableData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...createForm,
        ...(createForm.destination === 'Autre' && { destinationAutre: createForm.destinationAutre }),
        ...(createForm.filiere === 'Autre' && { filiereAutre: createForm.filiereAutre }),
      };

      const response = await fetch(`${API_URL}/api/rendezvous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la création');
      }

      toast.success('✅ Rendez-vous créé avec succès - Le client recevra un email de confirmation');
      setShowCreateForm(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        telephone: '',
        destination: 'France',
        destinationAutre: '',
        niveauEtude: 'Licence',
        filiere: 'Informatique',
        filiereAutre: '',
        date: '',
        time: '09:00'
      });
      fetchRendezvous();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, rdv: Rendezvous) => {
    if (!statusUpdate.status) {
      toast.error('Veuillez sélectionner un statut');
      return;
    }

    // Empêcher la modification si le rendez-vous est déjà terminé avec avis
    if (rdv.status === 'Terminé' && rdv.avisAdmin) {
      toast.error('❌ Impossible de modifier un rendez-vous terminé avec avis');
      setEditingId(null);
      return;
    }

    // Validation pour le statut "Terminé" - avis admin requis
    if (statusUpdate.status === 'Terminé' && !statusUpdate.avisAdmin) {
      toast.error('L\'avis admin est requis pour terminer un rendez-vous');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = `${API_URL}/api/rendezvous/${id}/status`;
      const bodyData = {
        status: statusUpdate.status,
        ...(statusUpdate.avisAdmin && { avisAdmin: statusUpdate.avisAdmin })
      };

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la mise à jour');
      }

      let successMessage = '✅ Statut mis à jour - Le client a été notifié par email';
      if (statusUpdate.status === 'Terminé' && statusUpdate.avisAdmin === 'Favorable') {
        successMessage += ' 📋 (Procédure créée automatiquement)';
      } else if (statusUpdate.status === 'Terminé' && statusUpdate.avisAdmin === 'Défavorable') {
        successMessage += ' ❌ (Aucune procédure créée)';
      }

      toast.success(successMessage);
      setEditingId(null);
      setStatusUpdate({ status: '', avisAdmin: '' });
      fetchRendezvous();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/rendezvous/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la suppression');
      }

      toast.success('🗑️ Rendez-vous supprimé avec succès');
      setDeleteConfirm(null);
      fetchRendezvous();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmé': return 'bg-green-100 text-green-800 border border-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Terminé': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Annulé': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getAvisColor = (avis?: string) => {
    switch (avis) {
      case 'Favorable': return 'text-green-600 font-semibold';
      case 'Défavorable': return 'text-red-600 font-semibold';
      default: return 'text-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const canAdminModify = (rdv: Rendezvous) => {
    // L'admin peut modifier tous les rendez-vous sauf ceux terminés avec avis
    return !(rdv.status === 'Terminé' && rdv.avisAdmin);
  };

  if (loading && rendezvous.length === 0) {
    return (
      <>
        <Helmet>
          <title>{`Gestion des Rendez-vous - Paname Consulting`}</title>
          <meta name="description" content="Gérez les rendez-vous clients - Administration Paname Consulting" />
        </Helmet>
       
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestion des Rendez-vous - Paname Consulting</title>
        <meta name="description" content={`Administration des rendez-vous clients - ${rendezvous.length} rendez-vous gérés - Paname Consulting`} />
        <meta name="keywords" content="rendez-vous, administration, gestion, clients, Paname Consulting" />
        <meta property="og:title" content="Gestion des Rendez-vous - Paname Consulting" />
        <meta property="og:description" content="Interface d'administration pour la gestion des rendez-vous clients" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        <meta name="yandexbot" content="noindex, nofollow" />
        <meta name="duckduckbot" content="noindex, nofollow" />
        <meta name="baidu" content="noindex, nofollow" />
        <meta name="naver" content="noindex, nofollow" />
        <meta name="seznam" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen  p-4">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-sky-900 mb-2">
              Gestion des Rendez-vous
            </h1>
            <p className="text-sky-600 text-lg">
              <strong>{rendezvous.length}</strong> rendez-vous au total
            </p>
            <p className="text-sky-500 text-sm mt-1">
              📧 Notifications automatiques envoyées aux clients
            </p>
          </header>

          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={isSubmitting}
              className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 shadow-lg"
              aria-expanded={showCreateForm}
              aria-controls="create-rendezvous-form"
            >
              {showCreateForm ? '✕ Annuler' : '📅 Nouveau Rendez-vous'}
            </button>
          </div>

          {/* Formulaire de création */}
          {showCreateForm && (
            <section 
              id="create-rendezvous-form"
              className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-sky-100"
              aria-labelledby="create-form-title"
            >
              <h2 id="create-form-title" className="text-xl font-semibold text-sky-900 mb-4">
                Créer un nouveau rendez-vous
              </h2>
              
              <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-sky-800 border-b border-sky-200 pb-2">
                    Informations personnelles
                  </h3>
                  
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-sky-700 mb-2">
                      Prénom *
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm({...createForm, firstName: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 placeholder-sky-400"
                      placeholder="Jean"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-sky-700 mb-2">
                      Nom *
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm({...createForm, lastName: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 placeholder-sky-400"
                      placeholder="Dupont"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-sky-700 mb-2">
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 placeholder-sky-400"
                      placeholder="jean.dupont@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="telephone" className="block text-sm font-medium text-sky-700 mb-2">
                      Téléphone *
                    </label>
                    <input
                      id="telephone"
                      type="tel"
                      required
                      value={createForm.telephone}
                      onChange={(e) => setCreateForm({...createForm, telephone: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 placeholder-sky-400"
                      placeholder="+33123456789"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-sky-800 border-b border-sky-200 pb-2">
                    Études et rendez-vous
                  </h3>

                  <div>
                    <label htmlFor="destination" className="block text-sm font-medium text-sky-700 mb-2">
                      Destination *
                    </label>
                    <select
                      id="destination"
                      value={createForm.destination}
                      onChange={(e) => setCreateForm({...createForm, destination: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 bg-white"
                    >
                      <option value="France">France</option>
                      <option value="Algérie">Algérie</option>
                      <option value="Turquie">Turquie</option>
                      <option value="Maroc">Maroc</option>
                      <option value="Tunisie">Tunisie</option>
                      <option value="Chine">Chine</option>
                      <option value="Russie">Russie</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  {createForm.destination === 'Autre' && (
                    <div>
                      <label htmlFor="destinationAutre" className="block text-sm font-medium text-sky-700 mb-2">
                        Précisez la destination *
                      </label>
                      <input
                        id="destinationAutre"
                        type="text"
                        required
                        value={createForm.destinationAutre}
                        onChange={(e) => setCreateForm({...createForm, destinationAutre: e.target.value})}
                        className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 placeholder-sky-400"
                        placeholder="Votre destination"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="niveauEtude" className="block text-sm font-medium text-sky-700 mb-2">
                      Niveau d'étude *
                    </label>
                    <select
                      id="niveauEtude"
                      value={createForm.niveauEtude}
                      onChange={(e) => setCreateForm({...createForm, niveauEtude: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 bg-white"
                    >
                      <option value="Bac">Bac</option>
                      <option value="Bac+1">Bac+1</option>
                      <option value="Bac+2">Bac+2</option>
                      <option value="Licence">Licence</option>
                      <option value="Master I">Master I</option>
                      <option value="Master II">Master II</option>
                      <option value="Doctorat">Doctorat</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filiere" className="block text-sm font-medium text-sky-700 mb-2">
                      Filière *
                    </label>
                    <select
                      id="filiere"
                      value={createForm.filiere}
                      onChange={(e) => setCreateForm({...createForm, filiere: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 bg-white"
                    >
                      <option value="Informatique">Informatique</option>
                      <option value="Médecine">Médecine</option>
                      <option value="Ingénierie">Ingénierie</option>
                      <option value="Droit">Droit</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  {createForm.filiere === 'Autre' && (
                    <div>
                      <label htmlFor="filiereAutre" className="block text-sm font-medium text-sky-700 mb-2">
                        Précisez la filière *
                      </label>
                      <input
                        id="filiereAutre"
                        type="text"
                        required
                        value={createForm.filiereAutre}
                        onChange={(e) => setCreateForm({...createForm, filiereAutre: e.target.value})}
                        className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 placeholder-sky-400"
                        placeholder="Votre filière"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-sky-700 mb-2">
                      Date *
                    </label>
                    <select
                      id="date"
                      required
                      value={createForm.date}
                      onChange={(e) => setCreateForm({...createForm, date: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 bg-white"
                    >
                      <option value="">Sélectionnez une date</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>
                          {formatDate(date)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-sky-700 mb-2">
                      Heure *
                    </label>
                    <select
                      id="time"
                      required
                      value={createForm.time}
                      onChange={(e) => setCreateForm({...createForm, time: e.target.value})}
                      className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 transition-colors text-sky-900 bg-white"
                    >
                      <option value="">Sélectionnez une heure</option>
                      {availableSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="lg:col-span-2 pt-4 border-t border-sky-200">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 w-full md:w-auto min-w-[200px]"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Création...
                      </span>
                    ) : (
                      '✅ Créer le rendez-vous'
                    )}
                  </button>
                  <p className="text-sm text-sky-600 mt-2">
                    📧 Le client recevra un email de confirmation automatiquement
                  </p>
                </div>
              </form>
            </section>
          )}

          <section aria-labelledby="rendezvous-list-title">
            <h2 id="rendezvous-list-title" className="sr-only">
              Liste des rendez-vous
            </h2>
            
            <div className="bg-white rounded-2xl shadow-xl border border-sky-100 overflow-hidden">
              <div className="md:hidden">
                {rendezvous.map((rdv) => (
                  <div key={rdv._id} className="p-4 border-b border-sky-100 last:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-sky-900 text-lg">
                          {rdv.firstName} {rdv.lastName}
                        </h3>
                        <p className="text-sky-600 text-sm">{rdv.email}</p>
                        <p className="text-sky-500 text-sm">{rdv.telephone}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(rdv.status)}`}>
                        {rdv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-sky-700 mb-3">
                      <div>
                        <strong>Destination:</strong><br />
                        {rdv.destination === 'Autre' ? rdv.destinationAutre : rdv.destination}
                      </div>
                      <div>
                        <strong>Filière:</strong><br />
                        {rdv.filiere === 'Autre' ? rdv.filiereAutre : rdv.filiere}
                      </div>
                      <div>
                        <strong>Date:</strong><br />
                        {formatDate(rdv.date)}
                      </div>
                      <div>
                        <strong>Heure:</strong><br />
                        {rdv.time}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${getAvisColor(rdv.avisAdmin)}`}>
                        Avis: {rdv.avisAdmin || 'Non défini'}
                      </span>
                      
                      <div className="flex gap-2">
                        {canAdminModify(rdv) && (
                          <button
                            onClick={() => {
                              setEditingId(rdv._id);
                              setStatusUpdate({ status: rdv.status, avisAdmin: rdv.avisAdmin || '' });
                            }}
                            className="text-sky-600 hover:text-sky-700 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 rounded px-2 py-1"
                          >
                            Modifier
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteConfirm(rdv._id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-red-500 rounded px-2 py-1"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {/* Popover de confirmation de suppression */}
                    {deleteConfirm === rdv._id && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-red-800 text-sm font-medium mb-2">
                          Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(rdv._id)}
                            disabled={isSubmitting}
                            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-2 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            {isSubmitting ? '...' : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formulaire de modification de statut */}
                    {editingId === rdv._id && (
                      <div className="mt-3 p-3 bg-sky-50 rounded-lg space-y-2 border border-sky-200">
                        <select
                          value={statusUpdate.status}
                          onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-sky-200 rounded focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="En attente">En attente</option>
                          <option value="Confirmé">Confirmé</option>
                          <option value="Terminé">Terminé</option>
                          <option value="Annulé">Annulé</option>
                        </select>

                        {statusUpdate.status === 'Terminé' && (
                          <select
                            value={statusUpdate.avisAdmin}
                            onChange={(e) => setStatusUpdate({...statusUpdate, avisAdmin: e.target.value})}
                            className="w-full px-3 py-2 text-sm border border-sky-200 rounded focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="">Sélectionnez un avis</option>
                            <option value="Favorable">Favorable</option>
                            <option value="Défavorable">Défavorable</option>
                          </select>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(rdv._id, rdv)}
                            disabled={isSubmitting}
                            className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-3 py-2 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            {isSubmitting ? '...' : 'Valider'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Vue desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-sky-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-900">Client</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-900">Contact</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-900">Destination</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-900">Date/Heure</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-900">Statut</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-900">Avis</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {rendezvous.map((rdv) => (
                      <tr key={rdv._id} className="hover:bg-sky-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-sky-900">
                            {rdv.firstName} {rdv.lastName}
                          </div>
                          <div className="text-sm text-sky-600">{rdv.niveauEtude}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-sky-900">{rdv.email}</div>
                          <div className="text-sm text-sky-600">{rdv.telephone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-sky-900">
                            {rdv.destination === 'Autre' ? rdv.destinationAutre : rdv.destination}
                          </div>
                          <div className="text-sm text-sky-600">{rdv.filiere === 'Autre' ? rdv.filiereAutre : rdv.filiere}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-sky-900">
                            {formatDate(rdv.date)}
                          </div>
                          <div className="text-sm text-sky-600">{rdv.time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(rdv.status)}`}>
                            {rdv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${getAvisColor(rdv.avisAdmin)}`}>
                            {rdv.avisAdmin || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {canAdminModify(rdv) && (
                              <button
                                onClick={() => {
                                  setEditingId(rdv._id);
                                  setStatusUpdate({ status: rdv.status, avisAdmin: rdv.avisAdmin || '' });
                                }}
                                className="text-sky-600 hover:text-sky-700 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 rounded text-left"
                              >
                                Modifier statut
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteConfirm(rdv._id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-red-500 rounded text-left"
                            >
                              Supprimer
                            </button>
                          </div>

                          {/* Popover de confirmation de suppression */}
                          {deleteConfirm === rdv._id && (
                            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-red-800 text-sm font-medium mb-2">
                                Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDelete(rdv._id)}
                                  disabled={isSubmitting}
                                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
                                >
                                  {isSubmitting ? '...' : 'Confirmer'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Formulaire de modification de statut */}
                          {editingId === rdv._id && (
                            <div className="mt-3 p-3 bg-sky-50 rounded-lg space-y-2 border border-sky-200">
                              <select
                                value={statusUpdate.status}
                                onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                                className="w-full px-3 py-1 text-sm border border-sky-200 rounded focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              >
                                <option value="En attente">En attente</option>
                                <option value="Confirmé">Confirmé</option>
                                <option value="Terminé">Terminé</option>
                                <option value="Annulé">Annulé</option>
                              </select>

                              {statusUpdate.status === 'Terminé' && (
                                <select
                                  value={statusUpdate.avisAdmin}
                                  onChange={(e) => setStatusUpdate({...statusUpdate, avisAdmin: e.target.value})}
                                  className="w-full px-3 py-1 text-sm border border-sky-200 rounded focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                >
                                  <option value="">Sélectionnez un avis</option>
                                  <option value="Favorable">Favorable</option>
                                  <option value="Défavorable">Défavorable</option>
                                </select>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStatusUpdate(rdv._id, rdv)}
                                  disabled={isSubmitting}
                                  className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500"
                                >
                                  {isSubmitting ? '...' : 'Valider'}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rendezvous.length === 0 && !loading && (
                <div className="text-center py-16">
                  <div className="text-sky-400 text-6xl mb-4" aria-hidden="true">📅</div>
                  <h3 className="text-xl font-medium text-sky-900 mb-2">Aucun rendez-vous</h3>
                  <p className="text-sky-600">Commencez par créer votre premier rendez-vous</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default AdminRendezVous;