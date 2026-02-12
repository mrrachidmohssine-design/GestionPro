
import React from 'react';
import { 
  ChartBarIcon, 
  PencilSquareIcon, 
  ClockIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, userRole, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon, roles: ['admin', 'viewer'] },
    { id: 'saisie', label: 'Saisie', icon: PencilSquareIcon, roles: ['admin'] },
    { id: 'history', label: 'Historique', icon: ClockIcon, roles: ['admin', 'viewer'] },
    { id: 'settings', label: 'Paramètres', icon: Cog6ToothIcon, roles: ['admin', 'viewer'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 flex flex-col bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">E</span>
          </div>
          <h1 className="font-bold text-xl text-slate-800">EcoTrack</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-40 flex justify-between items-center">
        <h1 className="font-bold text-lg text-slate-800">EcoTrack</h1>
        <div className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase tracking-wider font-semibold">
          {userRole}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors ${
              activeTab === item.id ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex flex-col items-center gap-1 p-2 min-w-[64px] text-slate-400">
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">Sortie</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
