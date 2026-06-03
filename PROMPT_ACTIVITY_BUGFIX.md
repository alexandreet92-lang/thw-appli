# Corrections page activité cyclisme (2 bugs)

Corrections chirurgicales uniquement. `npm run build` doit passer.

## Bug 1 — Supprimer les blocs colorés sur la courbe de puissance
`src/app/activities/page.tsx`, lignes ~2117-2125. Supprimer UNIQUEMENT le bloc
`{track.label === 'Puissance' && bestWindows.map(...)}` qui dessine les `<rect>`.
Garder intacts : `computeBestWindows` (1660-1680), l'état `bestWindows` (1719-1723),
la courbe de puissance, et tout le reste de `SyncCharts`.

## Bug 2 — Système de records de puissance
### 2a — Migration Supabase
Ajouter à `activities` les colonnes `records_processed` (bool, défaut false) et
`records_beaten` (jsonb, défaut '[]') + index partiel sur `records_processed = false`.
Appliquer via Supabase MCP et vérifier.

### 2b — processBikeActivity.ts
Après migration, le SELECT initial (qui lit `records_processed`/`records_beaten`)
fonctionne. Ne pas modifier la logique de comparaison (`?? 0`, beatsAll/beatsYear).
Vérifier que les records écrits dans `personal_records` ont `event_type = 'auto_session'`.

### 2c — Backfill
Lancer `POST /api/activities/backfill-records`. Si non appelable depuis CC, ajouter
un log de début de handler + indiquer la commande manuelle. Vérifier ensuite
`SELECT COUNT(*) FROM personal_records WHERE event_type='auto_session'` > 0.

### 2d — RecordsBeaten.tsx
Composant correct. Vérifier que `POST /api/activities/process-records` est bien
déclenché au montage avec le bon `activity_id`, et que `BeatenPayload {allTime, year}`
est transmis. Ne pas réécrire le composant.

## Règles
Chirurgical, lire avant de modifier. Ne pas toucher la comparaison des records.
Couleurs fond/texte via variables CSS ; couleurs fonctionnelles fixes
(#06B6D4, #EF4444, #10B981, #F97316). `npm run build` doit passer.
