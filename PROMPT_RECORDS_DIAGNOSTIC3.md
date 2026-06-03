# PROMPT_RECORDS_DIAGNOSTIC3 — Pourquoi l'auto-trigger ne s'enregistre pas

**Mode : lecture seule. Aucune modification.**

---

## Q1 — HELPER

**Fichier existe :** ✅ oui — `src/lib/records/triggerRecordsProcessing.ts` (commit `5ffc80d`, 2026-06-03 17:11 Paris / 15:11 UTC)

**Contenu complet :**
```ts
// ══════════════════════════════════════════════════════════════
// triggerRecordsProcessing — helper non bloquant appelé à la fin
// de CHAQUE pipeline d'import d'activité (webhook, sync, etc.).
//
// Règle d'or : un échec de traitement des records ne doit JAMAIS
// faire échouer l'import de l'activité. Try/catch englobant,
// erreurs loguées mais jamais propagées.
// ══════════════════════════════════════════════════════════════

import { createServiceClient }       from '@/lib/supabase/server'
import { processBikeActivityRecords } from './processBikeActivity'

export async function triggerRecordsProcessing(params: {
  activityId: string
  userId:     string
  sport:      string | null | undefined
}): Promise<void> {
  const { activityId, userId, sport } = params

  // Fast-path : on ne traite que le vélo (Pmax → 6h)
  const s = (sport ?? '').toLowerCase()
  if (s !== 'bike' && s !== 'cycling' && s !== 'cycle' && s !== 'velo') return

  try {
    console.log(`[records-trigger] processing activity ${activityId} for user ${userId}`)
    const sb     = createServiceClient()
    const result = await processBikeActivityRecords(sb, userId, activityId)
    const reason = result.reason ?? 'ok'
    const beats  = result.payload.allTime.length + result.payload.year.length
    console.log(`[records-trigger] done for activity ${activityId} (reason=${reason}, beats=${beats})`)
  } catch (err) {
    console.error(`[records-trigger] failed for activity ${activityId}:`, err)
    // Volontairement avalé — l'import ne doit pas échouer à cause des records
  }
}
```

---

## Q2 — APPELS DU HELPER

**Occurrences :** 4 sites d'appel (5 si on compte les 2 dans strava.ts), tous `await`és, tous dans des branches déjà gardées (post-upsert success).

### a) `src/app/api/strava/webhook/route.ts:206`
```ts
196:    .upsert(row, { onConflict: 'user_id,provider,provider_id' })
197:    .select('id, sport_type')
198:    .single()
199:
200:  if (error) {
201:    console.error(`[strava-webhook] Upsert error: ${error.message}`)
202:  } else {
203:    console.log(`[strava-webhook] ✅ Activity ${activityId} upserted for user ${userId}`)
204:    // Déclenchement records (non bloquant, ignoré si pas bike)
205:    if (upserted?.id) {
206:      await triggerRecordsProcessing({
207:        activityId: upserted.id as string,
208:        userId,
209:        sport:      (upserted.sport_type as string | null) ?? row.sport_type,
210:      })
211:    }
212:  }
```
- `try/catch` : **non explicite** (le helper a son propre try/catch ; jamais propagé)
- `await` : ✅ oui

### b) `src/lib/sync/strava.ts:247` (syncStravaActivities, dans la boucle stream-update)
```ts
240:    if (Object.keys(streams).length > 0) {
241:      await supabase
242:        .from('activities')
243:        .update({ streams })
244:        .eq('id', act.id)
245:      streamsSynced++
246:      // Records : déclenche le traitement maintenant que les streams sont là
247:      await triggerRecordsProcessing({
248:        activityId: act.id as string,
249:        userId,
250:        sport:      (act.sport_type as string | null) ?? null,
251:      })
252:    }
```
- `try/catch` : non explicite, propre au helper
- `await` : ✅ oui
- ⚠️ Cette boucle ne tourne **que pour les activités où `streams IS NULL`** (filtre `.is('streams', null)` ligne 231). Voir cause racine.

### c) `src/lib/sync/strava.ts:294` (syncMissingStreams)
```ts
288:      await supabase
289:        .from('activities')
290:        .update({ streams })
291:        .eq('id', act.id)
292:      synced++
293:      // Records : streams fraîchement présents → déclenche
294:      await triggerRecordsProcessing({
295:        activityId: act.id as string,
296:        userId,
297:        sport:      (act.sport_type as string | null) ?? null,
298:      })
299:    }
```
- ⚠️ Idem : filtre `is('streams', null)` ligne 272 → ne touche que les activités sans streams.

### d) `src/lib/sync/polar.ts:372`
```ts
364:  const { data: upserted, error } = await supabase
365:    .from('activities')
366:    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })
367:    .select('id, sport_type')
368:  if (error) throw new Error(`activities upsert: ${error.message}`)
369:
370:  // Records : déclenche pour chaque activité bike (séquentiel pour ne pas saturer)
371:  for (const a of upserted ?? []) {
372:    await triggerRecordsProcessing({
373:      activityId: a.id as string,
374:      userId,
375:      sport:      (a.sport_type as string | null) ?? null,
376:    })
377:  }
```
- `try/catch` : non explicite, propre au helper
- `await` : ✅ oui (mais la lib ne tournera pas de records vu que Polar v4 n'a pas de stream watts/seconde)

### e) `src/lib/sync/wahoo.ts:77`
```ts
68:  const { data: upserted, error } = await supabase
69:    .from('activities')
70:    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })
71:    .select('id, sport_type')
72:
73:  if (error) throw new Error(`Supabase upsert error: ${error.message}`)
74:
75:  // Records : déclenche pour chaque activité bike (séquentiel)
76:  for (const a of upserted ?? []) {
77:    await triggerRecordsProcessing({
78:      activityId: a.id as string,
79:      userId,
80:      sport:      (a.sport_type as string | null) ?? null,
81:    })
82:  }
```
- `await` : ✅ oui

---

## Q3 — ACTIVITÉS RÉCENTES

> Schéma : pas de colonne `source` ni `import_source`. Le provider est dans `provider`.

```sql
SELECT id, sport_type, provider, started_at, records_processed,
       jsonb_array_length(records_beaten) AS nb_beaten
FROM activities ORDER BY started_at DESC LIMIT 10;
```

| id | sport_type | provider | started_at (UTC) | records_processed | nb_beaten |
|---|---|---|---|---|---|
| 630495ae-…890d8e | bike | strava | 2026-06-01 16:17:42 | **false** | 0 |
| 7ce61565-…f00fa6e | run  | strava | 2026-05-31 18:34:38 | false | 0 |
| afe349ae-…7beac5c7 | bike | strava | 2026-05-30 08:02:19 | **false** | 0 |
| b2d308b8-…6d944c18 | bike | strava | 2026-05-28 06:12:34 | false | 0 |
| 72d0d7c1-…11d39d4e | bike | strava | 2026-05-27 17:56:43 | false | 0 |
| 5b184ce4-…6a226a3 | gym  | strava | 2026-05-25 09:17:20 | false | 0 |
| 97f2612d-…cfc02ba23b9c | bike | strava | 2026-05-24 06:52:56 | false | 0 |
| 68e15af0-…df88a0ade4 | bike | strava | 2026-05-21 12:23:09 | false | 0 |
| a1d3673f-…ca2cff4634 | bike | strava | 2026-05-19 16:17:46 | false | 0 |
| cc3a105d-…304c8f0b5d | gym  | strava | 2026-05-18 17:09:02 | false | 0 |

**100 % des activités récentes proviennent de Strava. Aucune n'a été traitée.**

Vérification supplémentaire des streams pour les 10 dernières activités vélo :

| id (court) | started_at | streams.watts | watts_len | records_processed |
|---|---|---|---|---|
| 630495ae | 2026-06-01 | ✅ | 6 816 | false |
| afe349ae | 2026-05-30 | ✅ | 7 407 | false |
| b2d308b8 | 2026-05-28 | ✅ | 16 777 | false |
| 72d0d7c1 | 2026-05-27 | ✅ | 3 388 | false |
| 97f2612d | 2026-05-24 | ✅ | 5 324 | false |
| 68e15af0 | 2026-05-21 | ✅ | 12 585 | false |
| a1d3673f | 2026-05-19 | ✅ | 6 997 | false |
| 746c8718 | 2026-05-17 | ✅ | 3 343 | false |
| a5d2af7e | 2026-05-16 | ❌ (null) | 0 | false |
| 54341e0d | 2026-05-12 | ❌ (null) | 0 | false |

→ Les 8 plus récentes ont des streams.watts exploitables ; aucune n'a été processée.

---

## Q4 — PERSONAL_RECORDS AUTO_SESSION

```sql
SELECT id, distance_label, performance, event_type, achieved_at, activity_id, created_at
FROM personal_records WHERE sport='bike' AND event_type='auto_session'
ORDER BY created_at DESC LIMIT 20;
```

**Total `auto_session` :** **0** lignes
**Dernier `created_at` :** `null`
**Résultat brut :** `[]`

Distribution event_type pour les 32 PRs bike : `training: 26`, `competition: 6`, `auto_session: 0`. Le pipeline auto n'a **jamais inséré** un seul record.

Dernier PR créé (manuel) : `2026-05-29 12:52:32 UTC`.

---

## Q5 — PIPELINE DES 3 DERNIÈRES ACTIVITÉS

| # | id | sport | provider | started_at (UTC) |
|---|---|---|---|---|
| 1 | 630495ae | bike | strava | 2026-06-01 16:17:42 |
| 2 | 7ce61565 | run  | strava | 2026-05-31 18:34:38 |
| 3 | afe349ae | bike | strava | 2026-05-30 08:02:19 |

**Endpoint potentiel pour les 3 : `provider='strava'` → soit le webhook (`src/app/api/strava/webhook/route.ts`), soit la sync incrémentale (`src/lib/sync/strava.ts:syncStravaActivities`), soit l'import-history client (`DatasTab.tsx:4402`).**

| Activité | Helper appelé dans l'endpoint ? | Ligne |
|---|---|---|
| 1 (bike, 06-01) | webhook → ✅ ligne 206 ; sync → ✅ ligne 247 ; import-history client → ❌ (pas instrumenté) |
| 2 (run, 05-31)  | helper court-circuite (sport ≠ bike) — comportement attendu |
| 3 (bike, 05-30) | idem (1) |

**⚠️ Tournant du diagnostic** :

- Le commit `5ffc80d` (autotrigger) est passé sur `main` à **2026-06-03 15:11 UTC**.
- L'activité la plus récente date du **2026-06-01 16:17 UTC**, soit **≈ 47 h AVANT le deploy**.
- `NOW() = 2026-06-03 16:46 UTC` → ≈ 1h35 après le deploy, mais aucune nouvelle activité ne s'est ajoutée depuis.

→ **Toutes les activités présentes en DB ont été importées AVANT que le code du helper n'existe.** Il n'a donc jamais eu l'occasion de tourner sur un import frais. Aucun pipeline ne « remet à jour » rétroactivement les activités déjà en place.

Les seules portes de sortie pour ces 10 lignes :
- Ouvrir la fiche d'une activité → `RecordsBeaten.tsx` (au mount) déclenche `POST /api/activities/process-records` (jamais utilisé encore sur celles-ci d'après `nb_beaten=0`)
- Cliquer « Recalculer » dans la page Performance → `POST /api/activities/backfill-records` (jamais cliqué non plus, sinon les 8 lignes avec watts seraient `records_processed=true`)
- Importer une nouvelle activité Strava POST-déploiement → là le helper tournera

---

## Q6 — LOGS VERCEL

**Accès aux logs Vercel impossible depuis Claude Code.** Aucun outil MCP n'est connecté à Vercel dans cette session (seules les MCPs Notion, Supabase, et autres app-spécifiques sont disponibles). Je ne peux ni vérifier la présence de `[records-trigger]` ni compter les occurrences ni voir d'éventuelles erreurs côté serveur.

À vérifier côté utilisateur sur https://vercel.com/dashboard → projet → Logs (24h), en filtrant sur :
- `[records-trigger]` : devrait apparaître ≥ 1× par import bike post-deploy
- `processBikeActivityRecords` : pas loggé en interne sauf via `[records-trigger]`
- `[strava-webhook]` : confirme si le webhook reçoit bien des événements

**Hypothèse si aucun log `[records-trigger]` n'apparaît** : aucun import bike n'a eu lieu après 2026-06-03 15:11 UTC. Cohérent avec le fait que la dernière activité date du 2026-06-01.

---

## Synthèse — où la chaîne casse

**Le code est correct et branché correctement** (Q1, Q2). Les 4 sites d'appel sont en place, awaités, après upsert ou update streams réussis, avec try/catch interne au helper qui empêche tout crash.

**La chaîne ne casse pas — elle n'a simplement jamais eu l'occasion de s'exécuter** :

1. Les 10 activités présentes ont toutes été importées **avant** le deploy de l'autotrigger (latest : 2026-06-01 16:17 UTC ; deploy : 2026-06-03 15:11 UTC).
2. Aucun import frais depuis le deploy → 0 appel au helper.
3. Aucun appui sur « Recalculer » (sinon les 32 PRs bike compteraient des `auto_session`, or il y en a 0).
4. Aucune ouverture des fiches d'activités impactées (sinon `records_processed=true` sur celles-ci).

**Pour valider que l'autotrigger fonctionne** (à faire côté utilisateur, AUCUNE modif code requise) :
- Soit déclencher une nouvelle activité Strava (sortie réelle ou import GPX) → vérifier `records_processed=true` après quelques secondes
- Soit cliquer « Recalculer » dans Performance → DatasTab → attendre, puis re-quéryer
- Soit ouvrir une activité bike récente dans l'UI → le `RecordsBeaten.tsx` la traitera au mount

Aucune modification de code effectuée.
