import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const RequireAdmin: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Debug pour voir l'état de l'authentification
    console.log('RequireAdmin - État:', { 
      isLoading, 
      isAuthenticated,
    });
  }, [isLoading, isAuthenticated]);

  // Afficher le loading seulement pendant le chargement initial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sky-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  // Vérification stricte après le chargement
  if (!isAuthenticated || !user || user.role !== 'admin' || !user.isActive) {
    console.log('RequireAdmin - Accès refusé:', { 
      isAuthenticated,
    });
    
    // Afficher un message d'erreur seulement si l'utilisateur est connecté mais pas admin
    if (isAuthenticated && user && (user.role !== 'admin' || !user.isActive)) {
      toast.error('Accès réservé aux administrateurs actifs');
    }
    
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAdmin;