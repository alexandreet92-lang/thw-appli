# PROMPT_NUTRITION_AUJOURDHUI

Refonte page Nutrition (desktop) + onglet « Aujourd'hui » autour du principe
« nutrition calée sur l'entraînement du jour ».

## PHASE 1 — INSPECTION (lecture seule) — RÉSULTATS

### Fichiers
- Page : `src/app/nutrition/page.tsx` (**2392 lignes** — à découper).
- Onglet « Aujourd'hui » : rendu **en deux blocs** `{tab === 'today' && …}`
  (≈ l.1326 grille 2 col, puis l.1731 second bloc), entrecoupés du bloc `plan`.
- Composants : `src/app/nutrition/components/*` (DayFoodJournal, MealSlotGrid,
  MacroDonuts, DailyBilan, etc.) + `src/components/nutrition/*`
  (DishPickerSheet, FoodSearchSheet, BarcodeScanner).

### Sous-nav verticale desktop (à réutiliser)
- **`src/components/navigation/SectionLayout.tsx`** : rail latéral desktop
  (hover-to-open, icône Lucide + `label` + `subtitle`) + onglets mobile avec
  slide. Déjà utilisé par Planning / Profil / Calendar. **C'est le pattern à
  réutiliser** (props `sections: SectionDef[]`, `urlParam`, `contentMaxWidth`).
- Nutrition n'utilise PAS encore SectionLayout : onglets soulignés custom en
  haut (`type NutritionTab = 'today'|'plan'|'tracking'|'body'`, `setTab`).

### Entrée de repas (DayFoodJournal)
- 6 créneaux dépliables ; le créneau ouvert propose Photo IA / Recherche /
  Manuel (+ **Plats** = DishPickerSheet, **retiré** dans cette tâche).
- Photo IA → `POST /api/analyze-meal-photo` (resize → base64). Inputs
  `capture="environment"` (caméra) et galerie.
- Modal « Ajouter un repas » : `MealModal` → onglets Manuel / Recherche /
  Photo IA (`MealModalPhotoAI`) + suggestions (`FoodSuggestions`).

### Bouton « + Ajouter un repas »
- Ouvre `MealCreateModal` (création d'un repas hors des 6 créneaux fixes).
  Les 6 créneaux sont gérés par `DayFoodJournal` (useDailyMeals).

### Sources de données réelles
- **Séance du jour** : `usePlanning()` → `PlannedSession` (filtrées par date).
- **Type de jour Low/Mid/Hard** : `computeDayType(todaySessions)` (existe). Les
  cibles kcal/macros viennent de `activePlan.plan_data.calories_{low,mid,hard}`
  et `macros_{…}`.
- **Hydratation** : `useHydration()` (objectif + valeur du jour, +25/+50/−).
- **Poids** : `useProfile()` → `profile.weight_kg` (peut être `null`).
- **CTL/ATL/TSB** : ⚠️ **non disponibles** dans le contexte nutrition (aucun
  hook de charge importé). → la « ligne de charge (ATL) » du module F ne peut
  pas être sourcée sans nouvelle requête/hook. **Documenté, non inventé.**

### Aliments récents (Ajout rapide)
- Pas de table dédiée, mais **dérivables** des repas déjà loggés
  (`useMealLogs` / `useDailyMeals`) : derniers aliments distincts de
  l'utilisateur. Faisable **sans nouveau schéma**.

### Icônes
- **Lucide** (traits) partout (`lucide-react`), + SVG inline en traits. Aucun
  emoji dans l'UI.

## ÉTAT D'IMPLÉMENTATION

### Fait dans ce commit (sûr, sans régression, critères du spec)
- **Suppression de la méthode « Plats »** dans `DayFoodJournal` (bouton + bloc
  DishPickerSheet + handler + type). Le **backend est conservé** (DishPickerSheet,
  `dish-catalogue.ts`, seed-dishes, migration) — simplement plus utilisé ici.
- **Photo IA → ouverture directe** : desktop = sélecteur de fichiers, mobile =
  caméra, **sans écran intermédiaire** (DayFoodJournal + `MealModalPhotoAI`).
- De-emoji des commentaires d'en-tête (aucun emoji UI introduit).

### Reste à faire (planifié — refactor lourd de la page 2392 l., à faire en
### incrément dédié pour garantir zéro régression sur les 4 onglets)
- **Phase 2 Navigation** : remplacer les onglets du haut par `SectionLayout`
  (rail desktop hover + onglets mobile). 4 sections : Aujourd'hui / Mon plan /
  Suivi / Composition. Difficulté : le contenu « today » est en deux blocs
  non contigus → à fusionner en un seul `content` avant bascule.
- **Phase 3 Layout** : grille 2 col desktop (gauche large : Hero + Autour de la
  séance + Repas ; droite : Hydratation + Ajout rapide + Séance du jour) ;
  pile mobile.
- **Phase 4 Modules** :
  - A. Hero « Fueling du jour » (anneau kcal SVG + 3 barres macro + note g/kg
    si `weight_kg` présent ; sinon masquée). Typo design system, sans monospace.
  - B. Autour de la séance : repos → message récup ; effort → 3 fenêtres
    Avant/Pendant/Après. **Cibles glucides par fenêtre non dérivables** des
    données actuelles → afficher « — » + ligne explicative (pas de chiffre inventé).
  - C. Repas : pastilles d'état, repas en cours déplié, CTA « Suggérer (IA) »
    contextuel (réutiliser `FoodSuggestions`), collations repliées.
  - D. Hydratation : objectif réel (`useHydration`), jamais mocké.
  - E. Ajout rapide : aliments récents dérivés des repas loggés (1 tap).
  - F. Séance du jour : séance réelle + lien cliquable ; **charge ATL =
    indisponible** (cf. inspection) → omise ou « non disponible », non inventée.

## CONTRAINTES RESPECTÉES
- Aucun emoji UI · TS strict, pas de `any` · zéro mock (manques documentés) ·
  SVG brut · variables CSS · `strava.ts` non touché · aucune migration.
- `npm run build` passe.
