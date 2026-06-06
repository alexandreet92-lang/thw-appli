# PROMPT_RECORDS_DIAGNOSTIC4 — Cause racine de l'échec d'insertion

**Mode :** lecture seule. Aucune modification de code n'a été effectuée.

## TL;DR — Bug identifié

La table `personal_records` a un **CHECK constraint** sur `event_type` qui n'autorise que `'training'` ou `'competition'`. Notre code insère `event_type: 'auto_session'` → tout INSERT est rejeté par Postgres :

```sql
CONSTRAINT personal_records_event_type_check
  CHECK ((event_type = ANY (ARRAY['training'::text, 'competition'::text])))
```

Conséquence en cascade :
1. `processBikeActivityRecords` reçoit l'erreur d'INSERT
2. Retourne `{ processed: false, reason: 'insert_failed: …' }`
3. **Ne fait PAS le UPDATE `records_processed=true`** sur les activités où des records auraient été battus
4. Les activités « propres » (aucun record candidat) passent à `records_processed=true` avec un payload vide → comptées dans `processed`
5. **Aucun record auto n'a jamais pu exister** (0 ligne `event_type='auto_session'` en DB)

**Preuves DB :**
- `SELECT COUNT(*) FROM personal_records WHERE event_type='auto_session'` → **0**
- Bike activities `records_processed=true` → **429** (les activités sans records candidats)
- Bike activities `records_processed=false` → **14** (les activités où l'INSERT a foiré et n'a pas été marqué processed)

---

## Q1 — Code complet de processBikeActivity.ts

(217 lignes — lu intégralement, non recopié ici par souci de volume ; le commit `9c5055` / la lib actuelle est exacte.)

Points-clés de la logique :
- `BIKE_RECORD_DURS` : 21 durées de 1 s à 21600 s (Pmax → 6h)
- `computeMmp(wStream, dur)` : sliding window sur le stream watts, cap 1500 W
- `processBikeActivityRecords` : sélectionne l'activité, compare aux records existants (null-safe), insère les records battus, marque l'activité processée
- **Lignes critiques pour le bug :**
  - L. 187 : `event_type: 'auto_session'` ← **valeur interdite par le CHECK constraint**
  - L. 200 : `await sb.from('personal_records').insert(rows)`
  - L. 201-207 : si `insErr` → return avec `processed: false` **avant** le UPDATE de records_processed

---

## Q2 — Trace sur la dernière activité bike

**Activité ciblée :** `630495ae-5df6-41e7-b5d0-b07edd890d8e`
- `started_at` : `2026-06-01 16:17:42+00`
- `moving_time_s` : 6994
- `watts_len` (streams.watts) : **6816**
- `raw_data->streams->watts` : 0 (fallback non utilisé)
- `records_processed` : **false**

### a) Sélection de l'activité
```sql
SELECT user_id, sport_type, started_at, streams, raw_data,
       records_processed, records_beaten
FROM activities
WHERE id = '630495ae-…' AND user_id = <user>
```
**Passe le filtre ?** Oui : `sport_type='bike'`, `records_processed=false`, `streams.watts` 6816 points. La condition `watts.length < 5` est fausse → on continue.

### b) Durées MMP calculées
Pour cette activité, `watts.length = 6816 s`. Pas de filtre `d > watts.length` jusqu'à `5400 s (1h30)` exclu. Durées effectivement calculées :

```
Pmax (1) | 5s | 10s | 30s | 1min | 3min | 5min | 8min | 10min |
12min | 15min | 20min | 30min | 45min | 1h
```

(Les durées ≥ 5400 s sont skip car `d > watts.length` — 6816 < 7200 mais ≥ 5400, donc `5400` passe également ; recalcul : 5400 ≤ 6816 → 1h30 inclus. 7200 > 6816 → 2h skip. Donc 16 durées calculées.)

**Labels exacts injectés dans la DB :**
`Pmax, 5s, 10s, 30s, 1min, 3min, 5min, 8min, 10min, 12min, 15min, 20min, 30min, 45min, 1h, 90min`

