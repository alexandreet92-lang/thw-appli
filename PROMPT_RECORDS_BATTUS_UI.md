# PROMPT_RECORDS_BATTUS_UI — Refonte « Records battus »

## Fichier modifié
- src/components/activity/RecordsBeaten.tsx (rendu uniquement)

## Logique conservée
- Le `useEffect` POST `/api/activities/process-records` et son state restent strictement identiques
- Les types `BeatenAllTime` / `BeatenYear` / `BeatenPayload` ne changent pas
- Props inchangées : `{ activityId, isBike }`

## Changements visuels
1. **Si aucun record battu** → renvoie `null` (au lieu du texte « Aucun record battu… »). La section disparaît complètement.
2. **Header card** : « RECORDS BATTUS » uppercase, letter-spacing 0.12em, fs 11, `var(--text-dim)`. À droite, le compteur total « N records » dans le même style.
3. **Card unique** : `background: var(--bg-card2)`, border 1px `var(--border)`, borderRadius 12, padding 16.
4. **Deux sections empilées** : All Time d'abord (doré `#eab308`), puis Année (cyan `#06B6D4`).
5. **Sous-header section** : « ALL TIME · N records » / « RECORD <année> · N records » en fs 9 uppercase letter-spacing 0.12em + border-bottom 1px `var(--border)`.
6. **Lignes** :
   - Barre verticale 3×24 dorée/cyan
   - Durée 50px fixe, fs 11, `var(--text-mid)`, tabular-nums
   - Valeur fs 15 bold colorée + « W » mince, tabular-nums, flex:1
   - Label à droite (« All Time » ou « 2026 ») fs 9 uppercase, color sémantique
7. **Tri** : ordre explicite `DURATION_ORDER` (Pmax → 5s → 10s → … → 6h) pour éviter le tri lexicographique.
8. **Format durée** : helper `formatRecordDuration(label)` (1min → 1', 90min/1h30 → 1h30, etc.).
9. **Border-bottom** entre lignes (sauf dernière) en `var(--border)`.

## Année dynamique
Reprise depuis `entry.year` côté backend (renvoie `activityYear`).
Si une section Année contient plusieurs entrées (toutes la même année puisque liées à la même activité), on utilise `year[0]?.year` pour le sous-header. Sinon fallback `new Date().getFullYear()`.

## Responsive mobile (<640px)
Via media query inline (style block scoped) : gap colonnes réduit à 12px, le label « All Time »/année reste à droite.

## Vérification
- npm run build : 0 erreur TS
- Aucun record → section masquée
- Records affichés en ordre Pmax → 6h
- Couleurs respectées : doré `#eab308`, cyan `#06B6D4`, reste via `var(--*)`
