import { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import RequireAdmin from '../../utils/RequireAdmin';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';

interface Step {
  nom: string;
  statut: 'En attente' | 'En cours' | 'Terminé' | 'Rejeté' | 'Annulé';
  raisonRefus?: string;
  dateMaj: string;
}

interface Procedure {
  _id: string;
  prenom: string;
  nom: string;
  email: string;
  destination: string;
  statut: 'En cours' | 'Terminée' | 'Refusée' | 'Annulée';
  steps: Step[];
  rendezVousId?: any;
  createdAt: string;
  isDeleted: boolean;
}

interface ProceduresResponse {
  data: Procedure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  tokenType?: string;
}

const AdminProcedures = () => {
  const { token, logout, refreshToken, user } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatutProcedure, setSelectedStatutProcedure] = useState<string>('tous');
  const [selectedStatutEtape, setSelectedStatutEtape] = useState<string>('toutes');
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null);
  const [currentStepUpdate, setCurrentStepUpdate] = useState<{procedureId: string, stepName: string, currentStatus: string} | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProcedures, setTotalProcedures] = useState(0);

  const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Fonction pour vérifier et rafraîchir le token
  const ensureValidToken = async (): Promise<string | null> => {
    console.log('🔐 Vérification du token...');
    
    let currentToken = token;
    
    if (!currentToken) {
      console.log('❌ Aucun token disponible');
      return null;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(currentToken);
      const isExpired = decoded.exp * 1000 < Date.now();
      const willExpireSoon = decoded.exp * 1000 < Date.now() + 5 * 60 * 1000; // 5 minutes
      
      console.log('📊 État du token:', {
        exp: new Date(decoded.exp * 1000).toLocaleTimeString(),
        now: new Date().toLocaleTimeString(),
        isExpired,
        willExpireSoon
      });

      if (isExpired || willExpireSoon) {
        console.log('🔄 Token expiré ou bientôt expiré, rafraîchissement...');
        const refreshed = await refreshToken();
        
        if (refreshed) {
          currentToken = localStorage.getItem('token');
          console.log('✅ Nouveau token obtenu');
        } else {
          console.log('❌ Échec du rafraîchissement');
          throw new Error('Impossible de rafraîchir le token');
        }
      }
      
      return currentToken;
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      throw error;
    }
  };

  // Fonction pour faire les requêtes avec gestion du token et credentials
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    console.log('🔄 Préparation requête vers:', url);
    
    const validToken = await ensureValidToken();
    
    if (!validToken) {
      throw new Error('Aucun token valide disponible');
    }

    console.log('📡 Envoi requête avec token valide et credentials...');
    
    const response = await fetch(url, {
      credentials: 'include', // Inclure les cookies
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json',
      },
      ...options,
    });

    console.log('📨 Réponse reçue:', response.status, response.statusText);

    if (response.status === 401) {
      console.log('🔒 Token invalide, déconnexion...');
      toast.error('Session expirée - Veuillez vous reconnecter');
      logout();
      throw new Error('Session expirée');
    }

    return response;
  };

  // Charger les procédures avec pagination
  const fetchProcedures = async (page: number = 1, limit: number = 50, retry = false) => {
    if (retry) {
      setRetryCount(prev => prev + 1);
      if (retryCount >= 2) {
        toast.error('Impossible de charger les données');
        return;
      }
    }

    try {
      setIsLoading(true);
      console.log('🔄 Chargement des procédures...');
      
      // URL explicite avec tous les paramètres
      const url = `${VITE_API_URL}/api/procedures?page=${page}&limit=${limit}`;
      console.log('📋 URL complète:', url);
      
      const response = await makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: ProceduresResponse = await response.json();
      console.log(`✅ ${data.data.length} procédures chargées sur ${data.total} total`, data);
      
      setProcedures(data.data);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
      setTotalProcedures(data.total);
      setRetryCount(0);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement procédures:', error);
      
      if (error.message.includes('Session expirée')) {
        return;
      }
      
      // Retry automatique après 2 secondes
      if (!retry) {
        console.log('🔄 Tentative de rechargement dans 2 secondes...');
        toast.warning('Problème de connexion, nouvelle tentative...');
        setTimeout(() => fetchProcedures(page, limit, true), 2000);
      } else {
        toast.error('Erreur lors du chargement des procédures');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Charger toutes les procédures (sans limite)
  const fetchAllProcedures = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Chargement de TOUTES les procédures...');
      
      const url = `${VITE_API_URL}/api/procedures?page=1&limit=1000`;
      console.log('📋 URL complète:', url);
      
      const response = await makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data: ProceduresResponse = await response.json();
      console.log(`✅ ${data.data.length} procédures chargées (toutes)`, data);
      
      setProcedures(data.data);
      setTotalProcedures(data.total);
      setRetryCount(0);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement toutes les procédures:', error);
      toast.error('Erreur lors du chargement des procédures');
    } finally {
      setIsLoading(false);
    }
  };

  // Mettre à jour le statut d'une procédure
  const updateProcedureStatus = async (procedureId: string, newStatus: Procedure['statut']) => {
    try {
      const url = `${VITE_API_URL}/api/procedures/${procedureId}`;
      console.log('📋 URL mise à jour procédure:', url);
      
      const response = await makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ statut: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const updatedProcedure = await response.json();
      
      // Mettre à jour l'état local
      setProcedures(prev => prev.map(p => 
        p._id === procedureId ? { ...p, statut: updatedProcedure.statut } : p
      ));
      
      if (selectedProcedure?._id === procedureId) {
        setSelectedProcedure(prev => prev ? { ...prev, statut: updatedProcedure.statut } : null);
      }

      toast.success('Statut mis à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour:', error);
      if (!error.message.includes('Session expirée')) {
        toast.error(error.message || 'Erreur lors de la mise à jour');
      }
    }
  };

  // Mettre à jour le statut d'une étape
  const updateStepStatus = async (procedureId: string, stepName: string, newStatus: Step['statut'], raisonRefus?: string) => {
    try {
      const url = `${VITE_API_URL}/api/procedures/${procedureId}/steps/${stepName}`;
      console.log('📋 URL mise à jour étape:', url);
      
      const updateData: any = { statut: newStatus };
      if (raisonRefus) {
        updateData.raisonRefus = raisonRefus;
      }

      const response = await makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'étape');
      }

      const updatedProcedure = await response.json();
      
      // Mettre à jour l'état local
      setProcedures(prev => prev.map(p => 
        p._id === procedureId ? updatedProcedure : p
      ));
      
      if (selectedProcedure?._id === procedureId) {
        setSelectedProcedure(updatedProcedure);
      }

      setCurrentStepUpdate(null);
      toast.success('Étape mise à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour étape:', error);
      if (!error.message.includes('Session expirée')) {
        toast.error(error.message || 'Erreur lors de la mise à jour de l\'étape');
      }
    }
  };

  // Supprimer une procédure
  const deleteProcedure = async () => {
    if (!procedureToDelete) return;

    try {
      const url = `${VITE_API_URL}/api/procedures/${procedureToDelete._id}`;
      console.log('📋 URL suppression:', url);
      
      const response = await makeAuthenticatedRequest(url, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Supprimé par l\'administrateur' }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      // Mettre à jour l'état local
      setProcedures(prev => prev.filter(p => p._id !== procedureToDelete._id));
      
      if (selectedProcedure?._id === procedureToDelete._id) {
        setSelectedProcedure(null);
      }

      setShowDeleteModal(false);
      setProcedureToDelete(null);
      toast.success('Procédure supprimée avec succès');
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      if (!error.message.includes('Session expirée')) {
        toast.error(error.message || 'Erreur lors de la suppression');
      }
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

  // Fonctions utilitaires pour les couleurs
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'En cours': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Terminée': return 'bg-green-100 text-green-800 border-green-200';
      case 'En attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Annulée': return 'bg-red-100 text-red-800 border-red-200';
      case 'Refusée': return 'bg-red-100 text-red-800 border-red-200';
      case 'Terminé': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejeté': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepDisplayName = (stepName: string) => {
    const stepNames: { [key: string]: string } = {
      'DEMANDE_ADMISSION': 'Demande d\'admission',
      'DEMANDE_VISA': 'Demande de visa',
      'PREPARATIF_VOYAGE': 'Préparatif de voyage'
    };
    return stepNames[stepName] || stepName;
  };

  const statutsProcedure = ['tous', 'En cours', 'Terminée', 'Refusée', 'Annulée'];
  const statutsEtape = ['toutes', 'En attente', 'En cours', 'Terminé', 'Rejeté', 'Annulé'];

  // Vérifier l'authentification au chargement
  useEffect(() => {
    console.log('🔐 État auth au chargement:', { 
      hasToken: !!token, 
      user: user,
      isAuthenticated: !!user && !!token 
    });
    
    if (token && user) {
      fetchAllProcedures();
    } else {
      setIsLoading(false);
      console.log('⚠️ Utilisateur non authentifié, attente...');
    }
  }, [token, user]);

  // Afficher un état de débogage
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Problème d'authentification</h2>
          <p className="text-slate-600 mb-4">Veuillez vous reconnecter</p>
          <button 
            onClick={() => window.location.href = '/connexion'}
            className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
        {/* Header avec état de connexion */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Gestion des Procédures
              </h1>
              <p className="text-slate-600 mt-1">
                {user ? `Connecté en tant que ${user.email}` : 'Chargement...'}
                {totalProcedures > 0 && ` • ${totalProcedures} procédures au total`}
              </p>
            </div>
            
            <div className="flex gap-3 items-center">
              {retryCount > 0 && (
                <span className="text-orange-600 text-sm">
                  Tentative {retryCount}/2
                </span>
              )}
              <button 
                onClick={() => fetchAllProcedures()}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
                {isLoading ? 'Chargement...' : 'Actualiser'}
              </button>
              <button 
                onClick={() => fetchProcedures(1, 50)}
                className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 w-fit"
              >
                <i className="fas fa-list"></i>
                Charger 50
              </button>
            </div>
          </div>
        </div>

        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <span className="text-blue-700 font-medium">Chargement des procédures...</span>
            </div>
          </div>
        )}

        {/* Statistiques rapides */}
        {!isLoading && procedures.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-slate-800">{totalProcedures}</div>
              <div className="text-slate-600 text-sm">Total</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-blue-600">
                {procedures.filter(p => p.statut === 'En cours').length}
              </div>
              <div className="text-slate-600 text-sm">En cours</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-green-600">
                {procedures.filter(p => p.statut === 'Terminée').length}
              </div>
              <div className="text-slate-600 text-sm">Terminées</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-2xl font-bold text-red-600">
                {procedures.filter(p => p.statut === 'Annulée' || p.statut === 'Refusée').length}
              </div>
              <div className="text-slate-600 text-sm">Annulées/Refusées</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Liste des procédures */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            {/* Barre de recherche et filtres */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Rechercher une procédure..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-0 focus:outline-none focus:border-blue-500 transition-all duration-200"
                />
                <i className="fas fa-search absolute left-3 top-3.5 text-slate-400"></i>
              </div>

              {/* Filtres */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Statut procédure:</span>
                  {statutsProcedure.map(statut => (
                    <button
                      key={statut}
                      onClick={() => setSelectedStatutProcedure(statut)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                        selectedStatutProcedure === statut
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {statut === 'tous' ? 'Tous' : statut}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Statut étape:</span>
                  {statutsEtape.map(statut => (
                    <button
                      key={statut}
                      onClick={() => setSelectedStatutEtape(statut)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                        selectedStatutEtape === statut
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {statut === 'toutes' ? 'Toutes' : statut}
                    </button>
                  ))}
                </div>
              </div>

              {/* Résultats du filtrage */}
              <div className="mt-3 text-sm text-slate-600">
                {filteredProcedures.length} procédure(s) trouvée(s)
                {(searchTerm || selectedStatutProcedure !== 'tous' || selectedStatutEtape !== 'toutes') && 
                 ` (sur ${procedures.length} au total)`}
              </div>
            </div>

            {/* Liste des procédures */}
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-slate-500 mt-2">Chargement des procédures...</p>
                </div>
              ) : filteredProcedures.length > 0 ? (
                filteredProcedures.map(proc => (
                  <div
                    key={proc._id}
                    className={`border-b border-slate-100 last:border-b-0 transition-all duration-200 cursor-pointer hover:bg-slate-50/70 ${
                      selectedProcedure?._id === proc._id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedProcedure(proc)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate">
                            {proc.prenom} {proc.nom}
                          </h3>
                          <p className="text-slate-600 text-sm truncate">{proc.email}</p>
                        </div>
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          {new Date(proc.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-700 text-sm font-medium bg-slate-100 px-2 py-1 rounded">
                            {proc.destination}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatutColor(proc.statut)}`}>
                            {proc.statut}
                          </span>
                        </div>
                        
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Étapes:</span>{' '}
                          {proc.steps.map((step, index) => (
                            <span key={step.nom} className="mr-2">
                              {getStepDisplayName(step.nom)}: 
                              <span className={`ml-1 px-1 rounded text-xs ${getStatutColor(step.statut).split(' ')[1]}`}>
                                {step.statut}
                              </span>
                              {index < proc.steps.length - 1 && ' •'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-folder-open text-slate-400 text-xl"></i>
                  </div>
                  <p>Aucune procédure trouvée</p>
                  {searchTerm || selectedStatutProcedure !== 'tous' || selectedStatutEtape !== 'toutes' ? (
                    <p className="text-sm mt-2">Essayez de modifier vos critères de recherche</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Détails de la procédure */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            {selectedProcedure ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {selectedProcedure.prenom} {selectedProcedure.nom}
                      </h2>
                      <p className="text-slate-600">{selectedProcedure.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedProcedure(null)}
                      className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                    >
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Destination</p>
                      <p className="font-semibold text-slate-800">{selectedProcedure.destination}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Date de création</p>
                      <p className="font-semibold text-slate-800">
                        {new Date(selectedProcedure.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informations détaillées */}
                <div className="flex-1 p-6 space-y-6">
                  {/* Statut Procédure */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-3">STATUT PROCÉDURE</h3>
                    <div className="flex flex-wrap gap-2">
                      {['En cours', 'Terminée', 'Refusée', 'Annulée'].map(statut => (
                        <button
                          key={statut}
                          onClick={() => updateProcedureStatus(selectedProcedure._id, statut as Procedure['statut'])}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedProcedure.statut === statut
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {statut}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gestion des étapes */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-3">GESTION DES ÉTAPES</h3>
                    <div className="space-y-3">
                      {selectedProcedure.steps.map((step, index) => (
                        <div key={step.nom} className="p-3 border border-slate-200 rounded-xl bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-800">
                              {getStepDisplayName(step.nom)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatutColor(step.statut)}`}>
                              {step.statut}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {['En attente', 'En cours', 'Terminé', 'Rejeté', 'Annulé'].map(statut => (
                              <button
                                key={statut}
                                onClick={() => {
                                  setCurrentStepUpdate({
                                    procedureId: selectedProcedure._id,
                                    stepName: step.nom,
                                    currentStatus: step.statut
                                  });
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                  step.statut === statut
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {statut}
                              </button>
                            ))}
                          </div>

                          {step.raisonRefus && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              <strong>Raison du refus:</strong> {step.raisonRefus}
                            </div>
                          )}
                          
                          <div className="text-xs text-slate-500 mt-2">
                            Dernière modification: {new Date(step.dateMaj).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-200 bg-slate-50/50">
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => {
                        setProcedureToDelete(selectedProcedure);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <i className="fas fa-trash"></i>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                    <i className="fas fa-tasks text-slate-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    Aucune procédure sélectionnée
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Cliquez sur une procédure pour afficher ses détails
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-slate-600 mb-4">
                Êtes-vous sûr de vouloir supprimer la procédure de {procedureToDelete?.prenom} {procedureToDelete?.nom} ?
                Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteProcedure}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de mise à jour d'étape */}
        {currentStepUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Modifier le statut de l'étape
              </h3>
              <p className="text-slate-600 mb-4">
                Choisissez le nouveau statut pour cette étape.
              </p>
              
              <div className="space-y-3 mb-4">
                {['En attente', 'En cours', 'Terminé', 'Rejeté', 'Annulé'].map(statut => (
                  <button
                    key={statut}
                    onClick={async () => {
                      if (statut === 'Rejeté') {
                        const reason = prompt('Veuillez saisir la raison du rejet:');
                        if (reason) {
                          await updateStepStatus(
                            currentStepUpdate.procedureId, 
                            currentStepUpdate.stepName, 
                            statut as Step['statut'],
                            reason
                          );
                        }
                      } else {
                        await updateStepStatus(
                          currentStepUpdate.procedureId, 
                          currentStepUpdate.stepName, 
                          statut as Step['statut']
                        );
                      }
                    }}
                    className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                      currentStepUpdate.currentStatus === statut
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {statut}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentStepUpdate(null)}
                className="w-full px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200 border border-slate-300 rounded-xl"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Mobile Floating Action Button */}
        <div className="lg:hidden fixed bottom-6 right-6">
          <button 
            onClick={() => fetchAllProcedures()}
            className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:bg-blue-600"
          >
            <i className="fas fa-sync-alt text-lg"></i>
          </button>
        </div>
      </div>
    </RequireAdmin>
  );
};

export default AdminProcedures;