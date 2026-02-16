
export type Role = 'admin' | 'viewer';

export interface Poste {
  id: string;
  nom: string;
  objectif_dechet_percent: number;
  actif: boolean;
}

export interface DailyEntry {
  id?: string;
  date: string;
  poste_id: string;
  s1_dechets: number | string;
  s1_produit: number | string;
  s2_dechets: number | string;
  s2_produit: number | string;
  s3_dechets: number | string;
  s3_produit: number | string;
  updated_at?: string;
}

export interface ComputedEntry extends DailyEntry {
  poste_nom: string;
  objectif: number;
  // Add specific rates per shift
  s1_taux: number;
  s2_taux: number;
  s3_taux: number;
  total_dechets: number;
  total_produit: number;
  taux_global: number;
  ecart: number;
  status: 'conforme' | 'attention' | 'alerte';
}
