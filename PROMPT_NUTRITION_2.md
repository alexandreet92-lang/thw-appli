# Nutrition — Refonte v2 « Repas de la journée » (analyse, photo, cadrage)

Branche : `claude/nutrition-mobile-layout-sitzpl`. Suite de `PROMPT_NUTRITION.md`.
`docs/DESIGN_SYSTEM.md` relu. `src/lib/sync/strava.ts` **non touché**. **Aucune migration.**

---

## ÉTAPE 0 — Repérage

### Fichier rendu (confirmé)
`src/app/nutrition/page.tsx` (route App Router) → onglet « Aujourd'hui »
`components/today/TodayTab.tsx` → liste repas `components/DayFoodJournal.tsx` → carte repas
`components/today/MealCard.tsx`. Chaîne de rendu tracée ; environnement **headless** (pas de
navigateur) → le test marqueur « TEST123 » visuel reste à rejouer sur mobile réel.

### Persistance vérifiée EN BASE (projet actif Supabase `thw-v2` / `sfrcnyzntgrxlwlmwifi`)
Colonnes `nutrition_meal_logs` (vérifiées via information_schema) :
`id, user_id, plan_id, date, meal_slot, validated, actual_description, actual_kcal (int),
actual_prot/gluc/lip (numeric), created_at, updated_at, meal_name (text), photo_url (text),
ingredients (jsonb), source (text)`.

- **Ingrédients d'un repas avec compte + P/L/G chacun** : ✅ stockables **sans migration** —
  `ingredients` est **jsonb** ; on y met `{ name, qty, unit, kcal, prot, gluc, lip }` par
  aliment (+ `count`/`estimated` pour l'analyse). L'agrégat du créneau (`actual_*`) = somme.

- **URL photo du repas** : ⛔ **BLOCAGE CONFIRMÉ (point n°4)**. La colonne `photo_url` existe,
  **MAIS le bucket Storage `meal-photos` N'EXISTE PAS** dans le projet `thw-v2` (buckets
  présents : `avatars`, `race-files`, `test-documents`). L'upload `storage.from('meal-photos')`
  échoue donc silencieusement (try/catch → `null`) → `photo_url` reste `null` → la photo ne
  se réaffiche jamais. **Ce n'est PAS un bug de code** : c'est l'infra manquante.
  - Fait notable : les **policies RLS `meal-photos` existent DÉJÀ** (`Upload/Read/Delete own
    meal photos`), attendant un préfixe de dossier `{user_id}/...`. Il ne manque que le bucket.

### Manque à créer dans une opération dédiée (NON faite ici — pas de migration)
```sql
-- Storage : créer le bucket manquant (les policies RLS existent déjà).
insert into storage.buckets (id, name, public, file_size_limit)
values ('meal-photos', 'meal-photos', true, 5242880)
on conflict (id) do nothing;
```
(public=true pour réaffichage simple ; sinon URL signées.) Le code d'upload est déjà en place
(`mealJournalUtils.uploadPhoto`, chemin `{user_id}/<ts>.<ext>` conforme aux policies). **Dès le
bucket créé, la photo se persistera et se réaffichera sans autre changement.** Tant qu'il
n'existe pas, je **n'affiche pas** une photo factice (pas de blob éphémère « pour faire
semblant ») : la carte reste sans photo et le blocage est ici, documenté.

### CIQUAL — état réel
Il n'existe **aucun dataset CIQUAL** dans le repo. La base d'aliments = table Supabase `foods`
(RPC `search_foods`) + `src/lib/common-foods.ts` (table FR curée, valeurs type-CIQUAL) +
OpenFoodFacts (live). L'« ancrage CIQUAL » du point 8 est donc réalisé sur **`common-foods`**
(référence déterministe) avec repli sur l'estimation du modèle. **Manque** : import du dataset
CIQUAL officiel (table dédiée) → à planifier (hors périmètre, signalé).

---

## 1. LARGEUR — conteneur copié de Planning
Référence = `src/components/navigation/SectionLayout.tsx` (utilisé par Planning/Calendar/Profil).
Valeurs reprises **à l'identique** pour le mobile :
- racine : `width:100% ; maxWidth:100% ; margin:0 ; padding:'0 0 80px' ; overflowX:hidden ;
  boxSizing:border-box`,
- en-tête : `padding:'24px 16px 0'`,
- contenu : `padding:'14px 12px 0'` + conteneur `width:100% ; boxSizing:border-box`.
Desktop : `main` `padding:'28px 28px 80px'` (le rail Nutrition reste). Résultat : rien de coupé
à droite, pas de scroll horizontal, marges identiques aux autres pages.
> Note DS §3 (≥20px mobile) : Planning cadre à 12/16px ; l'instruction « copier Planning » prime,
> donc 12/16px retenus pour la parité visuelle demandée.

