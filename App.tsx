
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
  ListBulletIcon
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPosteId, setFilterPosteId] = useState('all');
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  const computed = useMemo(() => {
    return entries.map(entry => {
      const poste = MOCK_POSTES.find(p => p.id === entry.poste_id);
      if (!poste) return null;
      return computeEntryData(entry, poste);
    }).filter((item): item is ComputedEntry => item !== null);
  }, [entries]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
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
      const fetched: DailyEntry[] = [];
      querySnapshot.forEach((doc) => fetched.push(doc.data() as DailyEntry));

      const fullEntries = MOCK_POSTES.map(p => {
        const existing = fetched.find(e => e.poste_id === p.id);
        return existing || {
          date: selectedDate,
          poste_id: p.id,
          s1_dechets: '0',
          s1_produit: '0',
          s2_dechets: '0',
          s2_produit: '0',
          s3_dechets: '0',
          s3_produit: '0',
        };
      });
      setEntries(fullEntries);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, user]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  const updateEntry = (posteId: string, shift: 1 | 2 | 3, field: 'dechets' | 'produit', value: string) => {
    setEntries(prev => prev.map(entry => {
      if (entry.poste_id === posteId) {
        return { ...entry, [`s${shift}_${field}`]: value };
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
        batch.set(docRef, {
          ...entry,
          s1_dechets: Number(entry.s1_dechets) || 0,
          s1_produit: Number(entry.s1_produit) || 0,
          s2_dechets: Number(entry.s2_dechets) || 0,
          s2_produit: Number(entry.s2_produit) || 0,
          s3_dechets: Number(entry.s3_dechets) || 0,
          s3_produit: Number(entry.s3_produit) || 0,
          updated_at: new Date().toISOString(),
          created_by: user.uid
        });
      });
      await batch.commit();
      alert("Sauvegardé avec succès !");
    } catch (err) {
      alert("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-dashboard-light dark:bg-dashboard-dark">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-dashboard-light flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-in">
        <div className="flex flex-col items-center mb-8">
           <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <span className="text-white text-3xl font-bold">E</span>
           </div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tight">EcoTrack</h1>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
          const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
          try { await signInWithEmailAndPassword(auth, email, password); } 
          catch { setAuthError("Email ou mot de passe incorrect"); }
        }} className="space-y-4">
          {authError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs text-center font-bold border border-rose-100">{authError}</div>}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
            <input name="email" type="email" placeholder="votre@email.com" required className="w-full border border-slate-200 bg-slate-50 p-4 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mot de passe</label>
            <input name="password" type="password" placeholder="••••••••" required className="w-full border border-slate-200 bg-slate-50 p-4 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
          </div>
          <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary-200 transition-all mt-4 active:scale-95">
            Se Connecter
          </button>
        </form>
      </div>
    </div>
  );

  const dashboardData = filterPosteId === 'all' ? computed : computed.filter(c => c.poste_id === filterPosteId);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole="admin" onLogout={() => signOut(auth)} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)}>
      {activeTab === 'dashboard' && (
        <div className="animate-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-xl font-bold dark:text-white flex items-center gap-3">
               <span className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">📊</span>
               Tableau de Bord
            </h1>
            <div className="flex items-center gap-3">
               <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-bold dark:text-white outline-none"/>
               <button onClick={fetchData} className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <ClockIcon className="w-5 h-5" />
               </button>
            </div>
          </div>
          <StatsCards data={dashboardData} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {dashboardData.map((item) => (
              <div key={item.poste_id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow group">
                <h3 className="font-bold text-primary-600 dark:text-primary-400 mb-2 truncate text-sm group-hover:text-primary-500">{item.poste_nom}</h3>
                <div className="flex justify-between items-end">
                   <span className="text-2xl font-black dark:text-white">{item.taux_global.toFixed(2)}%</span>
                   <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'conforme' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.status}</div>
                </div>
              </div>
            ))}
          </div>
          <ChartsSection data={computed} selectedPosteId={filterPosteId} />
        </div>
      )}
      {activeTab === 'saisie' && (
        <div className="animate-in">
          <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg flex justify-between items-center border border-slate-100 dark:border-slate-700">
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-3">
               <span className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">✍️</span>
               Saisie de Production
            </h2>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold dark:text-white outline-none"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MOCK_POSTES.map(poste => {
              const entry = entries.find(e => e.poste_id === poste.id);
              const comp = computed.find(c => c.poste_id === poste.id);
              return (
                <div key={poste.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden hover:border-primary-200 transition-colors">
                  <div className="p-4 border-b border-slate-50 dark:border-slate-700 flex justify-between bg-slate-50/50 dark:bg-slate-900/50 items-center">
                    <h3 className="font-bold text-slate-800 dark:text-primary-400 text-xs truncate max-w-[140px]">{poste.nom}</h3>
                    <span className="text-[10px] bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-400 font-bold border border-slate-100 dark:border-slate-600">Obj: {poste.objectif_dechet_percent}%</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(shift => (
                      <div key={shift} className="space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Shift {shift}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[7px] font-bold text-slate-400 uppercase ml-1">Déchets</label>
                            <input 
                              type="number" 
                              step="any" 
                              value={entry ? (entry as any)[`s${shift}_dechets`] : ''} 
                              onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'dechets', e.target.value)} 
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold dark:text-white focus:ring-1 focus:ring-primary-400 outline-none" 
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[7px] font-bold text-slate-400 uppercase ml-1">Prod</label>
                            <input 
                              type="number" 
                              step="any" 
                              value={entry ? (entry as any)[`s${shift}_produit`] : ''} 
                              onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'produit', e.target.value)} 
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold dark:text-white focus:ring-1 focus:ring-primary-400 outline-none" 
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Taux Jour</span>
                      <span className="font-black text-lg dark:text-white">{comp ? comp.taux_global.toFixed(2) : '0.00'}%</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${comp?.status === 'conforme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{comp?.status || 'conforme'}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center pb-12">
            <button onClick={saveToFirebase} disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white px-16 py-4 rounded-2xl font-bold shadow-xl shadow-primary-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-3">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  SAUVEGARDE...
                </>
              ) : (
                <>
                  VALIDER LA SAISIE
                  <ChevronRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
