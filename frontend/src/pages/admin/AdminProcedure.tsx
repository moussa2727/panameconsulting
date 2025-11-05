import { useState } from 'react';

interface Procedure {
  id: string;
  client: string;
  email: string;
  destination: string;
  etapeCourante: string;
  dateDebut: string;
  statutProcedure: 'en cours' | 'terminée' | 'en attente' | 'annulée';
  statutEtape: 'en cours' | 'terminée' | 'en attente' | 'validée';
  administrateur: string;
  couleur: string;
  priorite: 'haute' | 'moyenne' | 'basse';
}

const AdminProcedures = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([
    {
      id: '1',
      client: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      destination: 'Canada',
      etapeCourante: 'Être de visage',
      dateDebut: '10/03/2024',
      statutProcedure: 'en cours',
      statutEtape: 'en cours',
      administrateur: 'Jean Dupont',
      couleur: 'bg-purple-500',
      priorite: 'haute'
    },
    {
      id: '2',
      client: 'Marc Durand',
      email: 'marc.durand@example.com',
      destination: 'États-Unis',
      etapeCourante: 'Être de démarrage',
      dateDebut: '12/03/2024',
      statutProcedure: 'en cours',
      statutEtape: 'en attente',
      administrateur: 'Jean Dupont',
      couleur: 'bg-blue-500',
      priorite: 'moyenne'
    },
    {
      id: '3',
      client: 'Sophie Bernard',
      email: 'sophie.bernard@example.com',
      destination: 'Australie',
      etapeCourante: 'Être de voyage',
      dateDebut: '08/03/2024',
      statutProcedure: 'en cours',
      statutEtape: 'terminée',
      administrateur: 'Jean Dupont',
      couleur: 'bg-pink-500',
      priorite: 'haute'
    },
    {
      id: '4',
      client: 'Pierre Martin',
      email: 'pierre.martin@example.com',
      destination: 'Royaume-Uni',
      etapeCourante: 'Être de transmission',
      dateDebut: '14/03/2024',
      statutProcedure: 'en attente',
      statutEtape: 'en cours',
      administrateur: 'Jean Dupont',
      couleur: 'bg-orange-500',
      priorite: 'basse'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatutProcedure, setSelectedStatutProcedure] = useState<string>('tous');
  const [selectedStatutEtape, setSelectedStatutEtape] = useState<string>('toutes');
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);

  const filteredProcedures = procedures.filter(proc => {
    const matchesSearch = proc.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proc.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatutProc = selectedStatutProcedure === 'tous' || proc.statutProcedure === selectedStatutProcedure;
    const matchesStatutEtape = selectedStatutEtape === 'toutes' || proc.statutEtape === selectedStatutEtape;
    return matchesSearch && matchesStatutProc && matchesStatutEtape;
  });

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en cours': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'terminée': return 'bg-green-100 text-green-800 border-green-200';
      case 'en attente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'annulée': return 'bg-red-100 text-red-800 border-red-200';
      case 'validée': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'haute': return 'bg-red-500';
      case 'moyenne': return 'bg-yellow-500';
      case 'basse': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const updateProcedureStatut = (id: string, newStatut: Procedure['statutProcedure']) => {
    setProcedures(proc => proc.map(item => 
      item.id === id ? { ...item, statutProcedure: newStatut } : item
    ));
  };

  const updateEtapeStatut = (id: string, newStatut: Procedure['statutEtape']) => {
    setProcedures(proc => proc.map(item => 
      item.id === id ? { ...item, statutEtape: newStatut } : item
    ));
  };

  const statutsProcedure = ['tous', 'en cours', 'terminée', 'en attente', 'annulée'];
  const statutsEtape = ['toutes', 'en cours', 'terminée', 'en attente', 'validée'];
  const etapesOptions = ['Être de visage', 'Être de démarrage', 'Être de voyage', 'Être de transmission'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Procédures
            </h1>
            <p className="text-slate-600 mt-1">Gérez les procédures</p>
          </div>
          
          <button className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2 w-fit">
            <i className="fas fa-plus"></i>
            Nouvelle procédure
          </button>
        </div>
      </div>

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
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 capitalize ${
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
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 capitalize ${
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
          </div>

          {/* Liste des procédures */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredProcedures.map(proc => (
              <div
                key={proc.id}
                className={`border-b border-slate-100 last:border-b-0 transition-all duration-200 cursor-pointer hover:bg-slate-50/70 ${
                  selectedProcedure?.id === proc.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => setSelectedProcedure(proc)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                   

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {proc.client}
                          </h3>
                          <p className="text-slate-600 text-sm">{proc.email}</p>
                        </div>
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          {proc.dateDebut}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-700 text-sm font-medium bg-slate-100 px-2 py-1 rounded">
                            {proc.destination}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatutColor(proc.statutProcedure)}`}>
                            {proc.statutProcedure}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatutColor(proc.statutEtape)}`}>
                            Étape: {proc.statutEtape}
                          </span>
                        </div>
                        
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Étape courante:</span> {proc.etapeCourante}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredProcedures.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-folder-open text-slate-400 text-xl"></i>
                </div>
                <p>Aucune procédure trouvée</p>
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
                  <div className="flex items-center gap-3">
                   
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {selectedProcedure.client}
                      </h2>
                      <p className="text-slate-600">{selectedProcedure.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Destination</p>
                    <p className="font-semibold text-slate-800">{selectedProcedure.destination}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Date de début</p>
                    <p className="font-semibold text-slate-800">{selectedProcedure.dateDebut}</p>
                  </div>
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="flex-1 p-6 space-y-6">
                {/* Étape courante */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">ÉTAPE COURANTE</h3>
                  <select
                    value={selectedProcedure.etapeCourante}
                    onChange={(e) => setProcedures(proc => proc.map(item => 
                      item.id === selectedProcedure.id ? { ...item, etapeCourante: e.target.value } : item
                    ))}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-0 focus:outline-none focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    {etapesOptions.map(etape => (
                      <option key={etape} value={etape}>{etape}</option>
                    ))}
                  </select>
                </div>

                {/* Statut Procédure */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">STATUT PROCÉDURE</h3>
                  <div className="flex flex-wrap gap-2">
                    {['en cours', 'terminée', 'en attente', 'annulée'].map(statut => (
                      <button
                        key={statut}
                        onClick={() => updateProcedureStatut(selectedProcedure.id, statut as Procedure['statutProcedure'])}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                          selectedProcedure.statutProcedure === statut
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {statut}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Statut Étape */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">STATUT ÉTAPE</h3>
                  <div className="flex flex-wrap gap-2">
                    {['en cours', 'terminée', 'en attente', 'validée'].map(statut => (
                      <button
                        key={statut}
                        onClick={() => updateEtapeStatut(selectedProcedure.id, statut as Procedure['statutEtape'])}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                          selectedProcedure.statutEtape === statut
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {statut}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Administrateur */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">ADMINISTRATEUR</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-semibold">
                      JD
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{selectedProcedure.administrateur}</p>
                      <p className="text-sm text-slate-600">Administrateur</p>
                    </div>
                  </div>
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
                    <i className="fas fa-check-double"></i>
                    Valider l'étape
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

      {/* Mobile Floating Action Button */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <button className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:bg-blue-600">
          <i className="fas fa-plus text-lg"></i>
        </button>
      </div>
    </div>
  );
};

export default AdminProcedures;