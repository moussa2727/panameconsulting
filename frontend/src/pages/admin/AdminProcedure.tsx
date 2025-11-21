// AdminProcedure.tsx - VERSION FINALE CORRIGÉE
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import RequireAdmin from '../../context/RequireAdmin';
import { toast } from 'react-toastify';
import { 
  useAdminProcedureApi, 
  Procedure, 
  Step, 
  StepStatus, 
  ProcedureStatus,
  StepName 
} from '../../api/admin/AdminProcedureService';

const AdminProcedures = () => {
  const { user, logout } = useAuth();
  const {
    fetchProcedures,
    updateProcedureStatus,
    updateStepStatus,
    deleteProcedure: deleteProcedureApi,
  } = useAdminProcedureApi();

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatutProcedure, setSelectedStatutProcedure] = useState<string>('tous');
  const [selectedStatutEtape, setSelectedStatutEtape] = useState<string>('toutes');
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProcedures, setTotalProcedures] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Charger les procédures
  const loadProcedures = async (page: number = 1, limit: number = 50) => {
    try {
      setIsLoading(true);
      setIsRefreshing(true);
      const response = await fetchProcedures(page, limit);
      
      setProcedures(response.data);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      setTotalProcedures(response.total);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement procédures');
      
      if (error.message.includes('Session expirée')) {
        logout();
        return;
      }
      
      toast.error('Erreur lors du chargement des procédures');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ VALIDATION: Vérifier si une étape peut être modifiée
  const canUpdateStep = (procedure: Procedure, stepName: StepName, newStatus: StepStatus): { canUpdate: boolean; reason?: string } => {
    const stepIndex = procedure.steps.findIndex(step => step.nom === stepName);
    const demandeAdmission = procedure.steps.find(step => step.nom === StepName.DEMANDE_ADMISSION);
    
    // ✅ BLOCAGE: Demande Visa ne peut pas être modifiée si Admission n'est pas terminée
    if (stepName === StepName.DEMANDE_VISA) {
      if (!demandeAdmission || demandeAdmission.statut !== StepStatus.COMPLETED) {
        return { 
          canUpdate: false, 
          reason: 'La demande d\'admission doit être terminée avant de modifier la demande de visa' 
        };
      }
    }
    
    // ✅ BLOCAGE: Préparatif Voyage ne peut pas être modifiée si Visa n'est pas terminée
    if (stepName === StepName.PREPARATIF_VOYAGE) {
      const demandeVisa = procedure.steps.find(step => step.nom === StepName.DEMANDE_VISA);
      if (!demandeVisa || demandeVisa.statut !== StepStatus.COMPLETED) {
        return { 
          canUpdate: false, 
          reason: 'La demande de visa doit être terminée avant de modifier les préparatifs de voyage' 
        };
      }
    }

    return { canUpdate: true };
  };

  // ✅ Gestion cohérente des statuts avec validation
  const handleUpdateProcedureStatus = async (procedureId: string, newStatus: ProcedureStatus) => {
    try {
      const procedure = procedures.find(p => p._id === procedureId);
      if (!procedure) return;

      let updatedProcedure: Procedure;

      if (newStatus === ProcedureStatus.CANCELLED) {
        // Annulation : toutes les étapes non-terminées deviennent "Annulé"
        for (const step of procedure.steps) {
          if (step.statut !== StepStatus.COMPLETED && step.statut !== StepStatus.CANCELLED) {
            await updateStepStatus(procedureId, step.nom, StepStatus.CANCELLED);
          }
        }
        updatedProcedure = await updateProcedureStatus(procedureId, newStatus);
      } else if (newStatus === ProcedureStatus.REJECTED) {
        // Refus : toutes les étapes non-terminées deviennent "Rejeté"
        for (const step of procedure.steps) {
          if (step.statut !== StepStatus.COMPLETED && step.statut !== StepStatus.REJECTED) {
            await updateStepStatus(procedureId, step.nom, StepStatus.REJECTED, rejectReason || 'Procédure refusée');
          }
        }
        updatedProcedure = await updateProcedureStatus(procedureId, newStatus);
      } else {
        // Autres statuts : mise à jour simple
        updatedProcedure = await updateProcedureStatus(procedureId, newStatus);
      }

      // Mettre à jour l'état local
      setProcedures(prev => prev.map(p => 
        p._id === procedureId ? updatedProcedure : p
      ));
      
      if (selectedProcedure?._id === procedureId) {
        setSelectedProcedure(updatedProcedure);
      }

      toast.success('Statut de la procédure mis à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour procédure');
      toast.error(error.message || 'Erreur lors de la mise à jour du statut de la procédure');
    }
  };

  // ✅ Mise à jour d'étape avec validation stricte
  const handleUpdateStepStatus = async (
    procedureId: string, 
    stepName: StepName, 
    newStatus: StepStatus,
    raisonRefus?: string
  ) => {
    try {
      const procedure = procedures.find(p => p._id === procedureId);
      if (!procedure) return;

      // ✅ VALIDATION: Vérifier les règles métier
      const validation = canUpdateStep(procedure, stepName, newStatus);
      if (!validation.canUpdate) {
        toast.error(validation.reason);
        return;
      }

      // Validation pour le rejet
      if (newStatus === StepStatus.REJECTED && !raisonRefus) {
        // Pour le rejet, ouvrir le modal pour la raison
        setShowRejectModal(true);
        setProcedureToDelete(procedure);
        return;
      }

      const updatedProcedure = await updateStepStatus(procedureId, stepName, newStatus, raisonRefus);
      
      // Mettre à jour l'état local
      setProcedures(prev => prev.map(p => 
        p._id === procedureId ? updatedProcedure : p
      ));
      
      if (selectedProcedure?._id === procedureId) {
        setSelectedProcedure(updatedProcedure);
      }

      toast.success('Étape mise à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour étape');
      toast.error(error.message || 'Erreur lors de la mise à jour de l\'étape');
    }
  };

  // Confirmer le rejet avec raison
  const handleConfirmReject = async () => {
    if (!procedureToDelete || !rejectReason.trim()) {
      toast.error('Veuillez saisir une raison pour le rejet');
      return;
    }

    try {
      // Trouver l'étape à rejeter (première étape en attente ou en cours)
      const stepToReject = procedureToDelete.steps.find(step => 
        step.statut === StepStatus.PENDING || step.statut === StepStatus.IN_PROGRESS
      );

      if (stepToReject) {
        await handleUpdateStepStatus(
          procedureToDelete._id, 
          stepToReject.nom, 
          StepStatus.REJECTED, 
          rejectReason
        );
      } else {
        // Si aucune étape en cours, rejeter la procédure complète
        await handleUpdateProcedureStatus(procedureToDelete._id, ProcedureStatus.REJECTED);
      }

      setShowRejectModal(false);
      setRejectReason('');
      setProcedureToDelete(null);
      toast.success('Étape rejetée avec succès');
    } catch (error: any) {
      console.error('❌ Erreur rejet étape');
      toast.error(error.message || 'Erreur lors du rejet de l\'étape');
    }
  };

  // Supprimer une procédure
  const handleDeleteProcedure = async () => {
    if (!procedureToDelete) return;

    try {
      await deleteProcedureApi(procedureToDelete._id);
      
      setProcedures(prev => prev.filter(p => p._id !== procedureToDelete._id));
      
      if (selectedProcedure?._id === procedureToDelete._id) {
        setSelectedProcedure(null);
      }

      setShowDeleteModal(false);
      setProcedureToDelete(null);
      toast.success('Procédure supprimée avec succès');
    } catch (error: any) {
      console.error('❌ Erreur suppression');
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Filtrer les procédures
  const filteredProcedures = procedures.filter(proc => {
    const matchesSearch = 
      proc.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proc.destination.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatutProc = selectedStatutProcedure === 'tous' || proc.statut === selectedStatutProcedure;
    
    const matchesStatutEtape = selectedStatutEtape === 'toutes' || 
      proc.steps.some(step => step.statut === selectedStatutEtape);

    return matchesSearch && matchesStatutProc && matchesStatutEtape;
  });

  // ✅ Couleurs alignées avec les enums backend
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case StepStatus.IN_PROGRESS:
      case ProcedureStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case StepStatus.COMPLETED:
      case ProcedureStatus.COMPLETED:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case StepStatus.PENDING:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case StepStatus.CANCELLED:
      case ProcedureStatus.CANCELLED:
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case StepStatus.REJECTED:
      case ProcedureStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // ✅ Noms complets des étapes avec espaces
  const getStepDisplayName = (stepName: StepName) => {
    const stepNames: { [key: string]: string } = {
      [StepName.DEMANDE_ADMISSION]: 'Demande d\'admission',
      [StepName.DEMANDE_VISA]: 'Demande de visa',
      [StepName.PREPARATIF_VOYAGE]: 'Préparatifs de voyage'
    };
    return stepNames[stepName] || stepName;
  };

  // ✅ Utilisation des valeurs d'enum
  const statutsProcedure = ['tous', ...Object.values(ProcedureStatus)];
  const statutsEtape = ['toutes', ...Object.values(StepStatus)];

  // Chargement initial
  useEffect(() => {
    if (user) {
      loadProcedures(1, 50);
    }
  }, [user]);

  // Composant de carte de procédure pour la vue grid
  const ProcedureCard = ({ procedure }: { procedure: Procedure }) => (
    <div 
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={() => setSelectedProcedure(procedure)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-sm truncate">
            {procedure.prenom} {procedure.nom}
          </h3>
          <p className="text-slate-600 text-xs truncate">{procedure.email}</p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getStatutColor(procedure.statut)}`}>
          {procedure.statut}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-700 font-semibold bg-slate-100 px-2 py-1 rounded">
            {procedure.destination}
          </span>
          <span className="text-slate-400">
            {new Date(procedure.createdAt).toLocaleDateString('fr-FR')}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {procedure.steps.map((step) => (
            <div key={step.nom} className="flex items-center gap-1">
              <span className="text-slate-500 text-xs">
                {getStepDisplayName(step.nom)}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${getStatutColor(step.statut)}`}>
                {step.statut}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        {/* Header principal */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                Gestion des Procédures
              </h1>
              <p className="text-slate-600 text-sm">
                {user ? `Connecté en tant que ${user.email}` : 'Chargement...'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Toggle View Mode */}
              <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-list"></i>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <i className="fas fa-th"></i>
                </button>
              </div>

              <button 
                onClick={() => loadProcedures(1, 50)}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cartes de statistiques */}
        {!isLoading && procedures.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-slate-800">{totalProcedures}</div>
              <div className="text-slate-500 text-sm">Total</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {procedures.filter(p => p.statut === ProcedureStatus.IN_PROGRESS).length}
              </div>
              <div className="text-blue-500 text-sm">En cours</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-600">
                {procedures.filter(p => p.statut === ProcedureStatus.COMPLETED).length}
              </div>
              <div className="text-emerald-500 text-sm">Terminées</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {procedures.filter(p => p.statut === ProcedureStatus.CANCELLED || p.statut === ProcedureStatus.REJECTED).length}
              </div>
              <div className="text-red-500 text-sm">Annulées/Refusées</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Panneau de liste des procédures */}
          <div className={`${selectedProcedure ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Barre de recherche et filtres */}
              <div className="p-4 border-b border-slate-200">
                <div className="relative mb-4">
                  <input 
                    type="text" 
                    placeholder="Rechercher une procédure..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                </div>

                {/* Filtres */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">Statut procédure</label>
                    <div className="flex flex-wrap gap-2">
                      {statutsProcedure.map(statut => (
                        <button
                          key={statut}
                          onClick={() => setSelectedStatutProcedure(statut)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedStatutProcedure === statut
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {statut === 'tous' ? 'Toutes' : statut}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600 mb-2 block">Statut étape</label>
                    <div className="flex flex-wrap gap-2">
                      {statutsEtape.map(statut => (
                        <button
                          key={statut}
                          onClick={() => setSelectedStatutEtape(statut)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedStatutEtape === statut
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {statut === 'toutes' ? 'Toutes' : statut}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Résultats du filtrage */}
                <div className="mt-3 text-sm text-slate-500 font-medium">
                  {filteredProcedures.length} procédure{filteredProcedures.length > 1 ? 's' : ''} trouvée{filteredProcedures.length > 1 ? 's' : ''}
                </div>
              </div>

              {/* Liste des procédures */}
              <div className="max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-500">Chargement des procédures...</p>
                  </div>
                ) : filteredProcedures.length > 0 ? (
                  viewMode === 'list' ? (
                    // Vue liste
                    <div className="divide-y divide-slate-200">
                      {filteredProcedures.map(proc => (
                        <div
                          key={proc._id}
                          className={`p-4 transition-all duration-300 cursor-pointer hover:bg-slate-50 ${
                            selectedProcedure?._id === proc._id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                          }`}
                          onClick={() => setSelectedProcedure(proc)}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-800 truncate">
                                {proc.prenom} {proc.nom}
                              </h3>
                              <p className="text-slate-600 text-sm truncate">{proc.email}</p>
                            </div>
                            <span className="text-slate-400 text-xs whitespace-nowrap">
                              {new Date(proc.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-slate-700 text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
                                {proc.destination}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatutColor(proc.statut)}`}>
                                {proc.statut}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {proc.steps.map((step) => (
                                <div key={step.nom} className="flex items-center gap-1">
                                  <span className="text-slate-500 text-xs">
                                    {getStepDisplayName(step.nom)}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${getStatutColor(step.statut)}`}>
                                    {step.statut}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Vue grid
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                      {filteredProcedures.map(proc => (
                        <ProcedureCard key={proc._id} procedure={proc} />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-folder-open text-slate-400"></i>
                    </div>
                    <p className="text-slate-500 font-medium mb-2">Aucune procédure trouvée</p>
                    <p className="text-slate-400 text-sm">Essayez de modifier vos critères de recherche</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panneau de détails */}
          {selectedProcedure && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-slate-800 mb-1">
                        {selectedProcedure.prenom} {selectedProcedure.nom}
                      </h2>
                      <p className="text-slate-600 text-sm">{selectedProcedure.email}</p>
                      {selectedProcedure.telephone && (
                        <p className="text-slate-500 text-xs">📱 {selectedProcedure.telephone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedProcedure(null)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all rounded-lg hover:bg-white"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <p className="text-slate-500 mb-1 text-xs">Destination</p>
                      <p className="font-bold text-slate-800">{selectedProcedure.destination}</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <p className="text-slate-500 mb-1 text-xs">Date création</p>
                      <p className="font-bold text-slate-800">
                        {new Date(selectedProcedure.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {selectedProcedure.niveauEtude && (
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-slate-500 mb-1 text-xs">Niveau d'étude</p>
                        <p className="font-bold text-slate-800">{selectedProcedure.niveauEtude}</p>
                      </div>
                    )}
                    {selectedProcedure.filiere && (
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="text-slate-500 mb-1 text-xs">Filière</p>
                        <p className="font-bold text-slate-800">{selectedProcedure.filiere}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contenu détaillé */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {/* Statut de la procédure */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Statut de la Procédure</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(ProcedureStatus).map(statut => (
                        <button
                          key={statut}
                          onClick={() => handleUpdateProcedureStatus(selectedProcedure._id, statut)}
                          className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                            selectedProcedure.statut === statut
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {statut}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gestion des étapes avec validation stricte */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Gestion des Étapes</h3>
                    <div className="space-y-3">
                      {selectedProcedure.steps.map((step) => {
                        const demandeAdmission = selectedProcedure.steps.find(s => s.nom === StepName.DEMANDE_ADMISSION);
                        
                        return (
                          <div key={step.nom} className="bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-800 text-sm">
                                {getStepDisplayName(step.nom)}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatutColor(step.statut)}`}>
                                {step.statut}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mb-2">
                              {Object.values(StepStatus).map(statut => {
                                const validation = canUpdateStep(selectedProcedure, step.nom, statut);
                                const isCurrentStatus = step.statut === statut;
                                const isDisabled = !validation.canUpdate && !isCurrentStatus;

                                return (
                                  <button
                                    key={statut}
                                    onClick={() => {
                                      if (!isDisabled) {
                                        if (statut === StepStatus.REJECTED) {
                                          setShowRejectModal(true);
                                          setProcedureToDelete(selectedProcedure);
                                        } else {
                                          handleUpdateStepStatus(
                                            selectedProcedure._id, 
                                            step.nom, 
                                            statut
                                          );
                                        }
                                      }
                                    }}
                                    disabled={isDisabled}
                                    title={isDisabled ? validation.reason : ''}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                      isCurrentStatus
                                        ? 'bg-blue-500 text-white'
                                        : isDisabled
                                        ? 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {statut}
                                  </button>
                                );
                              })}
                            </div>

                            {step.raisonRefus && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-red-700 text-xs font-semibold">Raison du refus:</p>
                                <p className="text-red-600 text-xs mt-1">{step.raisonRefus}</p>
                              </div>
                            )}
                            
                            <div className="text-xs text-slate-400 mt-2">
                              Dernière modification: {new Date(step.dateMaj).toLocaleString('fr-FR')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Raison du rejet global */}
                  {selectedProcedure.raisonRejet && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <h3 className="text-sm font-semibold text-red-700 mb-1">RAISON DU REJET</h3>
                      <p className="text-red-600 text-sm">{selectedProcedure.raisonRejet}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button 
                      onClick={() => {
                        setShowRejectModal(true);
                        setProcedureToDelete(selectedProcedure);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-all font-medium flex items-center justify-center gap-2 text-sm"
                    >
                      <i className="fas fa-times-circle"></i>
                      Rejeter
                    </button>
                    <button 
                      onClick={() => {
                        setProcedureToDelete(selectedProcedure);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 transition-all font-medium flex items-center justify-center gap-2 text-sm"
                    >
                      <i className="fas fa-trash"></i>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-500"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">
                Confirmer la suppression
              </h3>
              <p className="text-slate-600 mb-6 text-center text-sm">
                Êtes-vous sûr de vouloir supprimer la procédure de <strong>{procedureToDelete?.prenom} {procedureToDelete?.nom}</strong> ?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteProcedure}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-all font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de rejet */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-times-circle text-red-500"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">
                Raison du rejet
              </h3>
              <p className="text-slate-600 mb-4 text-center text-sm">
                Veuillez saisir la raison du rejet :
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Saisissez la raison du rejet..."
                className="w-full p-3 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                rows={3}
              />
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setProcedureToDelete(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-all font-medium"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAdmin>
  );
};

export default AdminProcedures;