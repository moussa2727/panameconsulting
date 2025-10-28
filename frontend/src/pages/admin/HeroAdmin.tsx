import { RotateCcw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  FaCheck,
  FaGlobe,
  FaSave,
  FaSpinner,
  FaSync,
  FaTimes,
} from 'react-icons/fa';

const API_URL =
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000';

interface HeroData {
  slogan: string;
  title: string;
  description: string;
  countriesCount: number;
  studentsCount: number;
  expertise?: string;
  statistics?: string;
  mainTitle?: string;
}

const defaultHeroData: HeroData = {
  slogan: "LE CAP VERS L'EXCELLENCE",
  title: 'PANAME CONSULTING',
  description:
    "Forte de 3 ans d'expérience, notre équipe multiculturelle a accompagné plus de 50 étudiants vers les meilleures universités internationales. Nous offrons un service personnalisé de la sélection des programmes jusqu'à l'intégration sur place.",
  countriesCount: 8,
  studentsCount: 50,
  expertise: 'Expertise en éducation internationale',
  statistics: 'Chiffres clés de notre succès',
  mainTitle: 'Votre avenir commence ici',
};

const HeroAdmin = () => {
  const [heroData, setHeroData] = useState<HeroData>(defaultHeroData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const fetchHeroData = async (bypassCache = false) => {
    if (serverUnavailable && !bypassCache) {
      setHeroData(defaultHeroData);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const url = `${API_URL}/api/hero${bypassCache ? `?timestamp=${Date.now()}` : ''}`;
      const response = await fetch(url, {
        cache: bypassCache ? 'no-store' : 'default',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const data = await response.json();
      const {
        _id,
        __v,
        $__,
        $isNew,
        _doc,
        createdAt,
        updatedAt,
        ...cleanData
      } = data;
      setHeroData({
        ...defaultHeroData,
        ...cleanData,
      });
      setServerUnavailable(false);
    } catch (error) {
      console.error('Erreur:', error);
      setServerUnavailable(true);
      setHeroData(defaultHeroData);
      setError('Serveur indisponible - Utilisation des valeurs par défaut');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHeroData();
  }, []);

  const handleRefresh = async () => {
    if (serverUnavailable) {
      setError(
        'Serveur toujours indisponible - Utilisation des valeurs par défaut'
      );
      setIsRefreshing(false);
      return;
    }
    setIsRefreshing(true);
    await fetchHeroData(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setHeroData(prev => ({
      ...prev,
      [name]: name.includes('Count') ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (serverUnavailable) {
      setError('Impossible de sauvegarder - Serveur indisponible');
      return;
    }

    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setError(null);

      const dataToSend = {
        slogan: heroData.slogan,
        title: heroData.title,
        description: heroData.description,
        countriesCount: heroData.countriesCount,
        studentsCount: heroData.studentsCount,
        expertise: heroData.expertise,
        statistics: heroData.statistics,
        mainTitle: heroData.mainTitle,
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/hero`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.status === 401) {
        localStorage.removeItem('userToken');
        window.location.href = '/connexion';
        return;
      }

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      await fetchHeroData(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Échec de la mise à jour - Serveur indisponible');
      setServerUnavailable(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setResetSuccess(false);
      setError(null);
      setShowResetModal(false);

      if (serverUnavailable) {
        setHeroData(defaultHeroData);
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3000);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/hero/reset`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la réinitialisation');
      }

      const data = await response.json();
      const {
        _id,
        __v,
        $__,
        $isNew,
        _doc,
        createdAt,
        updatedAt,
        ...cleanData
      } = data;

      setHeroData({
        ...defaultHeroData,
        ...cleanData,
      });
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur:', error);
      setError(
        'Échec de la réinitialisation - Utilisation des valeurs par défaut'
      );
      setHeroData(defaultHeroData);
      setServerUnavailable(true);
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-sky-50'>
        <div className='text-center'>
          <FaSpinner className='animate-spin text-sky-600 text-4xl mx-auto' />
          <p className='mt-4 text-sky-700 font-medium'>
            Chargement des données...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-sky-50 py-8'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
          {/* En-tête */}
          <div className='bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-white/20 rounded-full flex items-center justify-center'>
                  <FaGlobe className='w-5 h-5 text-white' />
                </div>
                <div>
                  <h1 className='text-xl font-bold text-white'>
                    Gestion de la Section Hero
                  </h1>
                  <p className='text-sky-100 text-sm'>
                    Modifiez le contenu principal de votre site
                  </p>
                </div>
              </div>
              <div className='flex space-x-2'>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className='flex items-center px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50'
                  title='Actualiser les données'
                >
                  <FaSync
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  onClick={() => setShowResetModal(true)}
                  disabled={isResetting}
                  className='flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50'
                  title='Réinitialiser aux valeurs par défaut'
                >
                  <RotateCcw className='w-4 h-4 mr-1' />
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {/* Messages de statut */}
          {error && (
            <div className='px-6 py-3 bg-red-50 border-b border-red-200'>
              <div className='flex items-center'>
                <FaTimes className='w-4 h-4 text-red-500 mr-2' />
                <p className='text-red-700 text-sm'>{error}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className='px-6 py-3 bg-green-50 border-b border-green-200'>
              <div className='flex items-center'>
                <FaCheck className='w-4 h-4 text-green-500 mr-2' />
                <p className='text-green-700 text-sm'>
                  Modifications sauvegardées avec succès !
                </p>
              </div>
            </div>
          )}

          {resetSuccess && (
            <div className='px-6 py-3 bg-green-50 border-b border-green-200'>
              <div className='flex items-center'>
                <FaCheck className='w-4 h-4 text-green-500 mr-2' />
                <p className='text-green-700 text-sm'>
                  Contenu réinitialisé avec succès !
                </p>
              </div>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className='p-6 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Slogan *
                </label>
                <input
                  type='text'
                  name='slogan'
                  value={heroData.slogan}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Titre principal *
                </label>
                <input
                  type='text'
                  name='title'
                  value={heroData.title}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
                  required
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Description *
              </label>
              <textarea
                name='description'
                value={heroData.description}
                onChange={handleInputChange}
                rows={4}
                className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
                required
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Nombre de pays *
                </label>
                <input
                  type='number'
                  name='countriesCount'
                  value={heroData.countriesCount}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
                  min='0'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Nombre d'étudiants *
                </label>
                <input
                  type='number'
                  name='studentsCount'
                  value={heroData.studentsCount}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
                  min='0'
                  required
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Expertise
                </label>
                <input
                  type='text'
                  name='expertise'
                  value={heroData.expertise || ''}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Statistiques
                </label>
                <input
                  type='text'
                  name='statistics'
                  value={heroData.statistics || ''}
                  onChange={handleInputChange}
                  className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Titre principal alternatif
              </label>
              <input
                type='text'
                name='mainTitle'
                value={heroData.mainTitle || ''}
                onChange={handleInputChange}
                className='w-full px-3 py-2 focus:ring-none focus:outline-none border border-gray-300 rounded focus:border-sky-500'
              />
            </div>

            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={isSaving || serverUnavailable}
                className='flex items-center px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors'
              >
                {isSaving ? (
                  <>
                    <FaSpinner className='animate-spin w-4 h-4 mr-2' />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <FaSave className='w-4 h-4 mr-2' />
                    Sauvegarder
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Modal de réinitialisation */}
        {showResetModal && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center mb-4'>
                <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4'>
                  <RotateCcw className='w-6 h-6 text-red-600' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Réinitialiser le contenu
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Cette action est irréversible
                  </p>
                </div>
              </div>
              <p className='text-gray-700 mb-6'>
                Êtes-vous sûr de vouloir réinitialiser le contenu de la section
                Hero aux valeurs par défaut ? Cette action ne peut pas être
                annulée.
              </p>
              <div className='flex justify-end space-x-3'>
                <button
                  onClick={() => setShowResetModal(false)}
                  className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
                >
                  Annuler
                </button>
                <button
                  onClick={handleReset}
                  className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroAdmin;