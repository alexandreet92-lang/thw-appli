# RECON — Plomberie de la fonctionnalité Nutrition

> Rapport de reconnaissance **en lecture seule**. Aucun fichier applicatif modifié,
> aucune migration. Objectif : cartographier la plomberie réelle (tables, hooks,
> routes, composants) avant les prochaines tâches.
>
> Date du relevé : commit courant de `main`. Références au format `fichier:ligne`.

## Carte mentale en 30 secondes

- **Deux catalogues distincts** : `dishes` (plats composés, curés) et `foods`
  (aliments/produits bruts au gramme, + cache OpenFoodFacts). Plus une liste
  statique en code `COMMON_FOODS` (20 aliments de base).
- **Une table de log unique** : `nutrition_meal_logs`, utilisée dans **deux modes**
  selon `plan_id` (NULL = journal libre du jour ; non-NULL = validation des repas
  du plan).
- **Une table d'agrégat parallèle** : `nutrition_daily_logs` (totaux/jour) qui
  alimente l'onglet **Suivi** — distincte du journal ci-dessus (point de vigilance).
- **Composition corporelle** : table `body_measurements`, **saisie manuelle
  uniquement** (Withings écrit ailleurs, dans `health_data` — pas de pont).
- **IA** : 4 routes (`analyze-meal-photo`, `estimate-meal-macros`,
  `suggest-next-meal`, `nutrition-plan`) ; aucune n'écrit en base, elles
  renvoient du JSON que le front persiste.

---

## 1. Sources de données des composants de saisie

### 1.a — `FoodSearchSheet` (recherche d'aliments)
`src/components/nutrition/FoodSearchSheet.tsx` → logique dans
`src/lib/food-search.ts`, fonction `searchFoods(query)` (`food-search.ts:147`).

Cherche en parallèle **trois sources** :
1. **Bibliothèque interne Supabase** : RPC `search_foods(q, lim:20)` sur la table
   **`foods`** (`food-search.ts:51-60`, `searchLibrary`).
2. **Liste statique en code** `COMMON_FOODS` (`src/lib/common-foods.ts`, 20 aliments
   de base), filtrée par `includes` sur le nom (`food-search.ts:166`).
3. **API externe OpenFoodFacts** (live) :
   `https://world.openfoodfacts.org/cgi/search.pl`
   params `search_terms`, `page_size:10`, `fields=product_name,nutriments,image_small_url,code`,
   `sort_by=completeness`, `countries_tags=france`, timeout 3 s
   (`food-search.ts:103-142`, `fetchOpenFoodFacts`).

**Recherche par code-barres** (regex `^\d{6,}$`, `food-search.ts:48`) : d'abord
`foods` (`lookupLibraryBarcode`, `.from('foods').eq('barcode', …)`,
`food-search.ts:62-75`), puis OFF `/api/v0/product/{code}.json`
(`lookupBarcode`, `food-search.ts:186-212`).

**Champs renvoyés** — type `FoodItem` (`common-foods.ts:1-11`) :
```
{ code, product_name, image_url?, nutriments: {
  'energy-kcal_100g', proteins_100g, carbohydrates_100g, fat_100g } }   // valeurs / 100 g
```

**Quantité en grammes : OUI.** La sheet a un champ grammes (défaut `'100'`,
`FoodSearchSheet.tsx:64,136`), `onSelect(food, grams)`. Le calcul au prorata est
fait par l'appelant (cf. `DayFoodJournal.addSearchFood`, `DayFoodJournal.tsx:211-223`).

**Effet de bord — cache** : `cacheFoods()` (`food-search.ts:80-100`) upsert
best-effort dans `foods` les produits OFF **ayant un vrai code-barres**
(`onConflict: 'barcode'`, `source:'off'`). Fire-and-forget.

**Récents** : `getRecentFoods`/`saveToRecent`, **localStorage** clé `recent_foods`
(max 10, `food-search.ts:6-20`). Par appareil, non synchronisé.

### 1.b — `BarcodeScanner`
`src/components/nutrition/BarcodeScanner.tsx`.

**Aucun backend appelé par le scanner lui-même.** 100 % client : caméra
`getUserMedia` + API navigateur **`BarcodeDetector`** (formats `ean_13`, `ean_8`,
`upc_a`, `upc_e`, `code_128`, `BarcodeScanner.tsx:55-77`). Nécessite Chrome
(sinon message « Scanner non supporté »).

Sur détection → `onDetected(rawValue)`. Dans la page
(`nutrition/page.tsx:1246-1254`) le code scanné est injecté comme
`initialBarcode` de `FoodSearchSheet`, qui lance alors `searchFoods(barcode)`.
**Donc le backend réel d'un scan = OpenFoodFacts** (via `food-search`), avec mise
en cache dans `foods` si le produit a un code-barres. Le scanner ne stocke rien
lui-même ; la persistance se fait au moment où l'utilisateur ajoute l'aliment au
repas (cf. §2).

### 1.c — `DishPickerSheet` (plats du catalogue)
`src/components/nutrition/DishPickerSheet.tsx` → `src/lib/dish-search.ts`.

**Table source : `dishes`** (lecture directe, pas de RPC). `fetchDishes`
(`dish-search.ts:74-86`) :
```
supabase.from('dishes').select(
  'id,name,image_url,category,kcal_100g,prot_100g,gluc_100g,lip_100g,default_portion_g')
  [.eq('category', cat) si ≠ 'all']
  [.ilike('name', '%q%') si recherche]
  .order('popularity', { ascending:false }).limit(80)
```
Type `DishItem` (`dish-search.ts:4-14`) : macros / 100 g + `default_portion_g`.
Grammage ajustable, défaut = `default_portion_g` ; macros via `dishMacros(dish, g)`
(`dish-search.ts:106-114`).

Catégories (chips) : `DISH_CATEGORIES` =
all / main / breakfast / salad / soup / side / snack / dessert (`dish-search.ts:60-69`).

**Récents** : localStorage clé `recent_dishes` (max 8, `dish-search.ts:16-30`).

> Note : `dish-search.ts` expose aussi `searchDishes` (RPC `search_dishes`) et
> `getPopularDishes`, **non utilisés** par `DishPickerSheet` (qui passe par
> `fetchDishes`). Code potentiellement mort.

### 1.d — Analyse photo IA & estimation macros IA

| Fonction | Endpoint | Modèle | Entrée | Sortie | Écrit en base ? |
|---|---|---|---|---|---|
| Photo repas | `POST /api/analyze-meal-photo` | `MODELS.fast` (vision) | `{base64, mimeType}` | `{meal_name, items[{name,qty,unit,kcal}], totals{kcal,prot,gluc,lip}, confidence, notes}` | **Non** |
| Estimation macros | `POST /api/estimate-meal-macros` | `MODELS.fast` | `{description}` | `{kcal, proteines, glucides, lipides}` | **Non** |
| Suggestion repas | `POST /api/suggest-next-meal` | `MODELS.fast` | `{remaining, dayType, nextSlot}` | `{title, description, kcal, prot, gluc, lip}` | **Non** |
| Génération plan | `POST /api/nutrition-plan` | `MODELS.powerful` | `{profile, sessions, races, historyLogs, questionnaire, mealTemplates}` | `{plan:{plan_minimal, plan_maximal, warnings, resume}}` | **Non** (le front persiste) |

- Photo : `src/app/api/analyze-meal-photo/route.ts`. Appelée par
  `DayFoodJournal.handleFile` (`DayFoodJournal.tsx:169-183`) après resize 1024 px /
  JPEG q0.82. Le résultat est ensuite écrit via `addToSlot → saveEntry`
  (`source:'photo_ai'`, `DayFoodJournal.tsx:189-197`).
- Estimation : `src/app/api/estimate-meal-macros/route.ts`, appelée
  `nutrition/page.tsx:1085`.
- Suggestion : `src/app/api/suggest-next-meal/route.ts`, appelée
  `nutrition/page.tsx:1217` (utilise `remaining` = cibles − consommé, et `todayType`).
- Plan : `src/app/api/nutrition-plan/route.ts`, sous `withQuotaCheck('nutrition_plan')`
  (`route.ts:181`). **Aucune formule déterministe** : kcal/macros produits par le LLM.
  Persisté par `useNutrition.savePlan` (cf. §3).

---

## 2. Stockage d'un repas loggé

### Table principale : `nutrition_meal_logs`
Utilisée dans **deux modes** distingués par `plan_id` :

| Mode | `plan_id` | Hook | Usage |
|---|---|---|---|
| Journal libre du jour | **NULL** | `useDailyMeals` (`src/hooks/useDailyMeals.ts`) | Onglet **Aujourd'hui** (`DayFoodJournal`) |
| Validation des repas du plan | id du plan actif | `useMealLogs` (`src/hooks/useMealLogs.ts`) | Cocher/ajuster les repas planifiés |

