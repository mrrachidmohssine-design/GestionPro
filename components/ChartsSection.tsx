
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend
} from 'recharts';
import { ComputedEntry } from '../types';

interface ChartsSectionProps {
  data: ComputedEntry[];
  selectedPosteId: string;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ data, selectedPosteId }) => {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';

  // Data for the horizontal-ish station chart
  const barData = data.map(d => ({
    name: d.poste_nom,
    taux: parseFloat(d.taux_global.toFixed(2)),
  }));

  // Data for Shift Analysis
  const filteredEntry = selectedPosteId === 'all' 
    ? {
        // Fix: Explicitly cast string | number to number using Number() for addition
        s1: data.reduce((acc, curr) => acc + (Number(curr.s1_dechets) || 0), 0),
        s2: data.reduce((acc, curr) => acc + (Number(curr.s2_dechets) || 0), 0),
        s3: data.reduce((acc, curr) => acc + (Number(curr.s3_dechets) || 0), 0),
      }
    : (() => {
        const d = data.find(item => item.poste_id === selectedPosteId);
        return {
          // Fix: Ensure the returned values are numbers
          s1: d ? (Number(d.s1_dechets) || 0) : 0,
          s2: d ? (Number(d.s2_dechets) || 0) : 0,
          s3: d ? (Number(d.s3_dechets) || 0) : 0,
        };
      })();

  const shiftData = [
    { name: 'SHIFT 1', value: filteredEntry.s1 },
    { name: 'SHIFT 2', value: filteredEntry.s2 },
    { name: 'SHIFT 3', value: filteredEntry.s3 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Déchets par Poste */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center">
        <h3 className="text-slate-800 dark:text-white font-bold mb-8 text-lg">Déchets par Poste</h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis 
                dataKey="name" 
                fontSize={9} 
                tick={{fill: textColor}} 
                angle={-45} 
                textAnchor="end"
                interval={0}
              />
              <YAxis fontSize={10} tick={{fill: textColor}} />
              <Tooltip 
                cursor={{fill: isDark ? '#334155' : '#f8fafc'}}
                contentStyle={{ 
                  backgroundColor: tooltipBg,
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}
              />
              <Legend verticalAlign="top" align="center" iconType="rect" wrapperStyle={{paddingBottom: '20px'}} />
              <Bar name="Taux de déchets (%)" dataKey="taux" fill="#4f46e5" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Analyse par Shift */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center">
        <h3 className="text-slate-800 dark:text-white font-bold mb-8 text-lg">Analyse par Shift</h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shiftData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="name" fontSize={10} tick={{fill: textColor}} />
              <YAxis fontSize={10} tick={{fill: textColor}} />
              <Tooltip 
                cursor={{fill: isDark ? '#334155' : '#f8fafc'}}
                contentStyle={{ 
                  backgroundColor: tooltipBg,
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}
              />
              <Legend verticalAlign="top" align="center" iconType="rect" wrapperStyle={{paddingBottom: '20px'}} />
              <Bar name="Déchets (kg)" dataKey="value" radius={[4, 4, 0, 0]}>
                {shiftData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#4f46e5', '#6366f1', '#818cf8'][index % 3]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartsSection;
