
import React, { useState, useEffect } from 'react';
import { Poste, DailyEntry, ComputedEntry, Profile } from './types';
import { computeEntryData } from './utils/calculations';
import { exportToCSV, exportToJSON } from './utils/export';
import Layout from './components/Layout';
import StatsCards from './components/StatsCards';
import ChartsSection from './components/ChartsSection';
import { 
  ChevronRightIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/solid';

// COMPLETE LIST OF PRODUCTION STATIONS
const MOCK_POSTES: Poste[] = [
  { id: '1', nom: 'Plaques Métal déployé', objectif_dechet_percent: 3.0, actif: true },
  { id: '2', nom: 'Plaques Empateuse', objectif_dechet_percent: 2.0, actif: true },
  { id: '3', nom: 'Oxyde 1', objectif_dechet_percent: 1.2, actif: true },
  { id: '4', nom: 'Oxyde 2', objectif_dechet_percent: 1.2, actif: true },
  { id: '5', nom: 'Plaques TBS', objectif_dechet_percent: 2.5, actif: true },
  { id: '6', nom: 'Empochteuse DAGA', objectif_dechet_percent: 3.0, actif: true },
  { id: '7', nom: 'Empochteuse COSMEC', objectif_dechet_percent: 3.0, actif: true },
  { id: '8', nom: 'Empochteuse BATEK 1', objectif_dechet_percent: 2.8, actif: true },
  { id: '9', nom: 'Empochteuse BATEK 2', objectif_dechet_percent: 2.8, actif: true },
  { id: '10', nom: 'COS 1', objectif_dechet_percent: 1.8, actif: true },
  { id: '11', nom: 'COS 2', objectif_dechet_percent: 1.8, actif: true },
  { id: '12', nom: 'COS BATEK', objectif_dechet_percent: 2.0, actif: true },
  { id: '13', nom: 'Formation', objectif_dechet_percent: 1.0, actif: true },
  { id: '14', nom: 'HRD', objectif_dechet_percent: 2.2, actif: true },
  { id: '15', nom: 'Fardelage', objectif_dechet_percent: 0.5, actif: true },
  { id: '16', nom: 'Batteries Montage / Assemblage', objectif_dechet_percent: 1.5, actif: true },
];

const MOCK_ENTRIES: DailyEntry[] = MOCK_POSTES.map(p => ({
  date: new Date().toISOString().split('T')[0],
  poste_id: p.id,
  s1_dechets: Math.floor(Math.random() * 50),
  s1_produit: 1000 + Math.floor(Math.random() * 500),
  s2_dechets: Math.floor(Math.random() * 40),
  s2_produit: 900 + Math.floor(Math.random() * 400),
  s3_dechets: Math.floor(Math.random() * 60),
  s3_produit: 1100 + Math.floor(Math.random() * 600),
}));

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('admin');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [postes, setPostes] = useState<Poste[]>(MOCK_POSTES);
  const [entries, setEntries] = useState<DailyEntry[]>(MOCK_ENTRIES);
  const [computed, setComputed] = useState<ComputedEntry[]>([]);

  // Simulation of loading data
  useEffect(() => {
    const calculated = entries.map(entry => {
      const poste = postes.find(p => p.id === entry.poste_id)!;
      return computeEntryData(entry, poste);
    });
    setComputed(calculated);
  }, [entries, postes]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  const updateEntry = (posteId: string, shift: 1 | 2 | 3, field: 'dechets' | 'produit', value: string) => {
    const numValue = parseFloat(value) || 0;
    setEntries(prev => prev.map(entry => {
      if (entry.poste_id === posteId) {
        return {
          ...entry,
          [`s${shift}_${field}`]: numValue
        };
      }
      return entry;
    }));
  };

  const renderDashboard = () => (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Résumé Production</h2>
          <p className="text-slate-500">Statistiques du jour {selectedDate}</p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <StatsCards data={computed} />
      <ChartsSection data={computed} />

      <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Détails par Poste</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => exportToCSV(computed, `export_${selectedDate}`)}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              <DocumentArrowDownIcon className="w-3 h-3" />
              CSV
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Poste</th>
                <th className="px-6 py-4 font-semibold text-center">Taux (%)</th>
                <th className="px-6 py-4 font-semibold text-center">Déchets (kg)</th>
                <th className="px-6 py-4 font-semibold text-center">Écart Obj</th>
                <th className="px-6 py-4 font-semibold text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {computed.map(item => (
                <tr key={item.poste_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{item.poste_nom}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold ${item.status === 'alerte' ? 'text-red-500' : 'text-slate-700'}`}>
                      {item.taux_global.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">{item.total_dechets.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={item.ecart > 0 ? 'text-orange-600' : 'text-green-600'}>
                      {item.ecart > 0 ? '+' : ''}{item.ecart.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      item.status === 'conforme' ? 'bg-green-50 text-green-700 border-green-100' :
                      item.status === 'attention' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSaisie = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Saisie des Déchets</h2>
        <p className="text-slate-500">Enregistrement quotidien par shift</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {postes.map(poste => {
          const entry = entries.find(e => e.poste_id === poste.id);
          return (
            <div key={poste.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm truncate pr-2" title={poste.nom}>{poste.nom}</h3>
                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400 font-bold">
                  OBJ: {poste.objectif_dechet_percent}%
                </span>
              </div>
              <div className="p-5 space-y-6">
                {[1, 2, 3].map(shift => (
                  <div key={shift} className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Shift {shift}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Déchets (kg)</label>
                        <input 
                          type="number"
                          value={entry?.[`s${shift}_dechets` as keyof DailyEntry] || ''}
                          onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'dechets', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Produit (kg)</label>
                        <input 
                          type="number"
                          value={entry?.[`s${shift}_produit` as keyof DailyEntry] || ''}
                          onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'produit', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Taux</span>
                  <span className="font-bold text-slate-700">
                    {computed.find(c => c.poste_id === poste.id)?.taux_global.toFixed(2)}%
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  computed.find(c => c.poste_id === poste.id)?.status === 'alerte' ? 'bg-red-500' : 'bg-green-500'
                }`}></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 flex justify-end">
        <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
          Sauvegarder les données
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historique Mensuel</h2>
          <p className="text-slate-500">Tendances et archivage</p>
        </div>
        <div className="flex gap-3">
          <input type="month" className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 shadow-sm outline-none" defaultValue="2024-03" />
          <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
            <ArrowPathIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
          <ClockIcon className="w-10 h-10" />
        </div>
        <h3 className="font-bold text-slate-800 mb-2">Historique en cours de chargement</h3>
        <p className="text-slate-500 max-w-sm">Les vues historiques consolidées par mois seront disponibles après synchronisation avec la base de données Supabase.</p>
        <button 
           onClick={() => exportToJSON(computed, 'full_history_dump')}
           className="mt-6 text-blue-600 font-bold hover:underline"
        >
          Exporter le dump JSON actuel
        </button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-in fade-in duration-500">
       <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Paramètres</h2>
        <p className="text-slate-500">Gestion des objectifs et profil</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5 text-slate-400" />
            Objectifs de déchets (%)
          </h3>
          <div className="space-y-4">
            {postes.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                <span className="text-sm font-medium text-slate-700">{p.nom}</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    step="0.1" 
                    defaultValue={p.objectif_dechet_percent}
                    disabled={userRole !== 'admin'}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-center font-bold text-blue-600 disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
          {userRole === 'admin' && (
            <button className="w-full mt-6 bg-slate-800 text-white py-3 rounded-2xl font-bold hover:bg-slate-900 transition-all">
              Mettre à jour les objectifs
            </button>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Profil Utilisateur</h3>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                A
              </div>
              <div>
                <p className="font-bold text-slate-800">Admin Production</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">{userRole}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-800 font-medium">admin@eco-production.fr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Dernière connexion</span>
                <span className="text-slate-800 font-medium">Aujourd'hui, 08:34</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
              <div>
                <h4 className="font-bold text-orange-900 mb-1">Zone de Danger</h4>
                <p className="text-sm text-orange-800 opacity-80 mb-4">Supprimer toutes les entrées du mois actuel réinitialisera les compteurs.</p>
                <button className="text-red-600 text-sm font-bold bg-white border border-red-100 px-4 py-2 rounded-xl hover:bg-red-50 transition-all">
                  Réinitialiser le mois
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-100 border border-white max-w-md w-full">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6 rotate-3">
              <span className="text-white text-4xl font-black">E</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 text-center tracking-tight">EcoProduction</h1>
            <p className="text-slate-400 font-medium mt-1">Plateforme de suivi industriel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Identifiant</label>
              <input 
                type="email" 
                defaultValue="admin@eco-production.fr"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 font-medium" 
                placeholder="email@compagnie.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Mot de passe</label>
              <input 
                type="password" 
                defaultValue="password"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 font-medium" 
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-2">
               <button 
                type="submit" 
                onClick={() => setUserRole('admin')}
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Accès Admin
              </button>
               <button 
                type="submit" 
                onClick={() => setUserRole('viewer')}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Accès Lecture
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400 font-medium">
            Contactez la maintenance pour tout problème d'accès.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userRole={userRole}
      onLogout={() => setIsLoggedIn(false)}
    >
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'saisie' && renderSaisie()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'settings' && renderSettings()}
    </Layout>
  );
};

export default App;
