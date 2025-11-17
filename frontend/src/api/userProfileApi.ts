export interface UserProfileData {
  email?: string;
  telephone?: string;
}

export interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ValidationErrors {
  email?: string;
  telephone?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

class UserProfileApiService {
  private readonly VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Validation des champs profil
  validateProfileField(name: string, value: string): string {
    switch (name) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Format d\'email invalide';
        }
        break;
      
      case 'telephone':
        if (value && value.trim().length < 5) {
          return 'Le téléphone doit contenir au moins 5 caractères';
        }
        if (value && !/^[\d\s+\-()]+$/.test(value)) {
          return 'Le téléphone contient des caractères invalides';
        }
        break;
      
      default:
        return '';
    }
    return '';
  }

  // Validation des champs mot de passe
  validatePasswordField(name: string, value: string, allData?: PasswordData): string {
    switch (name) {
      case 'currentPassword':
        if (!value.trim()) {
          return 'Le mot de passe actuel est requis';
        }
        break;
      
      case 'newPassword':
        if (!value.trim()) {
          return 'Le nouveau mot de passe est requis';
        }
        if (value.length < 8) {
          return 'Le mot de passe doit contenir au moins 8 caractères';
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre';
        }
        break;
      
      case 'confirmNewPassword':
        if (!value.trim()) {
          return 'La confirmation du mot de passe est requise';
        }
        if (allData && value !== allData.newPassword) {
          return 'Les mots de passe ne correspondent pas';
        }
        break;
      
      default:
        return '';
    }
    return '';
  }

 // Mise à jour de la méthode updateProfile
async updateProfile(profileData: UserProfileData, token: string): Promise<any> {
  if (!token) {
    throw new Error('Vous devez être connecté pour modifier votre profil');
  }

  // Validation finale profil
  const finalErrors: ValidationErrors = {};
  Object.keys(profileData).forEach(key => {
    const error = this.validateProfileField(key, profileData[key as keyof UserProfileData] || '');
    if (error) {
      finalErrors[key as keyof ValidationErrors] = error;
    }
  });

  if (Object.keys(finalErrors).length > 0) {
    throw new Error('Veuillez corriger les erreurs dans le formulaire');
  }

  // Vérifier qu'au moins un champ modifiable est rempli (cohérence backend)
  const hasModifiableData = profileData.email?.trim() || profileData.telephone?.trim();
  if (!hasModifiableData) {
    throw new Error('Au moins un champ (email ou téléphone) doit être rempli');
  }

  try {
    const response = await fetch(`${this.VITE_API_URL}/api/users/profile/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        email: profileData.email?.trim() || undefined,
        telephone: profileData.telephone?.trim() || undefined
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la mise à jour du profil');
    }

    const updatedUser = await response.json();
    return updatedUser;
    
  } catch (error: any) {
    console.error('❌ Erreur mise à jour profil:', error);
    
    let errorMessage = 'Erreur lors de la mise à jour du profil';
    
    if (error.message.includes('email est déjà utilisé') || error.message.includes('Cet email est déjà utilisé')) {
      throw new Error('Cet email est déjà utilisé');
    } else if (error.message.includes('numéro de téléphone est déjà utilisé') || error.message.includes('Ce numéro de téléphone est déjà utilisé')) {
      throw new Error('Ce numéro de téléphone est déjà utilisé');
    } else if (error.message.includes('Format d\'email invalide')) {
      throw new Error('Format d\'email invalide');
    } else if (error.message.includes('Le téléphone doit contenir au moins 5 caractères')) {
      throw new Error('Le téléphone doit contenir au moins 5 caractères');
    } else if (error.message.includes('Au moins un champ (email ou téléphone) doit être fourni')) {
      throw new Error('Au moins un champ (email ou téléphone) doit être rempli');
    } else {
      throw new Error(error.message || errorMessage);
    }
  }
}

// Mise à jour de la méthode updatePassword
async updatePassword(passwordData: PasswordData, token: string): Promise<void> {
  if (!token) {
    throw new Error('Vous devez être connecté pour modifier votre mot de passe');
  }

  // Validation finale mot de passe
  const finalErrors: ValidationErrors = {};
  Object.keys(passwordData).forEach(key => {
    const error = this.validatePasswordField(key, passwordData[key as keyof PasswordData] || '', passwordData);
    if (error) {
      finalErrors[key as keyof ValidationErrors] = error;
    }
  });

  if (Object.keys(finalErrors).length > 0) {
    throw new Error('Veuillez corriger les erreurs dans le formulaire');
  }

  try {
    const response = await fetch(`${this.VITE_API_URL}/api/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
        // Le backend attend seulement ces deux champs
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la mise à jour du mot de passe');
    }

  } catch (error: any) {
    console.error('❌ Erreur mise à jour mot de passe:', error);
    
    let errorMessage = 'Erreur lors de la mise à jour du mot de passe';
    
    if (error.message.includes('Mot de passe actuel incorrect') || error.message.includes('Le mot de passe actuel est incorrect')) {
      throw new Error('Le mot de passe actuel est incorrect');
    } else {
      throw new Error(error.message || errorMessage);
    }
  }
}

// Mise à jour de la validation avant soumission
validateProfileBeforeSubmit(profileData: UserProfileData): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};
  
  // Validation email
  if (profileData.email && profileData.email.trim()) {
    const emailError = this.validateProfileField('email', profileData.email);
    if (emailError) errors.email = emailError;
  }
  
  // Validation téléphone
  if (profileData.telephone && profileData.telephone.trim()) {
    const telephoneError = this.validateProfileField('telephone', profileData.telephone);
    if (telephoneError) errors.telephone = telephoneError;
  }
  
  // Vérification qu'au moins un champ modifiable est rempli (cohérence backend)
  const hasModifiableData = profileData.email?.trim() || profileData.telephone?.trim();
  if (!hasModifiableData) {
    errors.email = 'Au moins un champ (email ou téléphone) doit être rempli';
    errors.telephone = 'Au moins un champ (email ou téléphone) doit être rempli';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

  // Validation du mot de passe avant soumission
  validatePasswordBeforeSubmit(passwordData: PasswordData): { isValid: boolean; errors: ValidationErrors } {
    const errors: ValidationErrors = {};
    
    Object.keys(passwordData).forEach(key => {
      const error = this.validatePasswordField(key, passwordData[key as keyof PasswordData] || '', passwordData);
      if (error) {
        errors[key as keyof ValidationErrors] = error;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export const userProfileApi = new UserProfileApiService();