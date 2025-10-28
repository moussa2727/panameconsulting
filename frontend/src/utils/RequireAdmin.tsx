import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const RequireAdmin: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // On attend que le chargement soit terminé
  if (isLoading || typeof user === 'undefined') {
    return (
      <div className="min-h-screen flex items-center justify-center text-sky-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  // Vérification après le chargement
   if (!user || user.role !== 'admin' || !user.isActive) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAdmin;