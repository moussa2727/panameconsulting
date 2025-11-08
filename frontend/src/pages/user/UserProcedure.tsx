import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "../../utils/AuthContext"
import { toast } from "react-toastify"
import {
  Home,
  User,
  FileText,
  Calendar,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  XCircle,
  TrendingUp,
  RefreshCw,
} from "lucide-react"

// Interfaces alignées avec le backend
interface ProcedureStep {
  nom: string
  statut: "En attente" | "En cours" | "Terminé" | "Rejeté" | "Annulé"
  dateMaj: string
  raisonRefus?: string
}

interface Procedure {
  _id: string
  prenom: string
  nom: string
  email: string
  destination: string
  statut: "En cours" | "Terminée" | "Rejetée" | "Annulée"
  steps: ProcedureStep[]
  createdAt: string
  updatedAt: string
  rendezVousId?: {
    _id: string
    firstName: string
    lastName: string
    date: string
    time: string
    status: string
  }
}

interface UserProcedureProps {
  onProcedureUpdate?: () => void
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

const UserProcedure: React.FC<UserProcedureProps> = ({ onProcedureUpdate }) => {
  const { 
    user, 
    isAuthenticated, 
    token,
    logout,
    refreshToken
  } = useAuth()

  const [userProcedures, setUserProcedures] = useState<Procedure[]>([])
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [isCancelPopoverOpen, setIsCancelPopoverOpen] = useState(false)
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedProcedure, setExpandedProcedure] = useState<string | null>(null)

