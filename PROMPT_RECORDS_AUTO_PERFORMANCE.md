# PROMPT_RECORDS_AUTO_PERFORMANCE — Auto-update à l'ouverture + interconnexion

## Diagnostic préalable (vu en DB)
- Le bouton « Recalculer » existait mais 0 activité n'a jamais été traitée
  (records_processed=false partout, 0 ligne auto_session)
- Le user a 32 PRs manuels avec des valeurs ÉLEVÉES (ex: 10s=933 W,
  Pmax=1104 W, 5min=351 W, 1h=256 W) → la plupart des activités récentes
  ne battent rien → backfill silencieux du point de vue UI
- Aucun lien activity_id sur les inserts auto → pas d'interconnexion

## Fichiers modifiés
- src/lib/records/processBikeActivity.ts            (activity_id sur l'insert)
- src/app/performance/DatasTab.tsx                  (auto-backfill au mount + UX)

## Fix 1 — `activity_id` sur les records auto
Dans `processBikeActivity.ts`, ajouter `activity_id: activityId` au payload
d'insert dans `personal_records`. Cette colonne existe (uuid nullable)
mais n'était jamais renseignée.

Bénéfices :
- Cohérence : chaque record auto pointe vers l'activité source
- L'UI peut maintenant linker `record → activité` pour respecter la
  règle d'interconnexion (CLAUDE.md)
- Évite les doublons croisés : si une activité génère 5 records,
  on sait exactement laquelle

## Fix 2 — Auto-backfill au mount de DatasTab vélo
Dans `DatasTab.tsx`, ajouter un `useEffect` qui :
1. Au mount (1×, deps `[]`) **et** quand `sport` passe à `'bike'`
2. Lance `POST /api/activities/backfill-records` (idempotent, skip les
   déjà processed → instantané si rien à faire)
3. Affiche un état `syncing` discret (« Synchronisation des records… »)
4. Au retour, refresh `bikeAllRecords` (re-fetch depuis `personal_records`)
5. Affiche un état `synced` éphémère selon le résultat :
   - `processed > 0 && beats > 0` → vert `✓ N record(s) battu(s)`
   - `processed > 0 && beats = 0` → bleu discret `✓ N activité(s) traitée(s), aucun record battu`
   - `processed = 0`              → rien (déjà à jour)
   - erreur → rouge `Échec, réessayer`

Auto-disparition après 5 s pour les états non-error.

## Fix 3 — Bouton « Recalculer » avec feedback robuste
- Affiche le message d'erreur si `!res.ok` (`Erreur N`)
- Affiche `Tout à jour` si `processed === 0`
- Affiche `N traitées · M record(s)` sinon
- Permet `?force=true` via un long-press (option future, pas pour cette itération)

## Vérification
- npm run build : 0 erreur
- Au mount de la page Performance (onglet vélo) : un appel à
  `/api/activities/backfill-records` part automatiquement
- Si nouvelles activités bike → records auto insérés avec `activity_id`
- Si rien à battre → toast bleu transitoire « N activités traitées,
  aucun record battu » au lieu de silence
- Records auto-insérés sont liés à leur activité d'origine (`activity_id`)