### c) Query records existants
```sql
SELECT distance_label, performance, achieved_at
FROM personal_records
WHERE user_id = <user>
  AND sport = 'bike'
  AND distance_label IN ('Pmax','5s','10s','30s','1min','3min','5min','8min',
                         '10min','12min','15min','20min','30min','45min',
                         '1h','90min','2h','3h','4h','5h','6h')
```
**Filtres :** `user_id`, `sport`, `distance_label IN (...)`. **Aucun filtre `event_type`** → lit `training` ET `competition` (les 32 records manuels existants).

### d) bestAll / bestYear
- Clé : `r.distance_label` (string exact venant de la DB)
- Valeur : `parseInt(r.performance)` (watts)
- Filtre causal `r.achieved_at < activityDate` → ne compte que les records STRICTEMENT antérieurs au `2026-06-01`
- `bestYear[label]` n'est rempli que si `r.achieved_at.slice(0,4) === '2026'` (activityYear)

### e) Code exact de la comparaison
```ts
const prevAll  = bestAll[label]  ?? 0
const prevYear = bestYear[label] ?? 0
const beatsAll  = sessionW > prevAll
const beatsYear = sessionW > prevYear && !beatsAll
```

### f) INSERT en cas de record battu
```ts
{
  user_id, sport: 'bike', distance_label,
  performance: String(sessionW), performance_unit: 'watts',
  event_type: 'auto_session',           // ← INTERDIT PAR LE CHECK
  achieved_at: activityDate,
  activity_id: activityId,
  …
}
```

---

## Q3 — Match des labels (séance vs DB)

### Labels présents en DB pour `sport='bike'` (résultat brut)
| distance_label | event_type | count |
|---|---|---|
| 10min | training | 2 |
| 10s | competition | 1 |
| 10s | training | 1 |
| 1h | training | 2 |
| 1min | training | 3 |
| 20min | training | 2 |
| 2h | competition | 1 |
| 2h | training | 1 |
| 30min | training | 4 |
| 30s | training | 3 |
| 3h | training | 1 |
| 3min | training | 1 |
| 4h | training | 1 |
| 5h | competition | 1 |
| 5h | training | 1 |
| 5min | competition | 2 |
| 5min | training | 1 |
| 8min | training | 1 |
| Pmax | competition | 1 |
| Pmax | training | 2 |

**Tous les labels présents correspondent EXACTEMENT à ceux générés par `BIKE_RECORD_DURS` (Pmax, 10s, 30s, 1min, 3min, 5min, 8min, 10min, 20min, 30min, 1h, 2h, 3h, 4h, 5h).**

Labels générés par le code MAIS absents en DB (donc bestAll=0 → 1ère perf devrait créer le record) :
`5s, 12min, 15min, 45min, 90min, 6h`

**Match exact : oui.** Le label n'est PAS la cause.

---

## Q4 — Filtres dans la lecture des records existants

| Filtre | Présent ? |
|---|---|
| `user_id` | ✅ oui (l. 126) |
| `sport='bike'` | ✅ oui (l. 127) |
| `distance_label IN labels` | ✅ oui (l. 128) |
| `event_type` | ❌ **non** — lit tous les types |

→ `bestAll` / `bestYear` sont correctement remplis depuis les records manuels (`training`/`competition`). La comparaison est correcte. Ce n'est pas la cause.

---

## Q5 — INSERT + RLS (la vraie cause)

### Try/catch et log
- L'INSERT (l. 200) **n'est PAS dans un try/catch JS** mais retourne `error` via `{ data, error } = await sb...`
- **L'erreur est consultée** (l. 201 `if (insErr)`) mais **n'est PAS loguée** (`console.error` absent) — invisible côté Vercel
- Retour : `{ processed: false, reason: 'insert_failed: <message>' }` → la route `backfill-records` compte ça dans `errors[]` mais ne le remonte pas au client (Front affiche juste `processed=N` et `beats=0`)

