
import { DailyEntry, Poste, ComputedEntry } from '../types';

export const calculateTaux = (dechets: number, produit: number): number => {
  if (produit <= 0) return 0;
  return (dechets / produit) * 100;
};

export const computeEntryData = (entry: DailyEntry, poste: Poste): ComputedEntry => {
  const s1_taux = calculateTaux(entry.s1_dechets, entry.s1_produit);
  const s2_taux = calculateTaux(entry.s2_dechets, entry.s2_produit);
  const s3_taux = calculateTaux(entry.s3_dechets, entry.s3_produit);

  const total_dechets = Number(entry.s1_dechets) + Number(entry.s2_dechets) + Number(entry.s3_dechets);
  const total_produit = Number(entry.s1_produit) + Number(entry.s2_produit) + Number(entry.s3_produit);
  const taux_global = calculateTaux(total_dechets, total_produit);
  
  const ecart = taux_global - poste.objectif_dechet_percent;

  let status: 'conforme' | 'attention' | 'alerte' = 'conforme';
  if (taux_global > poste.objectif_dechet_percent) {
    status = ecart <= 1 ? 'attention' : 'alerte';
  }

  return {
    ...entry,
    poste_nom: poste.nom,
    objectif: poste.objectif_dechet_percent,
    s1_taux,
    s2_taux,
    s3_taux,
    total_dechets,
    total_produit,
    taux_global,
    ecart,
    status,
  };
};

export const formatPercent = (val: number): string => val.toFixed(2) + '%';
export const formatKg = (val: number): string => val.toLocaleString('fr-FR') + ' kg';
