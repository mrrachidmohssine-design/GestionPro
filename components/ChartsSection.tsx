
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { ComputedEntry } from '../types';

interface ChartsSectionProps {
  data: ComputedEntry[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ChartsSection: React.FC<ChartsSectionProps> = ({ data }) => {
  const barData = data.map(d => ({
    name: d.poste_nom.length > 10 ? d.poste_nom.substring(0, 10) + '...' : d.poste_nom,
    full_name: d.poste_nom,
    taux: parseFloat(d.taux_global.toFixed(2)),
    obj: d.objectif
  })).sort((a, b) => b.taux - a.taux);

  const shiftData = [
    { name: 'Shift 1', value: data.reduce((acc, curr) => acc + curr.s1_dechets, 0) },
    { name: 'Shift 2', value: data.reduce((acc, curr) => acc + curr.s2_dechets, 0) },
    { name: 'Shift 3', value: data.reduce((acc, curr) => acc + curr.s3_dechets, 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Bar Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-slate-800 font-bold mb-4">Taux de déchets par poste (%)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={10} tick={{fill: '#64748b'}} />
              <YAxis fontSize={10} tick={{fill: '#64748b'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value}%`, 'Taux']}
              />
              <Bar dataKey="taux" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.taux > entry.obj ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Shift Pie Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-slate-800 font-bold mb-4">Répartition Déchets par Shift</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={shiftData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {shiftData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value.toFixed(0)} kg`, 'Déchets']} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartsSection;
