import {
  Calendar,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Home,
  Lock,
  Mail,
  Phone,
  Save,
  User,
  X,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const UserProfile: React.FC = () => {
  const { user, token, refreshToken, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    telephone: '',
  });
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fonction pour rafraîchir le token avec gestion d'erreur
  const refreshTokenWithRetry = async (): Promise<boolean> => {
    try {
      console.log('🔄 Tentative de rafraîchissement du token...');
      const success = await refreshToken();
      
      if (success) {
        console.log('✅ Token rafraîchi avec succès');
        return true;
      } else {
        console.log('❌ Échec du rafraîchissement du token');
        toast.error('Session expirée. Veuillez vous reconnecter.');
        logout('/connexion', true);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
      toast.error('Session expirée. Veuillez vous reconnecter.');
      logout('/connexion', true);
      return false;
    }
  };

  const loadUserProfile = async () => {
    if (!token) {
      console.log('❌ Aucun token disponible pour charger le profil');
      return;
    }

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      };

      let response = await makeRequest(token);

      // Si token expiré, rafraîchir et réessayer
      if (response.status === 401) {
        console.log('🔄 Token expiré détecté lors du chargement du profil');
        const refreshed = await refreshTokenWithRetry();
        
        if (refreshed) {
          // Récupérer le nouveau token du localStorage
          const newToken = localStorage.getItem('token');
          if (newToken) {
            console.log('✅ Nouveau token récupéré, réessai de la requête...');
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée');
        }
      }

      if (response.ok) {
        const profile = await response.json();
        console.log('✅ Profil chargé avec succès:', profile);
        setFormData({
          firstName: profile.firstName || user?.firstName || '',
          lastName: profile.lastName || user?.lastName || '',
          email: profile.email || user?.email || '',
          telephone: profile.telephone || profile.phone || user?.telephone || '',
        });
      } else {
        console.warn('⚠️ Réponse non-OK lors du chargement du profil:', response.status);
        // Fallback aux données du contexte
        if (user) {
          setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            telephone: user.telephone || '',
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
      
      if (error instanceof Error && error.message.includes('Session expirée')) {
        toast.error('Session expirée. Redirection...');
        setTimeout(() => logout('/connexion', true), 2000);
      } else if (user) {
        // Fallback aux données du contexte
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          telephone: user.telephone || '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Charger les données utilisateur
  useEffect(() => {
    if (user && token) {
      loadUserProfile();
    }
  }, [user, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Ne permettre la modification que de l'email et du téléphone
    if (name === 'email' || name === 'telephone') {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      logout('/connexion', true);
      return;
    }

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/users/profile/me`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: formData.email,
            telephone: formData.telephone,
          }),
        });
      };

      let response = await makeRequest(token);
      console.log('📤 Requête PATCH envoyée, statut:', response.status);

      // Si token expiré, rafraîchir et réessayer
      if (response.status === 401) {
        console.log('🔄 Token expiré détecté lors de la mise à jour, tentative de rafraîchissement...');
        const refreshed = await refreshTokenWithRetry();
        
        if (refreshed) {
          // Récupérer le nouveau token du localStorage
          const newToken = localStorage.getItem('token');
          if (newToken) {
            console.log('✅ Nouveau token récupéré, réessai de la requête PATCH...');
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Réponse erreur:', errorText);
        let errorMessage = 'Erreur lors de la mise à jour';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const updatedUser = await response.json();
      console.log('✅ Profil mis à jour avec succès:', updatedUser);
      
      setFormData(prev => ({
        ...prev,
        telephone: updatedUser.telephone || updatedUser.phone || '',
        email: updatedUser.email || ''
      }));

      toast.success('Profil mis à jour avec succès');
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      
      if (error instanceof Error && (
        error.message.includes('Session expirée') || 
        error.message.includes('Token invalide') ||
        error.message.includes('Token non disponible')
      )) {
        toast.error('Erreur lors de la mise à jour. ');
      } else {
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Vous devez être connecté pour effectuer cette action');
      return;
    }
    
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }

      if (passwordData.newPassword.length < 8) {
        toast.error('Le mot de passe doit contenir au moins 8 caractères');
        return;
      }

      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${API_URL}/api/auth/update-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        });
      };

      let response = await makeRequest(token);

      // Si token expiré, rafraîchir et réessayer
      if (response.status === 401) {
        console.log('🔄 Token expiré détecté lors du changement de mot de passe');
        const refreshed = await refreshTokenWithRetry();
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
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la mise à jour du mot de passe');
      }

      toast.success('Mot de passe mis à jour avec succès');
      setShowPasswordPopup(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour mot de passe:', error);
      
      if (error instanceof Error && (
        error.message.includes('Session expirée') || 
        error.message.includes('Token invalide')
      )) {
        toast.error('Erreur lors de la mise à jour du mot de passe. ');
      } else {
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du mot de passe');
      }
    }
  };

  const handleCancel = () => {
    if (user) {
      loadUserProfile();
      setIsEditing(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowPassword(false);
  };

 
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Navigation utilisateur - Mobile First */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2 md:space-x-6 overflow-x-auto">
              <Link 
                to="/" 
                className="flex items-center text-sky-600 hover:text-sky-700 transition-colors text-sm md:text-base whitespace-nowrap"
              >
                <Home className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                <span className="hidden xs:inline">Accueil</span>
              </Link>
              <nav className="flex space-x-1 md:space-x-4">
                <Link 
                  to="/user-profile" 
                  className="flex items-center px-2 py-2 md:px-3 bg-sky-100 text-sky-700 rounded-md text-sm whitespace-nowrap"
                >
                  <User className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Mon Profil</span>
                </Link>
                <Link 
                  to="/user-rendez-vous" 
                  className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors text-sm whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Rendez-vous</span>
                </Link>
                <Link 
                  to="/user-procedure" 
                  className="flex items-center px-2 py-2 md:px-3 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors text-sm whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Procédures</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Le reste du JSX reste identique */}
      <div className='py-4 md:py-8'>
        <div className='max-w-4xl mx-auto px-3 sm:px-6 lg:px-8'>
          <div className='mb-4 md:mb-8'>
            <h1 className='text-xl md:text-3xl font-bold text-gray-900'>Mon Profil</h1>
            <p className='text-gray-600 mt-1 md:mt-2 text-sm md:text-base'>Gérez vos informations personnelles</p>
          </div>

          <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
            {/* Header avec avatar */}
            <div className='bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-4 md:px-6 md:py-8'>
              <div className='flex items-center space-x-3 md:space-x-6'>
                <div className='w-12 h-12 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-bold'>
                  {formData.firstName.charAt(0).toUpperCase()}
                  {formData.lastName.charAt(0).toUpperCase()}
                </div>
                <div className='text-white'>
                  <h2 className='text-lg md:text-2xl font-bold'>
                    {formData.firstName} {formData.lastName}
                  </h2>
                  <p className='text-sky-100 text-sm md:text-base'>{formData.email}</p>
                </div>
              </div>
            </div>

            {/* Formulaire de profil */}
            <form onSubmit={handleProfileSubmit} className='p-4 md:p-6 space-y-4 md:space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
                {/* Prénom - Lecture seule */}
                <div>
                  <label htmlFor='firstName' className='block text-sm font-medium text-gray-700 mb-2'>
                    Prénom
                  </label>
                  <div className='relative'>
                    <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5' />
                    <input
                      type='text'
                      name='firstName'
                      id='firstName'
                      value={formData.firstName}
                      disabled={true}
                      autoComplete='given-name'
                      className='w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed'
                    />
                  </div>
                  <p className='text-xs text-red-600 mt-1'>✗ Non modifiable - Contactez l'administrateur</p>
                </div>

                {/* Nom - Lecture seule */}
                <div>
                  <label htmlFor='lastName' className='block text-sm font-medium text-gray-700 mb-2'>
                    Nom
                  </label>
                  <div className='relative'>
                    <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5' />
                    <input
                      type='text'
                      name='lastName'
                      id='lastName'
                      value={formData.lastName}
                      disabled={true}
                      autoComplete='family-name'
                      className='w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed'
                    />
                  </div>
                  <p className='text-xs text-red-600 mt-1'>✗ Non modifiable - Contactez l'administrateur</p>
                </div>

                {/* Email - Modifiable */}
                <div className="md:col-span-2">
                  <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-2'>
                    Adresse email *
                  </label>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5' />
                    <input
                      type='email'
                      name='email'
                      id='email'
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      autoComplete='email'
                      className='w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-gray-50 transition-colors'
                      required
                      placeholder="votre@email.com"
                    />
                  </div>
                  <p className='text-xs text-green-600 mt-1'>✓ Modifiable - Utilisé pour la connexion</p>
                </div>

                {/* Téléphone - Modifiable */}
                <div className="md:col-span-2">
                  <label htmlFor='telephone' className='block text-sm font-medium text-gray-700 mb-2'>
                    Numéro de téléphone *
                  </label>
                  <div className='relative'>
                    <Phone className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5' />
                    <input
                      type='tel'
                      name='telephone'
                      id='telephone'
                      value={formData.telephone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      autoComplete='tel'
                      className='w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-gray-50 transition-colors'
                      required
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                  <p className='text-xs text-green-600 mt-1'>✓ Modifiable - Pour vous contacter</p>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className='flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 pt-4 md:pt-6 border-t'>
                <button
                  type='button'
                  onClick={() => setShowPasswordPopup(true)}
                  className='flex items-center px-4 py-2 md:px-5 md:py-2.5 text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50 transition-colors w-full sm:w-auto justify-center text-sm md:text-base'
                >
                  <Lock className='w-4 h-4 md:w-5 md:h-5 mr-2' />
                  Changer le mot de passe
                </button>

                <div className='flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto'>
                  {!isEditing ? (
                    <button
                      type='button'
                      onClick={() => setIsEditing(true)}
                      className='flex items-center px-4 py-2 md:px-6 md:py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors w-full sm:w-auto justify-center text-sm md:text-base'
                    >
                      <Edit className='w-4 h-4 md:w-5 md:h-5 mr-2' />
                      Modifier le profil
                    </button>
                  ) : (
                    <>
                      <button
                        type='button'
                        onClick={handleCancel}
                        className='flex items-center px-4 py-2 md:px-6 md:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center text-sm md:text-base'
                      >
                        <X className='w-4 h-4 md:w-5 md:h-5 mr-2' />
                        Annuler
                      </button>
                      <button
                        type='submit'
                        className='flex items-center px-4 py-2 md:px-6 md:py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors w-full sm:w-auto justify-center text-sm md:text-base'
                      >
                        <Save className='w-4 h-4 md:w-5 md:h-5 mr-2' />
                        Sauvegarder
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Popup de changement de mot de passe */}
      {showPasswordPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h3>
                <button
                  onClick={() => {
                    setShowPasswordPopup(false);
                    resetPasswordForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                      placeholder="Entrez votre mot de passe actuel"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    placeholder="Minimum 8 caractères"
                    required
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    placeholder="Confirmez le nouveau mot de passe"
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordPopup(false);
                      resetPasswordForm();
                    }}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors w-full sm:w-auto"
                  >
                    Mettre à jour
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;