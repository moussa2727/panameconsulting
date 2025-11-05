import { useState } from 'react';

interface RendezVous {
  id: string;
  client: string;
  email: string;
  date: string;
  heure: string;
  destination: string;
  statut: 'confirmé' | 'en attente' | 'annulé' | 'terminé';
  avisAdmin: string;
  note: string;
  couleur: string;
}

const AdminRendezVous = () => {
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([
    {
      id: '1',
      client: 'Marie Dubois',
      email: 'marie.dubois@example.com',
      date: '15/03/2024',
      heure: '14:30',
      destination: 'Paris',
      statut: 'en attente',
      avisAdmin: 'Avraille',
      note: '',
      couleur: 'bg-purple-500'
    },
    {
      id: '2',
      client: 'Paul Morel',
      email: 'paul.morel@example.com',
      date: '16/03/2024',
      heure: '10:00',
      destination: 'Lyon',
      statut: 'confirmé',
      avisAdmin: 'Favorable',
      note: 'Dossier complet',
      couleur: 'bg-blue-500'
    },
    {
      id: '3',
      client: 'Sophie Leroy',
      email: 'sophie.leroy@example.com',
      date: '17/03/2024',
      heure: '16:15',
      destination: 'Marseille',
      statut: 'en attente',
      avisAdmin: '',
      note: '',
      couleur: 'bg-pink-500'
    },
    {
      id: '4',
      client: 'Jean Petit',
      email: 'jean.petit@example.com',
      date: '18/03/2024',
      heure: '11:45',
      destination: 'Bordeaux',
      statut: 'annulé',
      avisAdmin: 'Défavorable',
      note: 'Client indisponible',
      couleur: 'bg-orange-500'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('tous');
  const [selectedRendezVous, setSelectedRendezVous] = useState<RendezVous | null>(null);
  const [showAvisModal, setShowAvisModal] = useState(false);

  const filteredRendezVous = rendezVous.filter(rdv => {
    const matchesSearch = rdv.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rdv.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'tous' || rdv.statut === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'confirmé': return 'bg-green-100 text-green-800 border-green-200';
      case 'en attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'annulé': return 'bg-red-100 text-red-800 border-red-200';
      case 'terminé': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvisColor = (avis: string) => {
    switch (avis.toLowerCase()) {
      case 'favorable': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'défavorable': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'avraille': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const updateRendezVousStatut = (id: string, newStatut: RendezVous['statut']) => {
    setRendezVous(rdv => rdv.map(item => 
      item.id === id ? { ...item, statut: newStatut } : item
    ));
  };

  const updateAvisAdmin = (id: string, avis: string) => {
    setRendezVous(rdv => rdv.map(item => 
      item.id === id ? { ...item, avisAdmin: avis } : item
    ));
    setShowAvisModal(false);
  };

  const statuts = ['tous', 'confirmé', 'en attente', 'annulé', 'terminé'];
  const avisOptions = ['Favorable', 'Défavorable', 'Avraille'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Liste des rendez-vous */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {/* Barre de recherche et filtres */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="Rechercher un rendez-vous..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-0 focus:outline-none focus:border-blue-500 transition-all duration-200"
              />
              <i className="fas fa-search absolute left-3 top-3.5 text-slate-400"></i>
            </div>

            {/* Filtres de statut */}
            <div className="flex flex-wrap gap-2">
              {statuts.map(statut => (
                <button
                  key={statut}
                  onClick={() => setSelectedStatus(statut)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                    selectedStatus === statut
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {statut === 'tous' ? 'Tous les statuts' : statut}
                </button>
              ))}
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredRendezVous.map(rdv => (
              <div
                key={rdv.id}
                className={`border-b border-slate-100 last:border-b-0 transition-all duration-200 cursor-pointer hover:bg-slate-50/70 ${
                  selectedRendezVous?.id === rdv.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => setSelectedRendezVous(rdv)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                   

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {rdv.client}
                          </h3>
                          <p className="text-slate-600 text-sm">{rdv.email}</p>
                        </div>
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          {rdv.date} • {rdv.heure}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(rdv.statut)}`}>
                          {rdv.statut}
                        </span>
                        <span className="text-slate-700 text-sm font-medium">
                          {rdv.destination}
                        </span>
                        {rdv.avisAdmin && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAvisColor(rdv.avisAdmin)}`}>
                            {rdv.avisAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredRendezVous.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-calendar-times text-slate-400 text-xl"></i>
                </div>
                <p>Aucun rendez-vous trouvé</p>
              </div>
            )}
          </div>
        </div>

        {/* Détails du rendez-vous */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          {selectedRendezVous ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {selectedRendezVous.client}
                      </h2>
                      <p className="text-slate-600">{selectedRendezVous.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Date & Heure</p>
                    <p className="font-semibold text-slate-800">
                      {selectedRendezVous.date} • {selectedRendezVous.heure}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Destination</p>
                    <p className="font-semibold text-slate-800">{selectedRendezVous.destination}</p>
                  </div>
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="flex-1 p-6 space-y-6">
                {/* Statut */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">STATUT</h3>
                  <div className="flex flex-wrap gap-2">
                    {['en attente', 'confirmé', 'annulé', 'terminé'].map(statut => (
                      <button
                        key={statut}
                        onClick={() => updateRendezVousStatut(selectedRendezVous.id, statut as RendezVous['statut'])}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                          selectedRendezVous.statut === statut
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {statut}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avis Admin */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">AVIS ADMIN</h3>
                  <div className="flex flex-wrap gap-2">
                    {avisOptions.map(avis => (
                      <button
                        key={avis}
                        onClick={() => updateAvisAdmin(selectedRendezVous.id, avis)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedRendezVous.avisAdmin === avis
                            ? getAvisColor(avis) + ' border-2 border-blue-500'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {avis}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">NOTES</h3>
                  <textarea
                    placeholder="Ajouter une note..."
                    value={selectedRendezVous.note}
                    onChange={(e) => setRendezVous(rdv => rdv.map(item => 
                      item.id === selectedRendezVous.id ? { ...item, note: e.target.value } : item
                    ))}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-0 focus:outline-none focus:border-blue-500 transition-all duration-200 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-slate-200 bg-slate-50/50">
                <div className="flex flex-wrap gap-3">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2">
                    <i className="fas fa-edit"></i>
                    Modifier
                  </button>
                  <button className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2">
                    <i className="fas fa-check"></i>
                    Confirmer
                  </button>
                  <button className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 ml-auto">
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
                  <i className="fas fa-calendar-alt text-slate-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Aucun rendez-vous sélectionné
                </h3>
                <p className="text-slate-500 text-sm">
                  Cliquez sur un rendez-vous pour afficher ses détails
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <button className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:bg-blue-600">
          <i className="fas fa-plus text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default AdminRendezVous;