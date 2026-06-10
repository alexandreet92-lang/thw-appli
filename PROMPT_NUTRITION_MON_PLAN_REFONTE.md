# Refonte visuelle — onglet « Mon plan » de Nutrition

## Cadre
Première application du nouveau langage de design (docs/DESIGN_SYSTEM.md) à une
page réelle. On refond UNIQUEMENT l'onglet « Mon plan » (tab === 'plan') de
src/app/nutrition/page.tsx et ses composants. On ne touche à aucun autre onglet
(today / tracking / body) ni à aucune autre page.

LIRE docs/DESIGN_SYSTEM.md INTÉGRALEMENT avant toute modification. La refonte doit
s'y conformer à la lettre.

## Phase 0 — Inspection LECTURE SEULE (constat avant modification)

### 1. Rendu actuel de l'onglet (page.tsx:1574-1777)
Le bloc `{tab === 'plan' && (...)}` est enveloppé dans `<div style={cardStyle}>`
(carte `--bg-card` + bordure `1px solid var(--border)`, radius 20, padding 28/24).
Titre `Plan nutritionnel` en `sectionTitle` (Syne 18). Deux états :
- **`!activePlan`** : un bouton CTA dégradé cyan→indigo « Créer mon plan avec l'IA »
  (`page.tsx:1579-1608`) qui ouvre l'AIPanel.
- **`activePlan`** : ligne « Plan actif : {type} — {date} » (1613-1615) ; **3 cartes**
  Low/Mid/Hard à fond + bordure colorée (`DAY_COLORS`, 1618-1641) ; **sélecteur de
  variante A/B** (1643-1663) ; **calendrier 14 jours** en grille 7 colonnes, case du
  jour à fond + bordure 2px colorée (1665-1720) ; **rangée d'actions** : « Modifier
  avec l'IA » (bouton dégradé), « Liste de courses », « Régénérer », « Supprimer »
  (1722-1773).

Composants & callbacks réutilisables (restent en place dans page.tsx) :
- `PlanShoppingList` (modal liste de courses) ouvert par `setShoppingOpen(true)`.
- `AIPanel` (Coach IA) ouvert par `setAiPanelOpen(true)`.
- **Modal détail jour** rendue via `createPortal` à `page.tsx:2056+`, ouverte par
  `setDayDetailOpen(planDay)` ; possède son propre sélecteur variante A/B (2147+).
- `setRegenConfirm(true)` (modal de confirmation régénération) ; `handleDeletePlan`
  (1228-1231, `confirm()` + `deactivatePlan`).

Données réellement disponibles dans le scope page :
- `activePlan: NutritionPlan` → `type`, `plan_data` (`calories_low/mid/hard`,
  `macros_low/mid/hard`, `jours: PlanDay[]`).
- `todayKcalObj` / `todayMacroObj` (page.tsx:1144-1156) : cibles kcal+macros du jour.
- `todayType` (1141) ; `next14Days` (1266) ; `sessions` ; `todaySessions` (1136-1140).

### 2. Source des types de jour Low/Mid/Hard (réelle, pas de placeholder global)
- **Par jour planifié** : `PlanDay.type_jour` (`'low'|'mid'|'hard'`) **stocké** dans
  `nutrition_plans.plan_data.jours[].type_jour` (généré par l'IA). Valeur réelle.
- **Jour courant sans PlanDay** : `computeDayType(todaySessions)` (page.tsx:73-86),
  **dérivé** de `planned_sessions` (intensity / durée / tss). Valeur réelle.
- **Fallback calendrier** : `planDay?.type_jour ?? (date===today ? todayType : 'low')`
  (1672-1674). Le `'low'` n'est qu'un **fallback d'affichage** quand ni PlanDay ni
  jour courant ne s'appliquent. Documenté : non inventé, c'est un défaut visuel.
- **kcal cible** : `todayPlanDay?.kcal ?? calories_{type}` — réel (généré IA).

### 3. Séance du jour accessible ? OUI
`todaySessions` (page.tsx:1136-1140) filtre `sessions` (hook `usePlanning`, table
`planned_sessions`) sur le `day_index` du jour. Chaque `PlannedSession` expose
`title`, `sport`, `duration_min`, `intensity`, `tss`. Le lien « Calé sur ta séance »
est donc **possible**. Pas de route dédiée par séance dans l'app → le lien pointe
vers la **page `/planning`** (où vivent les séances). Si `todaySessions` est vide :
état réel « Jour de repos — aucune séance calée », **sans lien inventé**.

### 4. Couleurs en dur de l'onglet à remplacer par des tokens
- `DAY_COLORS` (page.tsx:49-53) : rgba + hex vert/jaune/rouge (fonds, bordures, textes).
- `#06B6D4` et `rgba(6,182,212,…)` (cyan) : variante A/B, points séance, gradients.
- `rgba(91,111,255,…)` / `#5b6fff` (indigo) : bordures/fonds des CTA IA.
- `linear-gradient(135deg,#06B6D4,#5b6fff)` : boutons.
→ Remplacés par : `--charge-low/mid/hard` (points uniquement), `--primary` (action,
liens), `--on-primary` (texte sur bouton cyan), `--bg-card2`, `--text*`. Aucun violet
IA dans cet onglet (le bouton « Modifier avec l'IA » est l'action principale = cyan,
conformément à DESIGN_SYSTEM.md §8).

## Phase 1 — Refonte (réalisée)
Onglet extrait dans son propre dossier pour respecter la limite 200 lignes/fichier
et permettre l'enforce isolé du garde-fou couleurs :
- `src/app/nutrition/components/plan/PlanTab.tsx` — en-tête éditorial, hero focal,
  cibles par type de jour, actions.
- `src/app/nutrition/components/plan/PlanRhythm.tsx` — signature : 14 barres SVG brut,
  hauteur ∝ kcal, couleur de charge (45 % d'opacité ; jour courant pleine couleur +
  fond `--bg-card2`), chaque jour cliquable vers la modal détail existante.
- `src/app/nutrition/components/plan/planFormat.ts` — helpers dates FR + tokens de
  charge (aucune couleur littérale).
`page.tsx` : le bloc 1574-1777 (carte + contenu) est remplacé par `<PlanTab … />`
(plus de `cardStyle`, plus de bordure décorative). Modal détail jour et autres onglets
inchangés.

## Phase 2 — Garde-fou
`ENFORCED_PATHS` (scripts/check-colors.mjs) reçoit les 3 nouveaux fichiers par chemin
exact. On **ne peut pas** enforced `page.tsx` (les 3 autres onglets gardent des
couleurs en dur) ni le dossier `plan/` entier (`PlanShoppingList.tsx` a encore de la
dette) : seuls les fichiers refondus sont enforced.

## Contraintes respectées
TypeScript strict (aucun any), zéro mock, SVG brut, tokens uniquement, aucun emoji,
aucune migration, strava.ts intact, build vert, commit local, pas de push.
