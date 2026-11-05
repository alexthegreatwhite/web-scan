import { Article, RawArticle } from '../types/product';

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
        const res = await fetch('/data/catalog.json');
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

    // Variantes UPC-A / EAN-13 (ex: 12 chiffres avec 0 devant)
    if (clean.length === 12) {
      this.eanMap.set('0' + clean, art);
    } else if (clean.length === 13 && clean.startsWith('0')) {
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
    const direct = this.eanMap.get(clean);
    if (direct) return direct;

    // Normalisation UPC / EAN
    if (clean.length === 12) {
      return this.eanMap.get('0' + clean) || null;
    }
    if (clean.length === 13 && clean.startsWith('0')) {
      return this.eanMap.get(clean.substring(1)) || null;
    }
    return null;
  }

  public search(query: string): Article | null {
    if (!query) return null;
    const clean = query.trim();

    // 1. Essai direct par EAN
    const byEan = this.findByEan(clean);
    if (byEan) return byEan;

    // 2. Essai par Code Article 6 chiffres
    const byCode = this.findByCode(clean);
    if (byCode) return byCode;

    // 3. Essai si saisie brute numérique
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
