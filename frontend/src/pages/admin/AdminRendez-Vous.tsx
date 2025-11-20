import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  MoreVertical, 
  Trash2, 
  Plus,
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Globe,
  AlertCircle
} from 'lucide-react';

interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  date: string;
  time: string;
  status: 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé';
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  avisAdmin?: 'Favorable' | 'Défavorable';
  createdAt: string;
  updatedAt: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const AdminRendezVous = () => {
  const { user, token, refreshToken, isAuthenticated } = useAuth();
  const [rendezvous, setRendezvous] = useState<Rendezvous[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRendezVous, setSelectedRendezVous] = useState<Rendezvous | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('tous');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeletePopover, setShowDeletePopover] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showAvisModal, setShowAvisModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{id: string, status: string} | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // États pour la création d'un rendez-vous
  const [newRendezVous, setNewRendezVous] = useState({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    date: '',
    time: '',
    destination: '',
    destinationAutre: '',
    niveauEtude: '',
    filiere: '',
    filiereAutre: ''
  });

  // Vérifier si un rendez-vous peut être supprimé selon la logique backend
  const canDeleteRendezvous = (rdv: Rendezvous): { canDelete: boolean; message?: string } => {
    const isAdmin = user?.role === 'ADMIN';
    
    // Les admins peuvent toujours supprimer
    if (isAdmin) {
      return { canDelete: true };
    }

    // Pour les non-admins, vérifier la contrainte des 2 heures
    const rdvDateTime = new Date(`${rdv.date}T${rdv.time}:00`);
    const now = new Date();
    const diffMs = rdvDateTime.getTime() - now.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000; // 2 heures

    if (diffMs <= twoHoursMs) {
      return { 
        canDelete: false, 
        message: "Vous ne pouvez plus annuler votre rendez-vous à moins de 2 heures de l'heure prévue" 
      };
    }

    return { canDelete: true };
  };

  // Récupération des rendez-vous
  const fetchRendezvous = async () => {
    if (!token) {
      console.error('Token non disponible');
      return;
    }

    setIsLoading(true);
    
    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        let url = `${API_URL}/api/rendezvous?page=${page}&limit=${limit}`;
        
        // Ajouter les filtres selon la logique backend
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (selectedStatus && selectedStatus !== 'tous') url += `&status=${encodeURIComponent(selectedStatus)}`;

        return fetch(url, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      };

      let response = await makeRequest(token);

      // Gestion du token expiré
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la récupération des rendez-vous');
      }

      const data = await response.json();
      setRendezvous(data.data || []);
      setTotalPages(Math.ceil((data.total || 0) / limit));

    } catch (error) {
      console.error('Erreur fetchRendezvous:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Récupération des dates disponibles
  const fetchAvailableDates = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-dates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const dates = await response.json();
        setAvailableDates(dates);
      }
    } catch (error) {
      console.error('Erreur fetchAvailableDates:', error);
    }
  };

  // Récupération des créneaux disponibles pour une date
  const fetchAvailableSlots = async (date: string) => {
    if (!token || !date) return;

    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-slots?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      if (response.ok) {
        const slots = await response.json();
        setAvailableSlots(slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Erreur fetchAvailableSlots:', error);
      setAvailableSlots([]);
    }
  };

  // Mise à jour du statut selon la logique backend
    const updateStatus = async (id: string, status: string, avisAdmin?: string): Promise<void> => {
    if (!token) {
      toast.error('Token non disponible');
      return;
    }

    console.log(`🔄 Tentative de mise à jour du statut: ${id} -> ${status} (avis: ${avisAdmin})`);

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        const bodyData: any = { status };
        
        // CORRECTION STRICTE: avisAdmin UNIQUEMENT et OBLIGATOIRE pour le statut "Terminé"
        if (status === 'Terminé') {
          if (!avisAdmin || (avisAdmin !== 'Favorable' && avisAdmin !== 'Défavorable')) {
            throw new Error('L\'avis admin (Favorable ou Défavorable) est obligatoire pour terminer un rendez-vous');
          }
          bodyData.avisAdmin = avisAdmin;
        } else {
          // CORRECTION STRICTE: Pour tous les autres statuts, NE PAS envoyer avisAdmin
          // Le backend se chargera de le mettre à null si nécessaire
          // On n'inclut PAS avisAdmin dans la requête pour les autres statuts
          console.log(`ℹ️ Statut "${status}" - avisAdmin non inclus dans la requête`);
        }

        console.log('📤 Données envoyées au backend:', bodyData);

        return fetch(`${API_URL}/api/rendezvous/${id}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyData),
          credentials: 'include'
        });
      };

      let response = await makeRequest(token);

      // Gestion du token expiré
      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshToken();
        if (refreshed) {
          console.log('✅ Token rafraîchi avec succès');
          const newToken = localStorage.getItem('token');
          if (newToken) {
            console.log('🔄 Nouvelle tentative avec le nouveau token...');
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      // Gestion des erreurs HTTP
      if (!response.ok) {
        let errorMessage = 'Erreur lors de la mise à jour du statut';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          
          // Gestion spécifique des erreurs de validation backend
          if (response.status === 400) {
            if (errorData.message?.includes('avis admin') || errorData.message?.includes('avisAdmin')) {
              errorMessage = 'L\'avis admin est obligatoire pour terminer un rendez-vous';
            } else if (errorData.message?.includes('Statut invalide')) {
              errorMessage = 'Statut invalide. Les statuts autorisés sont: En attente, Confirmé, Terminé, Annulé';
            }
          }
        } catch (parseError) {
          errorMessage = `Erreur serveur: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // Traitement de la réponse réussie
      const updatedRdv = await response.json();
      console.log('✅ Statut mis à jour avec succès:', updatedRdv);
      
      // Mise à jour optimiste de l'état local
      setRendezvous(prev => prev.map(rdv => {
        if (rdv._id === id) {
          const updated = { 
            ...rdv, 
            status: updatedRdv.status,
            // CORRECTION: Mettre à jour avisAdmin seulement si présent dans la réponse
            ...(updatedRdv.avisAdmin !== undefined && { avisAdmin: updatedRdv.avisAdmin })
          };
          
          // CORRECTION: Si le statut n'est pas "Terminé", s'assurer que avisAdmin est undefined
          if (updatedRdv.status !== 'Terminé' && updated.avisAdmin) {
            updated.avisAdmin = undefined;
          }
          
          return updated;
        }
        return rdv;
      }));
      
      // Mettre à jour également le rendez-vous sélectionné s'il s'agit du même
      if (selectedRendezVous?._id === id) {
        const updatedSelected = { 
          ...selectedRendezVous, 
          status: updatedRdv.status,
          // CORRECTION: Même logique pour le rendez-vous sélectionné
          ...(updatedRdv.avisAdmin !== undefined && { avisAdmin: updatedRdv.avisAdmin })
        };
        
        if (updatedRdv.status !== 'Terminé' && updatedSelected.avisAdmin) {
          updatedSelected.avisAdmin = undefined;
        }
        
        setSelectedRendezVous(updatedSelected);
      }

      // Fermer les modales
      setShowAvisModal(false);
      setPendingStatusUpdate(null);

      // Message de succès contextuel
      let successMessage = `Statut mis à jour: ${status}`;
      if (status === 'Terminé' && avisAdmin) {
        successMessage += ` (Avis: ${avisAdmin})`;
        
        // Message supplémentaire pour l'avis favorable
        if (avisAdmin === 'Favorable') {
          successMessage += ' - Une procédure a été créée pour cet utilisateur';
        }
      }
      
      toast.success(successMessage);

      // Recharger les données après un délai pour s'assurer de la synchronisation
      setTimeout(() => {
        fetchRendezvous();
      }, 1000);

    } catch (error: any) {
      console.error('❌ Erreur updateStatus:', error);
      
      // Gestion spécifique des erreurs d'authentification
      if (error instanceof Error && (
        error.message.includes('Session expirée') || 
        error.message.includes('Token invalide') ||
        error.message.includes('Token non disponible')
      )) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else if (error.message.includes('avis admin') || error.message.includes('avisAdmin')) {
        // Ne pas fermer la modale si l'erreur concerne l'avis admin manquant
        toast.error(error.message);
        // Garder la modale ouverte pour que l'admin puisse sélectionner un avis
      } else {
        // Affichage d'un message d'erreur générique
        toast.error(error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour');
        
        // Fermer les modales en cas d'erreur générique
        setShowAvisModal(false);
        setPendingStatusUpdate(null);
      }
    }
    };


  // Gestion du clic sur un statut
  const handleStatusClick = (id: string, status: string) => {
    if (status === 'Terminé') {
      // Pour le statut "Terminé", on demande l'avis admin
      setPendingStatusUpdate({ id, status });
      setShowAvisModal(true);
    } else {
      // Pour les autres statuts, mise à jour directe
      updateStatus(id, status);
    }
  };

  // Gestion de la sélection d'avis
  const handleAvisSelection = (avis: 'Favorable' | 'Défavorable') => {
    if (pendingStatusUpdate) {
      updateStatus(pendingStatusUpdate.id, pendingStatusUpdate.status, avis);
    }
  };

  // Suppression selon la logique backend avec restrictions temporelles
  const handleDelete = async (id: string) => {
    if (!token) {
      toast.error('Token non disponible');
      return;
    }

    // Vérifier si l'utilisateur peut supprimer ce rendez-vous
    const rdvToDelete = rendezvous.find(rdv => rdv._id === id);
    if (rdvToDelete) {
      const { canDelete, message } = canDeleteRendezvous(rdvToDelete);
      if (!canDelete) {
        toast.error(message || 'Suppression non autorisée');
        setShowDeleteModal(null);
        setShowDeletePopover(null);
        return;
      }
    }

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/rendezvous/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      };

      let response = await makeRequest(token);

      // Gestion du token expiré
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }

      // Mise à jour optimiste de l'état local
      setRendezvous(prev => prev.filter(rdv => rdv._id !== id));
      
      if (selectedRendezVous?._id === id) {
        setSelectedRendezVous(null);
      }

      setShowDeleteModal(null);
      setShowDeletePopover(null);
      toast.success('Rendez-vous supprimé avec succès');

    } catch (error) {
      console.error('Erreur handleDelete:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  // Gestion du clic sur le bouton supprimer
  const handleDeleteClick = (rdv: Rendezvous) => {
    const { canDelete, message } = canDeleteRendezvous(rdv);
    
    if (!canDelete) {
      toast.error(message || 'Suppression non autorisée');
      return;
    }

    setShowDeleteModal(rdv._id);
  };

  // Création d'un nouveau rendez-vous
  const handleCreateRendezVous = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Token non disponible');
      return;
    }

    // LOGIQUE STRICTE POUR LES CHAMPS "AUTRE" - IDENTIQUE AU BACKEND
    const createData: any = {
      firstName: newRendezVous.firstName.trim(),
      lastName: newRendezVous.lastName.trim(),
      email: newRendezVous.email.trim(),
      telephone: newRendezVous.telephone.trim(),
      date: newRendezVous.date,
      time: newRendezVous.time,
      niveauEtude: newRendezVous.niveauEtude
    };

    // Destination - logique stricte
    if (newRendezVous.destination === 'Autre') {
      if (!newRendezVous.destinationAutre || newRendezVous.destinationAutre.trim() === '') {
        toast.error('Veuillez préciser votre destination');
        return;
      }
      createData.destination = newRendezVous.destinationAutre.trim();
      createData.destinationAutre = newRendezVous.destinationAutre.trim();
    } else {
      createData.destination = newRendezVous.destination;
      // Pas de destinationAutre si pas "Autre"
    }

    // Filière - logique stricte
    if (newRendezVous.filiere === 'Autre') {
      if (!newRendezVous.filiereAutre || newRendezVous.filiereAutre.trim() === '') {
        toast.error('Veuillez préciser votre filière');
        return;
      }
      createData.filiere = newRendezVous.filiereAutre.trim();
      createData.filiereAutre = newRendezVous.filiereAutre.trim();
    } else {
      createData.filiere = newRendezVous.filiere;
      // Pas de filiereAutre si pas "Autre"
    }

    // Validation finale
    if (!createData.destination || createData.destination.trim() === '') {
      toast.error('La destination est obligatoire');
      return;
    }

    if (!createData.filiere || createData.filiere.trim() === '') {
      toast.error('La filière est obligatoire');
      return;
    }

    console.log('📤 Création RDV - Données envoyées:', createData);

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/rendezvous`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createData),
          credentials: 'include'
        });
      };

      let response = await makeRequest(token);

      // Gestion du token expiré
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création');
      }

      const createdRdv = await response.json();
      
      // Mise à jour optimiste de l'état local
      setRendezvous(prev => [createdRdv, ...prev]);
      
      // Réinitialiser le formulaire
      setNewRendezVous({
        firstName: '',
        lastName: '',
        email: '',
        telephone: '',
        date: '',
        time: '',
        destination: '',
        destinationAutre: '',
        niveauEtude: '',
        filiere: '',
        filiereAutre: ''
      });

      setShowCreateModal(false);
      toast.success('Rendez-vous créé avec succès');

      // Recharger les données disponibles
      fetchAvailableDates();

    } catch (error) {
      console.error('Erreur handleCreateRendezVous:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  // Gestion du changement de date pour charger les créneaux disponibles
  const handleDateChange = (date: string) => {
    setNewRendezVous(prev => ({ 
      ...prev, 
      date,
      time: '' // Réinitialiser le temps quand la date change
    }));
    if (date) {
      fetchAvailableSlots(date);
    } else {
      setAvailableSlots([]);
    }
  };

  // Initialisation
  useEffect(() => {
    fetchRendezvous();
    fetchAvailableDates();
  }, [page, searchTerm, selectedStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmé': return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Annulé': return 'bg-red-100 text-red-800 border-red-200';
      case 'Terminé': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvisColor = (avis: string) => {
    switch (avis) {
      case 'Favorable': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Défavorable': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.replace(':', 'h');
  };

  const statuts = ['tous', 'En attente', 'Confirmé', 'Terminé', 'Annulé'];
  const avisOptions = ['Favorable', 'Défavorable'];
  const destinations = ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'];
  const niveauxEtude = ['Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat'];
  const filieres = ['Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h2 className="text-lg font-bold text-slate-800">Confirmer la suppression</h2>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible.
              </p>
            </div>
            
            <div className="p-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-slate-700 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection d'avis pour le statut "Terminé" */}
      {showAvisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Avis Administratif Requis</h2>
              <p className="text-sm text-slate-600 mt-1">
                Pour terminer ce rendez-vous, veuillez sélectionner un avis administratif.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {avisOptions.map(avis => (
                  <button
                    key={avis}
                    onClick={() => handleAvisSelection(avis as 'Favorable' | 'Défavorable')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 focus:ring-none focus:outline-none ${
                      avis === 'Favorable'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300'
                        : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300'
                    }`}
                  >
                    <div className="font-semibold">{avis}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {avis === 'Favorable' 
                        ? 'Le candidat peut passer à la procédure' 
                        : 'Le candidat ne remplit pas les critères'
                      }
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAvisModal(false);
                    setPendingStatusUpdate(null);
                  }}
                  className="px-4 py-2 text-slate-700 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Créer un nouveau rendez-vous</h2>
            </div>
            
            <form onSubmit={handleCreateRendezVous} className="p-4 space-y-3">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="firstName" className="block text-xs font-medium text-slate-700 mb-1">
                      Prénom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={newRendezVous.firstName}
                        onChange={(e) => setNewRendezVous(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label htmlFor="lastName" className="block text-xs font-medium text-slate-700 mb-1">
                      Nom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={newRendezVous.lastName}
                        onChange={(e) => setNewRendezVous(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={newRendezVous.email}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="telephone" className="block text-xs font-medium text-slate-700 mb-1">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                    <input
                      id="telephone"
                      name="telephone"
                      type="tel"
                      required
                      value={newRendezVous.telephone}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, telephone: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="date" className="block text-xs font-medium text-slate-700 mb-1">
                      Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                      <select
                        id="date"
                        name="date"
                        required
                        value={newRendezVous.date}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                      >
                        <option value="">Sélectionner une date</option>
                        {availableDates.map(date => (
                          <option key={date} value={date}>
                            {new Date(date).toLocaleDateString('fr-FR')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label htmlFor="time" className="block text-xs font-medium text-slate-700 mb-1">
                      Heure *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                      <select
                        id="time"
                        name="time"
                        required
                        value={newRendezVous.time}
                        onChange={(e) => setNewRendezVous(prev => ({ ...prev, time: e.target.value }))}
                        disabled={!newRendezVous.date || availableSlots.length === 0}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Sélectionner un créneau</option>
                        {availableSlots.map(slot => (
                          <option key={slot} value={slot}>
                            {slot.replace(':', 'h')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {newRendezVous.date && availableSlots.length === 0 && (
                  <p className="text-xs text-amber-600 text-center">
                    Aucun créneau disponible pour cette date
                  </p>
                )}
                
                <div>
                  <label htmlFor="destination" className="block text-xs font-medium text-slate-700 mb-1">
                    Destination *
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                    <select
                      id="destination"
                      name="destination"
                      required
                      value={newRendezVous.destination}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                    >
                      <option value="">Sélectionner une destination</option>
                      {destinations.map(dest => (
                        <option key={dest} value={dest}>{dest}</option>
                      ))}
                    </select>
                  </div>
                  {newRendezVous.destination === 'Autre' && (
                    <input
                      id="destinationAutre"
                      name="destinationAutre"
                      type="text"
                      placeholder="Précisez la destination"
                      required
                      value={newRendezVous.destinationAutre}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, destinationAutre: e.target.value }))}
                      className="w-full mt-2 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                    />
                  )}
                </div>
                
                <div>
                  <label htmlFor="niveauEtude" className="block text-xs font-medium text-slate-700 mb-1">
                    Niveau d'étude *
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                    <select
                      id="niveauEtude"
                      name="niveauEtude"
                      required
                      value={newRendezVous.niveauEtude}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, niveauEtude: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                    >
                      <option value="">Sélectionner un niveau</option>
                      {niveauxEtude.map(niveau => (
                        <option key={niveau} value={niveau}>{niveau}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="filiere" className="block text-xs font-medium text-slate-700 mb-1">
                    Filière *
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                    <select
                      id="filiere"
                      name="filiere"
                      required
                      value={newRendezVous.filiere}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, filiere: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                    >
                      <option value="">Sélectionner une filière</option>
                      {filieres.map(filiere => (
                        <option key={filiere} value={filiere}>{filiere}</option>
                      ))}
                    </select>
                  </div>
                  {newRendezVous.filiere === 'Autre' && (
                    <input
                      id="filiereAutre"
                      name="filiereAutre"
                      type="text"
                      placeholder="Précisez la filière"
                      required
                      value={newRendezVous.filiereAutre}
                      onChange={(e) => setNewRendezVous(prev => ({ ...prev, filiereAutre: e.target.value }))}
                      className="w-full mt-2 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
                    />
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs text-slate-700 bg-white rounded-lg border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Liste des rendez-vous */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {/* Barre de recherche et filtres */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-800">Gestion rendez-vous</h1>
              <button
  onClick={() => setShowCreateModal(true)}
  className="px-2.5 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all duration-200 font-medium text-xs shadow-sm hover:shadow-md flex items-center gap-1 focus:ring-none focus:outline-none"
>
  <Plus className="w-3 h-3" />
  Nouveau RDV
</button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Rechercher un rendez-vous..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-none focus:outline-none focus:border-sky-500 hover:border-sky-400 transition-all duration-200"
              />
            </div>

            {/* Filtres de statut */}
            <div className="flex flex-wrap gap-2">
              {statuts.map(statut => (
                <button
                  key={statut}
                  onClick={() => setSelectedStatus(statut)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize focus:ring-none focus:outline-none ${
                    selectedStatus === statut
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 hover:border-sky-400'
                  }`}
                >
                  {statut === 'tous' ? 'Tous les statuts' : statut}
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : rendezvous.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p>Aucun rendez-vous trouvé</p>
              </div>
            ) : (
              rendezvous.map(rdv => {
                const { canDelete } = canDeleteRendezvous(rdv);
                
                return (
                  <div
                    key={rdv._id}
                    className={`border-b border-slate-100 last:border-b-0 transition-all duration-200 cursor-pointer hover:bg-slate-50/70 ${
                      selectedRendezVous?._id === rdv._id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedRendezVous(rdv)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-slate-800">
                                {rdv.firstName} {rdv.lastName}
                              </h3>
                              <p className="text-slate-600 text-sm">{rdv.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500 whitespace-nowrap">
                                {formatDate(rdv.date)} • {formatTime(rdv.time)}
                              </span>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeletePopover(showDeletePopover === rdv._id ? null : rdv._id);
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded-lg transition-colors focus:ring-none focus:outline-none"
                                >
                                  <MoreVertical className="w-4 h-4 text-slate-500" />
                                </button>
                                
                                {/* Popover de suppression */}
                                {showDeletePopover === rdv._id && (
                                  <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-slate-200 z-10 min-w-[200px]">
                                    <div className="p-3">
                                      <p className="text-sm text-slate-700 mb-3">Êtes-vous sûr de vouloir supprimer ce rendez-vous ?</p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDeletePopover(null);
                                          }}
                                          className="flex-1 px-3 py-2 text-xs text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                        >
                                          Annuler
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(rdv);
                                          }}
                                          disabled={!canDelete}
                                          className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-center gap-1 ${
                                            canDelete
                                              ? 'bg-red-500 text-white hover:bg-red-600'
                                              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                          }`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Supprimer
                                        </button>
                                      </div>
                                      {!canDelete && user?.role !== 'ADMIN' && (
                                        <p className="text-xs text-red-500 mt-2 text-center">
                                          Suppression impossible à moins de 2h du rendez-vous
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {rdv.destination === 'Autre' && rdv.destinationAutre 
                                ? rdv.destinationAutre 
                                : rdv.destination
                              }
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-3 h-3 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {rdv.niveauEtude} • {rdv.filiere === 'Autre' && rdv.filiereAutre ? rdv.filiereAutre : rdv.filiere}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(rdv.status)}`}>
                          {rdv.status}
                        </span>
                        
                        {rdv.status === 'Terminé' && rdv.avisAdmin && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getAvisColor(rdv.avisAdmin)}`}>
                            {rdv.avisAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                
                <span className="text-sm text-slate-600">
                  Page {page} sur {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Détails du rendez-vous sélectionné */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">Détails du rendez-vous</h2>
          </div>
          
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {selectedRendezVous ? (
              <div className="space-y-6">
                {/* Informations personnelles */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Informations personnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Prénom</label>
                      <p className="text-sm text-slate-800">{selectedRendezVous.firstName}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
                      <p className="text-sm text-slate-800">{selectedRendezVous.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                      <p className="text-sm text-slate-800 break-all">{selectedRendezVous.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Téléphone</label>
                      <p className="text-sm text-slate-800">{selectedRendezVous.telephone}</p>
                    </div>
                  </div>
                </div>

                {/* Informations du rendez-vous */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Informations du rendez-vous</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-800">{formatDate(selectedRendezVous.date)}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Heure</label>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-800">{formatTime(selectedRendezVous.time)}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Destination</label>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-800">
                          {selectedRendezVous.destination === 'Autre' && selectedRendezVous.destinationAutre 
                            ? selectedRendezVous.destinationAutre 
                            : selectedRendezVous.destination
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Statut actuel</label>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(selectedRendezVous.status)}`}>
                        {selectedRendezVous.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informations académiques */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Informations académiques</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Niveau d'étude</label>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-800">{selectedRendezVous.niveauEtude}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Filière</label>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <p className="text-sm text-slate-800">
                          {selectedRendezVous.filiere === 'Autre' && selectedRendezVous.filiereAutre 
                            ? selectedRendezVous.filiereAutre 
                            : selectedRendezVous.filiere
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Métadonnées */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Métadonnées</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Date de création</label>
                      <p className="text-sm text-slate-800">
                        {new Date(selectedRendezVous.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Dernière modification</label>
                      <p className="text-sm text-slate-800">
                        {new Date(selectedRendezVous.updatedAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Avis administratif (si terminé) */}
                {selectedRendezVous.status === 'Terminé' && selectedRendezVous.avisAdmin && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Avis Administratif</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-2 rounded-lg text-sm font-medium border ${getAvisColor(selectedRendezVous.avisAdmin)}`}>
                        {selectedRendezVous.avisAdmin}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Actions</h3>
                  
                  {/* Boutons de statut */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['En attente', 'Confirmé', 'Terminé', 'Annulé'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusClick(selectedRendezVous._id, status)}
                        disabled={selectedRendezVous.status === status}
                        className={`px-3 py-2 text-xs rounded-lg font-medium transition-all duration-200 focus:ring-none focus:outline-none ${
                          selectedRendezVous.status === status
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : status === 'En attente'
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
                            : status === 'Confirmé'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                            : status === 'Terminé'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {/* Bouton de suppression */}
                  <div className="pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => handleDeleteClick(selectedRendezVous)}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2 focus:ring-none focus:outline-none"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer le rendez-vous
                    </button>
                    {user?.role !== 'ADMIN' && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        {canDeleteRendezvous(selectedRendezVous).canDelete 
                          ? "Vous pouvez supprimer ce rendez-vous jusqu'à 2 heures avant l'horaire prévu"
                          : "Suppression impossible à moins de 2 heures du rendez-vous"
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p>Sélectionnez un rendez-vous pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRendezVous;