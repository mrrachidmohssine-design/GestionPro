
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Poste, DailyEntry, ComputedEntry } from './types';
import { computeEntryData } from './utils/calculations';
import { exportToCSV, exportToJSON } from './utils/export';
import Layout from './components/Layout';
import StatsCards from './components/StatsCards';
import ChartsSection from './components/ChartsSection';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { 
  ChevronRightIcon, 
  ClockIcon,
  Squares2X2Icon,
  ListBulletIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/solid';

const MOCK_POSTES: Poste[] = [
  { id: '1', nom: 'Plaques Métal déployé', objectif_dechet_percent: 2.0, actif: true },
  { id: '2', nom: 'Plaques Empateuse', objectif_dechet_percent: 3.5, actif: true },
  { id: '3', nom: 'Oxyde 1', objectif_dechet_percent: 1.5, actif: true },
  { id: '4', nom: 'Oxyde 2', objectif_dechet_percent: 1.5, actif: true },
  { id: '5', nom: 'Plaques TBS', objectif_dechet_percent: 2.5, actif: true },
  { id: '6', nom: 'Empochteuse DAGA', objectif_dechet_percent: 4.0, actif: true },
  { id: '7', nom: 'Empochteuse COSMEC', objectif_dechet_percent: 4.0, actif: true },
  { id: '8', nom: 'Empochteuse BATEK 1', objectif_dechet_percent: 4.0, actif: true },
  { id: '9', nom: 'Empochteuse BATEK 2', objectif_dechet_percent: 4.0, actif: true },
  { id: '10', nom: 'COS 1', objectif_dechet_percent: 1.8, actif: true },
  { id: '11', nom: 'COS 2', objectif_dechet_percent: 1.8, actif: true },
  { id: '12', nom: 'COS BATEK', objectif_dechet_percent: 2.0, actif: true },
  { id: '13', nom: 'Formation', objectif_dechet_percent: 1.0, actif: true },
  { id: '14', nom: 'HRD', objectif_dechet_percent: 2.2, actif: true },
  { id: '15', nom: 'Fardelage', objectif_dechet_percent: 0.5, actif: true },
  { id: '16', nom: 'Batteries Montage / Assemblage', objectif_dechet_percent: 1.5, actif: true },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [userRole] = useState<'admin' | 'viewer'>('admin');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardView, setDashboardView] = useState<'grid' | 'table'>('grid');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPosteId, setFilterPosteId] = useState('all');
  
  const [postes] = useState<Poste[]>(MOCK_POSTES);
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  const computed = useMemo(() => {
    return entries.map(entry => {
      const poste = postes.find(p => p.id === entry.poste_id);
      if (!poste) return null;
      return computeEntryData(entry, poste);
    }).filter((item): item is ComputedEntry => item !== null);
  }, [entries, postes]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "daily_entries"), where("date", "==", selectedDate));
      const querySnapshot = await getDocs(q);
      const fetchedEntries: DailyEntry[] = [];
      querySnapshot.forEach((doc) => {
        fetchedEntries.push(doc.data() as DailyEntry);
      });

      const fullEntries = postes.map(p => {
        const existing = fetchedEntries.find(e => e.poste_id === p.id);
        return existing || {
          date: selectedDate,
          poste_id: p.id,
          s1_dechets: 0,
          s1_produit: 0,
          s2_dechets: 0,
          s2_produit: 0,
          s3_dechets: 0,
          s3_produit: 0,
        };
      });
      setEntries(fullEntries);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, user, postes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const form = e.currentTarget as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("L'utilisateur existe déjà.");
      } else if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password'
      ) {
        setAuthError("Email ou mot de passe incorrect.");
      } else {
        setAuthError("Une erreur inattendue est survenue.");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateEntry = (posteId: string, shift: 1 | 2 | 3, field: 'dechets' | 'produit', value: string) => {
    // On stocke la valeur brute (string) pour permettre la saisie de décimales fluides
    setEntries(prev => prev.map(entry => {
      if (entry.poste_id === posteId) {
        return {
          ...entry,
          [`s${shift}_${field}`]: value
        };
      }
      return entry;
    }));
  };

  const saveToFirebase = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      entries.forEach((entry) => {
        const docId = `${entry.date}_${entry.poste_id}`;
        const docRef = doc(db, "daily_entries", docId);
        // Conversion explicite en nombres lors de la sauvegarde
        const cleanedEntry = {
          ...entry,
          s1_dechets: Number(entry.s1_dechets) || 0,
          s1_produit: Number(entry.s1_produit) || 0,
          s2_dechets: Number(entry.s2_dechets) || 0,
          s2_produit: Number(entry.s2_produit) || 0,
          s3_dechets: Number(entry.s3_dechets) || 0,
          s3_produit: Number(entry.s3_produit) || 0,
          updated_at: new Date().toISOString(),
          created_by: user.uid
        };
        batch.set(docRef, cleanedEntry);
      });
      await batch.commit();
      alert("Données sauvegardées avec succès !");
    } catch (err) {
      console.error("Error saving data:", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const dashboardData = filterPosteId === 'all' 
    ? computed 
    : computed.filter(c => c.poste_id === filterPosteId);

  const renderDashboard = () => (
    <div className="animate-in">
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-xl border border-white/20 dark:border-slate-700 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-3xl">📊</span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
              Suivi Déchets Production - Tableau de Bord
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date:</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filtrer par poste:</span>
              <select 
                value={filterPosteId}
                onChange={(e) => setFilterPosteId(e.target.value)}
                className="bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 font-medium text-sm focus:ring-2 focus:ring-primary-500 outline-none min-w-[160px]"
              >
                <option value="all">Tous les postes</option>
                {postes.map(p => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchData} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg font-bold shadow-md transition-all text-sm flex items-center gap-2">
               Actualiser
            </button>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <button onClick={() => setDashboardView('grid')} className={`p-1.5 rounded-md transition-all ${dashboardView === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400'}`}>
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button onClick={() => setDashboardView('table')} className={`p-1.5 rounded-md transition-all ${dashboardView === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400'}`}>
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <StatsCards data={dashboardData} />
      {dashboardView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {dashboardData.map((item) => (
            <div key={item.poste_id} className="bg-white dark:bg-slate-800 rounded-3xl border border-white/20 dark:border-slate-700 shadow-lg overflow-hidden flex flex-col hover:shadow-xl transition-shadow">
              <div className="p-6 pb-2">
                <h3 className="font-bold text-primary-600 dark:text-primary-400 text-lg mb-2 truncate" title={item.poste_nom}>{item.poste_nom}</h3>
                <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md inline-block">
                  Objectif: {item.objectif}%
                </div>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/10">
                {[1, 2, 3].map((shift) => (
                  <div key={shift} className="space-y-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase text-center">S{shift}</p>
                    <div className="space-y-1">
                      <div className="bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-md p-1.5 text-center shadow-sm">
                        <p className="text-[7px] text-slate-400 font-bold uppercase mb-0.5 leading-none">Déchets</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{(item as any)[`s${shift}_dechets`]}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-md p-1.5 text-center shadow-sm">
                        <p className="text-[7px] text-slate-400 font-bold uppercase mb-0.5 leading-none">Prod</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{(item as any)[`s${shift}_produit`]}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center mt-auto">
                 <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Taux Global</span>
                    <span className={`text-xl font-bold ${item.status === 'alerte' ? 'text-rose-500' : item.status === 'attention' ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>
                      {item.taux_global.toFixed(2)}%
                    </span>
                 </div>
                 <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase border shadow-sm ${
                    item.status === 'conforme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 
                    item.status === 'attention' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : 
                    'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                  }`}>
                    {item.status}
                  </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-12 bg-white dark:bg-slate-800 rounded-3xl border border-white/20 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="table-container">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Poste</th>
                  <th className="px-6 py-4 text-center">Taux (%)</th>
                  <th className="px-6 py-4 text-center">Déchets (kg)</th>
                  <th className="px-6 py-4 text-center">Écart Obj</th>
                  <th className="px-6 py-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {dashboardData.map(item => (
                  <tr key={item.poste_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200 text-sm">{item.poste_nom}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-white text-sm">{item.taux_global.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400 text-sm">{item.total_dechets.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-bold ${item.ecart > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {item.ecart > 0 ? '+' : ''}{item.ecart.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'conforme' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                        item.status === 'attention' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
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
      )}
      <ChartsSection data={computed} selectedPosteId={filterPosteId} />
    </div>
  );

  const renderSaisie = () => (
    <div className="animate-in">
      <div className="mb-8 flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-white/20 dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Saisie de Production</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Enregistrement pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}</p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-slate-700 dark:text-white font-bold text-sm outline-none shadow-inner"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {postes.map(poste => {
          const entry = entries.find(e => e.poste_id === poste.id);
          const comp = computed.find(c => c.poste_id === poste.id);
          return (
            <div key={poste.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-white/20 dark:border-slate-700 overflow-hidden group">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-primary-50/30 dark:bg-primary-900/10">
                <h3 className="font-bold text-primary-700 dark:text-primary-400 text-xs truncate" title={poste.nom}>{poste.nom}</h3>
                <span className="text-[10px] bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-400 font-bold border border-slate-100 dark:border-slate-600">Obj: {poste.objectif_dechet_percent}%</span>
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(shift => (
                  <div key={shift} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Shift {shift}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7px] font-bold text-slate-400 uppercase ml-1">Déchets (kg)</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={(entry as any)?.[`s${shift}_dechets`] ?? ''}
                          onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'dechets', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-800 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-bold text-slate-400 uppercase ml-1">Prod (kg)</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={(entry as any)?.[`s${shift}_produit`] ?? ''}
                          onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'produit', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-800 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Taux Jour</span>
                  <span className={`font-bold text-lg ${comp?.status === 'alerte' ? 'text-rose-500' : comp?.status === 'attention' ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>
                    {comp ? `${comp.taux_global.toFixed(2)}%` : '0.00%'}
                  </span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                  comp?.status === 'conforme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  comp?.status === 'attention' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                  'bg-rose-50 text-rose-700 border-rose-100'
                }`}>{comp?.status || 'conforme'}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-10 flex justify-center pb-8">
        <button 
          onClick={saveToFirebase}
          disabled={saving}
          className={`bg-primary-600 hover:bg-primary-700 text-white px-12 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-lg ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {saving ? 'SAUVEGARDE...' : 'VALIDER & SAUVEGARDER'}
          {!saving && <ChevronRightIcon className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in">
      <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl shadow-xl border border-white/20 dark:border-slate-700 flex flex-col items-center justify-center text-center min-h-[400px]">
        <ClockIcon className="w-20 h-20 text-indigo-100 dark:text-slate-700 mb-6" />
        <h3 className="font-bold text-2xl text-slate-800 dark:text-white mb-2">Historique de Production</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">Les données sont synchronisées en temps réel via Firestore.</p>
        <div className="flex gap-4">
          <button onClick={() => exportToJSON(computed, 'eco_data')} className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all">Export JSON</button>
          <button onClick={() => exportToCSV(computed, 'eco_data')} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-700 transition-all">Export CSV</button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-white/20 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 text-xl">Profil & Apparence</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">{user?.email?.[0].toUpperCase()}</div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{user?.email}</p>
                <span className="text-xs text-primary-600 font-bold uppercase tracking-widest">Accès {userRole}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-600 dark:text-slate-400">Mode Sombre</span>
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? 'bg-primary-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dashboard-light dark:bg-dashboard-dark">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-dashboard-light dark:bg-dashboard-dark flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-white/20">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center shadow-xl mb-6">
              <span className="text-white text-4xl font-black">E</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">EcoTrack</h1>
            <p className="text-slate-400 text-sm font-semibold uppercase mt-2">{isSignUp ? 'Créer un compte' : 'Connexion'}</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-5">
            {authError && <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-600 text-xs font-bold text-center">{authError}</div>}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Email</label>
              <input name="email" type="email" required className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl px-5 py-4 text-slate-800 dark:text-white outline-none font-bold focus:ring-2 focus:ring-primary-500" placeholder="admin@eco.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Mot de Passe</label>
              <input name="password" type="password" required className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl px-5 py-4 text-slate-800 dark:text-white outline-none font-bold focus:ring-2 focus:ring-primary-500" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-primary-700 transition-all text-sm uppercase tracking-widest mt-4">
              {isSignUp ? 'S\'inscrire' : 'Se Connecter'}
            </button>
            <div className="text-center pt-2">
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-primary-600 font-bold text-xs hover:underline tracking-tight">
                {isSignUp ? 'Déjà inscrit ? Connectez-vous' : 'Pas de compte ? Créez-en un'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'saisie' && renderSaisie()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'settings' && renderSettings()}
    </Layout>
  );
};

export default App;
