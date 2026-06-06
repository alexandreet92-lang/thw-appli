# PROMPT_ACTIVITY_DIAGNOSTIC2 — Diagnostic records auto-update

**Mode :** lecture seule. Aucune modification du code n'a été effectuée.

---

## Q1 — DÉCLENCHEMENT

**Appelé dans (TOUTES les références à `process-records` / `processBikeActivityRecords` dans le code) :**

| Fichier | Ligne | Rôle |
|---|---|---|
| `src/lib/records/processBikeActivity.ts` | 78 | Définition de la lib (cœur du traitement) |
| `src/app/api/activities/process-records/route.ts` | 9, 21 | Route POST qui appelle la lib pour UNE activité |
| `src/app/api/activities/backfill-records/route.ts` | 10, 53 | Route POST qui appelle la lib en boucle sur toutes les activités |
| `src/components/activity/RecordsBeaten.tsx` | 26 | `fetch('/api/activities/process-records', POST)` dans `useEffect` au montage du badge — *uniquement quand on ouvre la fiche d'une activité* |
| `src/app/performance/DatasTab.tsx` | 231 | `fetch('/api/activities/backfill-records', POST)` derrière le bouton **« Recalculer »** (Card « Records de puissance ») |

**Déclencheur réel : CLIENT seulement, et uniquement à la demande de l'utilisateur.**

**Contextes couverts :**
- ✅ Ouverture de la fiche d'une activité (`RecordsBeaten` → `/api/activities/process-records`)
- ✅ Clic manuel sur « Recalculer » (page Performance → `/api/activities/backfill-records`)

**Contextes NON couverts (origine du bug) :**
- ❌ Import Strava (`src/lib/sync/strava.ts`, `src/app/api/strava/import-history/route.ts`, `src/app/api/strava/webhook/route.ts`, `src/app/api/strava/upload-activity/route.ts`) — **aucun appel** à process-records
- ❌ Sync Polar (`src/lib/sync/polar.ts`)
- ❌ Sync Wahoo (`src/lib/sync/wahoo.ts`)
- ❌ Sync Withings (`src/lib/sync/withings.ts`)
- ❌ Route générique `src/app/api/sync/[provider]/route.ts`
- ❌ Upload GPX / création manuelle d'activité
- ❌ Aucun cron, aucun trigger Postgres, aucune Edge Function

→ **Vérifié par `grep -rn "process-records\|processBikeActivity\|records_processed" src/lib/sync src/lib/strava src/app/api/strava src/app/api/sync` : 0 résultat dans les pipelines de sync.**

→ Conséquence : après une nouvelle activité importée (Strava webhook, GPX, etc.), `records_processed` reste à `false` et `personal_records` n'est jamais alimenté tant que l'utilisateur n'ouvre pas la fiche ou ne clique pas « Recalculer ».

---

## Q2 — ROUTE PROCESS-RECORDS

**Fichier :** `src/app/api/activities/process-records/route.ts` (30 lignes, refactor → délègue tout à la lib)
**Lib :** `src/lib/records/processBikeActivity.ts` → fonction `processBikeActivityRecords(sb, userId, activityId, opts)`

**Logique step-by-step (combinée route + lib) :**

1. **Auth** : `await createClient()` puis `auth.getUser()`. 401 si pas de user.
2. **Body** : extrait `activity_id` (+ `force` optionnel). 400 si manquant.
3. **Service client** : `createServiceClient()` pour by-pass RLS sur les écritures.
4. **Charge l'activité** : `SELECT user_id, sport_type, started_at, streams, raw_data, records_processed, records_beaten` filtré sur `id` + `user_id`. 404 si introuvable.
5. **Filtre sport** : si `sport_type` ∉ {`bike`, `cycling`, `cycle`, `velo`} → retourne `{allTime:[], year:[]}` sans rien écrire.
6. **Filtre idempotence (la condition principale)** : `if (!opts.force && activity.records_processed && activity.records_beaten)` → renvoie `records_beaten` (le cache) sans recalculer. ⚠️ `records_beaten` ici est lu comme truthy ; voir Q3.
7. **Watts** : `streams?.watts ?? raw_data?.streams?.watts`. Si absent (`<5` samples) → écrit `records_processed=true, records_beaten={allTime:[],year:[]}`, retourne vide.
8. **Calcule sessionMmp** sur 21 durées (Pmax → 6h) via sliding window cap 1500 W (`computeMmp`).
9. **Charge `personal_records`** filtré `user_id`, `sport='bike'`, `distance_label IN labels`.
10. **Filtre causal** : ne garde que les records `achieved_at < activityDate` (records strictement antérieurs).
11. **Détecte les records battus** (null-safe via `?? 0`).
12. **INSERT** dans `personal_records` (`event_type='auto_session'`) pour chaque durée battue. Si erreur d'insert → retourne `{processed:false, reason:'insert_failed:…'}`, route renvoie 500.
13. **UPDATE** `activities SET records_processed=true, records_beaten=<jsonb>`.
14. **Retourne** `{allTime:[…], year:[…]}` au client.

| Question | Réponse |
|---|---|
| Filtre `records_processed` ? | ✅ **Oui**, ligne 103 de la lib : `if (!opts.force && activity.records_processed && activity.records_beaten) return cached` |
| Met à jour `records_processed=true` ? | ✅ Oui : ligne 111 (cas no_watts) et ligne 210 (cas nominal). Pas de mise à jour en cas d'erreur d'insert (volontaire) |
| Gestion d'erreurs ? | ⚠️ **Partielle** : la lib renvoie un `reason` typé (`not_found`, `not_bike`, `cached`, `no_watts`, `insert_failed:…`) ; la route mappe `not_found→404`, `insert_failed→500`. Aucun `console.error` ni log d'observabilité dans la route ou la lib (le `console.error` qui existait dans la route originale a été perdu lors du refactor). Les erreurs Supabase silencieuses sur le `SELECT personal_records` ne sont pas vérifiées. |

---

## Q3 — SELECT 5 dernières activités

Exécuté sur le projet Supabase actif `thw-v2` (`sfrcnyzntgrxlwlmwifi`, status `ACTIVE_HEALTHY`).

```sql
SELECT id, sport_type, started_at, records_processed, records_beaten
FROM activities
ORDER BY started_at DESC
LIMIT 5;
```

**Résultat brut :**

| id | sport_type | started_at | records_processed | records_beaten |
|---|---|---|---|---|
| `630495ae-5df6-41e7-b5d0-b07edd890d8e` | bike | 2026-06-01 16:17:42+00 | **false** | `[]` |
| `7ce61565-92c7-4263-9364-b98e3f00fa6e` | run  | 2026-05-31 18:34:38+00 | **false** | `[]` |
| `afe349ae-f59c-44c4-915f-ae367beac5c7` | bike | 2026-05-30 08:02:19+00 | **false** | `[]` |
| `b2d308b8-6c42-4c25-9a13-6d944c189a95` | bike | 2026-05-28 06:12:34+00 | **false** | `[]` |
| `72d0d7c1-f263-409c-a1fd-f11d39d4ec5b` | bike | 2026-05-27 17:56:43+00 | **false** | `[]` |

**Observations :**

1. **Toutes les 5 dernières activités ont `records_processed = false`** → confirme qu'aucun pipeline de sync ne déclenche le traitement (cohérent avec Q1).
2. **`records_beaten = []` (tableau vide JSONB) — PAS `NULL` comme spécifié dans la migration** :

   Vérifié via `information_schema.columns` :
   ```
   records_beaten | jsonb | DEFAULT '[]'::jsonb | nullable=YES
   records_processed | boolean | DEFAULT false | nullable=YES
   ```

   → La migration appliquée en production utilise `DEFAULT '[]'::jsonb`, alors que le fichier `src/supabase/migrations/add_records_processed_to_activities.sql` du repo dit `DEFAULT NULL`. **Désynchronisation migration vs DB réelle.**

