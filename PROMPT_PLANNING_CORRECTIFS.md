# PROMPT — Planning · Correctifs : couleurs thème + overlap courses frise

## Phase 0 (diagnostic)
1. Training Bloc (cartes + onglets) : `src/app/planning/components/TrainingBlockSummary.tsx`
   + `src/components/planning/BlocSummaryView.tsx` + `BlocDetailOverlay.tsx` +
   `FocusPicker.tsx` + `BlocStartWeekPicker.tsx`.
2. Frise : `src/components/planning/FriseV1.tsx` (+ `friseModel.ts`, `GanttOverlay.tsx`).
3. Couleurs en dur trouvées : `#161b22`, `#1b212b`, `#e6edf3`, `#888/#bbb/#ccc`,
   `rgba(255,255,255,.03→.15)`, `rgba(230,237,243,.2→.62)`.
4. Variables de thème du projet (globals.css, adaptent jour/nuit) :
   `--bg`, `--bg-card`, `--bg-card2`, `--bg-elev`, `--border`, `--border-mid`,
   `--text`, `--text-mid`, `--text-dim`. (Pas de `--card/--muted/--foreground`
   façon shadcn → on mappe vers les tokens RÉELS du projet, aucune variable créée.)

## Correctif 1 — couleurs adaptées au thème
Mapping appliqué (token réel du projet) :
| en dur | → token |
|---|---|
| `#161b22` (carte) | `var(--bg-card)` |
| `#1b212b` (surface 2) | `var(--bg-card2)` |
| `rgba(255,255,255,.03→.08)` (fonds) | `var(--bg-card2)` |
| `rgba(255,255,255,.06→.15)` (bordures) | `var(--border)` |
| `rgba(255,255,255,.12)` (pips inactifs) | `var(--border-mid)` |
| `#e6edf3` | `var(--text)` |
| `rgba(230,237,243,.45→.62)`, `#888` | `var(--text-mid)` |
| `rgba(230,237,243,.2→.4)`, `#bbb/#ccc` | `var(--text-dim)` |

Couleurs **non modifiées** (fonctionnelles/sport, assumées) : `#22d3ee` +
`rgba(34,211,238,…)`, `#ef4444` + `rgba(239,68,68,…)`, couleurs sport (`SPORT_COLORS`,
`${color}cc`), `#04141a` (texte sur cyan), `#fff` et `rgba(255,255,255,.4/.6/.75)`
(texte/poignées sur fonds colorés), `rgba(0,0,0,…)` (ombres/scrims).

## Correctif 2 — overlap des courses dans la frise
`assignRaceLevels` : tri par date, niveau vertical alterné si deux courses sont à
moins de 2 colonnes d'écart. Rendu avec `top = level*24`, `zIndex = 5-level`, épingle
seulement au niveau 0, **fond de badge `var(--bg-card)`** (lisible jour/nuit) + ombre.
Hauteur de la zone courses : 52px si un niveau > 0, sinon 30px. Les bandes rouges
verticales sur les pistes restent inchangées (couleur fonctionnelle).

## Checklist
- [x] Jour : cartes Training Bloc fond clair cohérent ; Nuit : fond sombre cohérent.
- [x] Plus aucun `#161b22`/`#1b212b`/fond blanc en dur dans Training Bloc + Frise.
- [x] Courses : aucun badge ne se chevauche (décalage vertical alterné).
- [x] Fond des badges course = `var(--bg-card)`.
- [x] Couleurs fonctionnelles/sport intactes.
- [x] `npm run build` passe.

## Contraintes
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
