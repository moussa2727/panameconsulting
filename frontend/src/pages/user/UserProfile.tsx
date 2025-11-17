import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Home, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userProfileApi, UserProfileData, PasswordData, ValidationErrors } from '../../api/userProfileApi';

export const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, updateUserProfile } = useAuth();
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    email: '',
    telephone: ''
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isProfileModified, setIsProfileModified] = useState(false);

  // Référence pour stocker les données originales
  const originalProfileDataRef = useRef<UserProfileData>({ email: '', telephone: '' });

  // Charger les données utilisateur
  useEffect(() => {
    if (user) {
      const newData = {
        email: user.email || '',
        telephone: user.telephone || ''
      };
      
      // Stocker les données originales
      originalProfileDataRef.current = newData;
      
      setProfileData(newData);
      setIsProfileModified(false);
    }
  }, [user]);

  // Réinitialiser les erreurs quand on change d'onglet
  useEffect(() => {
    setErrors({});
  }, [activeTab]);

  // Gestion des changements profil
  const handleProfileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Validation en temps réel
    const error = userProfileApi.validateProfileField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    setProfileData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Vérifier si les données ont changé par rapport aux originales
      const hasChanged = 
        newData.email !== originalProfileDataRef.current.email ||
        newData.telephone !== originalProfileDataRef.current.telephone;
      
      setIsProfileModified(hasChanged);
      
      return newData;
    });
  }, []);

  // Gestion des changements mot de passe
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    const newPasswordData = {
      ...passwordData,
      [name]: value
    };

    // Validation en temps réel avec toutes les données
    const error = userProfileApi.validatePasswordField(name, value, newPasswordData);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    setPasswordData(newPasswordData);
  }, [passwordData]);

  // Soumission du profil - VERSION CORRIGÉE
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !token) {
      toast.error('Vous devez être connecté pour modifier votre profil');
      return;
    }

    // Empêcher les doubles soumissions
    if (isProfileUpdating) {
      return;
    }

    // Validation finale avec la logique backend
    const validation = userProfileApi.validateProfileBeforeSubmit(profileData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setIsProfileUpdating(true);

    try {
      console.log('🔄 Début mise à jour profil...');
      
      // ✅ APPEL API D'ABORD sans mise à jour optimiste
      const updatedUser = await userProfileApi.updateProfile(profileData, token);
      
      console.log('✅ Réponse API reçue:', updatedUser);
      
      // ✅ MISE À JOUR DU CONTEXTE seulement après succès API
      if (updateUserProfile) {
        updateUserProfile({
          email: updatedUser.email,
          telephone: updatedUser.telephone
        });
      }
      
      // ✅ METTRE À JOUR les données originales
      originalProfileDataRef.current = {
        email: updatedUser.email || '',
        telephone: updatedUser.telephone || ''
      };
      
      setIsProfileModified(false);
      setErrors({});
      
      toast.success('Profil mis à jour avec succès');
      
    } catch (error: any) {
      console.warn('❌ Erreur mise à jour profil:', error.message);
      
      // ✅ ROLLBACK automatique vers les données originales
      setProfileData(originalProfileDataRef.current);
      
      const errorMessage = error.message || 'Erreur lors de la mise à jour du profil';
      
      if (errorMessage.includes('email est déjà utilisé')) {
        setErrors(prev => ({ ...prev, email: 'Cet email est déjà utilisé' }));
      } else if (errorMessage.includes('numéro de téléphone est déjà utilisé')) {
        setErrors(prev => ({ ...prev, telephone: 'Ce numéro de téléphone est déjà utilisé' }));
      } else if (errorMessage.includes('Format d\'email invalide')) {
        setErrors(prev => ({ ...prev, email: 'Format d\'email invalide' }));
      } else if (errorMessage.includes('téléphone doit contenir')) {
        setErrors(prev => ({ ...prev, telephone: 'Le téléphone doit contenir au moins 5 caractères' }));
      } else if (errorMessage.includes('Au moins un champ')) {
        toast.error('Au moins un champ (email ou téléphone) doit être rempli');
      } else if (errorMessage.includes('Session expirée')) {
        toast.error('Session expirée - Veuillez vous reconnecter');
      } else {
        toast.error('Erreur lors de la mise à jour du profil');
      }
    } finally {
      setIsProfileUpdating(false);
    }
  };

  // Soumission du mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !token) {
      toast.error('Vous devez être connecté pour modifier votre mot de passe');
      return;
    }

    // Empêcher les doubles soumissions
    if (isPasswordUpdating) {
      return;
    }

    // Validation finale avec la logique backend
    const validation = userProfileApi.validatePasswordBeforeSubmit(passwordData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setIsPasswordUpdating(true);

    try {
      await userProfileApi.updatePassword(passwordData, token);

      // Réinitialiser le formulaire mot de passe
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      
      setErrors({});
      
      toast.success('Mot de passe mis à jour avec succès');
      
    } catch (error: any) {
      console.warn('Erreur mise à jour mot de passe:', error.message);
      
      const errorMessage = error.message || 'Erreur lors de la mise à jour du mot de passe';
      
      // Gestion des erreurs spécifiques
      if (errorMessage.includes('Mot de passe actuel incorrect') || 
          errorMessage.includes('Le mot de passe actuel est incorrect')) {
        setErrors(prev => ({ ...prev, currentPassword: 'Le mot de passe actuel est incorrect' }));
      } else if (errorMessage.includes('Fonctionnalité temporairement indisponible')) {
        toast.error('Fonctionnalité temporairement indisponible');
      } else if (errorMessage.includes('Erreur de connexion')) {
        toast.error('Problème de connexion au serveur');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleProfileReset = useCallback(() => {
    // Réinitialiser vers les données originales
    setProfileData(originalProfileDataRef.current);
    setErrors(prev => {
      const { email, telephone, ...rest } = prev;
      return rest;
    });
    setIsProfileModified(false);
  }, []);

  const handlePasswordReset = useCallback(() => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setErrors(prev => {
      const { currentPassword, newPassword, confirmNewPassword, ...rest } = prev;
      return rest;
    });
  }, []);

  // États de désactivation des boutons
  const isProfileSubmitDisabled = 
    isProfileUpdating || 
    !isProfileModified || 
    !!errors.email || 
    !!errors.telephone ||
    (profileData.email === originalProfileDataRef.current.email && 
     profileData.telephone === originalProfileDataRef.current.telephone);

  const isPasswordSubmitDisabled = 
    isPasswordUpdating || 
    !!errors.currentPassword || 
    !!errors.newPassword || 
    !!errors.confirmNewPassword ||
    !passwordData.currentPassword ||
    !passwordData.newPassword ||
    !passwordData.confirmNewPassword;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Home className="w-5 h-5 text-slate-600" />
              </button>
              <h1 className="text-lg font-semibold text-slate-800">Mon Profil</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.reload()}
                disabled={isProfileUpdating || isPasswordUpdating}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-slate-600 ${isProfileUpdating || isPasswordUpdating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-3">
            <nav className="flex space-x-1">
              {[
                { id: 'profile', label: 'Informations personnelles' },
                { id: 'password', label: 'Mot de passe' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'profile' | 'password')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white text-slate-600 border border-slate-300 hover:border-blue-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Bannière informations utilisateur */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-lg font-semibold">
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-blue-100 text-sm opacity-90">
                    {user.role === 'admin' || user.isAdmin ? 'Administrateur' : 'Utilisateur'} • 
                    Compte {user.isActive ? 'actif' : 'inactif'}
                  </p>
                </div>
              </div>
            </div>

            {/* Indicateur de modifications non sauvegardées */}
            {activeTab === 'profile' && isProfileModified && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-amber-800 text-sm font-medium">
                      Modifications non sauvegardées
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Contenu des onglets */}
            <div className="p-6">
              {/* Onglet Informations personnelles */}
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Informations en lecture seule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-900">
                        {user.firstName}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Non modifiable</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-900">
                        {user.lastName}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Non modifiable</p>
                    </div>
                  </div>

                  {/* Champ Email */}
                  <div>
                    <label 
                      htmlFor="email" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Adresse email
                      <span className="text-gray-400 text-xs ml-1">(modifiable)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        disabled={isProfileUpdating}
                        className={`
                          block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          disabled:bg-gray-50 disabled:text-gray-500
                          transition-colors duration-200
                          ${errors.email 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300'
                          }
                        `}
                        placeholder="votre@email.com"
                      />
                      {errors.email && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Champ Téléphone */}
                  <div>
                    <label 
                      htmlFor="telephone" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Numéro de téléphone
                      <span className="text-gray-400 text-xs ml-1">(modifiable)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="telephone"
                        name="telephone"
                        type="tel"
                        autoComplete="tel"
                        value={profileData.telephone}
                        onChange={handleProfileChange}
                        disabled={isProfileUpdating}
                        className={`
                          block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          disabled:bg-gray-50 disabled:text-gray-500
                          transition-colors duration-200
                          ${errors.telephone 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300'
                          }
                        `}
                        placeholder="+33 1 23 45 67 89"
                      />
                      {errors.telephone && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.telephone && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.telephone}
                      </p>
                    )}
                  </div>

                  {/* Actions profil */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleProfileReset}
                      disabled={isProfileUpdating || !isProfileModified}
                      className={`
                        flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium
                        transition-colors duration-200
                        ${isProfileUpdating || !isProfileModified
                          ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                          : 'text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400'
                        }
                      `}
                    >
                      Annuler
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isProfileSubmitDisabled}
                      className={`
                        flex-1 px-6 py-3 border border-transparent rounded-lg font-medium text-white
                        transition-all duration-200 flex items-center justify-center
                        ${
                          isProfileSubmitDisabled
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }
                      `}
                    >
                      {isProfileUpdating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Mise à jour...
                        </>
                      ) : (
                        'Sauvegarder les modifications'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Onglet Mot de passe */}
              {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {/* Champ Mot de passe actuel */}
                  <div>
                    <label 
                      htmlFor="currentPassword" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        disabled={isPasswordUpdating}
                        className={`
                          block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          disabled:bg-gray-50 disabled:text-gray-500
                          transition-colors duration-200
                          ${errors.currentPassword 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300'
                          }
                        `}
                        placeholder="Entrez votre mot de passe actuel"
                      />
                      {errors.currentPassword && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.currentPassword && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>

                  {/* Champ Nouveau mot de passe */}
                  <div>
                    <label 
                      htmlFor="newPassword" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        disabled={isPasswordUpdating}
                        className={`
                          block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          disabled:bg-gray-50 disabled:text-gray-500
                          transition-colors duration-200
                          ${errors.newPassword 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300'
                          }
                        `}
                        placeholder="Entrez votre nouveau mot de passe"
                      />
                      {errors.newPassword && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.newPassword && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.newPassword}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.
                    </p>
                  </div>

                  {/* Champ Confirmation */}
                  <div>
                    <label 
                      htmlFor="confirmNewPassword" 
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        type="password"
                        autoComplete="new-password"
                        value={passwordData.confirmNewPassword}
                        onChange={handlePasswordChange}
                        disabled={isPasswordUpdating}
                        className={`
                          block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          disabled:bg-gray-50 disabled:text-gray-500
                          transition-colors duration-200
                          ${errors.confirmNewPassword 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300'
                          }
                        `}
                        placeholder="Confirmez votre nouveau mot de passe"
                      />
                      {errors.confirmNewPassword && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.confirmNewPassword && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.confirmNewPassword}
                      </p>
                    )}
                  </div>

                  {/* Actions mot de passe */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isPasswordUpdating || (!passwordData.currentPassword && !passwordData.newPassword && !passwordData.confirmNewPassword)}
                      className={`
                        flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium
                        transition-colors duration-200
                        ${isPasswordUpdating || (!passwordData.currentPassword && !passwordData.newPassword && !passwordData.confirmNewPassword)
                          ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                          : 'text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400'
                        }
                      `}
                    >
                      Réinitialiser
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isPasswordSubmitDisabled}
                      className={`
                        flex-1 px-6 py-3 border border-transparent rounded-lg font-medium text-white
                        transition-all duration-200 flex items-center justify-center
                        ${isPasswordSubmitDisabled
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }
                      `}
                    >
                      {isPasswordUpdating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Mise à jour...
                        </>
                      ) : (
                        'Changer le mot de passe'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;