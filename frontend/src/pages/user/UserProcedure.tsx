// UserProcedure.tsx
import {
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Home,
  Play,
  XCircle,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';

interface Procedure {
  _id: string;
  prenom?: string;
  nom?: string;
  email?: string;
  destination?: string;
  statut?: 'En cours' | 'Refusée' | 'Annulée' | 'Terminée';
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const UserProcedure: React.FC = () => {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'En cours':
        return { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: <Play className='w-4 h-4' /> };
      case 'Terminée':
        return { label: 'Terminée', color: 'bg-green-100 text-green-800', icon: <CheckCircle className='w-4 h-4' /> };
      case 'Refusée':
        return { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: <XCircle className='w-4 h-4' /> };
      case 'Annulée':
        return { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: <XCircle className='w-4 h-4' /> };
      default:
        return { label: 'Inconnue', color: 'bg-gray-100 text-gray-800', icon: <Eye className='w-4 h-4' /> };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fetchProcedures = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/procedures/user/${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement de vos procédures');
      const data = await res.json();
      setProcedures(data.data ?? data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // Fonction supprimée - les utilisateurs ne peuvent plus annuler les procédures

  useEffect(() => {
    fetchProcedures();
  }, [user?.email]);

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Navigation utilisateur */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center text-sky-600 hover:text-sky-700 transition-colors">
                <Home className="w-5 h-5 mr-2" />
                <span>Accueil</span>
              </Link>
              <nav className="flex space-x-4">
                <Link to="/user-profile" className="flex items-center px-3 py-2 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <User className="w-4 h-4 mr-2" />
                  Mon Profil
                </Link>
                <Link to="/user-rendez-vous" className="flex items-center px-3 py-2 text-gray-600 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors">
                  <Calendar className="w-4 h-4 mr-2" />
                  Mes Rendez-vous
                </Link>
                <Link to="/user-procedure" className="flex items-center px-3 py-2 bg-sky-100 text-sky-700 rounded-md">
                  <FileText className="w-4 h-4 mr-2" />
                  Mes Procédures
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className='py-8'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900'>Mes Procédures</h1>
            <p className='text-gray-600 mt-2'>Consultez l'état de vos procédures en cours</p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center'>
                <div className='p-2 bg-blue-100 rounded-lg'>
                  <Play className='w-6 h-6 text-blue-600' />
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-600'>En cours</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {procedures.filter(p => p.statut === 'En cours').length}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center'>
                <div className='p-2 bg-green-100 rounded-lg'>
                  <CheckCircle className='w-6 h-6 text-green-600' />
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-600'>Terminées</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {procedures.filter(p => p.statut === 'Terminée').length}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center'>
                <div className='p-2 bg-red-100 rounded-lg'>
                  <XCircle className='w-6 h-6 text-red-600' />
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-600'>Annulées</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {procedures.filter(p => p.statut === 'Annulée').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
            <div className='px-6 py-4 border-b border-gray-200'>
              <h2 className='text-xl font-semibold text-gray-900'>
                Liste des procédures
              </h2>
              <p className='text-sm text-gray-600 mt-1'>
                Consultez l'état de vos procédures en cours
              </p>
            </div>

            {loading ? (
              <div className='p-8 text-center'>Chargement...</div>
            ) : procedures.length === 0 ? (
              <div className='p-8 text-center'>
                <FileText className='w-16 h-16 text-gray-300 mx-auto mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Aucune procédure
                </h3>
                <p className='text-gray-600 mb-6'>
                  Vous n'avez pas encore de procédures.
                </p>
              </div>
            ) : (
              <div className='divide-y divide-gray-200'>
                {procedures.map(procedure => {
                  const statusInfo = getStatusInfo(procedure.statut);
                  return (
                    <div key={procedure._id} className='p-6 hover:bg-gray-50 transition-colors'>
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center space-x-3 mb-2'>
                            <h3 className='text-lg font-medium text-gray-900'>
                              {procedure.destination || 'Procédure'}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.icon}
                              <span className='ml-1'>{statusInfo.label}</span>
                            </span>
                          </div>

                          <div className='flex items-center space-x-6 text-sm text-gray-500'>
                            <div className='flex items-center'>
                              <Calendar className='w-4 h-4 mr-1' />
                              <span>Créée le {formatDate(procedure.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className='text-sm text-gray-500'>Consultation uniquement</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProcedure;