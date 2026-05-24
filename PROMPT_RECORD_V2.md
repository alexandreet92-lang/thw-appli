# PROMPT RECORD V2

## Partie 1 — Page record style Strava

Nouvelle structure :
- Map plein écran (~85% de la hauteur disponible)
- Panel bas fixe ~120px, fond `rgba(0,0,0,0.85) backdrop-blur-md`, rounded-t-3xl, drag indicator en haut
- 3 boutons cercles alignés horizontalement (Sport sélectionné / Démarrer orange / Parcours)
- Démarrer orange `#FF6B00`, cercle 64px, box-shadow cyan→orange (`rgba(255,107,0,0.5)`)
- Bouton Sport gauche : ouvre le SportSelector
- Bouton Parcours droite : toast "Bientôt disponible"
- Center "Démarrer" : lance directement la séance du sport sélectionné

## Partie 2 — SportSelector : nouveaux icônes

- 6 icônes SVG nouvelles (vélo, running, trail, muscu, hyrox, aviron) — paths fournis dans le prompt
- Couleur unique `#2563EB` pour tous (plus de hover sport-tinted)
- Slide-up animation 280ms `cubic-bezier(0.16, 1, 0.3, 1)`

## Partie 3 — Compteur vélo : thème selon l'heure

- Heure < 7 ou > 20 → thème sombre (`#0A0A0A` / blanc)
- Sinon → thème clair (`#FFFFFF` / `#0A0A0A`)
- Layout Garmin-style avec séparateurs :
  - VITESSE en haut (label 10px upper, valeur 80px bold, unité 13px)
  - Grille 2×2 : Distance/Durée puis D+/Allure
  - Lignes horizontales et verticales 1px selon thème
- Page 0 = Garmin grid, page 1 = map (conserve), page 2 = laps (conserve)
- Bouton Démarrer orange `#FF6B00` (au lieu de cyan)
- Boutons Pause/Resume adaptent (bg blanc en light = noir en dark)

## Carte — couches Std / Sat / Hyb

3 boutons cercles backdrop-blur en bas-droite de la carte (encapsulé dans MapBackground) :
- Std = CartoDB light tiles
- Sat = Esri World Imagery
- Hyb = Esri World Imagery + Esri Reference labels overlay

Marker GPS :
- Point bleu `#2563EB` (au lieu de cyan)
- Halo blanc pulsant (`rgba(255,255,255,0.6)`, au lieu de cyan)
- Mise à jour dans `globals.css`

## Fichiers modifiés

| Fichier | Changements |
|---|---|
| `src/app/record/page.tsx` | Layout Strava (map ~85% + panel 120px + 3 boutons cercles) |
| `src/components/record/MapBackground.tsx` | 3 tile layers + selector Std/Sat/Hyb, marker bleu |
| `src/components/record/SportSelector.tsx` | 6 nouveaux SVG, couleur unique `#2563EB` |
| `src/components/record/CyclingScreen.tsx` | Theme detection par heure, prop drilling |
| `src/components/record/CyclingDataPage.tsx` | Page 0 = Garmin grid avec séparateurs |
| `src/components/record/CyclingControls.tsx` | Bouton orange `#FF6B00`, theme adaptation |
| `src/app/globals.css` | Marker bleu + halo blanc |

## Règles

- Merge direct sur main
- `npm run build` doit passer
- Aucune modif d'autres pages
