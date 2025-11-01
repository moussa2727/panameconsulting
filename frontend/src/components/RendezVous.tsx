import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { toast } from 'react-toastify';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  BookOpen,
  ChevronDown,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface AvailableDate {
  date: string;
  available: boolean;
}

interface FormData {
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

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const RendezVous: React.FC = () => {
  const { user, token, isAuthenticated, refreshToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
    destination: '',
    destinationAutre: '',
    niveauEtude: '',
    filiere: '',
    filiereAutre: '',
    date: '',
    time: ''
  });

  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDestinationOther, setShowDestinationOther] = useState(false);
  const [showFiliereOther, setShowFiliereOther] = useState(false);

  // Destinations et filières prédéfinies
  const destinations = [
    'Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'
  ];

  const niveauxEtude = [
    'Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat'
  ];

  const filieres = [
    'Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'
  ];

  // Pré-remplir avec les données utilisateur si connecté
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        telephone: user.telephone || ''
      }));
    }
  }, [isAuthenticated, user]);

  // Pré-sélectionner la destination depuis la navigation
  useEffect(() => {
    const preselectedDestination = location.state?.preselectedDestination;
    if (preselectedDestination && destinations.includes(preselectedDestination)) {
      setFormData(prev => ({ ...prev, destination: preselectedDestination }));
    }
  }, [location.state]);

  // Gérer les changements de destination et filière
  useEffect(() => {
    setShowDestinationOther(formData.destination === 'Autre');
    setShowFiliereOther(formData.filiere === 'Autre');
  }, [formData.destination, formData.filiere]);

  // Vérifier si une date est passée
  const isDatePassed = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  // Vérifier si un créneau horaire est passé pour aujourd'hui
  const isTimePassed = (timeStr: string, dateStr: string): boolean => {
    const today = new Date();
    const selectedDate = new Date(dateStr);
    
    if (selectedDate.toDateString() !== today.toDateString()) {
      return false;
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const selectedTime = new Date();
    selectedTime.setHours(hours, minutes, 0, 0);
    
    return selectedTime < today;
  };

  // Charger les dates disponibles
  const fetchAvailableDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-dates`);
      if (!response.ok) throw new Error('Erreur lors du chargement des dates');
      
      const dates = await response.json();
      
      const today = new Date().toISOString().split('T')[0];
      const filteredDates = dates
        .filter((date: string) => !isDatePassed(date))
        .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
      
      setAvailableDates(filteredDates.map((date: string) => ({ 
        date, 
        available: true 
      })));
    } catch (error) {
      toast.error('Impossible de charger les dates disponibles');
    } finally {
      setLoadingDates(false);
    }
  }, []);

  // Charger les créneaux horaires disponibles
  const fetchAvailableSlots = useCallback(async (date: string) => {
    if (!date) return;
    
    setLoadingSlots(true);
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/available-slots?date=${date}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des créneaux');
      
      let slots = await response.json();
      
      if (date === new Date().toISOString().split('T')[0]) {
        slots = slots.filter((slot: string) => !isTimePassed(slot, date));
      }
      
      setAvailableSlots(slots);
    } catch (error) {
      toast.error('Impossible de charger les créneaux disponibles');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Initialiser les dates disponibles
  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  // Charger les créneaux quand la date change
  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots(formData.date);
    }
  }, [formData.date, fetchAvailableSlots]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.telephone);
      case 2:
        if (formData.destination === 'Autre' && !formData.destinationAutre) return false;
        if (formData.filiere === 'Autre' && !formData.filiereAutre) return false;
        return !!(formData.destination && formData.niveauEtude && formData.filiere);
      case 3:
        return !!(formData.date && formData.time);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour prendre un rendez-vous');
      navigate('/connexion');
      return;
    }

    // 🔥 CORRECTION: Vérifier que token n'est pas null
    if (!token) {
      toast.error('Session invalide. Veuillez vous reconnecter.');
      logout('/connexion');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        destination: formData.destination === 'Autre' ? formData.destinationAutre : formData.destination,
        filiere: formData.filiere === 'Autre' ? formData.filiereAutre : formData.filiere
      };

      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/rendezvous`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
      };

      let response = await makeRequest(token);

      // Si token expiré, rafraîchir et réessayer
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
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création du rendez-vous');
      }

      toast.success('Rendez-vous créé avec succès !');
      setTimeout(() => navigate('/user-rendez-vous'), 1500);

    } catch (error: any) {
      console.error('❌ Erreur création rendez-vous:', error);
      
      if (error.message.includes('Session expirée') || error.message.includes('Token invalide')) {
        toast.error('Session expirée. Redirection...');
        setTimeout(() => logout('/connexion'), 1500);
      } else {
        toast.error(error.message || 'Erreur lors de la création du rendez-vous');
      }
    } finally {
      setLoading(false);
    }
  };

  // Étape 1: Informations personnelles
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-sky-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Informations Personnelles</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Prénom *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none transition-colors"
            placeholder="Votre prénom"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Nom *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none transition-colors"
            placeholder="Votre nom"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none transition-colors"
            placeholder="votre@email.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Téléphone *</label>
          <input
            type="tel"
            name="telephone"
            value={formData.telephone}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none transition-colors"
            placeholder="+33 1 23 45 67 89"
          />
        </div>
      </div>
    </div>
  );

  // Étape 2: Destination et études
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-6 h-6 text-sky-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Destination et Parcours</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Destination *</label>
          <select
            name="destination"
            value={formData.destination}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none  transition-colors appearance-none bg-white"
          >
            <option value="">Choisir une destination</option>
            {destinations.map(dest => (
              <option key={dest} value={dest}>{dest}</option>
            ))}
          </select>
        </div>

        {showDestinationOther && (
          <div className="space-y-2 animate-fade-in">
            <label className="text-sm font-medium text-gray-700">Autre destination *</label>
            <input
              type="text"
              name="destinationAutre"
              value={formData.destinationAutre}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none transition-colors"
              placeholder="Ex: Canada, Belgique..."
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Niveau d'étude *</label>
          <select
            name="niveauEtude"
            value={formData.niveauEtude}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none  transition-colors appearance-none bg-white"
          >
            <option value="">Choisir votre niveau</option>
            {niveauxEtude.map(niveau => (
              <option key={niveau} value={niveau}>{niveau}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Filière *</label>
          <select
            name="filiere"
            value={formData.filiere}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none transition-colors appearance-none bg-white"
          >
            <option value="">Choisir une filière</option>
            {filieres.map(filiere => (
              <option key={filiere} value={filiere}>{filiere}</option>
            ))}
          </select>
        </div>

        {showFiliereOther && (
          <div className="space-y-2 animate-fade-in">
            <label className="text-sm font-medium text-gray-700">Autre filière *</label>
            <input
              type="text"
              name="filiereAutre"
              value={formData.filiereAutre}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-sky-400 focus:border-sky-500 focus:ring-none focus:outline-none transition-colors"
              placeholder="Ex: Architecture, Design..."
            />
          </div>
        )}
      </div>
    </div>
  );

  // Étape 3: Date et heure
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-sky-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Date et Heure</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dates */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Date *</label>
          
          {loadingDates ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
              {availableDates.map(({ date, available }) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, date, time: '' }))}
                  disabled={!available}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    formData.date === date
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : available
                      ? 'border-gray-300 hover:border-sky-400 hover:bg-sky-25'
                      : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium text-sm">{formatDateDisplay(date)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Heures */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Heure *</label>
          
          {!formData.date ? (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Choisir une date d'abord</p>
            </div>
          ) : loadingSlots ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun créneau disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {availableSlots.map(slot => {
                const isTimeDisabled = isTimePassed(slot, formData.date);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => !isTimeDisabled && setFormData(prev => ({ ...prev, time: slot }))}
                    disabled={isTimeDisabled}
                    className={`p-2 text-center rounded-lg border transition-colors text-sm ${
                      formData.time === slot
                        ? 'border-sky-500 bg-sky-50 text-sky-700 font-medium'
                        : isTimeDisabled
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 hover:border-sky-400 hover:bg-sky-25'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Récapitulatif */}
      {formData.date && formData.time && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 animate-fade-in">
          <h4 className="font-semibold text-sky-800 text-sm mb-1">Rendez-vous sélectionné :</h4>
          <div className="flex items-center gap-2 text-sky-700 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{formatDateDisplay(formData.date)}</span>
            <Clock className="w-4 h-4 ml-2" />
            <span>{formData.time}</span>
          </div>
        </div>
      )}
    </div>
  );

  // Indicateur de progression compact
  const ProgressSteps = () => (
    <div className="flex justify-between items-center mb-6 relative">
      {[1, 2, 3].map(step => (
        <div key={step} className="flex flex-col items-center z-10">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
            step === currentStep
              ? 'border-sky-500 bg-sky-500 text-white'
              : step < currentStep
              ? 'border-sky-500 bg-sky-500 text-white'
              : 'border-gray-300 bg-white text-gray-400'
          }`}>
            {step < currentStep ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <span className="text-xs font-medium">{step}</span>
            )}
          </div>
          <span className={`text-xs mt-1 ${step === currentStep ? 'text-sky-600' : 'text-gray-500'}`}>
            Étape {step}
          </span>
        </div>
      ))}
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
        <div 
          className="h-full bg-sky-500 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 py-6">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* En-tête compact */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-sky-600 mb-2">
            Prendre un Rendez-vous
          </h1>
          <p className="text-gray-600 text-sm">
            Consultation personnalisée pour vos études à l'étranger
          </p>
        </div>

        {/* Carte principale compacte */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <ProgressSteps />
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="min-h-[300px]">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>

            {/* Boutons de navigation compacts */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:border-sky-400 hover:bg-sky-50 disabled:opacity-50 transition-colors text-sm"
              >
                Précédent
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid(currentStep)}
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                >
                  Suivant
                  <ChevronDown className="w-3 h-3 rotate-270" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isStepValid(3) || loading}
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmer
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Informations supplémentaires compactes */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Confirmation par email • Horaires : lun-ven, 9h-16h30</p>
        </div>
      </div>

      {/* Styles d'animation */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RendezVous;