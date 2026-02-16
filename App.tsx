
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Poste, DailyEntry, ComputedEntry, Role } from './types';
import { computeEntryData } from './utils/calculations';
import { exportToCSV } from './utils/export';
import Layout from './components/Layout';
import StatsCards from './components/StatsCards';
import ChartsSection from './components/ChartsSection';
import { auth, db } from './firebase'; 
import { 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth'; 
import { collection, doc, getDocs, getDoc, query, where, writeBatch, setDoc } from 'firebase/firestore';
import { 
  FunnelIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  LockClosedIcon,
  UserIcon,
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
  const [userRole, setUserRole] = useState<Role>('viewer');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPosteId, setFilterPosteId] = useState('all');
  
  const [postes, setPostes] = useState<Poste[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  // Calcul des données formatées
  const computed = useMemo(() => {
    return entries.map(entry => {
      const poste = postes.find(p => p.id === entry.poste_id);
      if (!poste) return null;
      return computeEntryData(entry, poste);
    }).filter((item): item is ComputedEntry => item !== null);
  }, [entries, postes]);

  // Theme management
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Auth Listener : Récupère le rôle admin/viewer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.isAnonymous) {
          setUserRole('viewer');
        } else {
          try {
            const snap = await getDoc(doc(db, "profiles", currentUser.uid));
            if (snap.exists()) {
              setUserRole(snap.data().role as Role);
            } else {
              // Si le profil n'existe pas, on le crée par défaut en viewer
              await setDoc(doc(db, "profiles", currentUser.uid), {
                email: currentUser.email,
                role: 'viewer',
                updated_at: new Date().toISOString()
              });
              setUserRole('viewer');
            }
          } catch (e) {
            console.error("Erreur rôle:", e);
            setUserRole('viewer');
          }
        }
      } else {
        setUser(null);
        setUserRole('viewer');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetching Postes & Entries
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Charger les postes
      const postesSnap = await getDocs(collection(db, "postes"));
      let fetchedPostes: Poste[] = [];
      postesSnap.forEach(d => fetchedPostes.push({ ...d.data() as Poste, id: d.id }));
      
      if (fetchedPostes.length === 0) {
        fetchedPostes = DEFAULT_POSTES;
        // Optionnel: On ne sauvegarde pas auto pour éviter les écritures inutiles au viewer
      }
      setPostes(fetchedPostes);

      // 2. Charger les entrées du jour
      const q = query(collection(db, "daily_entries"), where("date", "==", selectedDate));
      const entrySnap = await getDocs(q);
      const fetchedEntries: DailyEntry[] = [];
      entrySnap.forEach(d => fetchedEntries.push(d.data() as DailyEntry));

      // 3. Fusionner les postes et les entrées existantes
      const finalEntries = fetchedPostes.map(p => {
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
    } catch (e) { 
      console.error("Fetch error:", e); 
    } finally { 
      setLoading(false); 
    }
  }, [selectedDate, user]);

  useEffect(() => { 
    if (user) fetchData(); 
  }, [fetchData, user]);

  // Actions Admin
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
        batch.set(doc(db, "daily_entries", id), { 
          ...e, 
          updated_at: new Date().toISOString(),
          s1_dechets: Number(e.s1_dechets), s1_produit: Number(e.s1_produit),
          s2_dechets: Number(e.s2_dechets), s2_produit: Number(e.s2_produit),
          s3_dechets: Number(e.s3_dechets), s3_produit: Number(e.s3_produit)
        });
      });
      await batch.commit();
      alert("Données de production enregistrées avec succès !");
    } catch (e) { 
      console.error(e);
      alert("Erreur lors de l'enregistrement. Vérifiez vos permissions."); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleSaveSettings = async () => {
    if (userRole !== 'admin') return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      postes.forEach(p => {
        batch.set(doc(db, "postes", p.id), p);
      });
      await batch.commit();
      alert("Objectifs de production mis à jour !");
    } catch (e) { 
      console.error(e);
      alert("Erreur lors de la mise à jour des paramètres."); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center dark:bg-slate-900 dark:text-white space-y-4">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold">Initialisation sécurisée...</p>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6 border dark:border-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">EcoTrack v2.1</h1>
          <p className="text-slate-400 text-xs font-bold uppercase mt-1">Management Industriel</p>
        </div>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
          const pass = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
          setAuthError(null);
          try { 
            await signInWithEmailAndPassword(auth, email, pass); 
          } catch (err: any) { 
            setAuthError("Email ou mot de passe invalide."); 
          }
        }} className="space-y-4">
          {authError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" /> {authError}
            </div>
          )}
          <div className="relative">
            <UserIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
            <input name="email" type="email" placeholder="Email Professionnel" required className="w-full bg-slate-50 dark:bg-slate-800 border-none p-4 pl-12 rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"/>
          </div>
          <div className="relative">
            <LockClosedIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
            <input name="password" type="password" placeholder="Mot de passe" required className="w-full bg-slate-50 dark:bg-slate-800 border-none p-4 pl-12 rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"/>
          </div>
          <button type="submit" className="w-full bg-primary-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-primary-700 active:scale-95 transition-all">
            Connexion Système
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase">Ou</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <button onClick={() => signInAnonymously(auth)} className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
          Accès Consultation Libre
        </button>
      </div>
    </div>
  );

  const filteredData = filterPosteId === 'all' ? computed : computed.filter(c => c.poste_id === filterPosteId);

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userRole={userRole} 
      onLogout={() => signOut(auth)} 
      isDarkMode={isDarkMode} 
      toggleTheme={() => setIsDarkMode(!isDarkMode)}
    >
      {activeTab === 'dashboard' && (
        <div className="animate-in space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow flex flex-col md:flex-row justify-between items-center gap-4 border dark:border-slate-700">
            <h2 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-primary-500" /> Pilotage Temps Réel
            </h2>
            <div className="flex gap-2 w-full md:w-auto">
              <select value={filterPosteId} onChange={(e) => setFilterPosteId(e.target.value)} className="flex-1 md:w-64 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold dark:text-white outline-none">
                <option value="all">Tous les postes de production</option>
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
            <div>
              <h2 className="text-xl font-bold dark:text-white">Registre de Production</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            {userRole === 'admin' ? (
              <button onClick={handleSaveSaisie} disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 transition-all flex items-center gap-2">
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : <CheckCircleIcon className="w-5 h-5" />}
                {saving ? "Synchronisation..." : "Enregistrer les modifications"}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase border border-rose-200 px-4 py-2 rounded-xl bg-rose-50/50">
                <LockClosedIcon className="w-4 h-4" /> Mode Lecture Uniquement
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {postes.map(poste => {
              const entry = entries.find(e => e.poste_id === poste.id);
              const comp = computed.find(c => c.poste_id === poste.id);
              return (
                <div key={poste.id} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border ${userRole === 'admin' ? 'hover:border-primary-400' : ''} dark:border-slate-700 overflow-hidden transition-all`}>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-b dark:border-slate-700 flex justify-between items-center">
                    <span className="text-[10px] font-black dark:text-primary-400 uppercase truncate max-w-[150px]">{poste.nom}</span>
                    <span className="text-[10px] font-bold text-slate-400">CIBLE: {poste.objectif_dechet_percent}%</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(s => (
                      <div key={s} className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1">
                            Shift {s} - Déchets
                          </label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="any" 
                              disabled={userRole !== 'admin'} 
                              value={entry?.[`s${s}_dechets` as keyof DailyEntry] || ''} 
                              onChange={(e) => handleUpdateSaisie(poste.id, s as any, 'dechets', e.target.value)} 
                              className={`w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 text-xs font-black dark:text-white outline-none border border-transparent focus:border-primary-500 ${userRole !== 'admin' ? 'opacity-70 grayscale' : ''}`} 
                              placeholder="0.00"
                            />
                            <span className="absolute right-2 top-2.5 text-[8px] font-bold text-slate-400">KG</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1">
                            Shift {s} - Prod.
                          </label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="any" 
                              disabled={userRole !== 'admin'} 
                              value={entry?.[`s${s}_produit` as keyof DailyEntry] || ''} 
                              onChange={(e) => handleUpdateSaisie(poste.id, s as any, 'produit', e.target.value)} 
                              className={`w-full bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5 text-xs font-black dark:text-white outline-none border border-transparent focus:border-primary-500 ${userRole !== 'admin' ? 'opacity-70 grayscale' : ''}`} 
                              placeholder="0.00"
                            />
                            <span className="absolute right-2 top-2.5 text-[8px] font-bold text-slate-400">KG</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`p-3 bg-slate-50/50 dark:bg-slate-900/20 border-t dark:border-slate-700 flex justify-between items-center ${
                    comp?.status === 'alerte' ? 'bg-rose-50/30' : comp?.status === 'attention' ? 'bg-amber-50/30' : ''
                  }`}>
                     <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-400 uppercase">Taux Journalier</span>
                       <span className={`text-lg font-black ${
                         comp?.status === 'alerte' ? 'text-rose-600' : comp?.status === 'attention' ? 'text-amber-600' : 'text-emerald-600'
                       }`}>
                         {comp ? comp.taux_global.toFixed(2) : '0.00'}%
                       </span>
                     </div>
                     <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border ${
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
              <CalendarDaysIcon className="w-6 h-6 text-primary-500" /> Historique & Reporting
            </h2>
            <button onClick={() => exportToCSV(computed, `Rapport_Production_${selectedDate}`)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-3 rounded-xl text-slate-600 dark:text-white flex items-center gap-2 font-bold text-xs transition-all">
              <ArrowDownTrayIcon className="w-5 h-5" /> Export CSV
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border dark:border-slate-700">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                    <tr>
                      <th className="p-5 font-black uppercase text-slate-400">Poste de Travail</th>
                      <th className="p-5 font-black uppercase text-slate-400">Masse Déchets</th>
                      <th className="p-5 font-black uppercase text-slate-400">Masse Produite</th>
                      <th className="p-5 font-black uppercase text-slate-400">Performance (%)</th>
                      <th className="p-5 font-black uppercase text-slate-400">Objectif</th>
                      <th className="p-5 font-black uppercase text-slate-400">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {computed.map(c => (
                      <tr key={c.poste_id} className="dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-5 font-black">{c.poste_nom}</td>
                        <td className="p-5">{c.total_dechets.toFixed(2)} kg</td>
                        <td className="p-5">{c.total_produit.toFixed(2)} kg</td>
                        <td className="p-5 font-black text-sm">{c.taux_global.toFixed(2)}%</td>
                        <td className="p-5 text-slate-400 font-bold">{c.objectif}%</td>
                        <td className="p-5">
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${
                            c.status === 'conforme' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 
                            c.status === 'attention' ? 'text-amber-500 bg-amber-50 border-amber-100' : 
                            'text-rose-500 bg-rose-50 border-rose-100'
                          }`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && userRole === 'admin' && (
        <div className="animate-in space-y-6">
           <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-black dark:text-white tracking-tight">Cibles de Performance</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Ajustement des taux de perte tolérés</p>
              </div>
              <button onClick={handleSaveSettings} disabled={saving} className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:shadow-primary-200 dark:hover:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3">
                {saving ? (
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : <CheckCircleIcon className="w-6 h-6" />}
                {saving ? "Application..." : "Mettre à jour les objectifs"}
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {postes.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border dark:border-slate-700 shadow-sm flex flex-col gap-4">
                  <span className="font-black dark:text-white text-xs uppercase tracking-tight truncate">{p.nom}</span>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        step="0.1" 
                        value={p.objectif_dechet_percent} 
                        onChange={(e) => setPostes(prev => prev.map(item => item.id === p.id ? { ...item, objectif_dechet_percent: parseFloat(e.target.value) || 0 } : item))} 
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-3 rounded-xl font-black text-center text-primary-600 outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="absolute right-3 top-3.5 text-xs font-black text-slate-300">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (p.objectif_dechet_percent / 5) * 100)}%` }}></div>
                    </div>
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
