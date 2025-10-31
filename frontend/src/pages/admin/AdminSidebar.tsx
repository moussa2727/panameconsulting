import React, { useState } from 'react';
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
  Settings,
  Menu,
  X,
  ChevronDown,
  Folder
} from 'lucide-react';

interface AdminSidebarProps {
  children: React.ReactNode;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const menuItems = [
    {
      name: 'Statistiques',
      path: '/gestionnaire/statistiques',
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
      name: 'Destinations',
      path: '/gestionnaire/destinations',
      icon: <MapPin className='w-5 h-5' />,
    },
    {
      name: 'Rendez-vous',
      path: '/gestionnaire/rendez-vous',
      icon: <Calendar className='w-5 h-5' />,
    },
    {
      name: 'Paramètres',
      path: '/gestionnaire/parametres',
      icon: <Folder className='w-5 h-5' />,
      submenu: [
        {
          name: 'Procédures',
          path: '/gestionnaire/procedures',
          icon: <FileText className='w-4 h-4' />,
        },
        {
          name: 'Mon Profil',
          path: '/gestionnaire/profil',
          icon: <User className='w-4 h-4' />,
        }
      ]
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleDropdown = (itemName: string) => {
    setActiveDropdown(activeDropdown === itemName ? null : itemName);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const isSubmenuActive = (submenu: any[]) => {
    return submenu.some(sub => isActivePath(sub.path));
  };

  // Ne rien afficher si pas admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
      {/* Version Desktop - Sidebar */}
      <div className='hidden lg:flex min-h-screen bg-sky-50 text-gray-900'>
        {/* Sidebar */}
        <div className='w-64 bg-white h-screen fixed left-0 top-0 z-40 shadow-lg border-r border-sky-100 flex flex-col'>
          {/* Logo */}
          <div className='p-4 border-b border-sky-200 bg-sky-500'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-white rounded-lg flex items-center justify-center'>
                <Link to="/">
                  <Settings className='w-6 h-6 text-sky-600' />
                </Link>
              </div>
              <div>
                <h1 className='text-lg font-bold text-white'>Administration</h1>
                <p className='text-xs text-sky-100'>Paname Consulting</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className='flex-1 overflow-y-auto py-4'>
            <div className='px-4'>
              <ul className='space-y-2'>
                {menuItems.map(item => (
                  <li key={item.path}>
                    {item.submenu ? (
                      <div className='relative'>
                        <button
                          onClick={() => toggleDropdown(item.name)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                            isSubmenuActive(item.submenu)
                              ? 'bg-sky-500 text-white shadow-md'
                              : 'text-gray-700 hover:bg-sky-100 hover:text-sky-600'
                          }`}
                        >
                          <div className='flex items-center space-x-3'>
                            {item.icon}
                            <span className='font-medium'>{item.name}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${
                            activeDropdown === item.name ? 'rotate-180' : ''
                          }`} />
                        </button>
                        
                        {/* Sous-menu */}
                        {activeDropdown === item.name && (
                          <div className='ml-4 mt-2 space-y-2'>
                            {item.submenu.map(subItem => (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => setActiveDropdown(null)}
                                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                                  isActivePath(subItem.path)
                                    ? 'bg-sky-100 text-sky-600'
                                    : 'text-gray-600 hover:bg-sky-50 hover:text-sky-600'
                                }`}
                              >
                                {subItem.icon}
                                <span className='font-medium text-sm'>{subItem.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={item.path}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          isActivePath(item.path)
                            ? 'bg-sky-500 text-white shadow-md'
                            : 'text-gray-700 hover:bg-sky-100 hover:text-sky-600'
                        }`}
                      >
                        {item.icon}
                        <span className='font-medium'>{item.name}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Déconnexion */}
          <div className='p-4 border-t border-sky-200'>
            <button
              onClick={handleLogout}
              className='w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-200'
            >
              <LogOut className='w-5 h-5' />
              <span className='font-medium'>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        <div className='ml-64 flex-1'>
          {children}
        </div>
      </div>

      {/* Version Mobile - Header */}
      <div className='lg:hidden min-h-screen bg-sky-50'>
        {/* Header Mobile */}
        <header className='bg-white shadow-lg border-b border-sky-200 sticky top-0 z-50'>
          <div className='px-4 sm:px-6'>
            <div className='flex justify-between items-center h-16'>
              {/* Logo et Titre */}
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center'>
                  <Settings className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h1 className='text-lg font-bold text-gray-900'>Administration</h1>
                  <p className='text-xs text-sky-600'>Paname Consulting</p>
                </div>
              </div>

              {/* Boutons côté droit */}
              <div className='flex items-center space-x-4'>
                {/* Déconnexion Desktop en mobile */}
                <button
                  onClick={handleLogout}
                  className='hidden sm:flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-200'
                >
                  <LogOut className='w-4 h-4' />
                  <span className='text-sm font-medium'>Déconnexion</span>
                </button>

                {/* Menu Mobile Toggle */}
                <button
                  onClick={toggleMobileMenu}
                  className='p-2 rounded-lg text-gray-600 hover:bg-sky-100 hover:text-sky-600 transition-colors'
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
            <div className='bg-white border-t border-sky-200 shadow-lg absolute top-16 left-0 right-0 z-50'>
              <div className='px-4 py-3 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto'>
                {menuItems.map(item => (
                  <div key={item.path}>
                    {item.submenu ? (
                      /* Dropdown Mobile */
                      <div>
                        <button
                          onClick={() => toggleDropdown(item.name)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                            isSubmenuActive(item.submenu)
                              ? 'bg-sky-500 text-white'
                              : 'text-gray-700 hover:bg-sky-100 hover:text-sky-600'
                          }`}
                        >
                          <div className='flex items-center space-x-3'>
                            {item.icon}
                            <span className='font-medium'>{item.name}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${
                            activeDropdown === item.name ? 'rotate-180' : ''
                          }`} />
                        </button>
                        
                        {/* Sous-menu Mobile */}
                        {activeDropdown === item.name && (
                          <div className='ml-8 mt-2 space-y-2'>
                            {item.submenu.map(subItem => (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setActiveDropdown(null);
                                }}
                                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                                  isActivePath(subItem.path)
                                    ? 'bg-sky-50 text-sky-600'
                                    : 'text-gray-600 hover:bg-sky-50 hover:text-sky-600'
                                }`}
                              >
                                {subItem.icon}
                                <span className='font-medium'>{subItem.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Lien simple Mobile */
                      <Link
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          isActivePath(item.path)
                            ? 'bg-sky-500 text-white'
                            : 'text-gray-700 hover:bg-sky-100 hover:text-sky-600'
                        }`}
                      >
                        {item.icon}
                        <span className='font-medium'>{item.name}</span>
                      </Link>
                    )}
                  </div>
                ))}
                
                {/* Déconnexion Mobile (visible seulement sur petits écrans) */}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className='flex items-center space-x-3 w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-200 sm:hidden'
                >
                  <LogOut className='w-5 h-5' />
                  <span className='font-medium'>Déconnexion</span>
                </button>
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
    </>
  );
};

export default AdminSidebar;