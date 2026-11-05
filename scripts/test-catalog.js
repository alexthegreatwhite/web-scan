import fs from 'node:fs';
import path from 'node:path';

const catalogFile = path.resolve('public/data/catalog.json');
const raw = fs.readFileSync(catalogFile, 'utf-8');
const catalog = JSON.parse(raw);

console.log('=== TEST CATALOG DATA INTEGRITY ===');
console.log(`Total articles dans catalog.json: ${catalog.length}`);

// 1. Test presence of known articles
const art104 = catalog.find(a => a.c === '000104');
console.log('Article 000104 (FicheArticle):', art104);
if (!art104 || !art104.n || !art104.p) {
  throw new Error('Test échoué pour 000104');
}

// 2. Test WMS resilience article (062589: present in Stock_Dluo but absent in FicheArticle)
const artWms = catalog.find(a => a.c === '062589');
console.log('Article 062589 (Auto-créé WMS Stock_Dluo):', artWms);
if (!artWms || artWms.c !== '062589') {
  throw new Error('Test échoué pour tolérance WMS 062589');
}

// 3. Test format and sanity checks
let invalidCodes = 0;
let invalidPcb = 0;
let chineseCharsFound = 0;
const chineseRegex = /[\u4e00-\u9fa5]/;

for (const a of catalog) {
  if (a.c.length !== 6) invalidCodes++;
  if (typeof a.p !== 'number' || a.p < 1) invalidPcb++;
  if (chineseRegex.test(a.n)) chineseCharsFound++;
}

console.log(`Codes invalides (!= 6 char) : ${invalidCodes}`);
console.log(`PCB invalides (< 1) : ${invalidPcb}`);
console.log(`Caractères chinois dans désignation : ${chineseCharsFound}`);

if (invalidCodes > 0 || invalidPcb > 0 || chineseCharsFound > 0) {
  throw new Error('Contrôle qualité échoué !');
}

console.log('TOUS LES TESTS D\'INTÉGRITÉ ONT RÉUSSI (ZÉRO HALLUCINATION).');
