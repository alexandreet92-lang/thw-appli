# PROMPT — Planning · Prompt 3 : grille semaine (cartes de séances)

## Phase 0 (diagnostic)
1. Grille 7 jours (Lun→Dim) : fonction `WeekGrid` dans `src/app/planning/page.tsx`
   (lignes ~3662-3793). En-têtes de colonne ~3672-3730 ; corps (cartes) ~3732-3791.
2. Carte de séance : JSX **inline** (pas de composant séparé), boucle des séances
   planifiées ~3770-3783.
3. Chemins affichés en console (ci-dessus).
4. Test de présence (« TEST789 ») effectué puis annulé.

## Avant → Après
- AVANT : en-têtes plats sur `var(--bg-card2)`, cartes claires `SPORT_BG` + SportBadge
  + barre de zones.
- APRÈS :
  - **En-tête colonne** = carte sombre `#161b22`, bordure `rgba(255,255,255,.06)` ;
    jour actuel bordure `rgba(34,211,238,.4)` + numéro `#22d3ee`. Abréviation 9.5px
    caps `rgba(230,237,243,.25)`, numéro 16px. Badge charge (intensité) conservé.
  - **Carte séance** = fond `#1b212b`, filet gauche 2px couleur sport, teinte de fond
    sport `opacity .08`, label sport caps 8px, titre 11px `#e6edf3`, heure+durée 9.5px,
    **barre de progression 2px** en bas (réalisé/prévu).

## Décisions de cohérence
- Couleur sport : on garde `SPORT_BORDER[s.sport]` (source de vérité de cette grille,
  partagée avec les cartes d'activité et `SPORT_BG`) plutôt qu'un second palette
  `blocTypes.SPORT_COLORS` — évite hyrox rouge ici / rose là, et couvre rowing/elliptique.
- Progression : `s.status === 'done' ? 100 : 0` (état réel de complétion, zéro mock ;
  les séances réalisées matchées par une activité sont déjà rendues séparément).
- Label sport court : map locale `SPORT_SHORT` (Run/Bike/Swim/Gym/Hyrox/Row/Ellip).
- Durée : `formatHM(durationMin)` → « 1h30 ».

## Checklist
- [x] Fond colonne `#161b22`, bordure `rgba(255,255,255,.06)`.
- [x] Colonne aujourd'hui : bordure `rgba(34,211,238,.4)`, numéro `#22d3ee`.
- [x] Carte séance fond `#1b212b`, filet sport, teinte fond opacity .08.
- [x] Barre de progression 2px en bas de chaque carte.
- [x] Label sport caps 8px, titre 11px, heure+durée 9.5px.
- [x] Durée « 1h30 » (formatHM).
- [x] `npm run build` passe.

## Contraintes
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
