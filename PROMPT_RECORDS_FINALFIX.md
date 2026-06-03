# PROMPT_RECORDS_FINALFIX — Fin du blocage records auto

## Fichiers créés / modifiés
- src/supabase/migrations/allow_auto_session_event_type.sql      (NEW, miroir prod)
- src/lib/records/processBikeActivity.ts                          (log défensif)
- src/app/api/activities/backfill-records/route.ts                (champ insert_failed + warning)

## Étape 1 — Migration appliquée en prod

### Constraint avant
```
personal_records_event_type_check
  CHECK ((event_type = ANY (ARRAY['training'::text, 'competition'::text])))
```

### Migration appliquée
```sql
ALTER TABLE personal_records
  DROP CONSTRAINT IF EXISTS personal_records_event_type_check;

ALTER TABLE personal_records
  ADD CONSTRAINT personal_records_event_type_check
  CHECK (event_type IN ('training', 'competition', 'auto_session'));
```

### Constraint après (vérifié via pg_constraint)
```
personal_records_event_type_check
  CHECK ((event_type = ANY (ARRAY['training'::text, 'competition'::text, 'auto_session'::text])))
```

### Test sanity
Un INSERT `event_type='auto_session'` dans une transaction ROLLBACK'ée est passé → la nouvelle valeur est bien acceptée.

Le fichier de migration repo `src/supabase/migrations/allow_auto_session_event_type.sql` reflète ce changement pour cohérence avec la prod.

## Étape 2 — Log défensif (processBikeActivity.ts)

```ts
const { error: insErr } = await sb.from('personal_records').insert(rows)
if (insErr) {
  console.error(
    '[records] insert failed for activity', activityId,
    '— code:', insErr.code,
    '— message:', insErr.message,
    '— details:', insErr.details,
    '— hint:',    insErr.hint,
  )
  return { payload: { allTime: [], year: [] }, processed: false,
           reason: `insert_failed: ${insErr.message}` }
}
```

- L'INSERT lui-même garde son payload exact (event_type, activity_id, etc. inchangés)
- L'activité reste `records_processed=false` en cas d'erreur → retentée au prochain backfill (idempotent)
- L'erreur est désormais visible dans les logs Vercel

## Étape 3 — Champ `insert_failed` + `warning` dans la réponse JSON

`backfill-records/route.ts` compte `insertFailed` et propage :

```json
{
  "processed":     N,
  "beatenAllTime": A,
  "beatenYear":    Y,
  "total":         T,
  "insert_failed": F,
  "warning":       "<F> activité(s) ont échoué à l'insertion. Vérifier les logs serveur ([records] insert failed)." | null,
  "errors":        [ "<uuid>: insert_failed: <pg_message>", ... ]   // top 10
}
```

Plus un `console.error` côté serveur résumant l'état si `insert_failed > 0` et un `console.log` final récapitulatif systématique.

## Étape 4 — Débloquer les 14 activités coincées

### État DB initial (14 activités bike `records_processed=false`)
| started_at | id |
|---|---|
| 2026-06-01 16:17:42+00 | 630495ae-… |
| 2026-05-30 08:02:19+00 | afe349ae-… |
| 2026-05-28 06:12:34+00 | b2d308b8-… |
| 2026-05-27 17:56:43+00 | 72d0d7c1-… |
| 2026-05-24 06:52:56+00 | 97f2612d-… |
| 2026-05-21 12:23:09+00 | 68e15af0-… |
| 2026-05-19 16:17:46+00 | a1d3673f-… |
| 2026-05-17 12:51:46+00 | 746c8718-… |
| 2026-03-19 14:33:54+00 | cc8efb75-… |
| 2026-02-17 14:03:25+00 | b888d3cf-… |
| 2026-01-17 13:58:54+00 | 1a341b61-… |
| 2025-12-26 13:59:24+00 | dac238a6-… |
| 2025-12-18 09:47:37+00 | f8bbc9e7-… |
| 2025-11-11 08:55:40+00 | 5611f9d3-… |

### Déclenchement
Le useEffect au mount de la page Performance (sport `bike`) — qui appelle déjà `POST /api/activities/backfill-records` — va automatiquement reprendre ces 14 activités au prochain affichage de la page : `records_processed=false` matche le filtre, le nouvel INSERT passe le CHECK, l'UPDATE marque processed=true, le toast vert s'affiche.

URL exacte à toucher si on veut forcer hors UI :
```
POST https://thw-coaching.vercel.app/api/activities/backfill-records
```
(auth cookie utilisateur requise).

Pour reprocesser TOUT (même les 429 déjà traitées) :
```
POST https://thw-coaching.vercel.app/api/activities/backfill-records?force=true
```

### Vérification post-fix (à exécuter après le rechargement de Performance)
```sql
-- 1. Records auto créés
SELECT COUNT(*) FROM personal_records WHERE event_type='auto_session';

-- 2. Activités restant bloquées
SELECT COUNT(*) FROM activities
WHERE sport_type IN ('bike','cycling','cycle','velo') AND records_processed=false;

-- 3. Détail des nouveaux records par durée
SELECT distance_label, COUNT(*), MAX(performance::int) AS max_watts
FROM personal_records
WHERE event_type='auto_session' AND sport='bike'
GROUP BY distance_label
ORDER BY distance_label;
```

## Étape 5 — Validation finale
- ✅ Le CHECK accepte `auto_session` (test rollback'é + vérification pg_constraint)
- ✅ Le code logue l'erreur d'INSERT côté serveur (console.error détaillé)
- ✅ La réponse JSON expose `insert_failed`, `warning`, `errors`
- ✅ `npm run build` : 0 erreur
- ⏳ Reprocessing des 14 activités : automatique au prochain mount de la page Performance (ou POST manuel sur la route)
- ⏳ Les nouveaux records auto seront visibles dans le tableau de la page Performance après le re-fetch déclenché par `onDone` du useEffect

## Note durabilité
- Sans le log côté serveur, ce bug aurait pu rester invisible des mois. Le `console.error` enrichi (code, message, details, hint) couvre désormais toute violation future de contrainte (NOT NULL, FK, CHECK).
- Le champ `insert_failed` du JSON permet à la UI (toast `BackfillRecordsButton` + indicateur Performance) d'afficher un message dédié si l'INSERT casse à nouveau.
