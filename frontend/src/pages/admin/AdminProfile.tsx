import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const AdminProfile: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Règles de validation du mot de passe
  const passwordRules = [
    { id: 'length', label: 'Au moins 8 caractères', met: formData.newPassword.length >= 8 },
    { id: 'lowercase', label: 'Une lettre minuscule', met: /[a-z]/.test(formData.newPassword) },
    { id: 'uppercase', label: 'Une lettre majuscule', met: /[A-Z]/.test(formData.newPassword) },
    { id: 'number', label: 'Un chiffre', met: /\d/.test(formData.newPassword) },
    { id: 'match', label: 'Les mots de passe correspondent', met: formData.newPassword === formData.confirmPassword && formData.newPassword !== '' }
  ];

  const allRulesMet = passwordRules.every(rule => rule.met);

  // Fonction de mise à jour du mot de passe
  const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    setMessage(null);

    try {
      const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');

      const requestBody = {
        currentPassword,
        newPassword,
        confirmNewPassword: newPassword
      };

      const response = await fetch(`${VITE_API_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la mise à jour du mot de passe';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          
          if (response.status === 400) {
            if (errorMessage.includes('correspondent pas')) {
              errorMessage = 'Les mots de passe ne correspondent pas';
            } else if (errorMessage.includes('actuel incorrect')) {
              errorMessage = 'Le mot de passe actuel est incorrect';
            }
          }
        } catch {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setMessage({ type: 'success', text: data.message || 'Mot de passe mis à jour avec succès' });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRulesMet) {
      setMessage({ type: 'error', text: 'Veuillez respecter toutes les règles de mot de passe' });
      return;
    }

    await updatePassword(formData.currentPassword, formData.newPassword);
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <>
      <Helmet>
        <title>Profil Administrateur - Paname Consulting</title>
        <meta name="description" content="Gestion sécurisée du mot de passe administrateur" />
        <meta name="keywords" content="Profil administrateur, mot de passe, sécurité" />
        <meta name="author" content="Paname Consulting" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-md mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Profil Administrateur
            </h1>
            <p className="text-gray-600 text-sm">
              Gestion sécurisée du mot de passe
            </p>
          </div>

          {/* Carte principale */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Info admin */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-blue-800 font-semibold text-sm truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-blue-600 text-xs mt-1 truncate">{user?.email}</p>
                </div>
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-3">
                  Admin
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Champ username caché pour l'accessibilité */}
              <div className="sr-only">
                <input
                  id="admin-username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={user?.email || ''}
                  readOnly
                  tabIndex={-1}
                />
              </div>

              {/* Mot de passe actuel */}
              <div>
                <label htmlFor="admin-currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    id="admin-currentPassword"
                    name="currentPassword"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none hover:border-blue-400 transition-colors duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                    placeholder="Mot de passe actuel"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label htmlFor="admin-newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    id="admin-newPassword"
                    name="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none hover:border-blue-400 transition-colors duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                    placeholder="Nouveau mot de passe"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label htmlFor="admin-confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    id="admin-confirmPassword"
                    name="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none hover:border-blue-400 transition-colors duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                    placeholder="Confirmer le mot de passe"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Règles de validation */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Règles de sécurité :</p>
                <div className="space-y-2">
                  {passwordRules.map((rule) => (
                    <div key={rule.id} className="flex items-center gap-3">
                      {rule.met ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${rule.met ? 'text-green-600' : 'text-gray-500'}`}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages */}
              {message && (
                <div
                  className={`p-4 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {message.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                  </div>
                </div>
              )}

              {/* Bouton de soumission */}
              <button
                type="submit"
                disabled={!allRulesMet || isLoading || !formData.currentPassword}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 text-base"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mise à jour...
                  </div>
                ) : (
                  'Mettre à jour le mot de passe'
                )}
              </button>
            </form>

            {/* Note de sécurité */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 text-sm font-medium">Sécurité renforcée</p>
                  <p className="text-amber-700 text-xs mt-1">
                    Votre mot de passe doit respecter les normes de sécurité les plus strictes pour protéger l'accès administrateur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminProfile;