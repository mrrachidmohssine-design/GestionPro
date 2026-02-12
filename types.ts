
export type Role = 'admin' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  role: Role;
}

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
  s1_dechets: number;
  s1_produit: number;
  s2_dechets: number;
  s2_produit: number;
  s3_dechets: number;
  s3_produit: number;
  created_by?: string;
  updated_at?: string;
}

export interface ComputedEntry extends DailyEntry {
  poste_nom: string;
  objectif: number;
  s1_taux: number;
  s2_taux: number;
  s3_taux: number;
  total_dechets: number;
  total_produit: number;
  taux_global: number;
  ecart: number;
  status: 'conforme' | 'attention' | 'alerte';
}
