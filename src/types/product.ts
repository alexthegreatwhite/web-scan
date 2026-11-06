export interface Article {
  code: string;       // Code Carton officiel (6 chiffres, ex: "000104")
  libelle: string;    // Dénomination en français uniquement
  ean: string;        // Code EAN unitaire (ou vide)
  pcb: number;        // Nombre d'unités par carton / colis (entier >= 1)
}

export interface RawArticle {
  c: string; // code
  n: string; // denomination
  e: string; // ean
  p: number; // pcb
  a?: string[]; // eans alias / secondaires issus du serveur caisse
}

export type ScanMode = 'auto' | 'trigger';
