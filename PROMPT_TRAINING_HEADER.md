# PROMPT_TRAINING_HEADER — Header page Training

## FIX 1 — Supprimer le header "Training / activités"
Supprimer le div/row contenant titre "Training", compteur "X activités",
et boutons App / refresh / ?.

## FIX 2 — Nouvelle barre unique
Une seule barre horizontale (display:flex, space-between, padding 12px 16px,
borderBottom var(--border)) contenant :
- Gauche : SectionDropdown (Données / Analyse / Progression)
- Droite : boutons App, refresh ↺, ?

## FIX 3 — Dropdown animé
Refaire le sélecteur de section avec :
- useState(open) + chevron SVG rotatif
- Menu déroulant animé : maxHeight 0→300px + opacity 0→1
- 3 items : Données / Analyse / Progression avec sous-titre
- Click outside ferme (useEffect)
- Item actif : fond cyan 8% + bordure gauche #06B6D4

## Fichiers
- `src/app/activities/page.tsx`
