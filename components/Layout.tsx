
import React from 'react';
import { 
  ChartBarIcon, 
  PencilSquareIcon, 
  ClockIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: Role;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  userRole, 
  onLogout,
  isDarkMode,
  toggleTheme
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon, roles: ['admin', 'viewer'] },
    { id: 'saisie', label: 'Saisie', icon: PencilSquareIcon, roles: ['admin', 'viewer'] },
    { id: 'history', label: 'Historique', icon: ClockIcon, roles: ['admin', 'viewer'] },
    { id: 'settings', label: 'Paramètres', icon: Cog6ToothIcon, roles: ['admin'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 flex flex-col transition-colors">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-50 shadow-xl">
        <div className="p-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <h1 className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">EcoTrack</h1>
          </div>
          
          {/* Role Badge Desktop */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
            userRole === 'admin' 
            ? 'bg-primary-50 text-primary-600 border-primary-100 dark:bg-primary-900/20 dark:border-primary-800' 
            : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-700 dark:border-slate-600'
          }`}>
            {userRole === 'admin' ? <ShieldCheckIcon className="w-3.5 h-3.5" /> : <UserCircleIcon className="w-3.5 h-3.5" />}
            Accès {userRole}
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 pt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                activeTab === item.id 
                ? 'bg-primary-600 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <button onClick={toggleTheme} className="w-full flex items-center gap-4 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-all">
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            <span className="font-bold text-sm">{isDarkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all">
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
            <span className="font-bold text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-40 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
             <span className="text-white font-bold text-sm">E</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm text-slate-800 dark:text-white leading-none">EcoTrack</h1>
            <span className={`text-[8px] font-black uppercase ${userRole === 'admin' ? 'text-primary-600' : 'text-slate-400'}`}>{userRole}</span>
          </div>
        </div>
        <button onClick={toggleTheme} className="p-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-lg">
          {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around p-2 pb-safe z-50 shadow-2xl">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all ${
              activeTab === item.id ? 'text-primary-600' : 'text-slate-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">{item.label}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex flex-col items-center gap-1 p-2 min-w-[64px] text-slate-400">
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Sortie</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
