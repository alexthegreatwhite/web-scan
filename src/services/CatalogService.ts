import { Article, RawArticle } from '../types/product';

// Alias EANs vérifiés pour variantes packaging / nouveaux codes fournisseurs non encore mis à jour dans le WMS
const KNOWN_EAN_ALIASES: Record<string, string> = {
  '8935034312169': '180694', // Chips Taro 100g (Fruit Food) -> Ref WMS 180694 (CHIPS DE TARO 250G VN)
};

class CatalogService {
  private articles: Article[] = [];
  private codeMap: Map<string, Article> = new Map();
  private eanMap: Map<string, Article> = new Map();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const res = await fetch('./data/catalog.json');
        if (!res.ok) {
          throw new Error(`Erreur chargement catalogue: ${res.statusText}`);
        }
        const rawList: RawArticle[] = await res.json();

        this.articles = new Array(rawList.length);
        this.codeMap.clear();
        this.eanMap.clear();

        for (let i = 0; i < rawList.length; i++) {
          const raw = rawList[i];
          const art: Article = {
            code: raw.c,
            libelle: raw.n,
            ean: raw.e || '',
            pcb: raw.p || 1
          };

          this.articles[i] = art;
          this.codeMap.set(art.code, art);

          if (art.ean) {
            this.indexEan(art.ean, art);
          }

          // Indexation de tous les codes EANs secondaires / caisse du serveur
          if (raw.a && Array.isArray(raw.a)) {
            for (let j = 0; j < raw.a.length; j++) {
              this.indexEan(raw.a[j], art);
            }
          }
        }

        this.isLoaded = true;
      } catch (err) {
        console.error('Échec initialisation catalogue:', err);
        throw err;
      }
    })();

    return this.loadPromise;
  }

  private indexEan(ean: string, art: Article) {
    const clean = ean.trim();
    if (!clean) return;

    this.eanMap.set(clean, art);

    // Variantes sans zéros initiaux
    const noZero = clean.replace(/^0+/, '');
    if (noZero && noZero !== clean) {
      this.eanMap.set(noZero, art);
    }

    // Variantes UPC-A / EAN-13 (12 chiffres avec 0 devant)
    if (clean.length === 12) {
      this.eanMap.set('0' + clean, art);
    } else if (clean.length === 13 && clean.startsWith('0')) {
      this.eanMap.set(clean.substring(1), art);
    }

    // Variantes ITF-14 / GTIN-14 commençant par 0
    if (clean.length === 14 && clean.startsWith('0')) {
      this.eanMap.set(clean.substring(1), art);
    }
  }

  public findByCode(code: string): Article | null {
    if (!code) return null;
    const clean = code.trim().padStart(6, '0');
    return this.codeMap.get(clean) || null;
  }

  public findByEan(ean: string): Article | null {
    if (!ean) return null;
    const clean = ean.trim();

    // 0. Table d'alias certifiés Paris Store
    if (KNOWN_EAN_ALIASES[clean]) {
      const art = this.findByCode(KNOWN_EAN_ALIASES[clean]);
      if (art) return art;
    }

    // 1. Recherche directe dans la table EAN
    const direct = this.eanMap.get(clean);
    if (direct) return direct;

    // 2. Normalisation UPC-A / EAN-13 / GTIN-14
    const noZero = clean.replace(/^0+/, '');
    if (noZero && this.eanMap.has(noZero)) {
      return this.eanMap.get(noZero)!;
    }
    if (clean.length === 12) {
      const art = this.eanMap.get('0' + clean);
      if (art) return art;
    }
    if (clean.length === 13 && clean.startsWith('0')) {
      const art = this.eanMap.get(clean.substring(1));
      if (art) return art;
    }
    if (clean.length === 14 && clean.startsWith('0')) {
      const art = this.eanMap.get(clean.substring(1));
      if (art) return art;
    }

    // 3. Code-barres étiquette vertical 8 chiffres Paris Store (88 + 6 chiffres code article)
    if (clean.length === 8 && clean.startsWith('88') && /^\d+$/.test(clean)) {
      const subCode = clean.substring(2);
      const art = this.findByCode(subCode);
      if (art) return art;
    }

    // 4. Code-barres interne Paris Store 13 chiffres (337914 + 6 chiffres code article + clé)
    if (clean.length === 13 && clean.startsWith('337914') && /^\d+$/.test(clean)) {
      const subCode = clean.substring(6, 12);
      const art = this.findByCode(subCode);
      if (art) return art;
    }

    return null;
  }

  public search(query: string): Article | null {
    if (!query) return null;
    const clean = query.trim();

    // 1. Essai par EAN ou code étiquette magasin (88..., 337914..., UPC...)
    const byEan = this.findByEan(clean);
    if (byEan) return byEan;

    // 2. Essai direct par Code Article 6 chiffres
    const byCode = this.findByCode(clean);
    if (byCode) return byCode;

    // 3. Saisie numérique brute (1 à 6 chiffres) complétée à 6 chiffres
    if (/^\d{1,6}$/.test(clean)) {
      return this.findByCode(clean.padStart(6, '0'));
    }

    return null;
  }

  public getCount(): number {
    return this.articles.length;
  }

  public isReady(): boolean {
    return this.isLoaded;
  }
}

export const catalogService = new CatalogService();
