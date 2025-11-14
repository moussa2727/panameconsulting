import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

interface RequireAdminProps {
  children: React.ReactNode;
}

/**
 * Composant de protection de route pour les administrateurs
 * Redirige vers la page de connexion si non authentifié
 * Redirige vers l'accueil si non administrateur
 */
const RequireAdmin = ({ children }: RequireAdminProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Affichage du loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Redirection si non authentifié
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/connexion" 
        replace 
        state={{ 
          from: location.pathname,
          message: 'Veuillez vous connecter pour accéder à cette page'
        }} 
      />
    );
  }

  // Vérification des droits administrateur
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;
  
  // Redirection si non administrateur
  if (!isAdmin) {
    return (
      <Navigate 
        to="/" 
        replace 
        state={{ 
          error: 'Accès non autorisé. Droits administrateur requis.',
          from: location.pathname
        }} 
      />
    );
  }

  // Rendu des enfants si tout est valide
  return <>{children}</>;
};

export default RequireAdmin;