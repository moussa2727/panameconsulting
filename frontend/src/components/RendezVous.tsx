import { useState, useEffect } from 'react';
import { Listbox } from '@headlessui/react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMapPin, FiUser, FiMail, FiPhone, FiCalendar, FiClock, FiBook } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';
import { useAuth } from '../utils/AuthContext';
import { toast } from 'react-toastify';

const RendezVous = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [initialDestination, setInitialDestination] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlDestination = params.get('destination');
    
    if (urlDestination) {
      setInitialDestination(decodeURIComponent(urlDestination));
    }
  }, [location]);

  const [formData, setFormData] = useState({
    destination: initialDestination || 'France',
    destinationAutre: '',
    nom: '',
    prenom: '',
    email: user?.email || '',
    niveauEtude: 'Bac',
    filiere: 'Informatique',
    filiereAutre: '',
    date: '',
    horaire: '',
    telephone: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success?: boolean; message?: string }>({});
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [showFiliereAutre, setShowFiliereAutre] = useState(false);
  const [showDestinationAutre, setShowDestinationAutre] = useState(false);
  const API_URL = (import.meta as any).env.VITE_API_URL;

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      destination: initialDestination || 'France',
      email: user?.email || ''
    }));
  }, [initialDestination, user]);

  useEffect(() => {
    if (submitStatus.message) {
      const timer = setTimeout(() => {
        setSubmitStatus({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  useEffect(() => {
    if (formData.date) {
      fetchOccupiedSlots(formData.date);
    } else {
      setOccupiedSlots([]);
    }
  }, [formData.date]);

  const fetchOccupiedSlots = async (date: string) => {
    try {
      const response = await fetch(`${API_URL}/api/rendezvous/occupied?date=${date}`);
      const data = await response.json();
      if (response.ok) {
        setOccupiedSlots(data.occupied);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des créneaux occupés:", error);
    }
  };

  const destinations = ['Algérie', 'Turquie', 'Maroc', 'France', 'Tunisie', 'Chine', 'Russie', 'Autre'];
  const niveauxEtude = ['Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat'];
  const filieres = ['Informatique', 'Médecine', 'Ingénierie', 'Droit', 'Commerce', 'Autre'];

  const generateTimeSlots = (): string[] => {
    return Array.from({ length: 18 }, (_, i) => {
      const hour = Math.floor(i / 2) + 8;
      const minute = i % 2 === 0 ? '20' : '50';
      if (hour === 17 && minute === '50') return undefined;
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }).filter((slot): slot is string => typeof slot === 'string');
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'filiere') {
      setShowFiliereAutre(value === 'Autre');
      if (value !== 'Autre') {
        setFormData(prev => ({ ...prev, filiereAutre: '', [field]: value }));
        return;
      }
    }
    
    if (field === 'destination') {
      setShowDestinationAutre(value === 'Autre');
      if (value !== 'Autre') {
        setFormData(prev => ({ ...prev, destinationAutre: '', [field]: value }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({});

    const payload = {
      firstName: formData.prenom,
      lastName: formData.nom,
      email: formData.email,
      phone: formData.telephone,
      destination: formData.destination === 'Autre' ? formData.destinationAutre : formData.destination,
      niveauEtude: formData.niveauEtude,
      filiere: formData.filiere === 'Autre' ? formData.filiereAutre : formData.filiere,
      date: formData.date,
      time: formData.horaire
    };

    try {
      const response = await fetch(`${API_URL}/api/rendezvous`, {
        method: "POST",
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Échec de l'envoi");

      setSubmitStatus({
        success: true,
        message: "Demande de rendez-vous envoyée avec succès !",
      });

      toast.success('Rendez-vous créé avec succès!');
      navigate('/mes-rendezvous');

      setFormData({
        destination: initialDestination || 'France',
        destinationAutre: '',
        nom: '',
        prenom: '',
        email: user?.email || '',
        niveauEtude: 'Bac',
        filiere: 'Informatique',
        filiereAutre: '',
        date: '',
        horaire: '',
        telephone: ''
      });
      setShowFiliereAutre(false);
      setShowDestinationAutre(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande de rendez-vous";
      setSubmitStatus({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = Object.entries(formData).every(([key, value]) => {
    if (key === 'filiereAutre' && formData.filiere === 'Autre') {
      return value.trim() !== '';
    }
    if (key === 'destinationAutre' && formData.destination === 'Autre') {
      return value.trim() !== '';
    }
    return key === 'filiereAutre' || key === 'destinationAutre' || value.trim() !== '';
  });

  if (!isAuthenticated) {
    return null; // Ou un loader pendant la redirection
  }

  return (
    <>
      <Helmet>
        <title>Prendre Rendez-Vous | Etudes Monde</title>
        <meta name="description" content="Prenez rendez-vous avec un conseiller Etudes Monde pour discuter de votre projet d'études à l'étranger. Choisissez votre destination, date et horaire préférés." />
        <meta name="keywords" content="rendez-vous, études à l'étranger, conseiller, orientation, Canada, Maroc, Belgique, France" />
        <link rel="icon" href="/etude-monde.ico" sizes="any" />
        <link rel="canonical" href="https://etudes-monde.com/rendez-vous" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 p-2 sm:p-3">
        {submitStatus.message && (
          <div
            className={`mb-4 p-3 rounded-lg mx-auto max-w-md ${
              submitStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
            role="alert"
            aria-live="polite"
          >
            {submitStatus.message}
          </div>
        )}
        
        <form 
          onSubmit={handleSubmit} 
          className="mx-auto max-w-md space-y-3 rounded-xl bg-white p-3 shadow-lg sm:p-4" 
          aria-labelledby="form-heading"
        >
          <h1 id="form-heading" className="text-xl font-bold text-sky-600 sm:text-2xl">📅 Rendez-vous</h1>

          {/* Destination */}
          <div>
            <label htmlFor="destination-button" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
              <span className="flex items-center gap-1">
                <FiMapPin className="text-sky-500" aria-hidden="true" />
                Destination
              </span>
            </label>
            <Listbox 
              value={formData.destination} 
              onChange={(val) => handleChange('destination', val)} 
              name="destination"
            >
              <Listbox.Button 
                id="destination-button"
                className="w-full rounded border border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:ring-none focus:outline-none sm:p-2 sm:text-sm"
                aria-label="Sélectionner une destination"
              >
                {formData.destination || 'Choisissez...'}
              </Listbox.Button>

              <Listbox.Options className="mt-1 flex max-w-full overflow-x-auto space-x-2 rounded border-2 border-gray-200 bg-white px-2 py-1 text-xs sm:text-sm">
                {destinations.map((dest) => (
                  <Listbox.Option
                    key={dest}
                    value={dest}
                    className={({ active }) =>
                      `shrink-0 cursor-pointer focus:outline-none focus:ring-none whitespace-nowrap rounded px-3 py-1.5 sm:px-4 sm:py-2 transition-colors ${active ? 'bg-sky-100' : 'bg-white'}`
                    }
                  >
                    {dest}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Listbox>
            
            {showDestinationAutre && (
              <div className="mt-2">
                <label htmlFor="destinationAutre" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                  Saisissez votre destination
                </label>
                <input
                  type="text"
                  value={formData.destinationAutre}
                  placeholder="Votre destination"
                  id="destinationAutre"
                  name="destinationAutre"
                  onChange={(e) => handleChange('destinationAutre', e.target.value)}
                  className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                  autoComplete="off"
                  required={formData.destination === 'Autre'}
                />
              </div>
            )}
          </div>

          {/* Nom et Prénom */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="nom" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FiUser className="text-sky-500" aria-hidden="true" />
                  Nom
                </span>
              </label>
              <input
                type="text"
                value={formData.nom}
                placeholder="Nom"
                id="nom"
                name="nom"
                onChange={(e) => handleChange('nom', e.target.value)}
                className="w-full rounded border border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none focus:ring-none sm:p-2 sm:text-sm"
                required
                aria-required="true"
                autoComplete="family-name"
              />
            </div>
            <div>
              <label htmlFor="prenom" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FiUser className="text-sky-500" aria-hidden="true" />
                  Prénom
                </span>
              </label>
              <input
                type="text"
                value={formData.prenom}
                placeholder="Prénom"
                id="prenom"
                name="prenom"
                onChange={(e) => handleChange('prenom', e.target.value)}
                className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                required
                aria-required="true"
                autoComplete="given-name"
              />
            </div>
          </div>

          {/* Email et Téléphone */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FiMail className="text-sky-500" aria-hidden="true" />
                  Email
                </span>
              </label>
              <input
                type="email"
                value={formData.email}
                placeholder="exemple@email.com"
                id="email"
                name="email"
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                required
                aria-required="true"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="telephone" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FiPhone className="text-sky-500" aria-hidden="true" />
                  Téléphone
                </span>
              </label>
              <input
                type="tel"
                value={formData.telephone}
                placeholder="+228 XX XX XX XX"
                id="telephone"
                name="telephone"
                onChange={(e) => handleChange('telephone', e.target.value)}
                className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                required
                aria-required="true"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Niveau et Filière */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="niveauEtude" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FaGraduationCap className="text-sky-500" aria-hidden="true" />
                  Niveau
                </span>
              </label>
              <select
                value={formData.niveauEtude}
                id="niveauEtude"
                name="niveauEtude"
                onChange={(e) => handleChange('niveauEtude', e.target.value)}
                className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                required
                aria-required="true"
                autoComplete="education-level"
              >
                {niveauxEtude.map((niv) => (
                  <option key={niv} value={niv}>{niv}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filiere" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FiBook className="text-sky-500" aria-hidden="true" />
                  Filière
                </span>
              </label>
              <select
                value={formData.filiere}
                id="filiere"
                name="filiere"
                onChange={(e) => handleChange('filiere', e.target.value)}
                className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                required
                aria-required="true"
                autoComplete="organization-title"
              >
                {filieres.map((fil) => (
                  <option key={fil} value={fil}>{fil}</option>
                ))}
              </select>
              
              {showFiliereAutre && (
                <div className="mt-2">
                  <label htmlFor="filiereAutre" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                    Saisissez votre filière voulue
                  </label>
                  <input
                    type="text"
                    value={formData.filiereAutre}
                    placeholder="Votre filière"
                    id="filiereAutre"
                    name="filiereAutre"
                    onChange={(e) => handleChange('filiereAutre', e.target.value)}
                    className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                    autoComplete="organization"
                    required={formData.filiere === 'Autre'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Date et Horaire */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FiCalendar className="text-sky-500" aria-hidden="true" />
                  Date
                </span>
              </label>
              <input
                type="date"
                value={formData.date}
                id="date"
                name="date"
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full rounded border focus:ring-none border-gray-200 p-1.5 text-xs transition-colors hover:border-sky-400 focus:border-sky-600 focus:outline-none sm:p-2 sm:text-sm"
                required
                aria-required="true"
                min={new Date().toISOString().split('T')[0]}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="horaire" className="mb-1 block text-xs font-medium text-gray-600 sm:text-sm">
                <span className="flex items-center gap-1">
                  <FiClock className="text-sky-500" aria-hidden="true" />
                  Horaire
                </span>
              </label>
              <input
                type="text"
                id="horaire"
                name="horaire"
                value={formData.horaire}
                readOnly
                hidden
                tabIndex={-1}
                autoComplete="off"
              />
              <div 
                className="h-20 overflow-y-auto rounded border-2 border-gray-200 p-1 focus-within:border-sky-600" 
                aria-labelledby="horaire-label"
              >
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {generateTimeSlots().map((time) => {
                    const isOccupied = occupiedSlots.includes(time);
                    const isSelected = formData.horaire === time;
                    
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => !isOccupied && handleChange('horaire', time)}
                        className={`text-xxs rounded p-0 focus:ring-none focus:outline-none transition-colors sm:text-xs ${
                          isSelected
                            ? 'bg-sky-600 text-white'
                            : isOccupied
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-100 hover:bg-sky-100'
                        }`}
                        aria-pressed={isSelected}
                        aria-label={`Horaire ${time}${isOccupied ? ' (Indisponible)' : ''}`}
                        disabled={isOccupied}
                      >
                        {time}
                        {isOccupied && <span className="sr-only"> (Indisponible)</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              <span id="horaire-label" className="sr-only">Sélection d'horaire</span>
            </div>
          </div>

          {/* Soumission */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full rounded focus:ring-none focus:outline-none p-2 text-xs font-semibold text-white transition-colors sm:p-2.5 sm:text-sm ${
              isFormValid && !isSubmitting
                ? 'bg-sky-600 hover:bg-sky-700'
                : 'cursor-not-allowed bg-gray-300'
            }`}
            aria-disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Envoi en cours...' : 'Confirmer ➔'}
          </button>
        </form>
      </div>
    </>
  )
};
export default RendezVous;