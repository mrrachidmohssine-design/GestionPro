
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
  const [filterPosteId, setFilterPosteId] = useState('all');
  
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

  const dashboardData = filterPosteId === 'all' 
    ? computed 
    : computed.filter(c => c.poste_id === filterPosteId);

  const renderDashboard = () => (
    <div className="animate-in fade-in duration-500">
      {/* HEADER SECTION FROM IMAGE */}
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-4xl">📊</span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            Suivi Déchets Production - Tableau de Bord
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filtrer par poste:</span>
            <select 
              value={filterPosteId}
              onChange={(e) => setFilterPosteId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium min-w-[180px]"
            >
              <option value="all">Tous les postes</option>
              {postes.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>

          <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all text-sm flex items-center gap-2">
            Calculer & Actualiser
          </button>
        </div>
      </div>

      <StatsCards data={dashboardData} />
      
      <ChartsSection data={computed} selectedPosteId={filterPosteId} />

      <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Détails de la performance</h3>
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
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-black">
              <tr>
                <th className="px-6 py-4">Poste</th>
                <th className="px-6 py-4 text-center">Taux (%)</th>
                <th className="px-6 py-4 text-center">Déchets (kg)</th>
                <th className="px-6 py-4 text-center">Écart Obj</th>
                <th className="px-6 py-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dashboardData.map(item => (
                <tr key={item.poste_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700 text-sm">{item.poste_nom}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-slate-800 text-sm">
                      {item.taux_global.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-500 text-sm">{item.total_dechets.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${item.ecart > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      {item.ecart > 0 ? '+' : ''}{item.ecart.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      item.status === 'conforme' ? 'bg-green-100 text-green-700' :
                      item.status === 'attention' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
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
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Saisie des Déchets</h2>
          <p className="text-slate-500">Enregistrement quotidien par shift</p>
        </div>
        <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-indigo-100">
          Mode Admin
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {postes.map(poste => {
          const entry = entries.find(e => e.poste_id === poste.id);
          const comp = computed.find(c => c.poste_id === poste.id);
          return (
            <div key={poste.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden group">
              <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-black text-slate-700 text-xs truncate pr-2 uppercase tracking-wide" title={poste.nom}>{poste.nom}</h3>
                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-400 font-black">
                  OBJ: {poste.objectif_dechet_percent}%
                </span>
              </div>
              <div className="p-5 space-y-5">
                {[1, 2, 3].map(shift => (
                  <div key={shift} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${['bg-indigo-500', 'bg-violet-500', 'bg-pink-500'][shift-1]}`}></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Shift {shift}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input 
                          type="number"
                          value={entry?.[`s${shift}_dechets` as keyof DailyEntry] || ''}
                          onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'dechets', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-200 font-bold"
                          placeholder="Déchets kg"
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="number"
                          value={entry?.[`s${shift}_produit` as keyof DailyEntry] || ''}
                          onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'produit', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-200 font-bold"
                          placeholder="Produit kg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Taux Global</span>
                  <span className={`font-black text-lg ${comp?.status === 'alerte' ? 'text-red-500' : 'text-slate-800'}`}>
                    {comp?.taux_global.toFixed(2)}%
                  </span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                  comp?.status === 'conforme' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {comp?.status}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 flex justify-end">
        <button className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          VALIDER & SAUVEGARDER
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Historique Mensuel</h2>
          <p className="text-slate-500">Tendances et archivage</p>
        </div>
        <div className="flex gap-3">
          <input type="month" className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 shadow-sm outline-none font-bold" defaultValue="2024-03" />
          <button className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
            <ArrowPathIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-200">
          <ClockIcon className="w-12 h-12" />
        </div>
        <h3 className="font-black text-xl text-slate-800 mb-2 tracking-tight">Synchronisation de l'Historique</h3>
        <p className="text-slate-400 max-w-sm font-medium">Les vues historiques consolidées par mois seront disponibles après synchronisation avec la base de données de production.</p>
        <button 
           onClick={() => exportToJSON(computed, 'full_history_dump')}
           className="mt-8 bg-slate-100 text-slate-600 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Exporter JSON Brut
        </button>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-in fade-in duration-500">
       <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800">Configuration</h2>
        <p className="text-slate-500">Gestion des seuils et paramètres système</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3 text-lg">
            <Cog6ToothIcon className="w-6 h-6 text-indigo-500" />
            Objectifs Qualité (%)
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {postes.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">{p.nom}</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    step="0.1" 
                    defaultValue={p.objectif_dechet_percent}
                    disabled={userRole !== 'admin'}
                    className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-center font-black text-indigo-600 disabled:opacity-50 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] font-black text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
          {userRole === 'admin' && (
            <button className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:scale-[1.01] transition-all">
              ENREGISTRER LES MODIFICATIONS
            </button>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 mb-6 text-lg tracking-tight">Utilisateur Connecté</h3>
            <div className="flex items-center gap-5 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-100">
                {userRole === 'admin' ? 'AD' : 'VW'}
              </div>
              <div>
                <p className="font-black text-slate-800 text-lg">Responsable Production</p>
                <p className="text-[10px] text-indigo-400 uppercase font-black tracking-[0.2em]">{userRole}</p>
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex justify-between text-sm pb-4 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Identifiant</span>
                <span className="text-slate-800 font-black">admin@eco-track.tech</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Session active</span>
                <span className="text-indigo-600 font-black underline">Modifier le MDP</span>
              </div>
            </div>
          </div>

          <div className="bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100">
            <div className="flex gap-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-rose-500" />
              <div>
                <h4 className="font-black text-rose-900 mb-1 text-lg">Maintenance Données</h4>
                <p className="text-sm text-rose-800 opacity-80 mb-6 leading-relaxed">Cette opération réinitialise définitivement les entrées de la journée en cours. Aucun retour possible.</p>
                <button className="text-white text-xs font-black bg-rose-500 px-6 py-3 rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 uppercase tracking-widest">
                  Reset Journalier
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
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-indigo-200/50 border border-white max-w-md w-full">
          <div className="flex flex-col items-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-300 mb-8 rotate-3">
              <span className="text-white text-5xl font-black">E</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 text-center tracking-tighter">EcoTrack</h1>
            <div className="h-1 w-12 bg-indigo-500 rounded-full mt-3"></div>
            <p className="text-slate-400 font-bold mt-4 uppercase text-[10px] tracking-[0.3em]">Suivi Industriel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Email</label>
              <input 
                type="email" 
                defaultValue="admin@eco-track.tech"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-slate-800 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 font-bold" 
                placeholder="votre@email.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Code Secret</label>
              <input 
                type="password" 
                defaultValue="password"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-slate-800 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 font-bold" 
                placeholder="••••••••"
              />
            </div>
            <div className="flex flex-col gap-3 pt-4">
               <button 
                type="submit" 
                onClick={() => setUserRole('admin')}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Accès Administrateur
              </button>
               <button 
                type="submit" 
                onClick={() => setUserRole('viewer')}
                className="w-full bg-slate-800 text-white font-black py-5 rounded-2xl hover:bg-black transition-all text-sm uppercase tracking-widest"
              >
                Mode Consultation
              </button>
            </div>
          </form>

          <p className="mt-12 text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            © 2024 EcoTrack Industrial Solutions
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
