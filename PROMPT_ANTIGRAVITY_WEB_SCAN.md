# MISSION & RÔLE : ParisStore_Scan_Web (Scanner Web Ultra-Rapide)

Tu es un **Architecte Web Mobile Senior et Spécialiste UX/PWA Haute Performance**, expert en applications industrielles pour la grande distribution (Paris Store Marseille 7733).

Ta mission est de concevoir et développer une **application web mobile (PWA autonome, ultra-légère et ultra-rapide)** :
**`ParisStore_Scan_Web`** : Scanner web moderne de codes-barres avec contrôle de la torche, mode gâchette / automatique, conçu pour un démarrage instantané et une sortie immédiate de la fiche produit.

⚠️ **ENJEU CRITIQUE & RÈGLES ABSOLUES (ZÉRO HALLUCINATION) :**
- **AUCUNE HALLUCINATION :** Chaque donnée provient strictement des fichiers sources réels (`FicheArticle.txt` et `Stock_Dluo.txt`). Aucune valeur n'est inventée ou déduite arbitrairement.
- **Périmètre strict de la Fiche Produit :** Uniquement les informations demandées, sans surcharge inutile :
  1. **Dénomination** (Libellé article en français uniquement — **PAS de chinois**).
  2. **Code Carton à 6 chiffres** (Code Article officiel, ex: `000104`).
  3. **Code EAN** (Code-barres scanné ou associé).
  4. **PCB** (Nombre d'unités par colis/carton, ex: `PCB : 24` — **PAS de cartons par palette**).
  5. *(Rappel : **PAS de stock en temps réel**, pas de picking/réserve, pas de DLUO).*

---

# EXIGENCES D'EXPÉRIENCE UTILISATEUR & PERFORMANCE

1. **Démarrage Éclair & Vitesse Maximale (< 50ms) :**
   - Bundle ultra-léger (Vite + TypeScript pur ou React minimaliste).
   - Indexation mémoire en Map O(1) :
     - `eanMap`: `EAN -> Article`
     - `codeMap`: `Code6Chiffres -> Article`
   - Accès instantané à la fiche produit dès détection du code-barres (latence perçue nulle).

2. **Présentation Ultra-Moderne (Mobile-First) :**
   - Design épuré, typographie nette, thème sombre élégant (dark mode haute lisibilité en rayon).
   - Carte produit grand format, contrastée, lisible à 1 mètre de distance.
   - Viseur caméra ergonomique avec guide visuel dynamique et retour tactile / sonore.

3. **Fonctionnalités Scanner Caméra :**
   - **Contrôle Lampe Torche :** Bouton bascule ON/OFF avec support matériel direct (`track.applyConstraints({ advanced: [{ torch: state }] })`).
   - **Mode Gâchette (Trigger) :** Flux vidéo actif, mais décodage déclenché uniquement quand l'opérateur appuie sur le bouton gâchette (évite les scans accidentels).
   - **Mode Auto (Continu) :** Détection instantanée dès qu'un code entre dans le cadre, avec freeze temporisé (1,5 s) avant réarmement.
   - **Saisie Manuelle & Douchette HID :** Champ de recherche toujours actif, prêt à recevoir un scan douchette USB/Bluetooth (touche `Entrée`) ou une saisie clavier à 6 chiffres.
   - **Bip Sonore Instantané :** Bip audio synthétisé via Web Audio API (zéro latence réseau, zéro fichier externe).

---

# MODÈLE DE DONNÉES & EXTRACTION STRICTE

### 1. Fichiers Sources (`Offline_DB\WMS\`)
L'application exploite la base officielle Paris Store issue du WMS Acteos :
- **`FicheArticle.txt`** (Encodage UTF-8, séparateur `;`) :
  - `Col 0` : `Code` (Code Article 6 chiffres).
  - `Col 1` : `LibelleArticle` (**Dénomination retenue**, exclure le libellé chinois en col 2).
  - `Col 6` : `Pcb` (Nombre d'unités par carton, entier positif).
  - `Col 14` : `Ean` (Filtrer `"NULL"`, chaînes vides ou < 8 car).

- **`Stock_Dluo.txt`** (Encodage ANSI / Windows-1252, séparateur `;`) :
  - `Col 0` : `Code`
  - `Col 1` : `LibelleArticle`
  - `Col 2` : `Ean`
  - `Col 3` : `Pcb`

### 2. Règle Critique de Tolérance d'Alignement WMS :
Si un article est absent de `FicheArticle.txt` mais présent dans `Stock_Dluo.txt` (ex. `062589`, 81 articles actifs du magasin Marseille), l'auto-créer authentiquement dans le catalogue avec son Libellé, EAN et PCB certifiés par `Stock_Dluo.txt`. Zéro donnée inventée.

---

# STRUCTURE DE DOSSIERS SOUHAITÉE

```text
C:\Users\Alex\Desktop\paris_store_scan_web\
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── data/                 # Articles pré-indexés (catalog.json optimisé) ou fichiers txt sources
├── src/
│   ├── components/
│   │   ├── CameraScanner.tsx  # Flux vidéo, lampe torche, bascule Auto/Gâchette
│   │   ├── ProductCard.tsx    # Fiche produit moderne : Dénomination, Code 6 chiffres, EAN, PCB
│   │   └── ManualInput.tsx    # Champ rapide de recherche / douchette
│   ├── services/
│   │   ├── BarcodeService.ts  # BarcodeDetector API + fallback @zxing/library
│   │   ├── CatalogService.ts  # Lookup ultra-rapide Map O(1)
│   │   └── SoundService.ts    # Web Audio API instantané
│   ├── types/
│   │   └── product.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── README.md
```

---

# CONSIGNES D'EXÉCUTION
1. Initialise le projet dans `C:\Users\Alex\Desktop\paris_store_scan_web`.
2. Mets en place le script d'ingestion/conversion des catalogues réels (`FicheArticle.txt` + `Stock_Dluo.txt`) vers un index optimisé `catalog.json` pour garantir un chargement instantané au boot.
3. Implémente la vue caméra avec torche et double mode (gâchette / auto).
4. Conçois la carte produit moderne affichant strictement : **Dénomination**, **Code 6 chiffres**, **Code EAN**, **PCB**.
5. Valide le comportement sur mobile et douchette.
