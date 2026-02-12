
import { ComputedEntry } from '../types';

export const exportToCSV = (data: ComputedEntry[], filename: string) => {
  const headers = [
    'Date', 'Poste', 'Objectif (%)', 'Shift 1 Déchets', 'Shift 1 Prod', 'Shift 1 Taux',
    'Shift 2 Déchets', 'Shift 2 Prod', 'Shift 2 Taux', 'Shift 3 Déchets', 'Shift 3 Prod', 'Shift 3 Taux',
    'Total Déchets', 'Total Prod', 'Taux Global', 'Écart', 'Statut'
  ];

  const rows = data.map(d => [
    d.date, d.poste_nom, d.objectif, d.s1_dechets, d.s1_produit, d.s1_taux.toFixed(2),
    d.s2_dechets, d.s2_produit, d.s2_taux.toFixed(2), d.s3_dechets, d.s3_produit, d.s3_taux.toFixed(2),
    d.total_dechets, d.total_produit, d.taux_global.toFixed(2), d.ecart.toFixed(2), d.status
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToJSON = (data: ComputedEntry[], filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
