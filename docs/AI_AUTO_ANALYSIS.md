# Auto-analyse IA des séances (Brique 1)

Déclenche **automatiquement** l'analyse IA d'une séance après sa synchronisation
(Strava webhook ou sync manuel), sans que l'utilisateur ait à cliquer. Le
résultat est stocké sur l'activité et affiché directement à l'ouverture (aucun
recalcul). But produit : le coach ouvre la séance d'un athlète et l'analyse est
déjà là.

## Architecture (file d'attente + cron)

Pour rester fiable en serverless (un webhook Strava doit répondre vite, et une
analyse LLM prend 15–30 s), le traitement est **découplé** :

1. **Enqueue** — à la fin de chaque import d'activité, `triggerRecordsProcessing`
   appelle `triggerAutoAnalysis()` qui se contente de marquer l'activité
   `ai_analysis_status = 'pending'` (rapide, un seul UPDATE, jamais bloquant).
   → `src/lib/ai/triggerAutoAnalysis.ts`
2. **Worker (cron)** — `/api/ai/auto-analyze-run` (toutes les 10 min) prend les
   activités `pending` (max `AI_AUTO_ANALYZE_BATCH`), assemble le contexte,
   appelle le LLM et stocke le résultat. Les surplus restent en file.
   → `src/lib/ai/autoAnalyzeWorker.ts`, `src/app/api/ai/auto-analyze-run/route.ts`
3. **Moteur partagé** — prompts + appel LLM dans `src/lib/ai/analyzeTraining.ts`,
   utilisé à la fois par le cron ET par la route manuelle `/api/analyze-training`
   (une seule source de vérité).
4. **Contexte serveur** — `src/lib/ai/assembleAnalysisContext.ts` reproduit
   l'assemblage fait côté app (zones, séance planifiée, récup 3 j, séances
   similaires, TSS semaine, dérive cardiaque, efficiency index).
5. **Affichage / cache** — l'AIPanel lit `activities.ai_analysis` : s'il existe,
   il l'affiche sans rappeler l'IA ; une analyse manuelle est aussi persistée.

## Base de données

Migration : `supabase/migrations/20260920_ai_auto_analysis.sql`
- `activities.ai_analysis` (jsonb) — le rapport stocké
- `activities.ai_analysis_status` (text) — `null | pending | done | error | skipped`
- `activities.ai_analysis_at` (timestamptz)
- `profiles.ai_auto_analyze` (bool, défaut true) — activation par utilisateur
- `profiles.ai_analysis_detail` (text, défaut `advanced`) — `minimum | advanced | specialist`

> À appliquer sur Supabase avant d'activer la fonctionnalité (via l'éditeur SQL
> ou la CLI). Colonnes additives → aucune donnée existante impactée.

## Variables d'environnement (Vercel)

- `AI_AUTO_ANALYZE` — **kill-switch global**. Non défini ou `!= 1` → auto-analyse
  désactivée (l'analyse manuelle continue de marcher). Mettre `1` pour activer.
- `AI_AUTO_ANALYZE_BATCH` — nb max d'activités par passage du cron (défaut 5).
  Garde-fou coût/quota.
- `CRON_SECRET` — déjà utilisé par les autres crons ; protège la route.
- `ANTHROPIC_API_KEY` — déjà requis (moteur d'analyse).

## Cron

Ajouté dans `vercel.json` :
```
{ "path": "/api/ai/auto-analyze-run", "schedule": "*/10 * * * *" }
```
> Si le plan Vercel restreint la fréquence des crons, repasser à `0 * * * *`
> (horaire) — les autres crons du projet utilisent déjà cette cadence.

## Gestion du coût / quota

- **Désactivé par défaut** : rien ne se déclenche tant que `AI_AUTO_ANALYZE=1`
  n'est pas posé (aucun appel DB ni LLM).
- **Par lot** : au plus `AI_AUTO_ANALYZE_BATCH` analyses par run ; le reste
  attend en file (`pending`).
- **Échec propre** : si le LLM échoue (quota API atteint, réseau…), l'activité
  passe `error` et le worker continue — jamais de crash, jamais d'échec de sync.
- **Par utilisateur** : `profiles.ai_auto_analyze = false` désactive pour un
  athlète donné.

## Niveau de détail

`profiles.ai_analysis_detail` : `minimum` (bref, 1 conseil), `advanced` (défaut),
`specialist` (analyse technique poussée). Utilisé par l'auto-analyse ; adapte la
longueur/profondeur et le budget de tokens.

## Comment tester

1. Appliquer la migration SQL sur Supabase.
2. Poser `AI_AUTO_ANALYZE=1` (+ `CRON_SECRET`, `ANTHROPIC_API_KEY`) sur Vercel.
3. Synchroniser une séance (course/vélo) → vérifier en base que
   `activities.ai_analysis_status = 'pending'`.
4. Déclencher le cron manuellement :
   `curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/ai/auto-analyze-run`
   → réponse `{ ok: true, picked, done, ... }`.
5. Vérifier `ai_analysis_status = 'done'` et `ai_analysis` rempli ; ouvrir la
   séance dans l'app → l'analyse s'affiche sans recalcul.

> Test end-to-end réel (webhook → LLM → DB → affichage) nécessite les clés de
> prod (Anthropic + Supabase) et un vrai événement de sync ; il ne peut pas être
> reproduit hors environnement de prod.
