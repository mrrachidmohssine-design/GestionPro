
import React from 'react';
import { ComputedEntry } from '../types';
import { CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface StatsCardsProps {
  data: ComputedEntry[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ data }) => {
  const totalWaste = data.reduce((acc, curr) => acc + curr.total_dechets, 0);
  const totalProd = data.reduce((acc, curr) => acc + curr.total_produit, 0);
  const avgTaux = totalProd > 0 ? (totalWaste / totalProd) * 100 : 0;
  
  const conforming = data.filter(d => d.status === 'conforme').length;
  const isGlobalConform = avgTaux <= 2.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
        <p className="text-primary-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Déchets</p>
        <p className="text-3xl font-black text-slate-800 dark:text-white">{totalWaste.toFixed(2)}</p>
        <p className="text-slate-400 text-xs mt-1">kg</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
        <p className="text-primary-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Production</p>
        <p className="text-3xl font-black text-slate-800 dark:text-white">{totalProd.toFixed(2)}</p>
        <p className="text-slate-400 text-xs mt-1">kg</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
        <p className="text-primary-400 text-[10px] font-bold uppercase tracking-widest mb-2">Taux Global</p>
        <p className="text-3xl font-black text-slate-800 dark:text-white">{avgTaux.toFixed(2)}</p>
        <p className="text-slate-400 text-xs mt-1">%</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
        <p className="text-primary-400 text-[10px] font-bold uppercase tracking-widest mb-2">Performance</p>
        <div className="flex items-center gap-2">
          {isGlobalConform ? (
             <CheckIcon className="w-6 h-6 text-emerald-500" />
          ) : (
             <ExclamationCircleIcon className="w-6 h-6 text-rose-500" />
          )}
          <p className="text-2xl font-black text-slate-800 dark:text-white">{isGlobalConform ? 'Conforme' : 'Alerte'}</p>
        </div>
        <p className="text-slate-400 text-[10px] mt-1">vs objectif</p>
      </div>
    </div>
  );
};

export default StatsCards;
