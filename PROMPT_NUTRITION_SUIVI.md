# PROMPT_NUTRITION_SUIVI

Refonte de l'onglet « Suivi » : bilan de période + tendances reliant nutrition
et entraînement. Affichage/agrégation de données existantes uniquement.

## PHASE 1 — INSPECTION (lecture seule) — DISPONIBILITÉ DES SOURCES

| Source | Disponible ? | Détail |
|---|---|---|
| **Totaux quotidiens loggés** (kcal + macros/jour) | ✅ **Oui** | `useNutrition().dailyLogs` (table `nutrition_daily_logs`, **30 derniers jours** : `kcal_consommees, proteines, glucides, lipides, date, option_choisie`). |
| **Charge d'entraînement (TSS/CTL)/jour** | ❌ **Non** (depuis Nutrition) | Pas de hook charge accessible. `useStrava` expose `activities[].tss` (flux paginé, lourd, pas par jour) ; **CTL/ATL ne sont calculés nulle part**. → module signature en état « non disponible ». |
| **Type de jour Low/Mid/Hard + cibles** | ✅ **Oui** | `activePlan.plan_data` (`jours[].type_jour`, `calories_/macros_{low,mid,hard}`). |
| **Readiness / récupération (Polar)/jour** | ❌ **Non** | `app/recovery/page.tsx` est encore en placeholder (TODO `supabase.from('recovery_daily_logs')` non branché). Aucune source réelle. → module Fueling×récup en état neutre. |
| **Poids utilisateur (g/kg)** | ✅ **Oui** | `useProfile().profile.weight_kg` (peut être `null` → g/kg masqué). |
| **Hydratation quotidienne** | ⚠️ **Partiel** | Table `hydration` (`user_id, date, liters`) — `useHydration` ne lit qu'**une date**. Pas d'historique via hook → **requête de plage lecture seule** ajoutée dans le module (aucun schéma modifié). **Objectif par jour non stocké** → barres de litres loggés seulement (pas de ligne d'objectif inventée). |

## PHASE 2/3 — IMPLÉMENTATION

Nouveaux fichiers (réutilisation `DonutChart` non requise ici ; SVG bruts) :
- `components/suivi/suiviData.ts` — agrégations pures (`buildPeriod`,
  `periodSummary`, `adherenceByType`). Jour non loggé = `logged:false`
  (jamais comblé).
- `components/suivi/SuiviCharts.tsx` — SVG bruts : adhérence par type,
  protéines g/kg (zone cible 1,6–2,2), hydratation (litres/jour).
- `components/suivi/SuiviSection.tsx` — sélecteur **7/14/30 j** (recalcule
  tout), **bandeau bilan** (jours loggés, adhérence, kcal moy/cible, protéines
  g/kg), **signature pleine largeur**, grille 2 colonnes responsive.

### Modules livrés
- **Bilan de période** ✅ (données réelles).
- **Glucides vs charge (signature)** → **état « non disponible »** documenté
  (charge inaccessible).
- **Adhérence par type de jour** ✅ (consommé vs cible, couleurs Low vert / Mid
  ambre / Hard rouge).
- **Protéines g/kg dans le temps** ✅ (zone cible 1,6–2,2 ; masqué si pas de
  poids profil).
- **Fueling × récupération** → **état neutre « pas encore branché »** (readiness
  sans source réelle ; seuil ≥ 7 jours croisés prévu une fois la source dispo).
- **Hydratation dans le temps** ✅ (litres loggés/jour ; objectif non stocké →
  documenté).
- **Régularité de logging** ✅ (X / N + barre ; avertissement < 50 %).

### Cadrage santé
Le module protéines est formulé « manges-tu assez de protéines pour ta charge »
(jamais déficit/restriction). Aucune cible de restriction chiffrée.

## RESTE À FAIRE (incrément dédié)
- **Sous-nav verticale gauche** (`SectionLayout`) + contenu pleine largeur :
  staggé pour éviter toute régression sur les 4 onglets (même page 2392 l.).
  Le contenu Suivi est déjà en grille responsive interne.
- Activer la **signature** (glucides×charge) et **Fueling×récupération** quand la
  charge/jour et la readiness seront exposées en données réelles.

## CONTRAINTES RESPECTÉES
- Aucun emoji · TS strict sans `any` · zéro mock (manques documentés) · SVG brut ·
  variables CSS · `strava.ts` intact · aucune migration · `npm run build` passe.
