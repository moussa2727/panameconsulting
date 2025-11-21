// AdminProcedure.tsx - VERSION MOBILE FIRST AVEC DESIGN MODERNE
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

// Icônes Lucide React
import {
  Search,
  Filter,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Trash2,
  Ban,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
  User,
  Calendar,
  GraduationCap,
  BookOpen,
  Plane,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const AdminProcedures = () => {
  const { user, logout } = useAuth();
  const {
    fetchProcedures,
    updateProcedureStatus,
    updateStepStatus,
    deleteProcedure: deleteProcedureApi,
    rejectProcedure
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
  const [showFilters, setShowFilters] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

const canUpdateStep = (procedure: Procedure, stepName: StepName, newStatus: StepStatus): { canUpdate: boolean; reason?: string } => {
  const step = procedure.steps.find(s => s.nom === stepName);
  if (!step) {
    return { canUpdate: false, reason: 'Étape non trouvée' };
  }

  // Ne pas permettre de modifier une étape déjà terminée/annulée/rejetée
  if ([StepStatus.COMPLETED, StepStatus.CANCELLED, StepStatus.REJECTED].includes(step.statut) && step.statut !== newStatus) {
    return { 
      canUpdate: false, 
      reason: `Impossible de modifier une étape ${step.statut.toLowerCase()}` 
    };
  }

  // Validation de l'ordre des étapes
  if (stepName === StepName.DEMANDE_VISA) {
    const admission = procedure.steps.find(s => s.nom === StepName.DEMANDE_ADMISSION);
    if (!admission || admission.statut !== StepStatus.COMPLETED) {
      return { 
        canUpdate: false, 
        reason: 'La demande d\'admission doit être terminée avant de modifier la demande de visa' 
      };
    }
  }
  
  if (stepName === StepName.PREPARATIF_VOYAGE) {
    const visa = procedure.steps.find(s => s.nom === StepName.DEMANDE_VISA);
    if (!visa || visa.statut !== StepStatus.COMPLETED) {
      return { 
        canUpdate: false, 
        reason: 'La demande de visa doit être terminée avant de modifier les préparatifs de voyage' 
      };
    }
  }

  return { canUpdate: true };
};
  // Mise à jour du statut de la procédure avec gestion stricte des étapes
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
      
      await refreshProcedures();
      toast.success('Statut de la procédure mis à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour procédure');
      toast.error(error.message || 'Erreur lors de la mise à jour du statut de la procédure');
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



  // Supprimer une procédure avec gestion stricte des étapes
  const handleDeleteProcedure = async () => {
    if (!procedureToDelete) return;

    try {
      // Annuler toutes les étapes avant suppression
      for (const step of procedureToDelete.steps) {
        if (step.statut !== StepStatus.CANCELLED && step.statut !== StepStatus.COMPLETED) {
          await updateStepStatus(procedureToDelete._id, step.nom, StepStatus.CANCELLED);
        }
      }

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

  // ✅ GESTION D'ERREURS SPÉCIFIQUE BACKEND
const handleUpdateStepStatus = async (
  procedureId: string, 
  stepName: StepName, 
  newStatus: StepStatus,
  raisonRefus?: string
) => {
  try {
    console.log(`🔄 Mise à jour étape: ${stepName} -> ${newStatus}`);
    
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
    console.error('❌ Erreur détaillée mise à jour étape:', error);
    
    // ✅ GESTION SPÉCIFIQUE PAR TYPE D'ERREUR
    if (error.message.includes('Nom d\'étape invalide')) {
      toast.error(`Erreur: Étape "${stepName}" non reconnue par le serveur`);
    } else if (error.message.includes('Procédure non trouvée')) {
      toast.error('Procédure introuvable - peut-être déjà supprimée');
    } else if (error.message.includes('Session expirée')) {
      toast.error('Session expirée - reconnexion nécessaire');
      logout();
    } else if (error.message.includes('429')) {
      toast.error('Trop de requêtes - veuillez patienter');
    } else {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    }
  }
};


  // ✅ VERSION FINALE - Sans dépendance à apiService
const refreshProcedures = async () => {
  try {
    setIsRefreshing(true);
    console.log('🔄 Rafraîchissement manuel des procédures...');
    
    // Forcer le rechargement sans cache
    const response = await fetchProcedures(currentPage, 50);
    
    setProcedures(response.data);
    setTotalProcedures(response.total);
    setTotalPages(response.totalPages);
    
    // Mettre à jour la procédure sélectionnée
    if (selectedProcedure) {
      const updatedSelected = response.data.find(p => p._id === selectedProcedure._id);
      setSelectedProcedure(updatedSelected || null);
      
      if (!updatedSelected) {
        toast.info('La procédure sélectionnée a été mise à jour ou supprimée');
      }
    }
    
    console.log('✅ Rafraîchissement terminé:', response.data.length, 'procédures');
    
  } catch (error: any) {
    console.error('❌ Erreur rafraîchissement:', error);
    
    // Gestion d'erreurs spécifiques
    if (error.message.includes('Session expirée')) {
      toast.error('Session expirée - reconnexion nécessaire');
      logout();
    } else if (error.message.includes('429')) {
      toast.warning('Trop de requêtes - veuillez patienter');
    } else {
      toast.error('Erreur lors de l\'actualisation des données');
    }
  } finally {
    setIsRefreshing(false);
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

  // Couleurs alignées avec les enums backend
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case StepStatus.IN_PROGRESS:
      case ProcedureStatus.IN_PROGRESS:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case StepStatus.COMPLETED:
      case ProcedureStatus.COMPLETED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case StepStatus.PENDING:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case StepStatus.CANCELLED:
      case ProcedureStatus.CANCELLED:
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case StepStatus.REJECTED:
      case ProcedureStatus.REJECTED:
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Icônes pour les statuts
  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case StepStatus.IN_PROGRESS:
      case ProcedureStatus.IN_PROGRESS:
        return <Clock className="w-4 h-4" />;
      case StepStatus.COMPLETED:
      case ProcedureStatus.COMPLETED:
        return <CheckCircle className="w-4 h-4" />;
      case StepStatus.PENDING:
        return <Clock className="w-4 h-4" />;
      case StepStatus.CANCELLED:
      case ProcedureStatus.CANCELLED:
        return <Ban className="w-4 h-4" />;
      case StepStatus.REJECTED:
      case ProcedureStatus.REJECTED:
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Noms complets des étapes avec espaces
  const getStepDisplayName = (stepName: StepName) => {
    const stepNames: { [key: string]: string } = {
      [StepName.DEMANDE_ADMISSION]: 'Demande d\'admission',
      [StepName.DEMANDE_VISA]: 'Demande de visa',
      [StepName.PREPARATIF_VOYAGE]: 'Préparatifs de voyage'
    };
    return stepNames[stepName] || stepName;
  };

  // Icônes pour les étapes
  const getStepIcon = (stepName: StepName) => {
    switch (stepName) {
      case StepName.DEMANDE_ADMISSION:
        return <FileText className="w-4 h-4" />;
      case StepName.DEMANDE_VISA:
        return <Shield className="w-4 h-4" />;
      case StepName.PREPARATIF_VOYAGE:
        return <Plane className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Utilisation des valeurs d'enum
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
      className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-95"
      onClick={() => {
        setSelectedProcedure(procedure);
        setIsDrawerOpen(true);
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-base truncate flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            {procedure.prenom} {procedure.nom}
          </h3>
          <div className="space-y-1 mt-2">
            <p className="text-slate-600 text-sm truncate flex items-center gap-2">
              <Mail className="w-3 h-3" />
              {procedure.email}
            </p>
            {procedure.telephone && (
              <p className="text-slate-500 text-xs flex items-center gap-2">
                <Phone className="w-3 h-3" />
                {procedure.telephone}
              </p>
            )}
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatutColor(procedure.statut)}`}>
          {getStatutIcon(procedure.statut)}
          {procedure.statut}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-700 font-semibold bg-slate-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            {procedure.destination}
          </span>
          <span className="text-slate-400 text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(procedure.createdAt).toLocaleDateString('fr-FR')}
          </span>
        </div>
        
        {/* Filière depuis le rendez-vous */}
        {procedure.filiere && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <BookOpen className="w-3 h-3" />
            <span className="font-medium">Filière:</span>
            <span>{procedure.filiere}</span>
          </div>
        )}

        {/* Étapes */}
        <div className="space-y-2">
          {procedure.steps.map((step) => (
            <div key={step.nom} className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                {getStepIcon(step.nom)}
                <span className="text-slate-700 text-xs font-medium">
                  {getStepDisplayName(step.nom)}
                </span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatutColor(step.statut)}`}>
                {getStatutIcon(step.statut)}
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
        {/* Header principal mobile-first */}
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                  Gestion des Procédures
                </h1>
                <p className="text-slate-600 text-sm mt-1">
                  {user ? `Connecté en tant que ${user.email}` : 'Chargement...'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Toggle View Mode */}
                <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'list' 
                        ? 'bg-blue-500 text-white' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-4 h-4 flex flex-col gap-0.5">
                      <div className="w-full h-0.5 bg-current rounded"></div>
                      <div className="w-full h-0.5 bg-current rounded"></div>
                      <div className="w-full h-0.5 bg-current rounded"></div>
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-blue-500 text-white' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                      <div className="w-full h-full bg-current rounded"></div>
                      <div className="w-full h-full bg-current rounded"></div>
                      <div className="w-full h-full bg-current rounded"></div>
                      <div className="w-full h-full bg-current rounded"></div>
                    </div>
                  </button>
                </div>

                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Filter className="w-5 h-5" />
                </button>

                <button 
                  onClick={() => loadProcedures(1, 50)}
                  disabled={isLoading}
                  className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Rechercher une procédure..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
              />
            </div>

            {/* Filtres (expandable sur mobile) */}
            {showFilters && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-3 block">Statut procédure</label>
                  <div className="flex flex-wrap gap-2">
                    {statutsProcedure.map(statut => (
                      <button
                        key={statut}
                        onClick={() => setSelectedStatutProcedure(statut)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
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
                  <label className="text-sm font-semibold text-slate-600 mb-3 block">Statut étape</label>
                  <div className="flex flex-wrap gap-2">
                    {statutsEtape.map(statut => (
                      <button
                        key={statut}
                        onClick={() => setSelectedStatutEtape(statut)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
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
            )}
          </div>
        </div>

        {/* Cartes de statistiques responsive */}
        {!isLoading && procedures.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-xl font-bold text-slate-800">{totalProcedures}</div>
              <div className="text-slate-500 text-sm">Total</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-200">
              <div className="text-xl font-bold text-blue-600">
                {procedures.filter(p => p.statut === ProcedureStatus.IN_PROGRESS).length}
              </div>
              <div className="text-blue-500 text-sm">En cours</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200">
              <div className="text-xl font-bold text-emerald-600">
                {procedures.filter(p => p.statut === ProcedureStatus.COMPLETED).length}
              </div>
              <div className="text-emerald-500 text-sm">Terminées</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-red-200">
              <div className="text-xl font-bold text-red-600">
                {procedures.filter(p => p.statut === ProcedureStatus.CANCELLED || p.statut === ProcedureStatus.REJECTED).length}
              </div>
              <div className="text-red-500 text-sm">Annulées/Refusées</div>
            </div>
          </div>
        )}

        {/* Résultats du filtrage */}
        <div className="mb-4 text-sm text-slate-600 font-medium flex items-center justify-between">
          <span>
            {filteredProcedures.length} procédure{filteredProcedures.length > 1 ? 's' : ''} trouvée{filteredProcedures.length > 1 ? 's' : ''}
          </span>
          {filteredProcedures.length > 0 && (
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-500 text-sm flex items-center gap-1"
            >
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Filtres
            </button>
          )}
        </div>

        {/* Liste des procédures */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-4" />
              <p className="text-slate-500">Chargement des procédures...</p>
            </div>
          ) : filteredProcedures.length > 0 ? (
            viewMode === 'list' ? (
              // Vue liste mobile-optimized
              <div className="divide-y divide-slate-200">
                {filteredProcedures.map(proc => (
                  <div
                    key={proc._id}
                    className="p-4 transition-all duration-300 cursor-pointer hover:bg-slate-50 active:bg-slate-100"
                    onClick={() => {
                      setSelectedProcedure(proc);
                      setIsDrawerOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-slate-400" />
                          {proc.prenom} {proc.nom}
                        </h3>
                        <div className="space-y-1">
                          <p className="text-slate-600 text-sm flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {proc.email}
                          </p>
                          {proc.telephone && (
                            <p className="text-slate-500 text-xs flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              {proc.telephone}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-400 text-xs whitespace-nowrap flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(proc.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-700 text-xs font-semibold bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {proc.destination}
                        </span>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatutColor(proc.statut)}`}>
                          {getStatutIcon(proc.statut)}
                          {proc.statut}
                        </span>
                      </div>
                      
                      {/* Filière */}
                      {proc.filiere && (
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <BookOpen className="w-3 h-3" />
                          <span className="font-medium">Filière:</span>
                          <span>{proc.filiere}</span>
                        </div>
                      )}
                      
                      {/* Étapes compactes */}
                      <div className="flex flex-wrap gap-2">
                        {proc.steps.map((step) => (
                          <div key={step.nom} className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1">
                            {getStepIcon(step.nom)}
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
              // Vue grid responsive
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredProcedures.map(proc => (
                  <ProcedureCard key={proc._id} procedure={proc} />
                ))}
              </div>
            )
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                <FileText className="text-slate-400 w-8 h-8" />
              </div>
              <p className="text-slate-500 font-medium mb-2">Aucune procédure trouvée</p>
              <p className="text-slate-400 text-sm">Essayez de modifier vos critères de recherche</p>
            </div>
          )}
        </div>

        {/* Drawer de détails pour mobile */}
        {isDrawerOpen && selectedProcedure && (
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 rounded-t-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800">Détails de la procédure</h2>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all rounded-xl hover:bg-slate-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Informations principales */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg">
                        {selectedProcedure.prenom} {selectedProcedure.nom}
                      </h3>
                      <p className="text-slate-600 text-sm">{selectedProcedure.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <p className="text-slate-500 mb-1 text-xs">Destination</p>
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedProcedure.destination}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <p className="text-slate-500 mb-1 text-xs">Date création</p>
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(selectedProcedure.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {selectedProcedure.niveauEtude && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-slate-500 mb-1 text-xs">Niveau d'étude</p>
                        <p className="font-bold text-slate-800 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {selectedProcedure.niveauEtude}
                        </p>
                      </div>
                    )}
                    {selectedProcedure.filiere && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <p className="text-slate-500 mb-1 text-xs">Filière</p>
                        <p className="font-bold text-slate-800 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {selectedProcedure.filiere}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-6">
                {/* Statut de la procédure */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Statut de la Procédure</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(ProcedureStatus).map(statut => (
                      <button
                        key={statut}
                        onClick={() => {
                          handleUpdateProcedureStatus(selectedProcedure._id, statut);
                          setIsDrawerOpen(false);
                        }}
                        className={`p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          selectedProcedure.statut === statut
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {getStatutIcon(statut)}
                        {statut}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gestion des étapes */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Gestion des Étapes</h3>
                  <div className="space-y-3">
                   {selectedProcedure.steps.map((step) => {
                      const validation = canUpdateStep(selectedProcedure, step.nom, StepStatus.COMPLETED);  
                      
                      return (
                        <div key={step.nom} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getStepIcon(step.nom)}
                              <span className="font-bold text-slate-800 text-sm">
                                {getStepDisplayName(step.nom)}
                              </span>
                            </div>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatutColor(step.statut)}`}>
                              {getStatutIcon(step.statut)}
                              {step.statut}
                            </span>
                          </div>
                          
                         <div className="grid grid-cols-2 gap-2">
                            {Object.values(StepStatus).map(statut => {
                              const stepValidation = canUpdateStep(selectedProcedure, step.nom, statut);
                              const isCurrentStatus = step.statut === statut;
                              const isDisabled = !stepValidation.canUpdate && !isCurrentStatus;

                              return (
                                <button
                                  key={statut}
                                  onClick={() => {
                                    if (!isDisabled) {
                                      if (statut === StepStatus.REJECTED) {
                                        setShowRejectModal(true);
                                        setProcedureToDelete(selectedProcedure);
                                        setIsDrawerOpen(false);
                                      } else {
                                        handleUpdateStepStatus(
                                          selectedProcedure._id, 
                                          step.nom, 
                                          statut
                                        );
                                        setIsDrawerOpen(false);
                                      }
                                    }
                                  }}
                                  disabled={isDisabled}
                                  title={isDisabled ? stepValidation.reason : ''} // ← ICI
                                  className={`p-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                                    isCurrentStatus
                                      ? 'bg-blue-500 text-white'
                                      : isDisabled
                                      ? 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed'
                                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {getStatutIcon(statut)}
                                  {statut}
                                </button>
                              );
                            })}
                          </div>

                          {step.raisonRefus && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-red-700 text-xs font-semibold">Raison du refus:</p>
                              <p className="text-red-600 text-xs mt-1">{step.raisonRefus}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <button 
                    onClick={() => {
                      setShowRejectModal(true);
                      setProcedureToDelete(selectedProcedure);
                      setIsDrawerOpen(false);
                    }}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Rejeter
                  </button>
                  <button 
                    onClick={() => {
                      setProcedureToDelete(selectedProcedure);
                      setShowDeleteModal(true);
                      setIsDrawerOpen(false);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">
                Confirmer la suppression
              </h3>
              <p className="text-slate-600 mb-6 text-center text-sm">
                Êtes-vous sûr de vouloir supprimer la procédure de <strong>{procedureToDelete?.prenom} {procedureToDelete?.nom}</strong> ?
                <br />
                <span className="text-red-500 font-medium">Toutes les étapes seront annulées.</span>
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteProcedure}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de rejet */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Ban className="w-6 h-6 text-red-500" />
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
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                rows={4}
              />
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setProcedureToDelete(null);
                  }}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" />
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