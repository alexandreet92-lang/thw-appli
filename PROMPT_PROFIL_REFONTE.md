# Refonte onglet Profil — Matériel + Connexions épurées

## Partie 1-2 — DB (migration appliquée)
- `user_bikes` (name, brand, model, weight_kg, strava_gear_id, is_default) + RLS
  (USING + WITH CHECK auth.uid()=user_id).
- `user_running_shoes` (name, brand, strava_gear_id, is_default) + RLS.
- `activities += strava_gear_id` (+ index) pour le futur matching Strava.
- Pas de colonnes de stats : calculées dynamiquement.

## Partie 3 — `lib/gear/stats.ts`
`getBikeStats` / `getShoesStats` : somme depuis `activities` filtrées par
`strava_gear_id`. Colonnes réelles **`distance_m` / `moving_time_s`** (pas
`distance`/`moving_time`). Renvoie 0 tant que `strava_gear_id` non matché.
`createServiceClient` (filtre explicite user_id).

## Partie 4 — `app/api/gear/route.ts`
GET (bikes+shoes avec stats), POST (type bike/shoes + validation nom requis,
poids 0–30), DELETE (type+id). Auth via `createClient`, écritures via
`createServiceClient`. (`createServerClient` du prompt n'existe pas.)

## Partie 5-6 — UI `GearBloc` (onglet Profil, entre Sports et Connexions)
Section « Matériel » (icône Package) : sous-sections Vélos / Chaussures running,
cartes (nom + poids/marque, ligne stats `X séances · Y km · Z h` format FR),
bouton X (confirmation), bouton « + Ajouter » pointillé, modal d'ajout
(vélo : nom/marque/modèle/poids ; chaussures : nom/marque). Stats à 0 affichées
proprement (V1, avant matching Strava).

## Partie 7 — Connexions épurées
Gardés : Strava, Wahoo, Polar, Withings. Supprimés : les 8 providers
« Bientôt disponible » (Apple Health, Google Fit, Fitbit, HRV4Training,
Elite HRV, Oura, MyFitnessPal, Cronometer) + la sous-section « Bientôt
disponible ».

## Partie 8 — Matching Strava (NON implémenté, V1)
Tables + colonne `activities.strava_gear_id` prêtes. La sync Strava remplira
`gear_id` plus tard ; un sélecteur « Lier à un gear Strava » sera ajouté.

npm run build : 0 erreur.
