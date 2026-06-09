# PROMPT_NUTRITION_MON_PLAN

Refonte de l'onglet « Mon plan » : affichage + pilotage d'un plan existant
(pas de génération IA, tâche séparée).

## PHASE 1 — INSPECTION (lecture seule) — RÉSULTATS

### Composant
- Onglet « Mon plan » : dans `src/app/nutrition/page.tsx` (bloc `{tab === 'plan'}`
  ≈ l.1543, + bouton « Mes repas types » l.2387). Page de 2392 lignes.

### Modèle de données du plan (`src/hooks/useNutrition.ts`)
Table `nutrition_plans` : `{ id, type: 'minimal'|'maximal'|'manuel', plan_data,
created_at, actif }`. `plan_data: NutritionPlanData` =
`{ description, calories_low|mid|hard, macros_low|mid|hard, jours: PlanDay[] }`.
`PlanDay = { date, type_jour: 'low'|'mid'|'hard', kcal, macros, repas:{option_A,
option_B: MealSet} }`. `MealSet` = 6 créneaux, chaque valeur = **string ou**
`{description, kcal, macros}` (`slotText()` lit les deux).

**Manques (documentés, jamais inventés) :**
- **Objectif** (Performance / Perte / Muscle) : pas de champ dédié — seulement
  `plan_data.description` (texte) et `type` (minimal/maximal/manuel).
- **Dates de fin / expiration** : seulement `created_at` + plage de `jours[].date`.
  Pas d'`end_date` → « expiré » non calculable précisément.
- **Référence conversation IA** : **absente** du modèle → impossible de rouvrir
  la conversation d'origine exacte.
- **Ingrédients structurés** : les repas sont des **descriptions en texte libre**
  → liste de courses en best-effort (cf. Phase 5).

### Régénérer / Supprimer (avant)
- « Régénérer » ouvrait directement le panneau IA (`setAiPanelOpen(true)`),
  sans confirmation ni tokens. « Supprimer » = `handleDeletePlan()` →
  `deactivatePlan()` (désactive `actif`, garde l'historique) + `confirm()`.

### Scanner code-barres
- `BarcodeScanner` (dynamic), bouton `className="flex md:hidden"` → **déjà
  mobile-only**. Rien à changer (vérifié).

### Modale « Mes repas types »
- `useNutritionTemplates` + `MealTemplatesSection` (CRUD templates), ouverte via
  bouton ghost l.2387.

### Point d'entrée génération
- `setAiPanelOpen(true)` ouvre le panneau IA (`AIPanel`) — c'est l'entrée de
  génération/modification existante. (API : `src/app/api/coach-engine/route.ts`.)

### Système de tokens
- **Non localisé** dans `src/hooks` (pages `/topup*` existent mais aucun hook de
  consommation de crédits trouvé). → régénération confirmée mais **ne consomme
  pas encore de tokens** (à brancher quand le hook sera identifié).

## ÉTAT D'IMPLÉMENTATION (commit local, sans push)

### Fait (réel, additif, sans régression — build OK)
- **Liste de courses** (nouveau `components/plan/PlanShoppingList.tsx`) :
  bascule **Par jour / Semaine complète**, regroupement **par rayon**
  (Fruits & légumes / Protéines / Féculents & épicerie / Produits laitiers /
  Fruits secs & autres / Autres), **quantités en fourchette** (n–n+1),
  extraction **best-effort** des descriptions de repas réelles du plan,
  **Imprimer** + **Télécharger (PDF)** via `window.print()` (vue d'impression
  isolée en CSS `@media print`). Limite documentée dans l'UI (pas de grammage
  exact dans le plan).
- **Régénérer** : design épuré + **modale de confirmation** avant ouverture du
  panneau IA. (Tokens : cf. manque ci-dessus.)
- **Supprimer** : démoté en **bouton ghost secondaire** (confirmation conservée).
- **Modifier avec l'IA** : bouton dédié → panneau IA (cf. manque : pas de
  conversation d'origine stockée à rouvrir).
- **Détail du jour** : ajout du **lien séance** (interconnexion → `/planning`)
  qui justifie le type de jour, ou état réel « Aucune séance liée ce jour ».
- Scanner : confirmé **mobile-only**.

### Déjà présent (réutilisé, non régressé)
- Cartes LOW / MID / HARD (kcal + macros réelles), variante A/B, calendrier
  14 jours à pastilles colorées par type réel + jour courant, panneau détail
  du jour (repas option A/B).

### Reste à faire (incrément dédié — refactor lourd page 2392 l.)
- **Phase 2** : bascule onglets → `SectionLayout` (rail desktop + onglets
  mobile) + contenu pleine largeur. Staggé pour éviter toute régression sur les
  4 onglets (même contrainte que la tâche « Aujourd'hui »).
- **Objectif** en puce + **statut/période** : nécessitent des champs absents
  (objectif enum, end_date) → à ajouter au schéma d'abord.
- **État vide/expiré** : « Créer mon plan avec l'IA » présent ; libellé
  « Un nouveau plan est généré chaque semaine selon ton planning » + détection
  d'expiration à ajouter quand `end_date` existera.
- **Tokens** sur régénération : brancher quand le hook crédits sera identifié.

## CONTRAINTES RESPECTÉES
- Aucun emoji · TS strict sans `any` · zéro mock (manques documentés) · SVG/CSS
  via variables · `strava.ts` intact · aucune migration · `npm run build` passe.
