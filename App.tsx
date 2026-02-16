
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Poste, DailyEntry, ComputedEntry, Role } from './types';
import { computeEntryData } from './utils/calculations';
import Layout from './components/Layout';
import StatsCards from './components/StatsCards';
import ChartsSection from './components/ChartsSection';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDocs, getDoc, query, where, writeBatch, setDoc } from 'firebase/firestore';
import { 
  ChevronRightIcon, 
  ClockIcon, 
  FunnelIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

const DEFAULT_POSTES: Poste[] = [
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
  const [role, setRole] = useState<Role>('viewer');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPosteId, setFilterPosteId] = useState('all');
  
  const [postes, setPostes] = useState<Poste[]>(DEFAULT_POSTES);
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  // Memoized computation logic
  const computed = useMemo(() => {
    return entries.map(entry => {
      const poste = postes.find(p => p.id === entry.poste_id);
      if (!poste) return null;
      return computeEntryData(entry, poste);
    }).filter((item): item is ComputedEntry => item !== null);
  }, [entries, postes]);

  // Handle Dark Mode
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Auth & Role Detection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch role from Firestore
        try {
          const profileDoc = await getDoc(doc(db, "profiles", currentUser.uid));
          if (profileDoc.exists()) {
            setRole(profileDoc.data().role as Role);
          } else {
            // Default to viewer and create profile
            await setDoc(doc(db, "profiles", currentUser.uid), { email: currentUser.email, role: 'viewer' });
            setRole('viewer');
          }
        } catch (e) { console.error("Error role:", e); }
      } else {
        setUser(null);
        setRole('viewer');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Data (Postes & Entries)
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Postes (Settings)
      const postesSnap = await getDocs(collection(db, "postes"));
      const fetchedPostes: Poste[] = [];
      postesSnap.forEach(doc => fetchedPostes.push({ ...doc.data() as Poste, id: doc.id }));
      if (fetchedPostes.length > 0) setPostes(fetchedPostes);

      // 2. Fetch Entries
      const q = query(collection(db, "daily_entries"), where("date", "==", selectedDate));
      const querySnapshot = await getDocs(q);
      const fetchedEntries: DailyEntry[] = [];
      querySnapshot.forEach((doc) => fetchedEntries.push(doc.data() as DailyEntry));

      const finalEntries = (fetchedPostes.length > 0 ? fetchedPostes : DEFAULT_POSTES).map(p => {
        const existing = fetchedEntries.find(e => e.poste_id === p.id);
        return existing || {
          date: selectedDate,
          poste_id: p.id,
          s1_dechets: '0', s1_produit: '0',
          s2_dechets: '0', s2_produit: '0',
          s3_dechets: '0', s3_produit: '0',
        };
      });
      setEntries(finalEntries);
    } catch (err) { console.error("Fetch error:", err); } 
    finally { setLoading(false); }
  }, [selectedDate, user]);

  useEffect(() => { if (user) fetchData(); }, [fetchData, user]);

  // Saisie Handlers
  const updateEntryValue = (posteId: string, shift: 1 | 2 | 3, field: 'dechets' | 'produit', value: string) => {
    if (role !== 'admin') return;
    setEntries(prev => prev.map(entry => {
      if (entry.poste_id === posteId) {
        return { ...entry, [`s${shift}_${field}`]: value };
      }
      return entry;
    }));
  };

  const saveEntries = async () => {
    if (role !== 'admin') return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      entries.forEach((entry) => {
        const docId = `${entry.date}_${entry.poste_id}`;
        batch.set(doc(db, "daily_entries", docId), {
          ...entry,
          updated_at: new Date().toISOString(),
          created_by: user?.uid
        });
      });
      await batch.commit();
      alert("Saisie enregistrée !");
    } catch (err) { alert("Erreur lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  // Settings Handlers
  const updatePosteObjective = (id: string, newObjective: string) => {
    setPostes(prev => prev.map(p => p.id === id ? { ...p, objectif_dechet_percent: parseFloat(newObjective) || 0 } : p));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      postes.forEach(p => {
        batch.set(doc(db, "postes", p.id), p);
      });
      await batch.commit();
      alert("Objectifs mis à jour !");
    } catch (err) { alert("Erreur sauvegarde paramètres."); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-dashboard-light dark:bg-dashboard-dark">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-dashboard-light flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-in">
        <h1 className="text-2xl font-black text-center mb-8 text-slate-800 tracking-tight">EcoTrack Login</h1>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
          const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
          try { await signInWithEmailAndPassword(auth, email, password); } 
          catch { setAuthError("Identifiants incorrects"); }
        }} className="space-y-4">
          {authError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs text-center font-bold">{authError}</div>}
          <input name="email" type="email" placeholder="Email" required className="w-full border p-4 rounded-xl font-bold bg-slate-50"/>
          <input name="password" type="password" placeholder="Mot de passe" required className="w-full border p-4 rounded-xl font-bold bg-slate-50"/>
          <button type="submit" className="w-full bg-primary-600 text-white p-4 rounded-xl font-bold uppercase shadow-lg shadow-primary-100">Connexion</button>
        </form>
      </div>
    </div>
  );

  const dashboardData = filterPosteId === 'all' ? computed : computed.filter(c => c.poste_id === filterPosteId);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole={role} onLogout={() => signOut(auth)} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)}>
      {activeTab === 'dashboard' && (
        <div className="animate-in space-y-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-primary-500" />
              Vue d'ensemble
            </h1>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select 
                value={filterPosteId} 
                onChange={(e) => setFilterPosteId(e.target.value)}
                className="flex-1 md:w-64 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold dark:text-white outline-none"
              >
                <option value="all">Tous les postes</option>
                {postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold dark:text-white outline-none"/>
            </div>
          </div>
          <StatsCards data={dashboardData} />
          <ChartsSection data={computed} selectedPosteId={filterPosteId} />
        </div>
      )}

      {activeTab === 'saisie' && (
        <div className="animate-in space-y-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg flex justify-between items-center border border-slate-100 dark:border-slate-700">
            <h2 className="text-2xl font-bold dark:text-white">Journée du {new Date(selectedDate).toLocaleDateString('fr-FR')}</h2>
            {role !== 'admin' && <div className="text-amber-500 text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-800">Lecture seule</div>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {postes.map(poste => {
              const entry = entries.find(e => e.poste_id === poste.id);
              const comp = computed.find(c => c.poste_id === poste.id);
              return (
                <div key={poste.id} className={`bg-white dark:bg-slate-800 rounded-3xl shadow-lg border transition-all ${comp?.status === 'alerte' ? 'border-rose-200 shadow-rose-50' : 'border-slate-100 dark:border-slate-700'}`}>
                  <div className="p-4 border-b dark:border-slate-700 flex justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-800 dark:text-primary-400 text-xs truncate max-w-[150px]">{poste.nom}</h3>
                    <span className="text-[10px] text-slate-400 font-bold">Obj: {poste.objectif_dechet_percent}%</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(shift => (
                      <div key={shift} className="space-y-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Shift {shift}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="number" step="any"
                            disabled={role !== 'admin'}
                            value={entry ? (entry as any)[`s${shift}_dechets`] : ''} 
                            onChange={(e) => updateEntryValue(poste.id, shift as 1|2|3, 'dechets', e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-2 py-2 text-xs font-bold dark:text-white focus:ring-1 focus:ring-primary-500 outline-none disabled:opacity-50" 
                            placeholder="Déchets kg"
                          />
                          <input 
                            type="number" step="any"
                            disabled={role !== 'admin'}
                            value={entry ? (entry as any)[`s${shift}_produit`] : ''} 
                            onChange={(e) => updateEntryValue(poste.id, shift as 1|2|3, 'produit', e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-2 py-2 text-xs font-bold dark:text-white focus:ring-1 focus:ring-primary-500 outline-none disabled:opacity-50" 
                            placeholder="Prod. kg"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 border-t dark:border-slate-700 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[7px] text-slate-400 font-bold uppercase">Taux Jour</span>
                      <span className="font-black text-lg dark:text-white">{comp ? comp.taux_global.toFixed(2) : '0.00'}%</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                      comp?.status === 'conforme' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      comp?.status === 'attention' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {comp?.status || 'conforme'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {role === 'admin' && (
            <div className="mt-10 flex justify-center pb-12">
              <button onClick={saveEntries} disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white px-16 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 transition-transform active:scale-95">
                {saving ? "SAUVEGARDE..." : <>ENREGISTRER LA SAISIE <ChevronRightIcon className="w-5 h-5" /></>}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && role === 'admin' && (
        <div className="animate-in space-y-8">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-3xl font-black dark:text-white tracking-tight">Objectifs de Production</h2>
              <p className="text-slate-400 text-sm mt-1">Configurez les seuils de tolérance aux déchets par poste.</p>
            </div>
            <button onClick={saveSettings} disabled={saving} className="w-full md:w-auto bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2">
              <CheckCircleIcon className="w-5 h-5" /> Enregistrer tout
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation Poste</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Seuil (%)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut Actuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {postes.map((poste) => (
                    <tr key={poste.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-200">{poste.nom}</td>
                      <td className="px-6 py-5">
                        <div className="relative">
                          <input 
                            type="number" step="0.1"
                            value={poste.objectif_dechet_percent}
                            onChange={(e) => updatePosteObjective(poste.id, e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-black text-primary-600 outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="absolute right-4 top-2 text-slate-300 font-bold">%</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> ACTIF
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
