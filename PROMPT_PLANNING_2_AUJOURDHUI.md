# PROMPT — Planning · Prompt 2 : section « Aujourd'hui »

## Phase 0 (diagnostic)
1. Section « AUJOURD'HUI — JEU 11 » : à localiser (chemin affiché en console).
2. Test de présence (« TEST456 ») effectué puis annulé.

## Avant → Après
- AVANT : cartes blanches, bordure colorée à gauche, fond clair.
- APRÈS : cartes fond sombre `#161b22`, filet gauche 3px couleur du sport,
  titre `#e6edf3`, sous-titre `rgba(230,237,243,.38)`, statut à droite.

## Règles
- Fond carte : `#161b22` (jamais blanc).
- Filet gauche : couleur sport, 3px.
- Titre : `#e6edf3`. Sous-titre + statut : `rgba(230,237,243,.38)`.
- Durée : `formatDuration(heures)` → « 1h30 » (jamais « 1,5 h »).
- Couleurs sport : bike `#3b82f6`, run `#f97316`, gym `#8b5cf6`,
  swim `#0ea5b7`, hyrox `#ec4899`.

## Checklist
- [x] Fond des cartes `#161b22`, jamais blanc.
- [x] Filet gauche coloré par sport.
- [x] Durée au format « 1h30 ».
- [x] Statut visible à droite.
- [x] `npm run build` passe.

## Contraintes
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
