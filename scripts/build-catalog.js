import fs from 'node:fs';
import path from 'node:path';

// Emplacements candidats pour les fichiers WMS Acteos
const CANDIDATE_DIRS = [
  'C:\\Users\\dam6.dam\\Documents\\projet 2\\VERSION_PRODUCTION_INTRANET\\TempSync',
  'C:\\Users\\dam6.dam\\Documents\\projet 2\\VERSION_TEST_HORS_LIGNE\\Offline_DB\\WMS',
  'C:\\Users\\dam6.dam\\Documents\\projet\\VERSION_TEST_HORS_LIGNE\\Offline_DB\\WMS',
  path.resolve('./Offline_DB/WMS')
];

let ficheArticlePath = null;
let stockDluoPath = null;

for (const dir of CANDIDATE_DIRS) {
  const fPath = path.join(dir, 'FicheArticle.txt');
  if (fs.existsSync(fPath) && !ficheArticlePath) {
    ficheArticlePath = fPath;
  }
  const sPath = path.join(dir, 'Stock_Dluo.txt');
  if (fs.existsSync(sPath) && !stockDluoPath) {
    stockDluoPath = sPath;
  }
}

// Fallback secondaire pour Stock_Dluo si non trouvé dans le même dossier
if (!stockDluoPath) {
  for (const dir of CANDIDATE_DIRS) {
    const sPath = path.join(dir, 'Stock_Dluo.txt');
    if (fs.existsSync(sPath)) {
      stockDluoPath = sPath;
      break;
    }
  }
}

const PUBLIC_DATA_DIR = path.resolve('public/data');
const OUTPUT_FILE = path.join(PUBLIC_DATA_DIR, 'catalog.json');

if (!fs.existsSync(PUBLIC_DATA_DIR)) {
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
}

console.log('Ingestion des catalogues WMS Paris Store...');
console.log(`Source FicheArticle: ${ficheArticlePath}`);
console.log(`Source Stock_Dluo: ${stockDluoPath}`);

if (!ficheArticlePath || !fs.existsSync(ficheArticlePath)) {
  console.error('Erreur: FicheArticle.txt introuvable dans les chemins candidats.');
  process.exit(1);
}

// 1. Parser FicheArticle.txt (UTF-8)
const rawFiche = fs.readFileSync(ficheArticlePath, 'utf-8');
const ficheLines = rawFiche.split(/\r?\n/);

const articlesMap = new Map(); // code -> article

let ficheCount = 0;
for (let i = 1; i < ficheLines.length; i++) {
  const line = ficheLines[i].trim();
  if (!line) continue;

  const parts = line.split(';');
  if (parts.length < 7) continue;

  const rawCode = parts[0]?.trim();
  if (!rawCode) continue;

  const code = rawCode.padStart(6, '0');
  const libelle = parts[1]?.trim() || `ARTICLE ${code}`;
  const pcb = parseInt(parts[6]?.trim(), 10) || 1;

  let ean = '';
  if (parts.length > 14) {
    const rawEan = parts[14]?.trim();
    if (rawEan && rawEan.toUpperCase() !== 'NULL' && rawEan.length >= 8) {
      ean = rawEan;
    }
  }

  articlesMap.set(code, {
    c: code,
    n: libelle,
    e: ean,
    p: pcb > 0 ? pcb : 1
  });
  ficheCount++;
}

console.log(`FicheArticle.txt traité: ${ficheCount} articles indexés.`);

// 2. Parser Stock_Dluo.txt (latin1 / ANSI) pour tolérance d'alignement WMS
let wmsAutoCreated = 0;
if (stockDluoPath && fs.existsSync(stockDluoPath)) {
  const rawStock = fs.readFileSync(stockDluoPath, 'latin1');
  const stockLines = rawStock.split(/\r?\n/);

  for (let i = 0; i < stockLines.length; i++) {
    const line = stockLines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length < 4) continue;

    const rawCode = parts[0]?.trim();
    if (!rawCode) continue;

    const code = rawCode.padStart(6, '0');

    if (!articlesMap.has(code)) {
      // Auto-création certifiée Acteos WMS (zéro hallucination)
      const libelle = parts[1]?.trim() || `ARTICLE ${code}`;
      let ean = '';
      const rawEan = parts[2]?.trim();
      if (rawEan && rawEan.toUpperCase() !== 'NULL' && rawEan.length >= 8) {
        ean = rawEan;
      }
      const pcb = parseInt(parts[3]?.trim(), 10) || 1;

      articlesMap.set(code, {
        c: code,
        n: libelle,
        e: ean,
        p: pcb > 0 ? pcb : 1
      });
      wmsAutoCreated++;
    } else {
      // Si l'EAN était manquant dans FicheArticle mais présent dans Stock_Dluo
      const existing = articlesMap.get(code);
      if (!existing.e && parts[2]) {
        const rawEan = parts[2].trim();
        if (rawEan && rawEan.toUpperCase() !== 'NULL' && rawEan.length >= 8) {
          existing.e = rawEan;
        }
      }
    }
  }
}

console.log(`Tolérance WMS Stock_Dluo : ${wmsAutoCreated} articles authentiques auto-créés.`);

// 3. Export JSON compact
const catalogArray = Array.from(articlesMap.values());
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalogArray), 'utf-8');

// Copie également dans dist/data si dist existe
const distDataDir = path.resolve('dist/data');
if (fs.existsSync(distDataDir)) {
  fs.writeFileSync(path.join(distDataDir, 'catalog.json'), JSON.stringify(catalogArray), 'utf-8');
}

const stats = fs.statSync(OUTPUT_FILE);
console.log(`Index généré avec succès dans ${OUTPUT_FILE}`);
console.log(`Total: ${catalogArray.length} articles (${(stats.size / 1024).toFixed(1)} Ko).`);