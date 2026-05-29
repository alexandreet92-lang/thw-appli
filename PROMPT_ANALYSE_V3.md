# PROMPT_ANALYSE_V3 — Données activité + Courbes

## Fichier principal
- src/app/activities/page.tsx — composant ActivityDetail (lignes ~2220-2700)
  - ZONE A (hero strip) : lignes ~2413-2434
  - ZONE B (blocs données) : lignes ~2437-2653
  - SyncCharts : lignes ~958-1450 (déjà implémenté)

## État avant implémentation
- Courbes Vitesse + Température : déjà dans tracks[] (sessions précédentes)
- Desktop layout (sync-left-col/sync-right-val) : déjà en place
- computedNp, z2DurationS, freewheelPowerS, maxTempStream, efVal : déjà calculés

## PARTIE 1 — ZONE A : hero strip simplifié à 5 items
Supprimer de la liste : Calories, Durée Z2, W. Norm., Cad. Max, Roue libre, Temp. Max, EF
Garder uniquement : Distance / Durée / D+ / Watts moy. ou Allure moy. / TSS

## PARTIE 1 — ZONE B : nouveaux champs
Nouvelles variables calculées dans ActivityDetail :
- maxCadStream / maxCad : a.max_cadence ?? max(stream cadence)
- maxHrStream : max(stream heartrate) pour fallback FC max
- freewheelPowerPct : freewheelPowerS / moving_time_s * 100
- wkgMoy : avg_watts / profile.weight_kg

Additions par bloc :
- BLOC 2 (Charge) : + Durée Z2 (hrZones[1] bounds)
- BLOC 3 isBike : NP → Watts norm. (computedNp), + Cadence max, + Roue libre (watts), + EF, + W/kg
- BLOC 3 isRun : + Cadence max (spm)
- BLOC 4 Cardio : FC max → stream fallback (a.max_hr ?? maxHrStream)
- BLOC 5 Contexte : + Temp. max (maxTempStream row dédiée), retirer inline "(max x°C)"

## PARTIES 2+3 — Courbes et desktop layout
Déjà entièrement implémentés. Aucune modification nécessaire.

## Rapport final
→ Voir fin de fichier après implémentation
