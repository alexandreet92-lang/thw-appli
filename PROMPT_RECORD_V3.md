# PROMPT RECORD V3

## Audit pré-modification

| Concern | Fichier | Action |
|---|---|---|
| Cacher navbar sur /record | `src/components/MobileTabBar.tsx` l.108 | Ajouter `if (pathname === '/record') return null` après le `hidden` guard |
| Panel bas blanc + bouton cyan→bleu | `src/app/record/page.tsx` | Bg theme-aware, centre = gradient cyan→bleu (était orange) |
| Layer selector visible (3 options) | `src/components/record/MapBackground.tsx` | `bottom: 16` → `bottom: 140` pour passer au-dessus du panel |
| Sport selector refonte Strava | `src/components/record/SportSelector.tsx` | Rewrite complet : header + search + recents horizontal + catégories scrollables |

## Détails

### 1. MobileTabBar
Surgical : 1 ligne ajoutée `if (pathname === '/record') return null` après `if (hidden) return null`.
Effet : sur `/record`, la navbar disparaît complètement.

### 2. Panel record/page.tsx
- Bg : `var(--bg-card)` (= white light / #1A1A1A dark via les CSS vars du projet)
- Boutons latéraux : `var(--bg-card2)` + couleur texte `var(--text)`
- Bouton central Démarrer : `linear-gradient(135deg, #06B6D4, #2563EB)`, shadow cyan

### 3. MapBackground
- LayerSelector reste tel quel mais bottom 16 → 140 pour ne plus être caché par le panel record

### 4. SportSelector (rewrite complet)
- Bottom sheet 85vh, fond `#1A1A1A` (sombre Strava style)
- Header : titre "Choisir un sport" + bouton close `×`
- Search bar : input avec icône loupe
- Recents : scroll horizontal, 5 sports en cercles 52px (cycling/running/trail/strength/swim par défaut)
- Catégories scrollables (sports sur roues / pied / muscu / nautiques)
- 9 sports au lieu de 6 (ajout : mtb, hiking, swim)
- Coche cyan `#06B6D4` sur le sport sélectionné
- `stroke` const + fonctions Icon déclarées AVANT `SPORT_CATEGORIES` (leçon TDZ V2)

### page.tsx
- Mise à jour pour passer `selectedSport={sport}` au SportSelector (prop ajoutée)
- Imports SportId élargi (mtb/hiking/swim ajoutés)

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
- Aucun autre fichier touché