## 2. BANDEAU 7 JOURS
`DayStrip` : **7 jours = aujourd'hui + 6 précédents**, aujourd'hui à droite, **présent et
sélectionné par défaut** (l'état initial de la page = `realToday`). Le « jour manquant »
venait du clip horizontal (point 1) + d'une fenêtre à 6 jours : corrigé.

## 3. DONUT = répartition P/G/L
`MacroDonut` (today) : anneau **segmenté en 3 arcs** proportionnels P/G/L (rouge/jaune/vert,
tokens `--macro-*`), **kcal NEUTRES au centre**, **plus de %**. SVG brut (déjà conforme,
intégré au nouveau layout de carte).

## 4. PHOTO — voir ÉTAPE 0 : blocage = bucket `meal-photos` manquant (reporté, non créé).

## 5. LAYOUT carte repas
`MealCard` : **rangée [photo à gauche · donut à droite]**, puis **EN DESSOUS les 3 jauges
P/G/L** (`MealMacroGauges` : barres rouge/jaune/vert, grammes + kcal, chiffres NEUTRES).

## 6. AJOUT + RECTIFICATION
- « + Ajouter un aliment » → recherche d'aliment (`FoodSearchSheet`, base `foods`/OFF/
  common-foods = ancrage type-CIQUAL) → macros auto.
- Toutes les valeurs (nom, quantité/compte, P/L/G) rectifiables via `FoodEditSheet` ; les
  totaux du repas se recalculent à chaque modif.

## 7. SECTION DÉTAIL par aliment
`MealDetail` (dépliable) : pour chaque aliment, nom, quantité **ou compte**, P / L / G, kcal.
Tap → `FoodEditSheet` pour corriger.

## 8. ANALYSE — décomposition + comptes + ancrage
`api/analyze-meal-photo` refondu :
- **décompose** le plat en ingrédients (ex. omelette → 4 œufs + beurre), jamais un bloc unique ;
- ingrédients **comptables** (œufs, tranches, fruits) → **nombre** + unité, pas des grammes ;
- la quantité issue de la photo est un **premier jet `estimated:true`**, confirmable ;
- **ancrage macros** ingrédient par ingrédient sur `common-foods` (`lib/nutrition/anchorMacros.ts`),
  repli sur l'estimation modèle si pas de correspondance ; **total repas = somme** ;
- **note /10 + avis** dans la **même réponse** (modèle `MODELS.fast` = Haiku/Hermès), **NON
  décompté du quota** (route sans `check-quota`/`recordTokenUsage` — inchangé), avis = conseil
  de perf constructif, jamais culpabilisant.
`PhotoMealEditor` : liste les ingrédients décomposés, chacun rectifiable (compte/quantité,
nom), recalcul live, badge « estimé » ; à la confirmation, **chaque ingrédient devient un
aliment** du repas (alimente le détail du point 7).

---

## Style
Fraunces titres / Inter + tabular-nums. Chiffres NEUTRES (kcal compris). Couleur seulement sur
arcs du donut + barres macros (rouge/jaune/vert). Cyan = action. var() only ; clair/sombre.
SVG brut. Repas rempli non refermable (acquis). Feuilles via createPortal.

## Contraintes
TS strict, aucun any. Fichiers < 200 lignes. Aucune migration (manques signalés ci-dessus).
Desktop non cassé. `npm run build` doit passer.

## Checklist
- [x] 1. Conteneur copié de Planning (`SectionLayout`) ; overflowX hidden + border-box ; marges 12/16/28px
- [x] 2. Bandeau 7 jours = aujourd'hui + 6 précédents, aujourd'hui présent + actif par défaut (flex 1, sans scroll)
- [x] 3. Donut = répartition P/G/L (rouge/jaune/vert), kcal NEUTRES au centre, plus de %
- [x] 4. Photo : blocage bucket `meal-photos` manquant **vérifié en base et reporté** (non créé, non simulé)
- [x] 5. Carte : photo + donut en rangée, jauges P/G/L en dessous (`MealMacroGauges`)
- [x] 6. Ajout d'aliment (recherche → macros auto) ; valeurs rectifiables (`FoodEditSheet`) ; totaux recalculés
- [x] 7. Détail par aliment (nom, compte/quantité, P/L/G, kcal) dépliable (`MealDetail`)
- [x] 8. Analyse décompose en ingrédients + comptes + ancrage `common-foods` + quantité estimée confirmable
- [x] Note/avis même réponse (Haiku/Hermès), non décompté, ton constructif
- [x] Chiffres neutres ; couleur donut/barres only ; var() only ; aucun any ; build OK (`npm run build` ✓, 58 pages)
- [ ] Desktop : padding aligné (28px) ; **validation visuelle desktop + mobile réel à faire** (env headless)
