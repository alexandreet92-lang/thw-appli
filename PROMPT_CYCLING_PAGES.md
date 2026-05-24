# PROMPT CYCLING PAGES

## Problème principal corrigé

Le bouton DÉMARRER était coupé en bas car :
- Wrapper CyclingScreen utilisait `height: '100vh'` (sur iOS Safari, `vh` ignore la barre d'URL → contenu déborde sous la barre)
- Controls en flex-item non protégé par safe-area-inset

**Fixes** :
- Wrapper : `100vh` → `100dvh` (dynamic viewport, exclut la chrome browser)
- Controls : passe en `position: fixed, bottom: 0, zIndex: 9999`
- Padding bottom : `max(env(safe-area-inset-bottom), 16px)` pour iOS

## Architecture

| Fichier | Rôle | Lignes cible |
|---|---|---|
| `CyclingScreen.tsx` | Orchestration : header + pages container + controls + settings sheet | ~180 |
| `CyclingPage1.tsx` | Durée 40% + grille 3×2 (Dist/Vitesse/D+ + Watts/FC/Watts moy) | ~120 |
| `CyclingPage2.tsx` | Carte 65% + 2 cellules (Watts + Distance) | ~100 |
| `CyclingPage3.tsx` | Watts 35% + grille 3×2 (Durée lap/Watts moy lap/FC moy lap + Cadence/Altitude/Watts nor.) | ~120 |
| `CyclingSettings.tsx` | Bottom sheet réglages : pages, capteurs, unités, alertes | ~170 |
| `CyclingControls.tsx` | Boutons Start/Pause/Lap/Resume/Stop — passe en position fixed | ~110 |

## Suppressions

- `CyclingDataPage.tsx` → remplacé par les 3 pages spécialisées
- `LapsList.tsx` → conservé (orphelin pour l'instant — peut servir plus tard)

## Theme

Détection heure conservée :
```ts
const isDark = new Date().getHours() < 7 || new Date().getHours() > 20
```

Variables centralisées (fonction `getTheme(isDark)` partagée entre les pages) :
```ts
{ bg, text, label, separator, cardBg }
```

## Animations

Ajout dans `globals.css` :
```css
@keyframes cycling-page-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.cycling-page-in { animation: cycling-page-in 200ms ease-out; }
```

`key={currentPage}` sur le wrapper de page force le re-mount à chaque swipe → l'animation rejoue.

## Réglages (CyclingSettings)

- Pages de données : liste des 3 pages + bouton "Modifier" (à venir, no-op pour l'instant)
- Capteurs (FC / Puissance / Cadence) : "Non connecté" + badge "Bientôt disponible"
- Unités : Métrique (sélectionné) / Impérial (disabled + badge)
- Alertes : "Alerte fin GPS" toggle ON par défaut (state local)

Les capteurs ne sont pas implémentés (Bluetooth Web API n'est pas universellement supporté + nécessite HTTPS). Les valeurs `--` sont affichées partout où un capteur est requis.

## Règles

- Merge direct sur main
- `npm run build` doit passer
- Aucun autre fichier touché