3. **Risque latent du `[]` par défaut** : la condition d'idempotence de la lib est
   ```ts
   if (!opts.force && activity.records_processed && activity.records_beaten) { … }
   ```
   Si jamais une activité a `records_processed=true` ET `records_beaten=[]` (tableau vide ; truthy en JS), la route retournerait `[]` comme cache typé `BeatenPayload`. L'accès `.allTime` / `.year` sur ce tableau renverrait `undefined` → l'UI du badge `RecordsBeaten` afficherait « Aucun record battu cette séance » même si l'activité contient en fait des records. Aujourd'hui le cas ne se produit pas (les 5 lignes ont `processed=false`), mais devient possible dès qu'une activité est traitée pour la première fois ET qu'un état intermédiaire force la valeur `[]`.

---

## Q4 — PAGE PERFORMANCE

**Fichier d'entrée :** `src/app/performance/page.tsx`, ligne 2487 :
```ts
{tab === 'datas' && <DatasTab onSelect={…} selectedDatum={…} profile={profile} … />}
```

**Composant qui charge les records vélo :** `src/app/performance/DatasTab.tsx`

### Hook / query

`useEffect` (mount-only, deps `[]`) à `DatasTab.tsx:3028–3042` :

```ts
useEffect(() => {
  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('personal_records')
      .select('id, distance_label, performance, achieved_at')
      .eq('user_id', user.id)
      .eq('sport', 'bike')
      .order('achieved_at', { ascending: false })
    if (data) setBikeAllRecords(data as {…}[])
  }
  void load()
}, [])
```

| Question | Réponse |
|---|---|
| **Table lue** | `personal_records` |
| **Colonnes** | `id, distance_label, performance, achieved_at` (pas `event_type`) |
| **Filtres** | `user_id = user.id` ET `sport = 'bike'`. **PAS de filtre sur `event_type`** → les lignes `'auto_session'` insérées par le backfill et le process-records sont bien lues. |
| **Ordre** | `achieved_at DESC` |
| **Type de fetch** | **Dynamique** (`useEffect` client-side au mount, deps `[]` → 1× par chargement de la page). Le hook secondaire ligne 3045 fait la même chose pour `run/swim/rowing/gym/triathlon`. |
| **Cache / revalidation** | Aucun. Pas de `revalidate`, pas de SWR / React Query, pas de listener temps réel. Le bouton « Recalculer » (`BackfillRecordsButton`) déclenche manuellement un re-fetch via le callback `onDone` qui ré-exécute la même requête. |
| **Calcul du meilleur record** | Fait côté client par `getEffectiveRec(dur)` (DatasTab.tsx:3012) : prend le **max** des `parseInt(performance)` du tableau filtré par `distance_label` et par année. Aucun risque de doublon ou d'écrasement (l'INSERT auto crée 1 ligne par durée battue, le max remonte la meilleure perf). |

---

## Synthèse — cause racine du bug rapporté

> « Le backfill a fonctionné, mais après une nouvelle activité les records ne se mettent jamais à jour automatiquement. »

**Cause racine :** aucun chemin de **synchronisation / import / upload / webhook** n'appelle `/api/activities/process-records` ni `processBikeActivityRecords`. Le seul déclencheur côté nouveauté est :

- L'ouverture de la fiche détaillée de l'activité (`RecordsBeaten.tsx` au mount)
- Le clic manuel sur « Recalculer » dans la page Performance

Donc une activité fraîchement importée par Strava reste avec `records_processed=false` et `records_beaten=[]` jusqu'à ce que l'utilisateur clique dessus ou fasse un backfill manuel. La page Performance lit `personal_records` dynamiquement, donc dès que ces lignes existent, elle les affiche — mais elles n'existent jamais tant que rien ne déclenche le traitement.

**Points secondaires confirmés en passant :**
- Migration de la colonne `records_beaten` désynchronisée : `DEFAULT '[]'::jsonb` en DB vs `DEFAULT NULL` dans le fichier de migration du repo.
- Le `console.error` initial de la route a disparu lors du refactor → 0 trace serveur si l'insert `personal_records` échoue (la route renvoie un 500 mais rien dans les logs Vercel).
- Aucun fallback : si l'utilisateur n'ouvre jamais une activité, ses records restent invisibles indéfiniment.

**Aucune modification de code effectuée.**
