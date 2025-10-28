import React, { useEffect, useState, useRef } from 'react';
import RequireAdmin from '../../utils/RequireAdmin';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Fonction getFullImageUrl conforme à ta demande
const getFullImageUrl = (imagePath: string) => {
  if (!imagePath) return '/placeholder-image.jpg';
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  if (import.meta.env.DEV) {
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  }
  return `${API_URL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
};

interface Destination {
  _id: string;
  country: string;
  text: string;
  imagePath: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedResponse {
  data: Destination[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface DataSourceInfo {
  isDefault: boolean;
  count: number;
  lastUpdated: string | null;
}

const initialForm: Partial<Destination> = {
  country: '',
  text: '',
  imagePath: '',
};

const AdminDestinations: React.FC = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dataSourceInfo, setDataSourceInfo] = useState<DataSourceInfo>({
    isDefault: false,
    count: 0,
    lastUpdated: null
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const popoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Affiche un popover animé qui disparaît après 3s
  const showPopover = (message: string, type: 'success' | 'error') => {
    setPopover({ message, type });
    if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
    popoverTimeout.current = setTimeout(() => setPopover(null), 3000);
  };

  // Fetch destinations avec détection de la source des données
  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/destination?limit=100`);
      
      if (!res.ok) {
        // Si erreur, on utilise les valeurs par défaut
        setDataSourceInfo({
          isDefault: true,
          count: 0,
          lastUpdated: null
        });
        throw new Error('Erreur lors du chargement');
      }
      
      const response: PaginatedResponse = await res.json();
      setDestinations(response.data);
      
      // Vérifier si on utilise des données par défaut (basé sur le contenu)
      const hasDefaultData = response.data.length > 0 && 
        response.data.some(dest => 
          dest.imagePath?.includes('russie.png') || 
          dest.imagePath?.includes('chine.jpg') ||
          dest.imagePath?.includes('maroc.webp') ||
          dest.imagePath?.includes('algerie.png') ||
          dest.imagePath?.includes('turquie.webp') ||
          dest.imagePath?.includes('france.svg')
        );
      
      setDataSourceInfo({
        isDefault: hasDefaultData,
        count: response.data.length,
        lastUpdated: response.data.length > 0 ? 
          new Date().toLocaleString('fr-FR') : null
      });
    } catch (err) {
      showPopover('Erreur lors du chargement des destinations', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; // ✅ un seul fichier
  
      // Validation de la taille (5MB max comme dans le backend)
      if (file.size > 5 * 1024 * 1024) {
        showPopover("L'image ne doit pas dépasser 5MB", "error");
        e.target.value = "";
        return;
      }
  
      // Validation du type (image seulement)
      if (!file.type.startsWith("image/")) {
        showPopover("Veuillez sélectionner une image valide", "error");
        e.target.value = "";
        return;
      }
  
      setImageFile(file); // ✅ type correct : File
    }
  };
  

  // Create or update destination
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs requis
    if (!form.country || !form.text) {
      showPopover('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('country', form.country);
      formData.append('text', form.text);
      
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (!editingId && !imageFile) {
        // Pour une nouvelle destination, une image est requise
        showPopover('Veuillez sélectionner une image', 'error');
        setLoading(false);
        return;
      }

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `${API_URL}/api/destination/${editingId}`
        : `${API_URL}/api/destination`;

      const token = localStorage.getItem('token');
      
      if (!token) {
        showPopover('Authentification requise', 'error');
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
      }
      
      const successMessage = editingId ? 'Destination modifiée avec succès' : 'Destination ajoutée avec succès';
      showPopover(successMessage, 'success');
      toast.success(successMessage);
      
      setForm(initialForm);
      setEditingId(null);
      setImageFile(null);
      
      // Réinitialiser le champ fichier
      const fileInput = document.getElementById('image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      fetchDestinations();
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la sauvegarde';
      showPopover(errorMessage, 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Edit destination
  const handleEdit = (dest: Destination) => {
    setForm({
      country: dest.country,
      text: dest.text,
      imagePath: dest.imagePath,
    });
    setEditingId(dest._id);
    setImageFile(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setForm(initialForm);
    setEditingId(null);
    setImageFile(null);
    
    // Réinitialiser le champ fichier
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Delete destination
  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showPopover('Authentification requise', 'error');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/destination/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }
      
      showPopover('Destination supprimée avec succès', 'success');
      toast.success('Destination supprimée avec succès');
      fetchDestinations();
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la suppression';
      showPopover(errorMessage, 'error');
    } finally {
      setLoading(false);
      setShowConfirm(null);
      setShowDeleteConfirm(null);
    }
  };

  useEffect(() => {
    fetchDestinations();
    // Nettoyage du timeout popover
    return () => {
      if (popoverTimeout.current) clearTimeout(popoverTimeout.current);
    };
  }, []);

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
          
          {/* Indicateur de source de données */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${dataSourceInfo.isDefault ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
            {dataSourceInfo.isDefault ? (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Données par défaut
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Base de données ({dataSourceInfo.count})
              </span>
            )}
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
            {editingId ? (
              <>
                <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier une destination
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter une nouvelle destination
              </>
            )}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="country" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pays *
                </label>
                <input
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-sky-500 rounded-lg focus:outline-none focus:ring-none focus:border-sky-600 transition"
                  placeholder="Nom du pays"
                />
              </div>
              
              <div>
                <label htmlFor="image" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image {!editingId && '*'}
                </label>
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-sky-500 rounded-lg focus:outline-none focus:ring-none focus:border-sky-600 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
                <p className="text-xs text-gray-500 mt-1">Formats acceptés: JPG, PNG, WEBP. Max: 5MB</p>
                
                {imageFile && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Fichier sélectionné: {imageFile.name}
                  </p>
                )}
                {form.imagePath && !imageFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Image actuelle: {form.imagePath.split('/').pop()}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="text" className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Description *
              </label>
              <textarea
                id="text"
                name="text"
                value={form.text}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-4 py-2 border border-sky-500 rounded-lg focus:outline-none focus:ring-none focus:border-sky-600 transition"
                placeholder="Il est préferable d'utiliser les mêmes descriptions avec le même nombre de caractères "
              />
              <p className="text-xs text-gray-500 mt-1">10-500 caractères</p>
            </div>
            
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
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
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Modifier
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter
                  </>
                )}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition focus:outline-none focus:ring-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
              <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
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
                        src={getFullImageUrl(dest.imagePath)} // Utilisation de ta méthode ici
                        alt={dest.country}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80?text=Image+non+disponible';
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate flex items-center gap-1">
                        <svg className="w-4 h-4 text-sky-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {dest.country}
                      </h4>
                      
                      <p className="text-gray-600 text-sm mt-2 line-clamp-3">
                        {dest.text}
                      </p>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEdit(dest)}
                          className="text-sky-600 hover:text-sky-800 text-sm font-medium flex items-center gap-1 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Modifier
                        </button>
                        
                        <button
                          onClick={() => setShowDeleteConfirm(dest._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 transition"
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
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-none"
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