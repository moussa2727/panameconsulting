import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import {
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Users,
  User,
  Calendar,
  FileText,
  Settings,
} from 'lucide-react';

const AdminSidebar: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      name: 'Procédures',
      path: '/gestionnaire/procedures',
      icon: <FileText className='w-5 h-5' />,
    },
    {
      name: 'Hero Section',
      path: '/gestionnaire/hero',
      icon: <Image className='w-5 h-5' />,
    },
    {
      name: 'Mon Profil',
      path: '/gestionnaire/profil',
      icon: <User className='w-5 h-5' />,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Ne rien afficher si pas admin - la protection est gérée par RequireAdmin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className='min-h-screen bg-sky-50 text-gray-900'>
      {/* Sidebar */}
      <div className='w-64 bg-white h-screen fixed left-0 top-0 z-40 shadow-lg border-r border-sky-100'>
        {/* Logo */}
        <div className='p-2 border-b border-sky-200 bg-sky-500'>
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
        <nav className='mt-3'>
          <div className='px-4'>
            <ul className='space-y-2'>
              {menuItems.map(item => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-sky-100 hover:text-sky-600'
                    }`}
                  >
                    {item.icon}
                    <span className='font-medium'>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Déconnexion */}
        <div className='absolute bottom-6 left-0 right-0 px-4'>
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
      <div className='ml-64'>
        {/* Header mobile */}
        <div className='lg:hidden bg-white shadow-sm border-b border-sky-200 px-4 py-3'>
          <div className='flex items-center justify-between'>
            <h1 className='text-lg font-semibold text-gray-900'>
              Administration
            </h1>
            <button
              onClick={handleLogout}
              className='text-gray-600 hover:text-red-600'
            >
              <LogOut className='w-5 h-5' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;