### Policies RLS sur `personal_records`
```
policyname: personal_records_all
cmd:       ALL
using:     is_owner(user_id)
check:     (null)
roles:     {public}
```
Une seule policy `ALL` avec `is_owner(user_id)`. La route backfill utilise le **service client** (`SUPABASE_SERVICE_ROLE_KEY`) → la RLS est by-passée. Donc pas un problème de RLS.

### Le vrai bug : CHECK constraint sur `event_type`

`pg_constraint` retourne :

```
personal_records_event_type_check
  CHECK ((event_type = ANY (ARRAY['training'::text, 'competition'::text])))
```

**Le code insère `event_type='auto_session'` → Postgres rejette avec un code 23514 (`check_violation`)**. Chaque INSERT échoue, la fonction retourne `insert_failed`, l'activité ne passe jamais à `records_processed=true`.

**Autres contraintes lues** (toutes valides pour nos inserts) :
- `personal_records_sport_check` : sport ∈ bike/run/trail/swim/rowing/hyrox/triathlon — OK
- `personal_records_surface_check` : surface ∈ route/piste/trail — on n'envoie pas surface → OK (nullable)
- `personal_records_rpe_check` : rpe entre 1 et 10 — on n'envoie pas → OK
- `personal_records_activity_id_fkey` : FK vers `activities(id)` — l'activity_id qu'on envoie EXISTE → OK
- `personal_records_user_id_fkey` : FK vers `profiles(id)` — OK

---

## Q6 — Retour de backfill-records

Je n'ai pas pu exécuter `curl POST /api/activities/backfill-records` (pas de session utilisateur côté Claude Code). À la place, j'ai vérifié l'état directement en DB après que le useEffect au mount ait tourné chez l'utilisateur :

| Indicateur | Valeur |
|---|---|
| `personal_records` lignes `event_type='auto_session'` | **0** |
| Activités bike `records_processed=true` | 429 |
| Activités bike `records_processed=false` | **14** |

Interprétation :
- Les 429 = activités où `toInsert.length === 0` (aucun record candidat) → `processBikeActivityRecords` passe direct au UPDATE final → marquées processées avec payload vide. **L'INSERT n'a jamais été tenté pour elles.**
- Les 14 restantes = activités où des records étaient candidats à insérer → l'INSERT a échoué (`check_violation` sur `event_type`) → retour `insert_failed`, **pas de UPDATE** → restent à `false`.

Le pattern « 0 ligne `auto_session` + activités bloquées à `false` » est **exactement** la signature d'un CHECK constraint qui bloque tous les inserts auto.

---

## Synthèse

**Cause unique et certaine :** `event_type = 'auto_session'` viole le CHECK constraint `personal_records_event_type_check ((event_type = ANY (ARRAY['training','competition'])))`.

**Pourquoi ça passe inaperçu :**
1. L'erreur Postgres n'est pas loguée côté serveur (pas de `console.error` autour de l'INSERT)
2. La route `backfill-records` la met dans `errors[]` mais ne la remonte pas dans la réponse principale au client
3. Le front affiche `processed=N, beats=0` → l'utilisateur croit que tout va bien mais qu'il n'a juste rien battu

**Pistes de fix (à valider — pas implémentées) :**
1. **Élargir le CHECK constraint** (migration) pour autoriser `'auto_session'`
2. **OU** changer la valeur côté code → utiliser `'training'` (sémantiquement OK : c'est dérivé d'un entraînement) et distinguer les records auto via `activity_id IS NOT NULL` ou `notes LIKE 'Auto-détecté%'`
3. **Ajouter un `console.error`** sur la branche `insErr` pour ne plus louper ce genre de bug
4. **Remonter `insert_failed` dans la réponse** de `backfill-records` pour rendre l'erreur visible côté UI

**Aucune modification de code n'a été faite — diagnostic uniquement.**
