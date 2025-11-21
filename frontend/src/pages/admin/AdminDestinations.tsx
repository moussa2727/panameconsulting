import React, { useEffect, useState, useRef } from 'react';
import RequireAdmin from '../../context/RequireAdmin';
import { useAuth } from '../../context/AuthContext';
import { 
  destinationService, 
  type Destination,
  type CreateDestinationData,
  type UpdateDestinationData
} from '../../api/admin/AdminDestionService';

interface DataSourceInfo {
  count: number;
  lastUpdated: string | null;
}

const initialForm = {
  country: '',
  text: '',
};

const AdminDestinations: React.FC = () => {
  const { token, user, isAuthenticated } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [popover, setPopover] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataSourceInfo, setDataSourceInfo] = useState<DataSourceInfo>({
    count: 0,
    lastUpdated: null
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const popoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Affiche un popover animé
  const showPopover = (message: string, type: 'success' | 'error') => {
    setPopover({ message, type });
    if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
    popoverTimeout.current = setTimeout(() => setPopover(null), 3000);
  };

  // Charger les destinations
  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const data = await destinationService.getAllDestinationsWithoutPagination();
     setDestinations(
        data.map((dest: any) => ({
          ...dest,
          imagePath: destinationService.getFullImageUrl(dest.imagePath),
        }))
      );
      
      // Mettre à jour les informations de source de données
      const stats = await destinationService.getStatistics();
      
      setDataSourceInfo({
        count: data.length,
        lastUpdated: stats.lastUpdated || new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    } catch (error: any) {
      console.error('Erreur:', error);
      showPopover(error.message || 'Erreur lors du chargement des destinations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier les droits admin
  const hasAdminRights = () => {
    return isAuthenticated && token && user && (user.role === 'admin' || user.isAdmin);
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasAdminRights()) {
      showPopover('Droits administrateur requis pour cette action', 'error');
      return;
    }

    setLoading(true);

    try {
      if (!form.country.trim() || !form.text.trim()) {
        showPopover('Veuillez remplir tous les champs obligatoires', 'error');
        return;
      }

      if (form.text.length < 10 || form.text.length > 2000) {
        showPopover('La description doit contenir entre 10 et 2000 caractères', 'error');
        return;
      }

      if (editingId) {
        // Mise à jour destination existante
        const updateData: UpdateDestinationData = {
          country: form.country.trim(),
          text: form.text.trim(),
          ...(imageFile && { imageFile })
        };

        await destinationService.updateDestination(editingId, updateData, token!);
        showPopover('Destination modifiée avec succès', 'success');
      } else {
        // Création nouvelle destination
        if (!imageFile) {
          showPopover('Veuillez sélectionner une image', 'error');
          return;
        }

        const createData: CreateDestinationData = {
          country: form.country.trim(),
          text: form.text.trim(),
          imageFile
        };

        await destinationService.createDestination(createData, token!);
        showPopover('Destination ajoutée avec succès', 'success');
      }

      // Réinitialiser et rafraîchir
      handleCancelEdit();
      fetchDestinations();
    } catch (error: any) {
      console.error('Erreur détaillée:', error);
      // Le message d'erreur est déjà géré par le service
    } finally {
      setLoading(false);
    }
  };

  // Suppression
  const handleDelete = async (id: string) => {
    if (!hasAdminRights()) {
      showPopover('Droits administrateur requis pour cette action', 'error');
      return;
    }

    setLoading(true);
    try {
      await destinationService.deleteDestination(id, token!);
      showPopover('Destination supprimée avec succès', 'success');
      setShowDeleteConfirm(null);
      fetchDestinations();
    } catch (error: any) {
      console.error('Erreur détaillée:', error);
      // Le message d'erreur est déjà géré par le service
    } finally {
      setLoading(false);
    }
  };

  // Gestion des changements de formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Gestion de l'image
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validation via le service
      const validation = destinationService.validateImageFile(file);
      if (!validation.isValid) {
        showPopover(validation.error!, "error");
        e.target.value = "";
        return;
      }

      setImageFile(file);
    }
  };

  // Édition
  const handleEdit = (dest: Destination) => {
    setForm({
      country: dest.country,
      text: dest.text,
    });
    setEditingId(dest._id);
    setImageFile(null);
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setForm(initialForm);
    setEditingId(null);
    setImageFile(null);
    
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  useEffect(() => {
    fetchDestinations();
    return () => {
      if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
    };
  }, []);

  const isAdmin = hasAdminRights();

  return (
    <RequireAdmin>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <svg className="w-7 h-7 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>
            </svg>
            Gestion des Destinations
          </h2>
          
          <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Base de données ({dataSourceInfo.count})
            </span>
          </div>
        </div>

        {/* Popover global */}
        {popover && (
          <div
            className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white font-semibold transition-all duration-300 flex items-center gap-2
              ${popover.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {popover.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{popover.message}</span>
          </div>
        )}

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            {editingId ? 'Modifier une destination' : 'Ajouter une nouvelle destination'}
          </h3>
          
          {!isAdmin && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Droits administrateur requis pour modifier les destinations
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="country" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Pays *
                </label>
                <input
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 border border-sky-500 rounded-lg focus:outline-none focus:ring-none focus:border-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Nom du pays"
                />
              </div>
              
              <div>
                <label htmlFor="image" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Image {!editingId && '*'}
                </label>
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 border border-sky-500 rounded-lg focus:outline-none focus:ring-none focus:border-sky-600 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Formats acceptés: JPG, PNG, WEBP, SVG. Max: 5MB</p>
                
                {imageFile && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Fichier sélectionné: {imageFile.name}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="text" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Description *
              </label>
              <textarea
                id="text"
                name="text"
                value={form.text}
                onChange={handleChange}
                required
                disabled={!isAdmin}
                rows={5}
                className="w-full px-4 py-2 border border-sky-500 rounded-lg focus:outline-none focus:ring-none focus:border-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Description de la destination (10-2000 caractères)"
              />
              <p className="text-xs text-gray-500 mt-1">{form.text.length}/2000 caractères</p>
            </div>
            
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || !isAdmin}
                className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {editingId ? 'Modification...' : 'Ajout...'}
                  </>
                ) : editingId ? (
                  'Modifier'
                ) : (
                  'Ajouter'
                )}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={!isAdmin}
                  className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition focus:outline-none focus:ring-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Liste des destinations */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              Liste des destinations
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {destinations.length} élément{destinations.length !== 1 ? 's' : ''}
              </span>
            </h3>
            
            {dataSourceInfo.lastUpdated && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Dernière mise à jour: {dataSourceInfo.lastUpdated}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sky-600 py-12">
              <svg className="animate-spin w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Chargement des destinations...</span>
            </div>
          ) : destinations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">Aucune destination à afficher</p>
              <p className="text-gray-400 mt-1">Commencez par ajouter votre première destination</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              {destinations.map((dest) => (
                <div key={dest._id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow relative">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <img
                        src={destinationService.getFullImageUrl(dest.imagePath)}
                        alt={dest.country}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/paname-placeholder.png';
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate flex items-center gap-1">
                        {dest.country}
                      </h4>
                      
                      <p className="text-gray-600 text-sm mt-2 line-clamp-3">
                        {dest.text}
                      </p>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEdit(dest)}
                          disabled={!isAdmin}
                          className="text-sky-600 hover:text-sky-800 text-sm font-medium flex items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Modifier
                        </button>
                        
                        <button
                          onClick={() => setShowDeleteConfirm(dest._id)}
                          disabled={!isAdmin}
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modal de confirmation suppression */}
                  {showDeleteConfirm === dest._id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-medium">Confirmer la suppression</span>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">Êtes-vous sûr de vouloir supprimer la destination "{dest.country}" ? Cette action est irréversible.</p>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-none"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleDelete(dest._id)}
                            disabled={!isAdmin}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Oui, supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAdmin>
  );
};

export default AdminDestinations;