// UserProfile.tsx
import {
  Edit,
  Eye,
  EyeOff,
  Home,
  Mail,
  Phone,
  Save,
  User,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const UserProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '0123456789',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleCancel = () => {
    setFormData({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '0123456789',
    });
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsEditing(false);
  };

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='mb-8 flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Link
              to='/'
              className='flex items-center text-sky-600 hover:text-sky-700 transition-colors'
            >
              <Home className='w-5 h-5 mr-2' />
              <span>Retour à l'accueil</span>
            </Link>
          </div>
          <h1 className='text-3xl font-bold text-gray-900'>Mon Profil</h1>
        </div>

        <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
          <div className='bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-8'>
            <div className='flex items-center space-x-6'>
              <div className='w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold'>
                {formData.firstName.charAt(0).toUpperCase()}
                {formData.lastName.charAt(0).toUpperCase()}
              </div>
              <div className='text-white'>
                <h2 className='text-2xl font-bold'>
                  {formData.firstName} {formData.lastName}
                </h2>
                <p className='text-sky-100'>{formData.email}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className='p-6 space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Prénom *
                </label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    type='text'
                    name='firstName'
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 disabled:bg-gray-50'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Nom *
                </label>
                <div className='relative'>
                  <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    type='text'
                    name='lastName'
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 disabled:bg-gray-50'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Email *
                </label>
                <div className='relative'>
                  <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    type='email'
                    name='email'
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 disabled:bg-gray-50'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Téléphone *
                </label>
                <div className='relative'>
                  <Phone className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                  <input
                    type='tel'
                    name='phone'
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500 disabled:bg-gray-50'
                    required
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className='border-t pt-6'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  Changer le mot de passe
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Mot de passe actuel
                    </label>
                    <div className='relative'>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name='currentPassword'
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                        placeholder='Laissez vide si pas de changement'
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                      >
                        {showPassword ? (
                          <EyeOff className='w-5 h-5' />
                        ) : (
                          <Eye className='w-5 h-5' />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Nouveau mot de passe
                    </label>
                    <div className='relative'>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name='newPassword'
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                        placeholder='Minimum 6 caractères'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className='relative'>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name='confirmPassword'
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-sky-400 focus:outline-none focus:ring-none focus:border-sky-500'
                        placeholder='Confirmez le nouveau mot de passe'
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className='flex justify-end space-x-4 pt-6 border-t'>
              {!isEditing ? (
                <button
                  type='button'
                  onClick={() => setIsEditing(true)}
                  className='flex items-center px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors'
                >
                  <Edit className='w-5 h-5 mr-2' />
                  Modifier le profil
                </button>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={handleCancel}
                    className='flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    <X className='w-5 h-5 mr-2' />
                    Annuler
                  </button>
                  <button
                    type='submit'
                    className='flex items-center px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors'
                  >
                    <Save className='w-5 h-5 mr-2' />
                    Sauvegarder
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;