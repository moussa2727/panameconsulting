// AdminProcedures.tsx
import React, { useState, useEffect } from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAdminProcedureApi, Procedure, ProcedureStatus, StepStatus, StepName } from '../../api/admin/AdminProcedureService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const AdminProcedures: React.FC = () => {
  const { user } = useAuth();
  const {
    fetchProcedures,
    updateStepStatus,
    deleteProcedure,
    rejectProcedure,
    getProceduresOverview,
    createProcedureFromRendezvous
  } = useAdminProcedureApi();

  // États
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    email: '',
    destination: '',
    statut: '' as ProcedureStatus | ''
  });
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    procedureId: string | null;
    procedureName: string;
  }>({
    isOpen: false,
    procedureId: null,
    procedureName: ''
  });

  // Chargement initial
  useEffect(() => {
    loadProcedures();
    loadStats();
  }, [pagination.page, pagination.limit]);

  // Chargement des procédures
  const loadProcedures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchProcedures(
        pagination.page, 
        pagination.limit, 
        filters.email || undefined,
        filters.destination || undefined,
        filters.statut || undefined
      );
      
      setProcedures(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages
      }));
    } catch (err: any) {
      // Gestion spécifique des erreurs
      if (err.message.includes('401')) {
        setError('Session expirée - Veuillez vous reconnecter');
        toast.error('Session expirée');
      } else if (err.message.includes('403')) {
        setError('Accès non autorisé');
        toast.error('Droits insuffisants');
      } else {
        setError(err.message || 'Erreur lors du chargement des procédures');
        toast.error('Erreur lors du chargement des procédures');
      }
    } finally {
      setLoading(false);
    }
  };

  // Chargement des statistiques
  const loadStats = async () => {
    try {
      const overview = await getProceduresOverview();
      setStats(overview);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  // Mise à jour du statut d'une étape
  const handleUpdateStep = async (procedureId: string, stepName: StepName, newStatus: StepStatus, reason?: string) => {
    // Validation frontend
    if (newStatus === StepStatus.REJECTED && (!reason || reason.trim() === '')) {
      toast.error('La raison du rejet est obligatoire');
      return;
    }

    try {
      setActionLoading(`${procedureId}-${stepName}`);
      
      const updatedProcedure = await updateStepStatus(procedureId, stepName, newStatus, reason);
      
      // Mettre à jour la liste locale
      setProcedures(prev => 
        prev.map(p => p._id === procedureId ? updatedProcedure : p)
      );
      
      toast.success(`Étape ${stepName} mise à jour avec succès`);
      loadStats(); // Recharger les stats
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  // Gestion de la suppression
  const handleDeleteClick = (procedure: Procedure) => {
    setDeleteModal({
      isOpen: true,
      procedureId: procedure._id,
      procedureName: `${procedure.prenom} ${procedure.nom}`
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.procedureId) return;
    
    try {
      setActionLoading(`delete-${deleteModal.procedureId}`);
      await deleteProcedure(deleteModal.procedureId, 'Supprimé par administrateur');
      
      setProcedures(prev => prev.filter(p => p._id !== deleteModal.procedureId));
      toast.success('Procédure supprimée avec succès');
      loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
      setDeleteModal({ isOpen: false, procedureId: null, procedureName: '' });
    }
  };

  // Rejet d'une procédure
  const handleRejectProcedure = async () => {
    if (!selectedProcedure || !rejectReason.trim()) {
      toast.error('Veuillez fournir une raison pour le rejet');
      return;
    }

    try {
      setActionLoading(`reject-${selectedProcedure._id}`);
      await rejectProcedure(selectedProcedure._id, rejectReason);
      
      setProcedures(prev => 
        prev.map(p => p._id === selectedProcedure._id ? { ...p, statut: ProcedureStatus.REJECTED } : p)
      );
      
      toast.success('Procédure rejetée avec succès');
      setShowRejectModal(false);
      setRejectReason('');
      loadStats();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du rejet');
    } finally {
      setActionLoading(null);
    }
  };

  // Gestion des filtres
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadProcedures();
  };

  const resetFilters = () => {
    setFilters({ email: '', destination: '', statut: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Rendu du statut avec badge coloré
  const renderStatusBadge = (status: ProcedureStatus) => {
    const statusConfig = {
      [ProcedureStatus.IN_PROGRESS]: { color: 'bg-blue-100 text-blue-800', label: 'En cours' },
      [ProcedureStatus.COMPLETED]: { color: 'bg-green-100 text-green-800', label: 'Terminée' },
      [ProcedureStatus.REJECTED]: { color: 'bg-red-100 text-red-800', label: 'Refusée' },
      [ProcedureStatus.CANCELLED]: { color: 'bg-gray-100 text-gray-800', label: 'Annulée' }
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Rendu du statut d'étape
  const renderStepStatus = (status: StepStatus) => {
    const statusConfig = {
      [StepStatus.PENDING]: { color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
      [StepStatus.IN_PROGRESS]: { color: 'bg-blue-100 text-blue-800', icon: ClockIcon },
      [StepStatus.COMPLETED]: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      [StepStatus.REJECTED]: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      [StepStatus.CANCELLED]: { color: 'bg-gray-100 text-gray-800', icon: XCircleIcon }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  if (loading && procedures.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-blue-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-lg shadow"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-600 mb-2">
            Gestion des Procédures
          </h1>
          <p className="text-slate-600">
            Consultez et gérez toutes les procédures des étudiants
          </p>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="text-sm text-slate-600">Total</div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400">
              <div className="text-sm text-slate-600">En cours</div>
              <div className="text-2xl font-bold text-blue-500">
                {stats.byStatus?.find((s: any) => s._id === ProcedureStatus.IN_PROGRESS)?.count || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="text-sm text-slate-600">Terminées</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.byStatus?.find((s: any) => s._id === ProcedureStatus.COMPLETED)?.count || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="text-sm text-slate-600">Rejetées</div>
              <div className="text-2xl font-bold text-red-600">
                {stats.byStatus?.find((s: any) => s._id === ProcedureStatus.REJECTED)?.count || 0}
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-colors"
                placeholder="Filtrer par email..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Destination
              </label>
              <input
                type="text"
                value={filters.destination}
                onChange={(e) => handleFilterChange('destination', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-colors"
                placeholder="Filtrer par destination..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Statut
              </label>
              <select
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-none focus:border-blue-500 hover:border-blue-400 transition-colors"
              >
                <option value="">Tous les statuts</option>
                {Object.values(ProcedureStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={applyFilters}
                className="flex-1 bg-blue-600 text-white px-2 py-0.5 text-sm rounded-md hover:bg-blue-700 
                          focus:outline-none focus:ring-2 focus:ring-none focus:ring-offset-none transition-colors"
              >
                <MagnifyingGlassIcon className="w-3 h-3 inline mr-1" />
                Appliquer
              </button>

              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-none focus:ring-blue-500 focus:ring-offset-none transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des procédures */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Étudiant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Étapes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {procedures.map((procedure) => (
                  <tr key={procedure._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {procedure.prenom} {procedure.nom}
                        </div>
                        <div className="text-sm text-slate-500">{procedure.email}</div>
                        {procedure.telephone && (
                          <div className="text-sm text-slate-500">{procedure.telephone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{procedure.destination}</div>
                      {procedure.filiere && (
                        <div className="text-sm text-slate-500">{procedure.filiere}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {renderStatusBadge(procedure.statut)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {procedure.steps.map((step, index) => (
                          <div key={step.nom} className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 flex-1">
                              {step.nom.split('_').join(' ')}
                            </span>
                            <div className="ml-2">
                              {renderStepStatus(step.statut)}
                            </div>
                            {/* Actions rapides pour les étapes */}
                            <div className="ml-2 flex space-x-1">
                              {step.statut === StepStatus.IN_PROGRESS && (
                                <button
                                  onClick={() => handleUpdateStep(procedure._id, step.nom, StepStatus.COMPLETED)}
                                  disabled={actionLoading === `${procedure._id}-${step.nom}`}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Marquer comme terminé"
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                </button>
                              )}
                              {[StepStatus.PENDING, StepStatus.IN_PROGRESS].includes(step.statut) && (
                                <button
                                  onClick={() => {
                                    setSelectedProcedure(procedure);
                                    setShowRejectModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  title="Rejeter"
                                >
                                  <XCircleIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(procedure.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedProcedure(procedure);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Voir les détails"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(procedure)}
                          disabled={actionLoading === `delete-${procedure._id}`}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-200">
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-700">
                    Affichage de <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> à{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    sur <span className="font-medium">{pagination.total}</span> résultats
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <span className="px-3 py-1 text-sm text-slate-700">
                    Page {pagination.page} sur {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}

          {procedures.length === 0 && !loading && (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">Aucune procédure</h3>
              <p className="mt-1 text-sm text-slate-500">
                Aucune procédure ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détail */}
      {showDetailModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">
                Détails de la procédure - {selectedProcedure.prenom} {selectedProcedure.nom}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <p className="text-sm text-slate-900">{selectedProcedure.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Téléphone</label>
                  <p className="text-sm text-slate-900">{selectedProcedure.telephone || 'Non renseigné'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Destination</label>
                  <p className="text-sm text-slate-900">{selectedProcedure.destination}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Filière</label>
                  <p className="text-sm text-slate-900">{selectedProcedure.filiere || 'Non renseigné'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Étapes</label>
                <div className="space-y-2">
                  {selectedProcedure.steps.map((step) => (
                    <div key={step.nom} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-900">
                          {step.nom.split('_').join(' ')}
                        </div>
                        <div className="text-sm text-slate-600">
                          Dernière mise à jour: {new Date(step.dateMaj).toLocaleDateString('fr-FR')}
                        </div>
                        {step.raisonRefus && (
                          <div className="text-sm text-red-600 mt-1">
                            Raison: {step.raisonRefus}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {renderStepStatus(step.statut)}
                        <div className="flex space-x-1">
                          {step.statut === StepStatus.IN_PROGRESS && (
                            <button
                              onClick={() => {
                                handleUpdateStep(selectedProcedure._id, step.nom, StepStatus.COMPLETED);
                                setShowDetailModal(false);
                              }}
                              className="text-green-600 hover:text-green-800 p-1"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                          )}
                          {[StepStatus.PENDING, StepStatus.IN_PROGRESS].includes(step.statut) && (
                            <button
                              onClick={() => {
                                setShowDetailModal(false);
                                setShowRejectModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rejet */}
      {showRejectModal && selectedProcedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">
                Rejeter la procédure
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600 mb-4">
                Vous êtes sur le point de rejeter la procédure de {selectedProcedure.prenom} {selectedProcedure.nom}.
                Veuillez indiquer la raison du rejet.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Raison du rejet..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRejectProcedure}
                disabled={!rejectReason.trim() || actionLoading === `reject-${selectedProcedure._id}`}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === `reject-${selectedProcedure._id}` ? 'Rejet...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">
                Confirmer la suppression
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600">
                Êtes-vous sûr de vouloir supprimer la procédure de <strong>{deleteModal.procedureName}</strong> ?
                Cette action est irréversible.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, procedureId: null, procedureName: '' })}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading === `delete-${deleteModal.procedureId}`}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProcedures;