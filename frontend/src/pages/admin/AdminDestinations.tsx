// AdminDestinations.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { toast } from 'react-toastify';

interface Destination {
  id: string;
  name: string;
  description: string;
  country: string;
  climate: string;
  bestTimeToVisit: string;
  imageUrl: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DestinationFormData {
  name: string;
  description: string;
  country: string;
  climate: string;
  bestTimeToVisit: string;
  imageUrl: string;
  price: number;
  isActive: boolean;
}

const AdminDestinations: React.FC = () => {
  const { token, refreshToken, logout, isAuthenticated } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<DestinationFormData>({
    name: '',
    description: '',
    country: '',
    climate: '',
    bestTimeToVisit: '',
    imageUrl: '',
    price: 0,
    isActive: true,
  });

  const VITE_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Charger les destinations
  const fetchDestinations = async () => {
    if (!isAuthenticated || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${VITE_API_URL}/api/destinations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          return;
        }
        // Réessayer après rafraîchissement
        return fetchDestinations();
      }

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des destinations');
      }

      const data = await response.json();
      setDestinations(data);
    } catch (error: any) {
      console.error('❌ Erreur chargement destinations:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Créer ou mettre à jour une destination
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !token) {
      toast.error('Vous devez être connecté pour effectuer cette action');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingDestination 
        ? `${VITE_API_URL}/api/destinations/${editingDestination.id}`
        : `${VITE_API_URL}/api/destinations`;
      
      const method = editingDestination ? 'PUT' : 'POST';

      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
          body: JSON.stringify(formData),
        });
      };

      let response = await makeRequest(token);

      // Si token expiré, rafraîchir et réessayer
      if (response.status === 401) {
        console.log('🔄 Token expiré, tentative de rafraîchissement...');
        const refreshed = await refreshToken();
        
        if (refreshed) {
          // Récupérer le nouveau token
          const newToken = localStorage.getItem('token');
          if (newToken) {
            console.log('✅ Nouveau token, réessai de la requête...');
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
      }

      const savedDestination = await response.json();
      
      if (editingDestination) {
        setDestinations(prev => 
          prev.map(dest => 
            dest.id === savedDestination.id ? savedDestination : dest
          )
        );
        toast.success('Destination mise à jour avec succès');
      } else {
        setDestinations(prev => [...prev, savedDestination]);
        toast.success('Destination créée avec succès');
      }

      handleCancel();
      
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
      
      if (error.message.includes('Session expirée') || error.message.includes('Token invalide')) {
        toast.error('Session expirée. Redirection...');
        setTimeout(() => logout('/connexion'), 2000);
      } else {
        toast.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supprimer une destination
  const handleDelete = async (id: string) => {
    if (!isAuthenticated || !token) {
      toast.error('Vous devez être connecté pour effectuer cette action');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette destination ?')) {
      return;
    }

    try {
      const makeRequest = async (currentToken: string): Promise<Response> => {
        return fetch(`${VITE_API_URL}/api/destinations/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
        });
      };

      let response = await makeRequest(token);

      // Si token expiré, rafraîchir et réessayer
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          const newToken = localStorage.getItem('token');
          if (newToken) {
            response = await makeRequest(newToken);
          } else {
            throw new Error('Token non disponible après rafraîchissement');
          }
        } else {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
      }

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setDestinations(prev => prev.filter(dest => dest.id !== id));
      toast.success('Destination supprimée avec succès');
      
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      
      if (error.message.includes('Session expirée') || error.message.includes('Token invalide')) {
        toast.error('Session expirée. Redirection...');
        setTimeout(() => logout('/connexion'), 2000);
      } else {
        toast.error(error.message);
      }
    }
  };

  // Éditer une destination
  const handleEdit = (destination: Destination) => {
    setEditingDestination(destination);
    setFormData({
      name: destination.name,
      description: destination.description,
      country: destination.country,
      climate: destination.climate,
      bestTimeToVisit: destination.bestTimeToVisit,
      imageUrl: destination.imageUrl,
      price: destination.price,
      isActive: destination.isActive,
    });
  };

  // Annuler l'édition/création
  const handleCancel = () => {
    setEditingDestination(null);
    setFormData({
      name: '',
      description: '',
      country: '',
      climate: '',
      bestTimeToVisit: '',
      imageUrl: '',
      price: 0,
      isActive: true,
    });
  };

  // Gérer les changements du formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'price') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Charger les destinations au montage
  useEffect(() => {
    if (isAuthenticated) {
      fetchDestinations();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Accès non autorisé</h2>
          <p className="mt-4">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestion des Destinations</h1>
        <button
          onClick={() => setEditingDestination({} as Destination)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          + Nouvelle Destination
        </button>
      </div>

      {/* Formulaire de création/édition */}
      {editingDestination && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingDestination?.id ? 'Modifier la Destination' : 'Nouvelle Destination'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pays</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Climat</label>
              <input
                type="text"
                name="climate"
                value={formData.climate}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Meilleure période</label>
              <input
                type="text"
                name="bestTimeToVisit"
                value={formData.bestTimeToVisit}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prix (€)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="text-sm font-medium">Active</label>
            </div>

            <div className="md:col-span-2 flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
              >
                {isSubmitting ? 'Sauvegarde...' : (editingDestination?.id ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des destinations */}
      <div className="bg-white rounded-lg shadow-md">
        {isLoading ? (
          <div className="p-8 text-center">
            <p>Chargement des destinations...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pays
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {destinations.map((destination) => (
                  <tr key={destination.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={destination.imageUrl}
                          alt={destination.name}
                          className="h-10 w-10 rounded-full object-cover mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {destination.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {destination.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {destination.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {destination.price} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          destination.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {destination.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(destination)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(destination.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {destinations.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Aucune destination trouvée.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDestinations;