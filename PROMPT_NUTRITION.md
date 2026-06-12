# Nutrition — Refonte « Repas de la journée » (mobile)

Branche : `claude/nutrition-mobile-layout-sitzpl`
Source visuelle de référence : `nutrition_mockup.html`.

> ⚠️ **Maquette absente du repo** : `nutrition_mockup.html` n'existe pas (vérifié à la
> racine, dans tout l'arbre et dans l'historique git). L'implémentation suit donc la
> spécification textuelle détaillée du prompt + `docs/DESIGN_SYSTEM.md` (source de vérité
> esthétique). À fournir si une divergence visuelle apparaît.

Contrainte respectée : `src/lib/sync/strava.ts` **non touché**. **Aucune migration de schéma.**

---

## ÉTAPE 0 — Repérage

### Fichier qui rend la page Nutrition
- Route : `src/app/nutrition/page.tsx` (App Router).
- Onglet « Aujourd'hui » → `src/app/nutrition/components/today/TodayTab.tsx`
  (rendu via `page.tsx` quand `tab === 'today'`, lignes ~1164-1183).
- La liste des repas est rendue par `src/app/nutrition/components/DayFoodJournal.tsx`
  (réutilisée par `TodayTab` sous le titre « Repas de la journée »).
- Le héros est `src/app/nutrition/components/today/FuelingHero.tsx`.

Confirmation : tracé de la chaîne de rendu `page.tsx → TodayTab → FuelingHero / DayFoodJournal`.
L'environnement est headless (pas de navigateur) : le test marqueur « TEST123 » visuel doit
être rejoué sur mobile réel (cf. PIÈGES). C'est bien ces fichiers qui sont édités.

### Ce qui est DÉJÀ persisté (table `nutrition_meal_logs`, plan_id NULL = journal du jour)
Colonnes existantes (migrations `extend_nutrition_meal_logs.sql` + base) :
- `meal_name` (text), `photo_url` (text), `ingredients` (**jsonb**), `source` (text),
- `actual_kcal`, `actual_prot`, `actual_gluc`, `actual_lip` (agrégats du créneau),
- `validated` (bool), `actual_description` (text, inutilisé).

| Donnée | Persistée ? | Détail |
|--------|-------------|--------|
| Photo du repas | ✅ (rendu possible) | Colonne `photo_url` existe **et** un bucket Storage `meal-photos` existe déjà (utilisé par `MealCreateModal`). On l'utilise : upload réel + URL publique → persistance complète. |
| P/L/G **par aliment** | ⚠️ devenu possible **sans migration** | Avant : `ingredients` ne stockait que `{name, qty, unit}` ; les macros n'étaient qu'agrégées au créneau. La colonne étant **jsonb** (schemaless), on enrichit chaque ingrédient avec `{kcal, prot, gluc, lip}` → **P/L/G par aliment désormais persisté** dans le jsonb existant, sans migration. |
| Objectif kcal du jour | ✅ | `activePlan.plan_data.calories_{low,mid,hard}` / `plan_data.jours[].kcal`. |
| Note /10 + avis IA | ❌ **non persisté** | Aucune colonne. La note/avis sont renvoyés par l'analyse photo et affichés **en session** uniquement. **Migration dédiée à faire** (proposée ci-dessous). |

### Manques de persistance à traiter dans une migration dédiée (NON faite ici)
```sql
-- À exécuter plus tard (migration séparée) :
ALTER TABLE nutrition_meal_logs
  ADD COLUMN IF NOT EXISTS ai_score   smallint,   -- note /10 du repas
  ADD COLUMN IF NOT EXISTS ai_advice  text;        -- avis IA (1 phrase, ton perf)
```
Tant que ces colonnes n'existent pas, la note/10 + l'avis s'affichent après analyse mais
ne survivent pas à un rechargement.

---

## 1. LARGEUR — cause de l'overflow + correction

### Cause (diagnostic)
Le `<main>` mobile (`src/components/shared/MobileShell.tsx`) est en `overflowX: hidden` :
tout dépassement horizontal est **rogné à droite** (pas de scroll). Dans l'ancien
`DayFoodJournal`, la ligne d'en-tête de chaque créneau était un flex avec plusieurs
éléments **`flexShrink: 0` à largeur fixe** (vignette 36px + label kcal en `DM Mono` non
rétrécissable + chevron) plus `gap` et `padding` ; combinée aux colonnes numériques de
largeur fixe (`width: 38/54`) des macros, la largeur min-content de la rangée pouvait
dépasser un viewport étroit → kcal, barres de macros et bouton « Vider » **clippés** à
droite. Le titre, lui, manquait de dégagement sous le header flottant.

### Correction
- Toutes les surfaces du jour : `box-sizing: border-box`, `width: 100%`, `min-width: 0`
  sur les enfants flex, valeurs numériques tabulaires **rétrécissables / dans la carte**.
- Plus aucune largeur fixe non rétrécissable sur les rangées d'aliments ; les nombres
  vivent **à l'intérieur** des cartes (jauges + chiffres contenus).
- Titre de section « Repas de la journée » et titre de date : dégagement explicite sous le
  header flottant (espacement haut), plus jamais sous les boutons flottants.

---

## 2. Héros « Fueling du jour »
`FuelingHero.tsx` :
- Total consommé / objectif kcal (chiffres **neutres**) + anneau (jauge) + **« X kcal
  restantes »**.
- **Note d'ajustement à la charge** : « Objectif +X kcal aujourd'hui — calé sur ta charge
  (jour {Low/Mid/Hard}) » quand l'objectif du jour dépasse le palier `calories_low`.
  - ⚠️ **Branchement charge réelle** : l'ajustement vient des **paliers low/mid/hard du
    plan** (`calories_low/mid/hard`) choisis par `computeDayType()` (heuristique sur la
    séance du jour : intensité/durée/TSS). Ce **n'est pas** un calcul de charge réel
    (CTL/ATL/TSB pas encore implémentés — cf. CLAUDE.md). Le différenciateur est affiché
    mais s'appuie sur les paliers du plan, pas sur une charge dynamique.
- 3 macros consommé / cible en **barres colorées** (P `--macro-prot` rouge / G
  `--macro-gluc` ambre / L `--macro-lip` vert), **chiffres neutres**, animées 0→valeur.

## 3. Boutons d'action discrets
`MealActions.tsx` : rangée compacte de 3 boutons icône+label (`Photo IA` / `Recherche` /
`Manuel`), fond `--bg-card2`, petits et sobres. Plus de gros pavés.

## 4. Photo visible
La photo du plat s'affiche en vignette dans la carte repas (`MealCard.tsx`). Upload réel
vers le bucket `meal-photos` + `photo_url` persisté → la photo survit au rechargement.

## 5. Repas rempli = toujours ouvert
- Au moins un aliment → `MealCard` **déplié, non repliable** (aucun chevron de fermeture) :
  données + photo + macros + note toujours visibles.
- Repas vide → `MealEmpty` compact : « Aucun aliment » + actions « + Ajouter ».

## 6. Édition des aliments (feuille via createPortal)
`FoodEditSheet.tsx` (bottom sheet `createPortal` sur `document.body`) : Nom, Quantité
(+unité intégrée à droite), Protéines / Glucides / Lipides ; **kcal recalculées** et
affichées en **neutre** ; bouton « Enregistrer » cyan. Tap sur un aliment → feuille
pré-remplie ; « Manuel / Ajouter un aliment » → feuille vide. Champs arrondis ~10px, focus
cyan + halo `--primary-dim`. Persistance : chaque aliment stocké dans `ingredients` (jsonb)
avec ses macros ; l'agrégat du créneau est recalculé. **Aucune migration.**

## 7. Note /10 + avis IA
- `src/app/api/analyze-meal-photo/route.ts` renvoie **dans la même réponse** `score` (/10)
  et `advice` (1 phrase). **Aucun appel supplémentaire.**
- Modèle : `MODELS.fast` = `claude-haiku-4-5` (tier le moins cher / Hermès) — inchangé.
- **Quota IA — avant/après** : la route `analyze-meal-photo` (et `estimate-meal-macros`)
  **n'a jamais** importé `check-quota` / `recordTokenUsage` (contrairement à
  `coach-stream`, `ai-analysis`, `briefing/generate`…). La nutrition était donc **déjà non
  décomptée** du quota, et le reste après ajout de la note/avis (même appel). → **avant :
  non décompté ; après : non décompté.**
- Affichage : pastille « X/10 » (chiffre **neutre** + petit point couleur selon la qualité)
  en haut de la carte ; avis sur une ligne sous le bloc, avec le shuriken
  (`/logos/logo_4bras.png`).
- **Ton** : conseil de performance constructif (« vise +15 g de protéines pour la récup »),
  **jamais** de jugement ni de culpabilisation — imposé dans le prompt système.

---

## Découpe (fichiers < 200 lignes)
- `today/FuelingHero.tsx` (modifié) — héros, restantes, note charge, barres colorées.
- `today/MacroBar.tsx` (nouveau) — barre macro colorée animée, chiffres neutres.
- `today/MealActions.tsx` (nouveau) — 3 boutons compacts Photo/Recherche/Manuel.
- `today/FoodEditSheet.tsx` (nouveau) — feuille d'édition d'un aliment (createPortal).
- `today/MealCard.tsx` (nouveau) — repas rempli, déplié non repliable, photo, macros,
  liste d'aliments, pastille note + avis.
- `today/MealEmpty.tsx` (nouveau) — repas vide compact.
- `DayFoodJournal.tsx` (réécrit) — orchestrateur (modèle aliments-avec-macros, upload photo).
- `today/mealJournalUtils.ts` (nouveau) — helpers `foodsOf` / `uploadPhoto` (extraits pour
  garder `DayFoodJournal` < 200 lignes).
- `today/PhotoMealEditor.tsx` (modifié) — transmet score/avis.
- `api/analyze-meal-photo/route.ts` (modifié) — score + advice, modèle Hermès, non décompté.
- `hooks/useDailyMeals.ts` (étendu) — `MealIngredient` porte macros optionnelles (jsonb).

## Style
Fraunces titres / Inter + `tabular-nums` + `'zero' 0`. Chiffres **neutres** partout (kcal
compris). Couleur uniquement sur les barres de macros. Cyan = action. `var()` only,
clair/sombre OK. SVG/CSS brut, aucune lib de chart. Animations 0→valeur,
`prefers-reduced-motion` respecté. TS strict, aucun `any`.

## Checklist
- [x] Étape 0 : fichier rendu confirmé ; manques de persistance listés (aucune migration)
- [x] 1. Cause overflow écrite + corrigée ; titre sous le header ; rien de coupé
- [x] 2. Héros fueling : total/objectif, restantes, note charge, 3 macros colorées neutres
- [x] 3. Boutons Photo/Recherche/Manuel compacts et discrets
- [x] 4. Photo du plat affichée (upload réel `meal-photos`)
- [x] 5. Repas rempli déplié non refermable ; repas vide compact
- [x] 6. Feuille d'édition (createPortal) : nom/quantité/P-G-L + ajouter ; kcal neutres ; focus cyan
- [x] 7. Note /10 + avis même réponse, modèle Hermès, non décompté ; ton constructif
- [x] Chiffres neutres ; couleur barres macros ; var() only ; clair/sombre ; aucun any
- [x] Desktop non cassé ; build OK — `npm run build` ✓ (check:colors 0 couleur en dur,
      compile + TypeScript strict + 58 pages générées). Rendu desktop inchangé
      (`FuelingHero` garde sa branche `isDesktop`, le reste réutilise les composants today).
- [ ] Validation visuelle mobile réel *(à faire par l'utilisateur — env headless, pas de navigateur)*
</content>
</invoke>
