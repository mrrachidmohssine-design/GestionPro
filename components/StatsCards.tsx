
import React from 'react';
import { ComputedEntry } from '../types';

interface StatsCardsProps {
  data: ComputedEntry[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ data }) => {
  const totalWaste = data.reduce((acc, curr) => acc + curr.total_dechets, 0);
  const totalProd = data.reduce((acc, curr) => acc + curr.total_produit, 0);
  const avgTaux = totalProd > 0 ? (totalWaste / totalProd) * 100 : 0;
  
  const conforming = data.filter(d => d.status === 'conforme').length;
  const totalPostes = data.length;
  const performanceStatus = totalPostes > 0 ? (conforming / totalPostes) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <p className="text-slate-500 text-sm font-medium mb-1">Total Déchets</p>
        <p className="text-2xl font-bold text-slate-800">{totalWaste.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span></p>
      </div>
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <p className="text-slate-500 text-sm font-medium mb-1">Production Total</p>
        <p className="text-2xl font-bold text-slate-800">{totalProd.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span></p>
      </div>
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <p className="text-slate-500 text-sm font-medium mb-1">Taux Moyen</p>
        <p className={`text-2xl font-bold ${avgTaux > 2 ? 'text-orange-500' : 'text-blue-600'}`}>
          {avgTaux.toFixed(2)}%
        </p>
      </div>
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <p className="text-slate-500 text-sm font-medium mb-1">Performance</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-slate-800">{performanceStatus.toFixed(0)}%</p>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${performanceStatus > 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {performanceStatus > 80 ? 'Bonne' : 'Alerte'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
