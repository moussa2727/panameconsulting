import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import {
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Users,
  User,
  Calendar,
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOutIcon
} from 'lucide-react';

interface AdminSidebarProps {
  children: React.ReactNode;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ children }) => {
  const { logout, user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLogoutAllOpen, setIsLogoutAllOpen] = useState(false);

  // Détection de la taille d'écran
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const menuItems = [
    {
      name: 'Tableau de bord',
      path: '/gestionnaire',
      icon: <LayoutDashboard className='w-5 h-5' />,
    },
    {
      name: 'Utilisateurs',
      path: '/gestionnaire/utilisateurs',
      icon: <Users className='w-5 h-5' />,
    },
    {
      name: 'Messages',
      path: '/gestionnaire/messages',
      icon: <MessageSquare className='w-5 h-5' />,
    },
    {
      name: 'Rendez-vous',
      path: '/gestionnaire/rendez-vous',
      icon: <Calendar className='w-5 h-5' />,
    },
    {
      name: 'Procédures',
      path: '/gestionnaire/procedures',
      icon: <FileText className='w-5 h-5' />,
    },
    {
      name: 'Destinations',
      path: '/gestionnaire/destinations',
      icon: <MapPin className='w-5 h-5' />,
    },
    {
      name: 'Mon Profil',
      path: '/gestionnaire/profil',
      icon: <User className='w-5 h-5' />,
    },
  ];

  // Fonction pour obtenir le nom d'affichage sécurisé selon AuthContext
  const getDisplayName = (): string => {
    if (!user) return 'Administrateur';
    
    // Utilise firstName et lastName comme défini dans AuthContext
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    // Fallback sur firstName seul
    if (user.firstName) return user.firstName;
    
    // Fallback sur email
    if (user.email) return user.email.split('@')[0];
    
    return 'Administrateur';
  };

  // Fonction pour obtenir l'initiale du nom
  const getNameInitial = (): string => {
    const displayName = getDisplayName();
    return displayName.charAt(0).toUpperCase();
  };

  // Déconnexion simple - session actuelle uniquement
  const handleLogout = () => {
    logout('/connexion', false); // redirectPath, silent=false (déconnexion normale)
  };

  // Déconnexion de toutes les sessions
  const handleLogoutAll = async () => {
    try {
      // Appel API pour déconnecter toutes les sessions
      const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${VITE_API_URL}/api/auth/logout-all`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion globale:', error);
    } finally {
      // Déconnexion côté client de toute façon
      logout('/connexion', false);
      setIsLogoutAllOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  // Ne rien afficher si pas admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
      {/* Version Desktop - Sidebar */}
      <div className='hidden lg:flex min-h-screen bg-slate-50'>
        {/* Sidebar */}
        <div 
          className={`bg-white h-screen fixed left-0 top-0 z-40 shadow-xl border-r border-slate-200/60 flex flex-col transition-all duration-300 ${
            isCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* En-tête avec bouton de réduction */}
          <div className='p-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-sky-500'>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!isCollapsed && (
                <div className='flex items-center space-x-3'>
                  
                  <div>
                    <h1 className='text-lg font-bold text-white'>Tableau de bord</h1>
                    <p className='text-xs text-blue-100'>Gestionnaire</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={toggleSidebar}
                className='p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent'
              >
                {isCollapsed ? (
                  <ChevronRight className='w-4 h-4 text-white' />
                ) : (
                  <ChevronLeft className='w-4 h-4 text-white' />
                )}
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className='flex-1 overflow-y-auto py-6'>
            <div className='px-3'>
              <ul className='space-y-2'>
                {menuItems.map(item => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center rounded-xl transition-all duration-200 group ${
                        isCollapsed ? 'justify-center px-3 py-4' : 'space-x-4 px-4 py-3'
                      } ${
                        isActivePath(item.path)
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      } focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent`}
                    >
                      <div className={`${isActivePath(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        {item.icon}
                      </div>
                      {!isCollapsed && (
                        <span className='font-medium'>{item.name}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Section utilisateur et déconnexion */}
          <div className='p-4 border-t border-slate-200 space-y-3'>
            {!isCollapsed && (
              <div className='flex items-center space-x-3 px-3 py-2 text-slate-600'>
                <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                  {getNameInitial()}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-slate-800 truncate'>{getDisplayName()}</p>
                  <p className='text-xs text-slate-500'>Administrateur</p>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className='flex justify-center'>
                <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                  {getNameInitial()}
                </div>
              </div>
            )}
            
            {/* Boutons de déconnexion */}
            <div className={`space-y-2 ${isCollapsed ? 'px-0' : 'px-1'}`}>
              {/* Déconnexion simple */}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center rounded-xl transition-colors duration-200 border border-slate-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus:ring-0 focus:outline-none focus:border-orange-300 ${
                  isCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-4 py-3'
                }`}
              >
                <LogOut className='w-4 h-4' />
                {!isCollapsed && <span className='font-medium text-sm'>Déconnexion</span>}
              </button>

              {/* Déconnexion de toutes les sessions */}
              <button
                onClick={() => setIsLogoutAllOpen(true)}
                className={`w-full flex items-center rounded-xl transition-colors duration-200 border border-slate-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:ring-0 focus:outline-none focus:border-red-300 ${
                  isCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-4 py-3'
                }`}
              >
                <LogOutIcon className='w-4 h-4' />
                {!isCollapsed && <span className='font-medium text-sm'>Déconnecter tous</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Contenu principal avec marge adaptative */}
        <div className={`flex-1 transition-all duration-300 ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          {children}
        </div>
      </div>

      {/* Version Mobile */}
      <div className='lg:hidden min-h-screen bg-slate-50'>
        {/* Header Mobile */}
        <header className='bg-white shadow-lg border-b border-slate-200/60 sticky top-0 z-50 backdrop-blur-sm bg-white/95'>
          <div className='px-4 sm:px-6'>
            <div className='flex justify-between items-center h-16'>
              {/* Logo et Titre */}
              <div className='flex items-center space-x-3'>
               
                <div>
                  <h1 className='text-lg font-bold text-slate-800'>Tableau de bord</h1>
                  <p className='text-xs text-slate-500'>Gestionnaire</p>
                </div>
              </div>

              {/* Boutons côté droit */}
              <div className='flex items-center space-x-3'>
                {/* Profil utilisateur */}
                <div className='hidden sm:flex items-center space-x-2 px-3 py-2 text-slate-600'>
                  <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                    {getNameInitial()}
                  </div>
                  <span className='text-sm font-medium text-slate-700 max-w-24 truncate'>
                    {getDisplayName()}
                  </span>
                </div>

                {/* Menu Mobile Toggle */}
                <button
                  onClick={toggleMobileMenu}
                  className='p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent'
                  aria-label='Menu'
                >
                  {isMobileMenuOpen ? (
                    <X className='w-6 h-6' />
                  ) : (
                    <Menu className='w-6 h-6' />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Menu Mobile déroulant */}
          {isMobileMenuOpen && (
            <div className='bg-white border-t border-slate-200/60 shadow-xl absolute top-16 left-0 right-0 z-50 backdrop-blur-sm bg-white/95'>
              <div className='px-4 py-4 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto'>
                {/* En-tête profil mobile */}
                <div className='flex items-center space-x-3 px-4 py-3 mb-2 bg-slate-50 rounded-xl'>
                  <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
                    {getNameInitial()}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-slate-800 truncate'>{getDisplayName()}</p>
                    <p className='text-xs text-slate-500'>Administrateur</p>
                  </div>
                </div>

                {/* Navigation */}
                {menuItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActivePath(item.path)
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    } focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent`}
                  >
                    <div className={`${isActivePath(item.path) ? 'text-white' : 'text-slate-500'}`}>
                      {item.icon}
                    </div>
                    <span className='font-medium'>{item.name}</span>
                  </Link>
                ))}
                
                {/* Séparateur */}
                <div className='border-t border-slate-200 my-2'></div>
                
                {/* Boutons de déconnexion Mobile */}
                <div className='space-y-2'>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className='flex items-center space-x-4 w-full px-4 py-3 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors duration-200 border border-slate-300 hover:border-orange-300 focus:ring-0 focus:outline-none focus:border-orange-300'
                  >
                    <LogOut className='w-5 h-5' />
                    <span className='font-medium'>Déconnexion</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsLogoutAllOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className='flex items-center space-x-4 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors duration-200 border border-slate-300 hover:border-red-300 focus:ring-0 focus:outline-none focus:border-red-300'
                  >
                    <LogOutIcon className='w-5 h-5' />
                    <span className='font-medium'>Déconnecter tous</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Overlay pour fermer le menu mobile */}
        {isMobileMenuOpen && (
          <div 
            className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Contenu principal mobile */}
        <div className='p-4 sm:p-6'>
          {children}
        </div>
      </div>

      {/* Modal de confirmation déconnexion globale */}
      {isLogoutAllOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Déconnexion globale</h2>
              <button
                onClick={() => setIsLogoutAllOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300 border border-transparent"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-600 text-center mb-2">
                Êtes-vous sûr de vouloir vous déconnecter de toutes les sessions ?
              </p>
              <p className="text-sm text-slate-500 text-center">
                Cette action vous déconnectera de tous les appareils où vous êtes connecté.
              </p>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setIsLogoutAllOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-sky-300"
              >
                Annuler
              </button>
              <button
                onClick={handleLogoutAll}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 focus:ring-0 focus:outline-none focus:border-red-300 border border-transparent"
              >
                Déconnecter tous
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;