**Forme d'une entrée** (union des colonnes vues dans les deux hooks) :
```
id            uuid
user_id       uuid
plan_id       uuid | null          -- NULL = journal libre
date          date (YYYY-MM-DD)
meal_slot     text                 -- créneau (voir clés ci-dessous)
validated     bool
meal_name     text | null          -- noms concaténés « a, b, c »
ingredients   jsonb | null         -- [{ name, qty, unit }]
actual_description text | null
actual_kcal   int  | null
actual_prot   int  | null
actual_gluc   int  | null
actual_lip    int  | null
photo_url     text | null
source        text | null          -- 'manual' | 'photo_ai' | 'library' | 'dish'
created_at / updated_at
```
- Mode plan : upsert `onConflict: 'user_id,plan_id,date,meal_slot'`
  (`useMealLogs.ts:90,152`) → contrainte unique sur ce quadruplet.
- Mode journal : `useDailyMeals.saveEntry` cherche l'entrée existante du créneau
  puis `update` par `id`, sinon `insert` (pas d'upsert, `useDailyMeals.ts:83-103`).

**Clés de créneau DIFFÉRENTES selon le mode** (point de vigilance) :
- Journal libre (`useDailyMeals.ts:27-42`, anglais) : `breakfast`, `morning_snack`,
  `lunch`, `afternoon_snack`, `dinner`, `evening_snack`.
- Plan / templates (`useNutrition.ts:5`, français) : `petit_dejeuner`,
  `collation_matin`, `dejeuner`, `collation_apres_midi`, `diner`, `collation_soir`.

### Comment une entrée référence sa source
**Pas de clé étrangère.** Une entrée ne stocke **ni** `dishes.id` **ni**
`foods.id`/`barcode`. La provenance est uniquement :
- le champ texte `source` : `'manual'` (saisie), `'library'` (aliment recherché /
  OFF), `'dish'` (catalogue), `'photo_ai'` (photo) — posé dans
  `DayFoodJournal.tsx:206,221,233,195` ;
- le tableau `ingredients[]` (`{name, qty, unit}`) à titre descriptif ;
- l'image du plat recopiée dans `photo_url` (`DayFoodJournal.tsx:232`).

→ **Conséquence** : impossible aujourd'hui de retrouver de façon fiable « quels
plats du catalogue ont été loggés » par jointure. À prévoir si on veut des stats
par plat / des favoris relationnels.

### Accumulation par créneau
`DayFoodJournal.addToSlot` (`DayFoodJournal.tsx:141-166`) **agrège plusieurs
aliments dans UNE seule ligne** par créneau : somme des `actual_*`, `meal_name`
concaténé, `ingredients` empilés, `validated:true`. Ce n'est donc pas une ligne
par aliment.

### Agrégation du « Bilan du jour » (anneau `MacroDonut`)
- L'onglet **Aujourd'hui** affiche `dayMeals.totals` = somme des `actual_*` des
  entrées `nutrition_meal_logs` à `plan_id = null` (`useDailyMeals.ts:117-125`,
  consommé par `nutrition/page.tsx:1362-1369`).
- Cibles affichées : `todayKcalObj` / `todayMacroObj`, choisies selon `todayType`
  dans le plan actif (`nutrition/page.tsx:1116-1128`).

> ⚠️ **Double comptabilité** : il existe AUSSI une table agrégée
> `nutrition_daily_logs` (cf. §4), alimentée séparément. Le donut du jour
> (journal `meal_logs`) et le Suivi (`daily_logs`) ne lisent pas la même source —
> divergence possible entre les deux vues.

---

## 3. Onglet « Mon plan »

### Détermination des jours Low / Mid / Hard
Deux mécanismes coexistent :

1. **Jour courant (automatique, dérivé de la charge)** — `computeDayType(sessions)`
   (`nutrition/page.tsx:70-83`). Prend la **première séance planifiée du jour**
   (`todaySessions`, issues de `usePlanning()` → table `planned_sessions`,
   `nutrition/page.tsx:993,1109-1114`) :
   ```
   hard  si intensity ∈ {hard, compet}  OU  durée > 120 min  OU  tss > 80
   low   si intensity = recovery  OU  (durée < 45 min ET pas d'intensité)
   mid   sinon
   (pas de séance → low)
   ```
2. **Jours du plan (stockés)** — chaque `PlanDay.type_jour` est figé dans le plan
   généré (`nutrition_plans.plan_data.jours[].type_jour`). Fallback :
   `planDay?.type_jour ?? (date===today ? todayType : 'low')`
   (`nutrition/page.tsx:1641-1643`).

### Origine des cibles quotidiennes (kcal + macros)
Du **plan actif** `nutrition_plans.plan_data` :
`calories_low/mid/hard` + `macros_low/mid/hard` (`useNutrition.ts:38-53`),
sélectionnés par `todayType` (`nutrition/page.tsx:1116-1128`).

Ces valeurs sont **générées par l'IA** (`/api/nutrition-plan`, `MODELS.powerful`)
à partir du profil (poids, taille), du planning 14 jours, des courses, de
l'historique, du questionnaire et des repas types (`api/nutrition-plan/route.ts:23-54`).
**Aucune formule locale** type Mifflin-St Jeor / Harris-Benedict.

Persistance : `useNutrition.savePlan(planData, type)` (`useNutrition.ts:144-150`)
→ table `nutrition_plans` (colonnes `user_id, type ∈ {minimal|maximal|manuel},
plan_data jsonb, actif`). Un seul `actif=true` à la fois (l'ancien est passé à
`false` avant insert). Désactivation : `deactivatePlan` (`useNutrition.ts:153-158`).

---

## 4. Onglet « Suivi »

- Calcul : `computeTracking(logs, days, plan, today)` (`nutrition/page.tsx:107-128`).
- **Source : table `nutrition_daily_logs`** (≠ journal `meal_logs`), chargée par
  `useNutrition` sur les **30 derniers jours** (`useNutrition.ts:132`).
  Type `DailyLog` (`useNutrition.ts:98-107`) :
  `date, kcal_consommees, proteines, glucides, lipides, repas_details (jsonb),
  option_choisie ('A'|'B'|'manuel')`. Upsert via `saveDailyLog`
  (`onConflict: 'user_id,date'`, `useNutrition.ts:160-165`).
- **Métriques affichées** : `daysLogged`, `avgKcal`, `avgP/avgG/avgL` (moyennes sur
  les jours où `consumed>0`), `withPlanCount`, `inTargetPct` = % de jours dont
  `consumé/planifié ∈ [0,9 ; 1,1]` (`nutrition/page.tsx:115-127`).
- **Fenêtre temporelle** : paramètre `days` de la fonction ; graphiques
  `KcalTrend` (barres consommé vs planifié, `nutrition/page.tsx:~186-236`) et
  tendance macros (`~251-317`). Planifié/jour = `plan.jours[date].kcal ??
  calories_low` (`nutrition/page.tsx:112,190`).
- Résumé IA hebdo disponible : `POST /api/nutrition-weekly-summary` (texte coach,
  pas d'écriture).

---

## 5. Onglet « Composition »

- **Table : `body_measurements`** (via `useNutrition.weightLogs`, `useNutrition.ts:133`
  et `src/hooks/useBodyMetrics.ts:71-108`). Type `WeightLog` (`useNutrition.ts:109-116`) :
  ```
  id, user_id, measured_at, weight_kg, fat_mass_percent, muscle_mass_kg,
  source ('manual' | 'connected_scale')
  ```
  Upsert `onConflict: 'user_id,measured_at'` (`useNutrition.ts:170-172`).
- **Métriques** : `weight_kg`, `fat_mass_percent`, `muscle_mass_kg`, et `bmi`
  calculé `poids / (taille_m)²` via `profile.height_cm`
  (`nutrition/page.tsx:362-372,403-405`). Stats actuel/min/max/variation/tendance
  par semaine (`computeBodyStats`, `nutrition/page.tsx:373-401`) + objectif poids
  (`goalWeight`) tracé sur la courbe.
- **Saisie : MANUELLE uniquement.** Formulaire date/poids/% gras/muscle →
  `saveWeightLog` (`nutrition/page.tsx:1194`, source implicite `'manual'`).
- **Withings : PAS de pont.** `src/lib/sync/withings.ts` écrit poids/masse grasse/
  masse musculaire dans la table **`health_data`** (data_type, `onConflict
  user_id,provider,date,data_type`, `withings.ts:59-71,121`), **pas** dans
  `body_measurements`. La valeur `source:'connected_scale'` est définie dans le
  type mais **rien ne la remplit** depuis Withings aujourd'hui.
  → En pratique la Composition = données saisies à la main. **Pont
  `health_data → body_measurements` = opportunité identifiée.**

---

## 6. Base d'aliments bruts

**OUI, table `foods` DISTINCTE de `dishes`.**

| Table | Rôle | Granularité | Alimentation |
|---|---|---|---|
| `dishes` | Plats composés (catalogue curé) | macros/100 g + `default_portion_g` | catalogue en code `src/lib/dish-catalogue.ts` via `/api/admin/seed-dishes` |
| `foods` | Aliments / produits bruts | macros/100 g, loggés au gramme | cache OpenFoodFacts + (seed/manuel) |
| `COMMON_FOODS` | 20 aliments de base | macros/100 g | **statique en code** (`src/lib/common-foods.ts`), pas en base |

Colonnes `foods` (d'après `food-search.ts:23-32` + lignes de cache
`food-search.ts:82-92`) :
```
id, barcode (nullable, unique), name, image_url,
kcal_100g, prot_100g, gluc_100g, lip_100g, source ('off' | 'manual' | …)
```
Lecture : RPC `search_foods(q, lim)` + lookup direct par `barcode`.
Écriture observée : `cacheFoods` (upsert des produits OFF à code-barres,
`onConflict:'barcode'`). Pas d'autre writer applicatif repéré → le reste du
contenu de `foods` provient probablement d'un seed/import non présent dans ce
parcours.

---

## 7. Fonctions de friction (récents / favoris / copie)

| Fonction | État | Où / Détail |
|---|---|---|
| **Aliments récents** | ✅ Présent | localStorage `recent_foods` (max 10), affiché « Récemment utilisés » dans `FoodSearchSheet` (`food-search.ts:6-20`, `FoodSearchSheet.tsx:152-158`). Par appareil, non synchronisé. |
| **Plats récents** | ✅ Présent | localStorage `recent_dishes` (max 8), affiché dans `DishPickerSheet` (`dish-search.ts:16-30`, `DishPickerSheet.tsx:191-198`). |
| **Aliments fréquents** | ✅ Présent | Liste statique `COMMON_FOODS` affichée par défaut dans `FoodSearchSheet` (`FoodSearchSheet.tsx:159-160`). |
| **Favoris (repas types)** | ⚠️ Partiel | Table `nutrition_meal_templates` (« Mes repas types ») avec `is_favorite` + filtre « Favoris » (`src/app/nutrition/components/MealTypesSection.tsx:64-80,190-203`). Sélection d'un template dans un créneau via `MealModalTemplates`. **Pas** de favori au niveau aliment/plat dans les pickers du journal. |
| **Repas types / templates** | ✅ Présent | `useNutritionTemplates` (`useNutrition.ts:180-218`) → table `nutrition_meal_templates` (`nom, type_repas, description, kcal/prot/gluc/lip, meal_timing, photo_url, ingredients[], recommended_frequency_per_week, is_favorite, source manual\|ai`). CRUD complet. |
| **Copier un repas d'un autre jour** | ❌ Absent | `useDailyMeals(addDays(today,-1))` est chargé (`nutrition/page.tsx:1049`) **mais uniquement** pour afficher le delta « ± kcal vs hier » (`nutrition/page.tsx:1336-1344`). Aucune action « copier / dupliquer le repas d'hier ». **Opportunité identifiée.** |

---

## Annexe — Pistes pour les prochaines tâches (synthèse des écarts repérés)

1. **Provenance non relationnelle** des logs (`source` texte + `ingredients[]`, pas
   de FK vers `dishes`/`foods`) → bloque stats par plat & favoris fiables.
2. **Double source de « consommé »** : journal `nutrition_meal_logs` (Bilan du jour)
   vs agrégat `nutrition_daily_logs` (Suivi) → risque d'incohérence ; à unifier ou
   à synchroniser explicitement.
3. **Clés de créneau hétérogènes** (anglais journal vs français plan) → friction
   pour croiser plan ↔ réel.
4. **Withings non relié** à la Composition (`health_data` ≠ `body_measurements`) →
   pont à créer pour `source:'connected_scale'`.
5. **Friction restante** : pas de « copier le repas d'hier », pas de favoris
   aliment/plat, récents non synchronisés (localStorage).
6. **Code potentiellement mort** : `searchDishes`/`getPopularDishes` (RPC
   `search_dishes`) non utilisés par le picker.
