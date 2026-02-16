
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
      alert("Sauvegardé !");
    } catch (err) {
      alert("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-white font-bold">Chargement...</div>;

  if (!user) return (
    <div className="h-screen bg-dashboard-light flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center mb-6">EcoTrack Login</h1>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
          const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
          try { await signInWithEmailAndPassword(auth, email, password); } 
          catch { setAuthError("Identifiants invalides"); }
        }} className="space-y-4">
          {authError && <div className="text-red-500 text-xs text-center font-bold">{authError}</div>}
          <input name="email" type="email" placeholder="Email" required className="w-full border p-4 rounded-xl font-bold"/>
          <input name="password" type="password" placeholder="Mot de passe" required className="w-full border p-4 rounded-xl font-bold"/>
          <button type="submit" className="w-full bg-primary-600 text-white p-4 rounded-xl font-bold uppercase">Connexion</button>
        </form>
      </div>
    </div>
  );

  const dashboardData = filterPosteId === 'all' ? computed : computed.filter(c => c.poste_id === filterPosteId);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole="admin" onLogout={() => signOut(auth)} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)}>
      {activeTab === 'dashboard' && (
        <div className="animate-in">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl mb-8 flex justify-between items-center">
            <h1 className="text-xl font-bold dark:text-white">Tableau de Bord</h1>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-700 border rounded-lg px-3 py-1.5 text-sm"/>
          </div>
          <StatsCards data={dashboardData} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {dashboardData.map((item) => (
              <div key={item.poste_id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border dark:border-slate-700">
                <h3 className="font-bold text-primary-600 dark:text-primary-400 mb-2 truncate">{item.poste_nom}</h3>
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
          <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg flex justify-between items-center">
            <h2 className="text-2xl font-bold dark:text-white">Saisie de Production</h2>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-700 border rounded-xl px-4 py-2 text-sm font-bold"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MOCK_POSTES.map(poste => {
              const entry = entries.find(e => e.poste_id === poste.id);
              const comp = computed.find(c => c.poste_id === poste.id);
              return (
                <div key={poste.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border dark:border-slate-700 overflow-hidden">
                  <div className="p-4 border-b dark:border-slate-700 flex justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-primary-700 dark:text-primary-400 text-xs truncate">{poste.nom}</h3>
                    <span className="text-[10px] text-slate-400 font-bold">Obj: {poste.objectif_dechet_percent}%</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(shift => (
                      <div key={shift} className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Shift {shift}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" step="any" value={entry ? (entry as any)[`s${shift}_dechets`] : ''} onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'dechets', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-2 py-1.5 text-xs font-bold dark:text-white" placeholder="Déchets"/>
                          <input type="number" step="any" value={entry ? (entry as any)[`s${shift}_produit`] : ''} onChange={(e) => updateEntry(poste.id, shift as 1|2|3, 'produit', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-2 py-1.5 text-xs font-bold dark:text-white" placeholder="Prod"/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 border-t dark:border-slate-700 flex justify-between items-center">
                    <span className="font-black text-lg dark:text-white">{comp ? comp.taux_global.toFixed(2) : '0.00'}%</span>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${comp?.status === 'conforme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{comp?.status || 'conforme'}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center pb-8">
            <button onClick={saveToFirebase} disabled={saving} className="bg-primary-600 text-white px-12 py-4 rounded-2xl font-bold shadow-xl">
              {saving ? 'EN COURS...' : 'VALIDER'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
