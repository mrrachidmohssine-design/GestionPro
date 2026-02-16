
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Poste, DailyEntry, ComputedEntry, Role } from './types';
import { computeEntryData } from './utils/calculations';
import { exportToCSV } from './utils/export';
import Layout from './components/Layout';
import StatsCards from './components/StatsCards';
import ChartsSection from './components/ChartsSection';
import { auth, db } from './firebase'; // Import centralisé de l'instance auth
import { 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth'; // Import des méthodes uniquement
import { collection, doc, getDocs, getDoc, query, where, writeBatch } from 'firebase/firestore';
import { 
  FunnelIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  LockClosedIcon,
  UserIcon
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
  const [userRole, setUserRole] = useState<Role>('viewer');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPosteId, setFilterPosteId] = useState('all');
  
  const [postes, setPostes] = useState<Poste[]>(DEFAULT_POSTES);
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  const computed = useMemo(() => {
    return entries.map(entry => {
      const poste = postes.find(p => p.id === entry.poste_id);
      if (!poste) return null;
      return computeEntryData(entry, poste);
    }).filter((item): item is ComputedEntry => item !== null);
  }, [entries, postes]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Auth Logic utilisant l'instance partagée 'auth'
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.isAnonymous) {
          setUserRole('viewer');
        } else {
          const snap = await getDoc(doc(db, "profiles", currentUser.uid));
          setUserRole(snap.exists() ? snap.data().role : 'viewer');
        }
      } else {
        setUser(null);
        setUserRole('viewer');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const postesSnap = await getDocs(collection(db, "postes"));
      const fetchedPostes: Poste[] = [];
      postesSnap.forEach(d => fetchedPostes.push({ ...d.data() as Poste, id: d.id }));
      if (fetchedPostes.length > 0) setPostes(fetchedPostes);

      const q = query(collection(db, "daily_entries"), where("date", "==", selectedDate));
      const entrySnap = await getDocs(q);
      const fetchedEntries: DailyEntry[] = [];
      entrySnap.forEach(d => fetchedEntries.push(d.data() as DailyEntry));

      const finalEntries = (fetchedPostes.length > 0 ? fetchedPostes : DEFAULT_POSTES).map(p => {
        const existing = fetchedEntries.find(e => e.poste_id === p.id);
        return existing || {
          date: selectedDate,
          poste_id: p.id,
          s1_dechets: 0, s1_produit: 0,
          s2_dechets: 0, s2_produit: 0,
          s3_dechets: 0, s3_produit: 0,
        };
      });
      setEntries(finalEntries);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [selectedDate, user]);

  useEffect(() => { if (user) fetchData(); }, [fetchData, user]);

  const handleUpdateSaisie = (posteId: string, shift: 1|2|3, field: 'dechets'|'produit', val: string) => {
    if (userRole !== 'admin') return;
    setEntries(prev => prev.map(e => e.poste_id === posteId ? { ...e, [`s${shift}_${field}`]: val } : e));
  };

  const handleSaveSaisie = async () => {
    if (userRole !== 'admin') return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      entries.forEach(e => {
        const id = `${e.date}_${e.poste_id}`;
        batch.set(doc(db, "daily_entries", id), { ...e, updated_at: new Date().toISOString() });
      });
      await batch.commit();
      alert("Données sauvegardées !");
    } catch (e) { alert("Erreur de sauvegarde"); } finally { setSaving(false); }
  };

  const handleSaveSettings = async () => {
    if (userRole !== 'admin') return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      postes.forEach(p => batch.set(doc(db, "postes", p.id), p));
      await batch.commit();
      alert("Objectifs mis à jour !");
    } catch (e) { alert("Erreur"); } finally { setSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center dark:text-white">Chargement...</div>;

  if (!user) return (
    <div className="h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">EcoTrack v2.0</h1>
        </div>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
          const pass = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
          try { await signInWithEmailAndPassword(auth, email, pass); } catch { setAuthError("Identifiants incorrects"); }
        }} className="space-y-4">
          {authError && <div className="text-rose-500 text-xs text-center font-bold">{authError}</div>}
          <div className="relative">
            <UserIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
            <input name="email" type="email" placeholder="Email Admin" required className="w-full bg-slate-50 border-none p-4 pl-12 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"/>
          </div>
          <div className="relative">
            <LockClosedIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
            <input name="password" type="password" placeholder="Mot de passe" required className="w-full bg-slate-50 border-none p-4 pl-12 rounded-xl font-bold focus:ring-2 focus:ring-primary-500 outline-none"/>
          </div>
          <button type="submit" className="w-full bg-primary-600 text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">Connexion Admin</button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase">Ou</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button onClick={() => signInAnonymously(auth)} className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
          Accès Visiteur (Lecture seule)
        </button>
      </div>
    </div>
  );

  const filteredData = filterPosteId === 'all' ? computed : computed.filter(c => c.poste_id === filterPosteId);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} onLogout={() => signOut(auth)} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)}>
      {activeTab === 'dashboard' && (
        <div className="animate-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow flex flex-col md:flex-row justify-between items-center gap-4 border dark:border-slate-700">
            <h2 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-primary-500" /> Vue Interactive
            </h2>
            <div className="flex gap-2 w-full md:w-auto">
              <select value={filterPosteId} onChange={(e) => setFilterPosteId(e.target.value)} className="flex-1 md:w-64 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold dark:text-white outline-none">
                <option value="all">Tous les postes</option>
                {postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold dark:text-white outline-none"/>
            </div>
          </div>
          <StatsCards data={filteredData} />
          <ChartsSection data={computed} selectedPosteId={filterPosteId} />
        </div>
      )}

      {activeTab === 'saisie' && (
        <div className="animate-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow flex justify-between items-center border dark:border-slate-700">
            <h2 className="text-xl font-bold dark:text-white">Saisie - {new Date(selectedDate).toLocaleDateString('fr-FR')}</h2>
            {userRole === 'admin' ? (
              <button onClick={handleSaveSaisie} disabled={saving} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg disabled:opacity-50">
                {saving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            ) : (
              <span className="text-rose-500 text-[10px] font-black uppercase border border-rose-200 px-3 py-1 rounded-full bg-rose-50">Lecture Seule</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {postes.map(poste => {
              const entry = entries.find(e => e.poste_id === poste.id);
              const comp = computed.find(c => c.poste_id === poste.id);
              return (
                <div key={poste.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow border dark:border-slate-700 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-b dark:border-slate-700 flex justify-between">
                    <span className="text-[10px] font-bold dark:text-primary-400 uppercase truncate max-w-[150px]">{poste.nom}</span>
                    <span className="text-[10px] font-bold text-slate-400">Obj: {poste.objectif_dechet_percent}%</span>
                  </div>
                  <div className="p-3 space-y-3">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Shift {s} Déchets</label>
                          <input type="number" step="any" disabled={userRole !== 'admin'} value={entry?.[`s${s}_dechets` as keyof DailyEntry] || ''} onChange={(e) => handleUpdateSaisie(poste.id, s as any, 'dechets', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded p-2 text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-primary-500" placeholder="0"/>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Shift {s} Prod</label>
                          <input type="number" step="any" disabled={userRole !== 'admin'} value={entry?.[`s${s}_produit` as keyof DailyEntry] || ''} onChange={(e) => handleUpdateSaisie(poste.id, s as any, 'produit', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded p-2 text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-primary-500" placeholder="0"/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/20 border-t dark:border-slate-700 flex justify-between items-center">
                     <span className="text-lg font-black dark:text-white">{comp ? comp.taux_global.toFixed(2) : '0.00'}%</span>
                     <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                       comp?.status === 'conforme' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                       comp?.status === 'attention' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                     }`}>{comp?.status || 'conforme'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow border dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <CalendarDaysIcon className="w-6 h-6 text-primary-500" /> Rapports & Exports
            </h2>
            <div className="flex gap-2">
              <button onClick={() => exportToCSV(computed, `Rapport_${selectedDate}`)} className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-white">
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow overflow-hidden border dark:border-slate-700">
             <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="p-4 font-black uppercase text-slate-400">Poste</th>
                    <th className="p-4 font-black uppercase text-slate-400">Déchets</th>
                    <th className="p-4 font-black uppercase text-slate-400">Prod.</th>
                    <th className="p-4 font-black uppercase text-slate-400">Taux (%)</th>
                    <th className="p-4 font-black uppercase text-slate-400">Objectif</th>
                    <th className="p-4 font-black uppercase text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {computed.map(c => (
                    <tr key={c.poste_id} className="dark:text-slate-200">
                      <td className="p-4 font-bold">{c.poste_nom}</td>
                      <td className="p-4">{c.total_dechets.toFixed(1)} kg</td>
                      <td className="p-4">{c.total_produit.toFixed(1)} kg</td>
                      <td className="p-4 font-black">{c.taux_global.toFixed(2)}%</td>
                      <td className="p-4 text-slate-400">{c.objectif}%</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-bold ${
                          c.status === 'conforme' ? 'text-emerald-500' : c.status === 'attention' ? 'text-amber-500' : 'text-rose-500'
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && userRole === 'admin' && (
        <div className="animate-in space-y-6">
           <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow border dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black dark:text-white">Paramètres Objectifs</h2>
                <p className="text-slate-400 text-sm">Ajustez les seuils (%) par poste.</p>
              </div>
              <button onClick={handleSaveSettings} disabled={saving} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg">
                <CheckCircleIcon className="w-5 h-5 inline mr-2" /> {saving ? "Ajustement..." : "Appliquer"}
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {postes.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 shadow flex justify-between items-center">
                  <span className="font-bold dark:text-white text-sm">{p.nom}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={p.objectif_dechet_percent} onChange={(e) => setPostes(prev => prev.map(item => item.id === p.id ? { ...item, objectif_dechet_percent: parseFloat(e.target.value) || 0 } : item))} className="w-20 bg-slate-50 dark:bg-slate-900 border dark:border-slate-600 p-2 rounded-lg font-black text-center text-primary-500 outline-none"/>
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
