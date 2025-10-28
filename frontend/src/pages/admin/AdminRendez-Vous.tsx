import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../utils/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  destination: string;
  destinationAutre?: string; 
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  date: string;
  time: string;
  status: string;
  avisAdmin?: string;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  destination: string;
  destinationAutre?: string;  // facultatif
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;      // facultatif
  date: string;
  time: string;
}

interface RendezvousStats {
  total: number;
  today: number;
  thisMonth: number;
  lastMonth: number;
}

const AdminRendezVous: React.FC = () => {
  const { token, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [filteredRendezvous, setFilteredRendezvous] = useState<Rendezvous[]>([]);
  const [stats, setStats] = useState<RendezvousStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    search: ''
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
 const [formData, setFormData] = useState<FormData>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  destination: 'France',
  niveauEtude: 'Bac',
  filiere: 'Informatique',
  date: '',
  time: ''
});

  const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Options pour les selects
  const destinations = ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'];
  const niveauxEtude = ['Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat'];
  const filieres = ['Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'];

    // Rediriger si l'utilisateur n'est pas admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      toast.error('Accès réservé aux administrateurs');
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchRendezvous();
    fetchStats();
    fetchAvailableDates();
  }, [currentPage]);

  useEffect(() => {
    // Réinitialiser à la première page quand les filtres changent
    setCurrentPage(1);
  }, [filters.status, filters.date, filters.search]);

  useEffect(() => {
    if (filters.status || filters.date || filters.search) {
      fetchRendezvous();
    }
  }, [filters, currentPage]);

  const fetchAvailableDates = async () => {
    try {
        const response = await fetch(`${VITE_API_URL}/api/rendezvous/available-dates`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des dates disponibles');
        }

        const dates = await response.json();
        setAvailableDates(dates);
    } catch (error) {
        console.error('Error fetching available dates:', error);
        toast.error('Impossible de charger les dates disponibles');
        setAvailableDates([]);
    }
};
  // Charger les créneaux disponibles quand la date change
  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots(formData.date);
    } else {
      setAvailableSlots([]);
    }
  }, [formData.date]);

  const fetchAvailableSlots = async (date: string) => {
    setLoadingSlots(true);
    try {
      const response = await fetch(`${VITE_API_URL}/api/rendezvous/available-slots?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des créneaux');
      }

      const slots = await response.json();
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Impossible de charger les créneaux disponibles');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };


  const fetchRendezvous = async () => {
  try {
    setLoading(true);
    
    // Check if token exists
    if (!token) {
      toast.error('Authentication token missing. Please log in again.');
      return;
    }
    
    let url = `${VITE_API_URL}/api/rendezvous?page=${currentPage}&limit=${itemsPerPage}`;
    
    if (filters.status) url += `&status=${filters.status}`;
    if (filters.date) url += `&date=${filters.date}`;
    if (filters.search) url += `&search=${filters.search}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token is invalid or expired
      toast.error('Session expired. Please log in again.');
      // You might want to redirect to login here
      return;
    }

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des rendez-vous');
    }

    const data = await response.json();
    setRendezvous(data.data);
    setFilteredRendezvous(data.data);
    setTotalPages(Math.ceil(data.total / itemsPerPage));
  } catch (error) {
    console.error('Error fetching rendezvous:', error);
    toast.error('Erreur lors du chargement des rendez-vous');
  } finally {
    setLoading(false);
  }
};


  const fetchStats = async () => {
    try {
      const response = await fetch(`${VITE_API_URL}/api/rendezvous/stats/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Impossible de charger les statistiques');
    }
  };

  // Dans la méthode updateStatus, ajoutez la validation
const updateStatus = async (id: string, status: string, avisAdmin?: string) => {
    const allowedStatuses = ['En attente', 'Confirmé', 'Terminé', 'Annulé'];
    if (!allowedStatuses.includes(status)) {
        toast.error('Statut invalide');
        return;
    }

    if (avisAdmin && !['Favorable', 'Défavorable'].includes(avisAdmin)) {
        toast.error('Avis administratif invalide');
        return;
    }

    try {
        setUpdating(id);
        const response = await fetch(`${VITE_API_URL}/api/rendezvous/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status, avisAdmin }),
        });

        if (response.status === 401) {
            toast.error('Session expirée. Veuillez vous reconnecter.');
            return;
        }
        if (response.status === 403) {
            toast.error('Accès refusé : vous devez être administrateur.');
            return;
        }
        if (response.status === 404) {
            toast.error('Rendez-vous non trouvé.');
            return;
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la mise à jour du statut');
        }

        toast.success('Statut mis à jour avec succès');
        fetchRendezvous();
        fetchStats();
    } catch (error:any) {
        console.error('Error updating status:', error);
        toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    } finally {
        setUpdating(null);
    }
};


  const updateAdminComment = async (id: string, adminComment: string) => {
    try {
      setUpdating(id);
      const response = await fetch(`${VITE_API_URL}/api/rendezvous/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminComment }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du commentaire');
      }

      toast.success('Commentaire mis à jour avec succès');
      fetchRendezvous(); // Rafraîchir la liste
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Erreur lors de la mise à jour du commentaire');
    } finally {
      setUpdating(null);
    }
  };

  const deleteRendezvous = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      return;
    }

    try {
      setUpdating(id);
      const response = await fetch(`${VITE_API_URL}/api/rendezvous/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du rendez-vous');
      }

      toast.success('Rendez-vous supprimé avec succès');
      fetchRendezvous(); // Rafraîchir la liste
      fetchStats(); // Rafraîchir les statistiques
    } catch (error) {
      console.error('Error deleting rendezvous:', error);
      toast.error('Erreur lors de la suppression du rendez-vous');
    } finally {
      setUpdating(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateRendezvous = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitting = true;

    try {
      // Préparer les données en enlevant les champs optionnels vides
      const submitData = { ...formData };
      if (!submitData.destinationAutre) delete submitData.destinationAutre;
      if (!submitData.filiereAutre) delete submitData.filiereAutre;

      const response = await fetch(`${VITE_API_URL}/api/rendezvous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création du rendez-vous');
      }

      toast.success('Rendez-vous créé avec succès!');
      
      // Réinitialiser le formulaire
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        destination: 'France',
        destinationAutre: '',
        niveauEtude: 'Bac',
        filiere: 'Informatique',
        filiereAutre: '',
        date: '',
        time: ''
      });
      setAvailableSlots([]);
      setShowCreateForm(false);
      
      // Rafraîchir la liste
      fetchRendezvous();
      fetchStats();

    } catch (error: any) {
      console.error('Error creating rendezvous:', error);
      toast.error(error.message || 'Erreur lors de la création du rendez-vous');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      date: '',
      search: ''
    });
  };

   if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Ou un message d'erreur
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-sky-800 flex items-center">
            <svg className="w-8 h-8 mr-3 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Gestion des Rendez-vous
          </h1>
          
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showCreateForm ? 'Retour à la liste' : 'Créer un rendez-vous'}
          </button>
        </div>
        
        {showCreateForm ? (
          // Formulaire de création
          <div className="bg-white rounded-lg shadow p-6 border border-sky-200 mb-6">
            <h2 className="text-xl font-semibold text-sky-700 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouveau Rendez-Vous
            </h2>
            
            <form onSubmit={handleCreateRendezvous} className="space-y-6">
              {/* Informations personnelles */}
              <div>
                <h3 className="text-lg font-medium text-sky-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Informations Personnelles
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Prénom *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Téléphone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Études et destination */}
              <div>
                <h3 className="text-lg font-medium text-sky-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                  Études et Destination
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Niveau d'étude *</label>
                    <select
                      name="niveauEtude"
                      value={formData.niveauEtude}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      {niveauxEtude.map(niveau => (
                        <option key={niveau} value={niveau}>{niveau}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Filière *</label>
                    <select
                      name="filiere"
                      value={formData.filiere}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      {filieres.map(filiere => (
                        <option key={filiere} value={filiere}>{filiere}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.filiere === 'Autre' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-sky-700 mb-1">Précisez votre filière *</label>
                    <input
                      type="text"
                      name="filiereAutre"
                      value={formData.filiereAutre}
                      onChange={handleInputChange}
                      required={formData.filiere === 'Autre'}
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-sky-700 mb-1">Destination *</label>
                  <select
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    {destinations.map(destination => (
                      <option key={destination} value={destination}>{destination}</option>
                    ))}
                  </select>
                </div>

                {formData.destination === 'Autre' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-sky-700 mb-1">Précisez votre destination *</label>
                    <input
                      type="text"
                      name="destinationAutre"
                      value={formData.destinationAutre}
                      onChange={handleInputChange}
                      required={formData.destination === 'Autre'}
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                )}
              </div>

              {/* Date et heure */}
              <div>
                <h3 className="text-lg font-medium text-sky-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date et Heure
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Date *</label>
                    <select
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="">Sélectionnez une date</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-sky-700 mb-1">Heure *</label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center p-2 border border-sky-300 rounded-md bg-sky-50">
                        <svg className="animate-spin h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="ml-2 text-sky-600">Chargement des créneaux...</span>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <select
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        required
                        className="w-full p-2 border border-sky-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <option value="">Sélectionnez un créneau</option>
                        {availableSlots.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    ) : formData.date ? (
                      <div className="p-2 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                        Aucun créneau disponible pour cette date
                      </div>
                    ) : (
                      <div className="p-2 text-sm text-sky-600 bg-sky-50 rounded-md border border-sky-200">
                        Veuillez d'abord sélectionner une date
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-sky-600">
                  <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Seules les dates avec des créneaux disponibles sont affichées.
                </div>
              </div>

              {/* Bouton de soumission */}
              <div className="pt-4 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Annuler
                </button>
                
                <button
                  type="submit"
                  disabled={!formData.date || !formData.time}
                  className="flex-1 py-3 px-4 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Créer le Rendez-vous
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-sky-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-sky-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-sky-700">Total</h3>
                  </div>
                  <p className="text-3xl font-bold text-sky-600 mt-2">{stats.total}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-sky-700">Aujourd'hui</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.today}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-sky-700">Ce mois</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.thisMonth}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-sky-700">Mois dernier</h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.lastMonth}</p>
                </div>
              </div>
            )}

            {/* Filtres */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 border border-sky-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-sky-700 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtres
                </h2>
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 bg-sky-100 text-sky-700 rounded-md hover:bg-sky-200 transition-colors text-sm"
                >
                  Réinitialiser
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sky-700 mb-1">Statut</label>
                  <div className="relative">
                    <select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                      className="w-full p-2 pl-10 border border-sky-300 rounded-md focus:outline-none focus:ring-none focus:border-sky-500 hover:border-sky-400 transition-colors"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="En attente">En attente</option>
                      <option value="Confirmé">Confirmé</option>
                      <option value="Terminé">Terminé</option>
                      <option value="Annulé">Annulé</option>
                    </select>
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sky-700 mb-1">Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="date"
                      value={filters.date}
                      onChange={handleFilterChange}
                      className="w-full p-2 pl-10 border border-sky-300 rounded-md focus:outline-none focus:ring-none focus:border-sky-500 hover:border-sky-400 transition-colors"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-sky-700 mb-1">Recherche</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="search"
                      value={filters.search}
                      onChange={handleFilterChange}
                      placeholder="Nom, prénom ou email"
                      className="w-full p-2 pl-10 border border-sky-300 rounded-md focus:outline-none focus:ring-none focus:border-sky-500 hover:border-sky-400 transition-colors"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau des rendez-vous */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-sky-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-sky-200">
                  <thead className="bg-sky-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-sky-600 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-sky-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-sky-600 uppercase tracking-wider">
                        Destination
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-sky-600 uppercase tracking-wider">
                        Date & Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-sky-600 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-sky-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-sky-200">
                    {filteredRendezvous.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sky-600">
                          <svg className="w-12 h-12 mx-auto mb-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-lg font-medium">Aucun rendez-vous trouvé</p>
                          <p className="text-sm text-sky-500">Essayez de modifier vos filtres</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRendezvous.map((rdv) => (
                        <tr key={rdv._id} className="hover:bg-sky-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-sky-900">
                              {rdv.firstName} {rdv.lastName}
                            </div>
                            <div className="text-sm text-sky-600">{rdv.niveauEtude}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-sky-900 flex items-center">
                              <svg className="w-4 h-4 mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {rdv.email}
                            </div>
                            <div className="text-sm text-sky-600 flex items-center mt-1">
                              <svg className="w-4 h-4 mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {rdv.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-sky-900">
                              {rdv.destination === 'Autre' ? rdv.destinationAutre : rdv.destination}
                            </div>
                            <div className="text-sm text-sky-600">
                              {rdv.filiere === 'Autre' ? rdv.filiereAutre : rdv.filiere}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-sky-900 flex items-center">
                              <svg className="w-4 h-4 mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(rdv.date)}
                            </div>
                            <div className="text-sm text-sky-600 flex items-center mt-1">
                              <svg className="w-4 h-4 mr-1 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {rdv.time}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full focus:outline-none focus:ring-none focus:border-sky-500 hover:border-sky-400 transition-colors ${
                                rdv.status === 'Confirmé'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : rdv.status === 'En attente'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  : rdv.status === 'Terminé'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}
                            >
                              {rdv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                <div className="relative">
                                  <select
                                    value={rdv.status}
                                    onChange={(e) => updateStatus(rdv._id, e.target.value, rdv.avisAdmin)}
                                    disabled={updating === rdv._id}
                                    className="text-sm border border-sky-300 rounded-md p-2 pr-8 focus:outline-none focus:ring-none focus:border-sky-500 hover:border-sky-400 transition-colors"
                                  >
                                    <option value="En attente">En attente</option>
                                    <option value="Confirmé">Confirmé</option>
                                    <option value="Terminé">Terminé</option>
                                    <option value="Annulé">Annulé</option>
                                  </select>
                                 
                                </div>
                                
                                <button
                                  onClick={() => deleteRendezvous(rdv._id)}
                                  disabled={updating === rdv._id}
                                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                  title="Supprimer"
                                >
                                  {updating === rdv._id ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                              
                              {rdv.avisAdmin && (
                                <div className="text-xs text-sky-600 bg-sky-50 p-1 rounded">
                                  <span className="font-medium">Avis:</span> {rdv.avisAdmin}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-sky-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-sky-300 text-sm font-medium rounded-md text-sky-700 bg-white hover:bg-sky-50 disabled:opacity-50"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-sky-300 text-sm font-medium rounded-md text-sky-700 bg-white hover:bg-sky-50 disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                  
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-sky-700">
                        Page <span className="font-medium">{currentPage}</span> sur{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-sky-300 bg-white text-sm font-medium text-sky-500 hover:bg-sky-50 disabled:opacity-50 transition-colors"
                        >
                          <span className="sr-only">Précédent</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'z-10 bg-sky-600 border-sky-600 text-white'
                                  : 'bg-white border-sky-300 text-sky-600 hover:bg-sky-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-sky-300 bg-white text-sm font-medium text-sky-500 hover:bg-sky-50 disabled:opacity-50 transition-colors"
                        >
                          <span className="sr-only">Suivant</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRendezVous;