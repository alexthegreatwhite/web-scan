# ParisStore_Scan_Web 🚀

Scanner web ultra-rapide (PWA mobile & desktop) pour les employés de magasin et entrepôt Paris Store Marseille (7733).

## Caractéristiques Clés
- **Vitesse Éclair :** Démarrage instantané, index mémoire O(1) de 7 517 articles réels issus d'Acteos WMS (`FicheArticle.txt` + `Stock_Dluo.txt`).
- **Fiche Produit Épurée :**
  1. Dénomination (Français uniquement)
  2. Code Carton (6 chiffres)
  3. Code EAN
  4. PCB (Conditionnement par colis)
- **Double Mode Caméra :**
  - **Mode Auto :** Détection continue avec ligne laser et pause anti-rebond 1,5s.
  - **Mode Gâchette :** Déclenchement à la demande via bouton tactile "Gâchette" ergonomique.
- **Contrôle Matériel Lampe Torche :** Activation/désactivation directe de la torche du smartphone.
- **Douchette USB / Bluetooth (HID) :** Champ de recherche toujours actif, compatible scan continu clavier.
- **Retour Sensoriel :** Bip audio Web Audio API (1760 Hz) + vibration haptique.

## Lancement Rapide
Double-cliquez sur `start.bat` ou lancez :
```bash
npm run dev -- --host
```
Puis ouvrez l'URL affichée (ex: `http://localhost:3000` sur PC ou `http://<IP_LOCAL>:3000` sur le smartphone).
