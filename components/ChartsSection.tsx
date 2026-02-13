
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
  // Data for the horizontal-ish station chart
  const barData = data.map(d => ({
    name: d.poste_nom,
    taux: parseFloat(d.taux_global.toFixed(2)),
  }));

  // Data for Shift Analysis
  const filteredEntry = selectedPosteId === 'all' 
    ? {
        s1: data.reduce((acc, curr) => acc + curr.s1_dechets, 0),
        s2: data.reduce((acc, curr) => acc + curr.s2_dechets, 0),
        s3: data.reduce((acc, curr) => acc + curr.s3_dechets, 0),
      }
    : (() => {
        const d = data.find(item => item.poste_id === selectedPosteId);
        return {
          s1: d ? d.s1_dechets : 0,
          s2: d ? d.s2_dechets : 0,
          s3: d ? d.s3_dechets : 0,
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
        <h3 className="text-slate-800 font-bold mb-8 text-lg">Déchets par Poste</h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                fontSize={9} 
                tick={{fill: '#94a3b8'}} 
                angle={-45} 
                textAnchor="end"
                interval={0}
              />
              <YAxis fontSize={10} tick={{fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="center" iconType="rect" wrapperStyle={{paddingBottom: '20px'}} />
              <Bar name="Taux de déchets (%)" dataKey="taux" fill="#818cf8" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Analyse par Shift */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
        <h3 className="text-slate-800 font-bold mb-8 text-lg">Analyse par Shift</h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shiftData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} tick={{fill: '#94a3b8'}} />
              <YAxis fontSize={10} tick={{fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="center" iconType="rect" wrapperStyle={{paddingBottom: '20px'}} />
              <Bar name="Déchets (kg)" dataKey="value" radius={[4, 4, 0, 0]}>
                {shiftData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#6366f1', '#6d28d9', '#f472b6'][index % 3]} />
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
