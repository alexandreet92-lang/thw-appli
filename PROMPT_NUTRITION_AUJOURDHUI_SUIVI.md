# Refonte visuelle — onglets « Aujourd'hui » et « Suivi » de Nutrition

## Cadre
Application du langage de design (docs/DESIGN_SYSTEM.md) à DEUX onglets de
src/app/nutrition/page.tsx : « Aujourd'hui » (tab === 'today') et « Suivi »
(tab === 'tracking'). On ne touche à aucun autre onglet ni aucune autre page.
Fond de page = var(--bg) ; seul gris autorisé = var(--bg-card2).

## Phase 0 — Inspection LECTURE SEULE (constats réels)

### Onglet « Aujourd'hui » (page.tsx:1357-1568 + 1596-1639)
Données :
- **Cibles kcal+macros du jour** : `todayKcalObj` / `todayMacroObj`
  (page.tsx:1144-1156) — **branché** (plan actif ou fallback par type de jour).
- **Consommé du jour** : `dayMeals.totals` (hook `useDailyMeals(today)`) — **branché**.
- **Poids athlète (g/kg)** : `profile?.weight_kg` — **branché si renseigné**, sinon
  null → état réel « poids non renseigné », pas de poids inventé.
- **Séance(s) du jour** : `todaySessions` (1136-1140, hook `usePlanning`) — **branché**,
  expose title/sport/duration_min/intensity/tss. Lien possible vers `/planning`.
- **Règles de fueling pré/pendant/post** : **ABSENT**. Il existe seulement un enum
  `MealTiming` (`pre_training|post_training|rest|morning|evening`,
  useNutrition.ts:6) servant à *étiqueter des repas types* — aucune table/règle qui
  dise quoi manger avant/pendant/après une séance. → « Autour de ta séance » ne doit
  PAS inventer de chiffres : afficher les séances + message neutre, documenter le manque.
- **Aliments récents** : **présent** — `getRecentFoods()` (localStorage `recent_foods`,
  food-search.ts:9) renvoie `FoodItem[]`. Exploitable, mais le quick-add (clic →
  ajout au créneau) demande un câblage non trivial (cf. note d'implémentation).
- **Hydratation** : hook `useHydration(today)` → `{ liters, addLiters, setLiters }`
  (table `hydration`) — **branché**.
- **Créneaux de repas + états** : composant `DayFoodJournal` (350+ lignes), gère
  l'ajout (Photo IA / Recherche / Manuel) ET **le repli des collations**
  (`expanded` par créneau, expandSignal). — **branché**.

Couleurs en dur / monospace de l'onglet : `DAY_COLORS` (vert/jaune/rouge),
`#06B6D4` + `rgba(6,182,212,…)` (cyan, ~15×), violet IA `#8b5cf6`/`rgba(139,92,246,…)`,
`DM Mono`/`Syne` en littéral, `MacroDonut` (4×, couleurs en prop).

### Onglet « Suivi » (page.tsx:1642-1651 → SuiviSection/SuiviCharts/suiviData)
- **Jours loggés, adhérence, kcal moy, protéines g/kg** : **calculables** —
  `periodSummary` (suiviData.ts:70) sur `nutrition_daily_logs` + plan + poids.
  g/kg null si poids absent (honnête).
- **Charge d'entraînement (TSS/CTL) depuis la nutrition** : **ABSENT** (pas de hook
  exposant la charge/jour). Déjà signalé honnêtement (SuiviSection.tsx:106-108).
  Reconfirmé : le module « Glucides vs charge » reste en état indisponible.
- **Readiness / récupération** : **ABSENT** (table recovery non alimentée,
  SuiviSection.tsx:118-120). Module « Fueling × récup » reste indisponible.
- **Adhérence par type de jour** : `adherenceByType` — **branché**.
- **Hydratation loggée** : requête table `hydration` dans SuiviSection — **branché**.
- **Régularité de logging** : `loggedPct` / rows — **branché**.

Couleurs en dur / monospace : `TYPE_COLOR` (#22c55e/#eab308/#ef4444, SuiviCharts.tsx:9),
`#06B6D4` (ligne protéines), `#0ea5e9` (barres hydratation, hors palette),
bande cible verte `#22c55e` (protéines), fonts `Syne`/`DM Mono` en littéral.

## Phase 1A — Refonte « Aujourd'hui »
Anatomie cible : en-tête éditorial, hero « Ton fueling du jour » (anneau SVG unique
kcal + 3 barres macros + g/kg + lien séance), « Autour de ta séance » (séances réelles
+ état neutre, AUCUN chiffre de fueling inventé), hydratation (barre fine + boutons
texte), repas de la journée, suggestion IA (bouton texte var(--ai-accent)).

Périmètre livré / différé (décision documentée) : la **liste des repas** réutilise
`DayFoodJournal` tel quel (repli des collations conservé). Le **restyle interne de
DayFoodJournal** (fil vertical, points 7px) et les **pastilles « ajout rapide »
(recent foods cliquables)** sont **différés** : réécrire un composant partagé de
350+ lignes + câbler le quick-add au créneau est un gros diff à risque (clause
« s'arrêter et documenter » du cadre). DayFoodJournal reste donc non-enforced.

## Phase 1B — Refonte « Suivi »
En-tête éditorial + sélecteur 7/14/30 j en boutons texte ; bilan = 4 stats nues ;
hero glucides-vs-charge en état indisponible honnête (charge absente) ; modules
secondaires SVG bruts (adhérence par type en teintes, protéines g/kg ligne primary +
bande cible NEUTRE, fueling×récup indisponible, hydratation barres primary +
objectif, régularité en grille de carrés). Cadrage santé : « manges-tu assez pour ta
charge », jamais déficit/restriction.

## Phase 2 — Garde-fou
Ajouter à ENFORCED_PATHS (scripts/check-colors.mjs) chaque fichier extrait et nettoyé.
DayFoodJournal et page.tsx restent hors enforce (dette/onglets non refondus).

## Contraintes
TypeScript strict, zéro any, zéro mock (donnée absente = état réel), SVG brut, tokens
uniquement, ≤200 lignes/fichier, npm run build vert, aucun emoji, commit local, pas de push.