  const fetchWithAuth = async (url: string, options: FetchOptions = {}): Promise<Response> => {
    let currentToken = token
    
    // Préparer les headers initiaux
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' as RequestCredentials
    })

    // Si token expiré, tenter de le rafraîchir
    if (response.status === 401) {
      console.log("🔄 Token expiré, tentative de rafraîchissement...")
      const refreshed = await refreshToken()
      if (refreshed) {
        console.log("✅ Token rafraîchi avec succès")
        // Réessayer la requête avec le nouveau token
        currentToken = localStorage.getItem('token') // Récupérer le nouveau token
        if (currentToken) {
          headers['Authorization'] = `Bearer ${currentToken}`
        }
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include' as RequestCredentials
        })
      } else {
        console.log("❌ Échec du rafraîchissement du token")
        throw new Error('Session expirée')
      }
    }

    return response
  }

  // Chargement initial
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchUserProcedures()
    }
  }, [isAuthenticated, user?.email, page])

  const fetchUserProcedures = async (): Promise<void> => {
    if (!isAuthenticated || !user?.email) {
      setIsLoadingProcedures(false)
      return
    }

    setIsLoadingProcedures(true)
    try {
      const url = `${API_URL}/api/procedures/user?page=${page}&limit=${limit}`
      console.log("🔍 Fetching procedures from:", url)
      
      const response = await fetchWithAuth(url)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expirée')
        }
        const errorData = await response.json()
        throw new Error(errorData.message || `Erreur ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Données reçues:", data)
      
      if (data && Array.isArray(data.data)) {
        setUserProcedures(data.data)
        setTotalPages(data.totalPages || 1)
      } else {
        console.warn("⚠️ Format de données inattendu:", data)
        setUserProcedures([])
        setTotalPages(1)
      }
      
    } catch (error: any) {
      console.error("❌ Erreur récupération procédures:", error)
      
      if (error.message.includes('Session expirée') || error.message.includes('401')) {
        toast.error("Session expirée, veuillez vous reconnecter")
        logout('/', true)
      } else {
        toast.error(error.message || "Erreur lors du chargement des procédures")
      }
      
      setUserProcedures([])
    } finally {
      setIsLoadingProcedures(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter")
      return
    }

    setRefreshing(true)
    // Si on est déjà sur la page 1, on recharge directement
    if (page === 1) {
      fetchUserProcedures()
    } else {
      // Sinon on retourne à la page 1
      setPage(1)
    }
  }

  const handleCancelProcedure = async (procId: string) => {
    if (!isAuthenticated) {
      toast.error("Session expirée, veuillez vous reconnecter")
      return
    }

    if (!cancelReason.trim() || cancelReason.length < 5) {
      toast.error("Veuillez fournir une raison d'annulation (au moins 5 caractères)")
      return
    }

    setIsCancelling(true)
    try {
      const response = await fetchWithAuth(`${API_URL}/api/procedures/${procId}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Erreur lors de l'annulation")
      }

      toast.success("Procédure annulée avec succès")
      setIsCancelPopoverOpen(false)
      setCancelReason("")
      setSelectedProcedureId(null)
      
      // Recharger les procédures
      fetchUserProcedures()
      onProcedureUpdate?.()
    } catch (error: any) {
      console.error("❌ Erreur annulation:", error)
      
      if (error.message.includes('Session expirée') || error.message.includes('401')) {
        toast.error("Session expirée, veuillez vous reconnecter")
        logout('/', true)
      } else {
        toast.error(error.message || "Erreur lors de l'annulation")
      }
    } finally {
      setIsCancelling(false)
    }
  }

  const navigateToHome = () => {
    window.location.href = "/"
  }

  const toggleProcedureDetails = (procedureId: string) => {
    setExpandedProcedure(expandedProcedure === procedureId ? null : procedureId)
  }

  // Utility functions alignées avec le backend
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Terminée":
        return "bg-green-100 text-green-800 border-green-200"
      case "En cours":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Rejetée":
        return "bg-red-100 text-red-800 border-red-200"
      case "Annulée":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case "Terminé":
        return "bg-green-500"
      case "En cours":
        return "bg-blue-500"
      case "Rejeté":
        return "bg-red-500"
      case "Annulé":
        return "bg-gray-400"
      default:
        return "bg-gray-300"
    }
  }

  const getStepStatusText = (status: string) => {
    switch (status) {
      case "Terminé":
        return "Terminé"
      case "En cours":
        return "En cours"
      case "Rejeté":
        return "Rejeté"
      case "Annulé":
        return "Annulé"
      default:
        return "En attente"
    }
  }

  const formatStepName = (stepName: string) => {
    if (!stepName) return "Étape inconnue"
    
    const stepNameMap: { [key: string]: string } = {
      'DEMANDE_ADMISSION': 'Demande d\'admission',
      'DEMANDE_VISA': 'Demande de visa',
      'PREPARATION_DEPART': 'Préparation du départ',
      'PREPARATIF_VOYAGE': 'Préparatif de voyage'
    }
    
    return stepNameMap[stepName] || stepName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch {
      return "Date invalide"
    }
  }

  const canCancel = (proc: Procedure) => {
    return proc.statut === "En cours" && user?.email === proc.email
  }

  const getProgressPercentage = (steps: ProcedureStep[]) => {
    const completed = steps.filter((step) => step.statut === "Terminé").length
    return steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0
  }

  const openCancelPopup = (procId: string) => {
    if (!isAuthenticated) {
      toast.error("Session expirée, veuillez vous reconnecter")
      return
    }

    setSelectedProcedureId(procId)
    setIsCancelPopoverOpen(true)
    setCancelReason("")
  }

  const closeCancelPopup = () => {
    setIsCancelPopoverOpen(false)
    setSelectedProcedureId(null)
    setCancelReason("")
  }

  // Écran de chargement
  if (isLoadingProcedures && userProcedures.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <button 
                onClick={navigateToHome}
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="w-5 h-5" />
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Accueil</span>
              </button>
              <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </button>
            </div>
          </div>
        </div>

        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4 animate-pulse">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="h-8 bg-slate-200 rounded-lg w-64 mx-auto mb-3 animate-pulse"></div>
              <div className="h-4 bg-slate-200 rounded w-96 mx-auto animate-pulse"></div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                    <div className="h-6 bg-slate-200 rounded w-1/3 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vérification d'authentification
  if (!isAuthenticated || !user?.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Accès non autorisé</h2>
          <p className="text-slate-600 mb-6">Veuillez vous connecter pour accéder à cette page.</p>
          <button
            onClick={() => window.location.href = '/connexion'}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  // Aucune procédure
  if (userProcedures.length === 0 && !isLoadingProcedures) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <button 
                onClick={navigateToHome}
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="w-5 h-5" />
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Accueil</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center py-16">
            <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-6">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Aucune procédure en cours</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Vos procédures de visa apparaîtront ici une fois votre rendez-vous confirmé et terminé favorablement.
            </p>
            <button
              onClick={navigateToHome}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button 
              onClick={navigateToHome}
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="w-5 h-5" />
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Accueil</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 hidden sm:block">
                Connecté en tant que {user?.email}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing || isLoadingProcedures}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title="Actualiser"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-3">Mes Procédures</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Suivez l'avancement de vos démarches de visa
              {userProcedures.length > 0 && ` (${userProcedures.length} trouvée(s))`}
            </p>
          </div>

          <div className="space-y-6">
            {userProcedures.map((proc) => (
              <div key={proc._id} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold text-slate-800">
                          Procédure pour {proc.destination}
                        </h3>
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(proc.statut)}`}
                        >
                          {proc.statut}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          <span>
                            {proc.prenom} {proc.nom}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <span>{proc.destination}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>Créée le {formatDate(proc.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>Progression: {getProgressPercentage(proc.steps)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => toggleProcedureDetails(proc._id)}
                        className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {expandedProcedure === proc._id ? "Masquer" : "Détails"}
                      </button>

                      {canCancel(proc) && (
                        <button
                          onClick={() => openCancelPopup(proc._id)}
                          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors duration-200 border border-red-200"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Steps Details */}
                {expandedProcedure === proc._id && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                        Étapes de la procédure
                      </h4>

                      {proc.steps.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                          <p>Aucune étape disponible</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4 mb-6">
                            {proc.steps.map((step, index) => (
                              <div
                                key={step.nom || `step-${index}`}
                                className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm"
                              >
                                <div className="flex-shrink-0">
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepStatusColor(step.statut)}`}
                                  >
                                    <span className="text-xs font-semibold text-white">{index + 1}</span>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                    <h5 className="text-base font-medium text-slate-900">
                                      {formatStepName(step.nom)}
                                    </h5>
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                        step.statut === "Terminé"
                                          ? "bg-green-100 text-green-800"
                                          : step.statut === "En cours"
                                            ? "bg-blue-100 text-blue-800"
                                            : step.statut === "Rejeté"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-slate-100 text-slate-800"
                                      }`}
                                    >
                                      {getStepStatusText(step.statut)}
                                    </span>
                                  </div>

                                  <div className="flex items-center text-sm text-slate-500">
                                    <Clock className="w-4 h-4 mr-1" />
                                    Mise à jour: {formatDate(step.dateMaj)}
                                  </div>

                                  {step.raisonRefus && step.statut === "Rejeté" && (
                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                      <strong className="font-medium">Raison du rejet:</strong> {step.raisonRefus}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Progress Bar */}
                          <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center justify-between text-sm text-slate-700 mb-3">
                              <span className="font-medium">Progression globale</span>
                              <span>
                                {proc.steps.filter((step) => step.statut === "Terminé").length} / {proc.steps.length}{" "}
                                étapes
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: `${getProgressPercentage(proc.steps)}%`,
                                }}
                              ></div>
                            </div>
                            <div className="text-right text-sm text-slate-500 mt-2">
                              {getProgressPercentage(proc.steps)}% complété
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center mt-8">
              <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoadingProcedures}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-slate-50 rounded-xl border border-slate-300 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Précédent</span>
                </button>

                <div className="flex items-center gap-1 mx-4">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={isLoadingProcedures}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        page === pageNum
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                          : "text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoadingProcedures}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-slate-50 rounded-xl border border-slate-300 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Popup */}
      {isCancelPopoverOpen && selectedProcedureId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmer l'annulation</h3>
            <p className="text-slate-600 mb-4">
              Êtes-vous sûr de vouloir annuler cette procédure ? Cette action est irréversible.
            </p>

            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-slate-700 mb-2">
                Raison de l'annulation *
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Veuillez indiquer la raison (minimum 5 caractères)..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                minLength={5}
                maxLength={500}
              />
              <div className="text-xs text-slate-500 mt-1 text-right">
                {cancelReason.length}/500 caractères
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={closeCancelPopup}
                disabled={isCancelling}
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
              >
                Retour
              </button>
              <button
                onClick={() => handleCancelProcedure(selectedProcedureId)}
                disabled={isCancelling || cancelReason.length < 5}
                className="px-6 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-red-200"
              >
                {isCancelling ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Annulation...
                  </span>
                ) : (
                  "Confirmer l'annulation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProcedure