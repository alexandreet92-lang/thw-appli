# PROJECT_STATUS — THW Coaching

_Audit généré le 2026-04-23 après changement d'ordinateur._

Source : lecture complète de CLAUDE.md + scan de `src/` + analyse package.json / tsconfig.json / .env.local.example.

---

## 0. Résumé exécutif (TL;DR)

| Item | État |
|------|------|
| Stack | Next.js 16.0.10 + React 19.2 + TypeScript strict + Tailwind 4 + Supabase + Three.js |
| Repo | `alexandreet92-lang/thw-appli` (non-git localement — pas de `.git`) |
| `node_modules` | **ABSENT** → `npm install` requis avant tout |
| Compilation | ✅ **Imports résolus** (2026-04-23) — `src/lib/` et `src/hooks/` restaurés depuis GitHub (38 fichiers). Reste `npm install` pour builder |
| Features UI (pages) | 18 pages App Router présentes et cohérentes côté front |
| Features API | 20 routes API présentes, dont 7 endpoints IA Anthropic |
| CLAUDE.md drift | 3 conventions violées (voir §7) |

**Priorité #1 : ~~récupérer `src/lib/` et `src/hooks/`~~** ✅ fait le 2026-04-23 via GitHub API (branche `main` du repo public). Prochaine étape : `npm install` puis `npm run build`.

---

## 1. Stack & outillage

**package.json**
- `next` 16.0.10 · `react` 19.2.0 · `typescript` ^5.3.3
- `@supabase/ssr` 0.10.0 · `@supabase/supabase-js` 2.101.1
- `@anthropic-ai/sdk` ^0.88.0
- `@react-three/fiber` 9.5.0 · `@react-three/drei` 10.7.7 · `three` ^0.183.2
- `tailwindcss` ^4.1.3 + `@tailwindcss/postcss`
- `next-themes` (dark/light)
- **Aucune lib de chart** (respect de CLAUDE.md → SVG raw)

**tsconfig.json**
- `strict: true`, `moduleResolution: bundler`
- Alias : `@/*` → `./src/*`

**.env attendues** (depuis `.env.local.example`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`
- `ANTHROPIC_API_KEY`

---

## 2. Arborescence `src/` — rôle de chaque fichier

### 2.1 `src/app/` — pages (App Router)

| Fichier | Rôle |
|---------|------|
| [layout.tsx](src/app/layout.tsx) | Layout racine — sidebar, mobile nav, bouton IA global, CSS vars thème |
| [page.tsx](src/app/page.tsx) | Dashboard — KPIs activités, CTL/ATL/TSB (mock), zones |
| [login/page.tsx](src/app/login/page.tsx) | Auth Supabase (login/signup) |
| [activities/page.tsx](src/app/activities/page.tsx) | Liste activités, filtres, tabs, KPIs sport, **SyncCharts SVG** |
| [activities/page.backup.tsx](src/app/activities/page.backup.tsx) | ⚠️ Backup — à supprimer |
| [activities/page.v2.backup.tsx](src/app/activities/page.v2.backup.tsx) | ⚠️ Backup — à supprimer |
| [athletes/page.tsx](src/app/athletes/page.tsx) | Liste athlètes (données hardcodées) |
| [calendar/page.tsx](src/app/calendar/page.tsx) | Vue calendrier — races, events perso, CRUD |
| [connections/page.tsx](src/app/connections/page.tsx) | Intégrations Strava/Wahoo/Polar/Withings |
| [data/page.tsx](src/app/data/page.tsx) | Redirige vers `/recovery` |
| [injuries/page.tsx](src/app/injuries/page.tsx) | Tracking blessures — mock data + canvas 3D |
| [injuries/Body3DCanvas.tsx](src/app/injuries/Body3DCanvas.tsx) | Modèle 3D corps (Three.js), hit detection, zoom |
| [nutrition/page.tsx](src/app/nutrition/page.tsx) | Plans nutri low/mid/hard, logs poids |
| [onboarding/page.tsx](src/app/onboarding/page.tsx) | Plans tarifaires (Stripe pas branché) |
| [performance/page.tsx](src/app/performance/page.tsx) | Profil athlète (FTP, LTHR, VO2max), tests |
| [performance/DatasTab.tsx](src/app/performance/DatasTab.tsx) | Onglet — PRs, Hyrox races, year data manuel |
| [planning/page.tsx](src/app/planning/page.tsx) | Semaine d'entraînement, drag & drop, analyse IA |
| [profile/page.tsx](src/app/profile/page.tsx) | Préférences, agents IA (hermes/athena/zeus), sports, avatar |
| [recovery/page.tsx](src/app/recovery/page.tsx) | Readiness (mock), métriques, conseils IA |
| [session/page.tsx](src/app/session/page.tsx) | Library / builder / execute — blocs warmup/effort/cooldown |
| [zones/page.tsx](src/app/zones/page.tsx) | Calcul zones par sport (LTHR, FTP) |

### 2.2 `src/app/api/` — routes serveur

| Route | Méthode | Rôle |
|-------|---------|------|
| [api/activities/route.ts](src/app/api/activities/route.ts) | GET | Activités paginées, filtres sport/provider/range |
| [api/analyze-planning/route.ts](src/app/api/analyze-planning/route.ts) | POST | Analyse semaine → JSON score/issues/suggestions |
| [api/coach-engine/route.ts](src/app/api/coach-engine/route.ts) | POST | Orchestrator — route vers 8 actions |
| [api/coach-stream/route.ts](src/app/api/coach-stream/route.ts) | POST | Chat IA en streaming SSE |
| [api/nutrition-plan/route.ts](src/app/api/nutrition-plan/route.ts) | POST | Plan nutritionnel détaillé |
| [api/performance-agents/route.ts](src/app/api/performance-agents/route.ts) | POST | 5 actions performance (profil, tests, lacunes, progression…) |
| [api/session-builder/route.ts](src/app/api/session-builder/route.ts) | POST | Générateur séance (nom/sport/blocs) |
| [api/training-plan/route.ts](src/app/api/training-plan/route.ts) | POST | Programme 14j+ via Managed Agent + fallback |
| [api/auth/strava/connect/route.ts](src/app/api/auth/strava/connect/route.ts) | GET | OAuth init Strava |
| [api/auth/strava/callback/route.ts](src/app/api/auth/strava/callback/route.ts) | GET | OAuth callback Strava |
| [api/oauth/connect/route.ts](src/app/api/oauth/connect/route.ts) | GET | OAuth générique init |
| [api/oauth/callback/route.ts](src/app/api/oauth/callback/route.ts) | GET | OAuth générique callback |
| [api/oauth/disconnect/route.ts](src/app/api/oauth/disconnect/route.ts) | POST | Révoquer provider |
| [api/oauth/status/route.ts](src/app/api/oauth/status/route.ts) | GET | Providers connectés |
| [api/strava/activities/route.ts](src/app/api/strava/activities/route.ts) | GET/POST | Sync activités Strava |
| [api/strava/streams/route.ts](src/app/api/strava/streams/route.ts) | POST | Fetch & store streams (HR, cadence…) |
| [api/strava/disconnect/route.ts](src/app/api/strava/disconnect/route.ts) | POST | Déconnecter Strava |
| [api/sync/[provider]/route.ts](src/app/api/sync/[provider]/route.ts) | POST | Sync générique multi-provider |

### 2.3 `src/components/`

| Fichier | Rôle |
|---------|------|
| [ai/agentConfig.ts](src/components/ai/agentConfig.ts) | 8 agents + quick actions + mapping display |
| [ai/AIAssistantButton.tsx](src/components/ai/AIAssistantButton.tsx) | Bouton header inline → ouvre AIPanel |
| [ai/AIPanel.tsx](src/components/ai/AIPanel.tsx) | **Monolithe ~5000 lignes** — chat, SSE, onglets, agents, data fetch |
| [ai/GlobalAIButton.tsx](src/components/ai/GlobalAIButton.tsx) | Bouton IA global (layout) |
| [shared/Sidebar.tsx](src/components/shared/Sidebar.tsx) | Nav desktop (hover) + mobile (scroll fixé, createPortal) |
| [strava/StravaConnect.tsx](src/components/strava/StravaConnect.tsx) | Widget connexion Strava |
| [ui/AnimatedBar.tsx](src/components/ui/AnimatedBar.tsx) | Barre animée + hook CountUp |
| [ui/Badge.tsx](src/components/ui/Badge.tsx) | Badge — 6 variants (brand/blue/red/orange/green/default) |
| [ui/Button.tsx](src/components/ui/Button.tsx) | Button avec loading state |
| [ui/Card.tsx](src/components/ui/Card.tsx) | Wrapper card (CSS vars) |

### 2.4 Racine `src/`
- [middleware.ts](src/middleware.ts) — guard auth, redirect login ↔ home, vérifie `profiles.id`
- `postcss.config.js` — config Tailwind
- ⚠️ `B5C73A6A-8052-46C8-901B-B764F09A0E57.PNG` — **image orpheline** (~305 Ko) à dégager

### 2.5 `src/lib/`, `src/hooks/`, `src/types/` — restaurés 2026-04-23

Récupérés via GitHub API (`https://raw.githubusercontent.com/alexandreet92-lang/thw-appli/main/...`).

**`src/lib/`** (30 fichiers) :
- [lib/utils.ts](src/lib/utils.ts) — `cn`, `SPORT_EMOJI`, `SPORT_LABEL`, `formatTime`, `formatDate`, `getTSBColor`, `getReadinessLabel`
- [lib/supabase/client.ts](src/lib/supabase/client.ts) — `createClient` (browser)
- [lib/supabase/server.ts](src/lib/supabase/server.ts) — `createClient` (server), `createPublicClient`, `createServiceClient`
- [lib/agents/base.ts](src/lib/agents/base.ts) — `getAnthropicClient`, `MODELS`, `parseJsonResponse`, `callAgent`, `SYSTEM_BASE`
- [lib/agents/chatAgent.ts](src/lib/agents/chatAgent.ts) — `getModelConfig`, `buildChatParams`, `runChatAgent`
- [lib/agents/performanceAgents.ts](src/lib/agents/performanceAgents.ts) — `analyzeProfile`, `analyzeTest`, `explainData`, `getLacunes`, `getProgression`
- [lib/agents/adjustmentAgent.ts](src/lib/agents/adjustmentAgent.ts), [nutritionAgent.ts](src/lib/agents/nutritionAgent.ts), [performanceAgent.ts](src/lib/agents/performanceAgent.ts), [planningAnalysisAgent.ts](src/lib/agents/planningAnalysisAgent.ts), [programAgent.ts](src/lib/agents/programAgent.ts), [readinessAgent.ts](src/lib/agents/readinessAgent.ts), [sessionBuilderAgent.ts](src/lib/agents/sessionBuilderAgent.ts), [strategyAgent.ts](src/lib/agents/strategyAgent.ts)
- [lib/coach-engine/client.ts](src/lib/coach-engine/client.ts), [orchestrator.ts](src/lib/coach-engine/orchestrator.ts) (`runCoachEngine`), [mapping.ts](src/lib/coach-engine/mapping.ts) (`isValidAction`, `getActionDescription`, `ACTION_MAP`), [schemas.ts](src/lib/coach-engine/schemas.ts) (42 types : `ChatInput`, `CoachAction`, `StrategyInput/Output`, `ProgramInput/Output`, etc.), [context/contextFormatters.ts](src/lib/coach-engine/context/contextFormatters.ts)
- [lib/oauth/config.ts](src/lib/oauth/config.ts) (`OAUTH_CONFIG`, `buildAuthUrl`, `OAuthProvider`), [tokens.ts](src/lib/oauth/tokens.ts) (`saveTokens`, `getValidToken`, `revokeToken`, `getConnectedProviders`)
- [lib/strava/config.ts](src/lib/strava/config.ts) (`STRAVA_CONFIG`, `buildAuthUrl`), [tokens.ts](src/lib/strava/tokens.ts) (`getValidToken`, `saveTokens`, `disconnectStrava`, `isStravaConnected`), [activities.ts](src/lib/strava/activities.ts), [streams.ts](src/lib/strava/streams.ts)
- [lib/sync/strava.ts](src/lib/sync/strava.ts) **(sanctuaire — ne jamais modifier)**, [wahoo.ts](src/lib/sync/wahoo.ts), [polar.ts](src/lib/sync/polar.ts), [withings.ts](src/lib/sync/withings.ts)
- [lib/types/index.ts](src/lib/types/index.ts)

**`src/hooks/`** (8 fichiers) :
- [useTheme.ts](src/hooks/useTheme.ts), [useProfile.ts](src/hooks/useProfile.ts), [useNutrition.ts](src/hooks/useNutrition.ts), [usePlanning.ts](src/hooks/usePlanning.ts), [useTrainingZones.ts](src/hooks/useTrainingZones.ts), [useStrava.ts](src/hooks/useStrava.ts), [useRecords.ts](src/hooks/useRecords.ts), [useCountUp.ts](src/hooks/useCountUp.ts)

**`src/types/`** (1 fichier) :
- [tests.ts](src/types/tests.ts)

**Fichier ignoré côté repo distant** : `src/hooks/useAthléteSports.tts` (nom accentué + extension `.tts` invalide, non référencé par aucun import) — vraisemblablement un fichier mort à supprimer côté repo upstream.

**Vérification imports** (2026-04-23) :
- 34 chemins uniques `@/lib/*` + `@/hooks/*` → **tous résolvent** (0 manquant)
- Symboles critiques présents : `MODELS`, `getAnthropicClient`, `parseJsonResponse`, `createClient`/`createServiceClient`/`createPublicClient`, `cn`, `runCoachEngine`, `isValidAction`, `buildChatParams`, `getModelConfig`, `ChatInput`, tous les OAuth/Strava helpers.

---

## 3. Tables Supabase utilisées

| Table | Fichiers qui lisent/écrivent |
|-------|------------------------------|
| `activities` | api/activities, app/page, activities/page, planning/page, performance/DatasTab, AIPanel |
| `profiles` | middleware, profile/page |
| `planned_sessions` | planning/page, AIPanel |
| `planned_races` | planning/page, calendar/page |
| `week_tasks` | planning/page |
| `day_intensity` | planning/page |
| `calendar_events` | calendar/page, AIPanel |
| `calendar_event_types` | calendar/page |
| `training_zones` | app/page, activities/page, AIPanel |
| `athlete_sports` | profile/page |
| `athlete_performance_profile` | AIPanel |
| `athlete_zones` | AIPanel |
| `metrics_daily` | app/page, activities/page, AIPanel |
| `recovery_daily_logs` | recovery/page (TODO upsert — non branché) |
| `session_library` | session/page, AIPanel |
| `nutrition_meal_templates` | AIPanel |
| `test_definitions`, `test_results` | AIPanel |
| `hyrox_races`, `personal_records`, `year_data_manual` | performance/DatasTab |
| `sync_logs` | api/sync/[provider] |

**Note** : aucune migration SQL présente dans le repo local → schéma géré hors-repo (Supabase dashboard ou migrations dans l'autre machine).

---

## 4. Agents IA & modèles Claude

### 4.1 Managed Agent Anthropic (ID explicite)
- **`agent_011Ca8Ar5a3gyowSA6fQ94UT`** — utilisé dans [api/training-plan/route.ts:292](src/app/api/training-plan/route.ts:292) pour la génération de programmes. Fallback automatique sur `MODELS.powerful` si l'agent échoue.

### 4.2 Modèles Claude appelés

| Route | Modèle / constante |
|-------|--------------------|
| [api/analyze-planning/route.ts:48](src/app/api/analyze-planning/route.ts:48) | `claude-sonnet-4-6` (en dur) |
| [api/session-builder/route.ts:217](src/app/api/session-builder/route.ts:217) | `MODELS.balanced` |
| [api/nutrition-plan/route.ts:115](src/app/api/nutrition-plan/route.ts:115) | `MODELS.powerful` |
| [api/training-plan/route.ts:310](src/app/api/training-plan/route.ts:310) | `MODELS.powerful` (fallback) |
| [api/coach-stream/route.ts](src/app/api/coach-stream/route.ts) | via `buildChatParams` + `getModelConfig` |
| [api/performance-agents/route.ts](src/app/api/performance-agents/route.ts) | via `@/lib/agents/performanceAgents` |
| [api/coach-engine/route.ts](src/app/api/coach-engine/route.ts) | via `runCoachEngine` orchestrator |

Les constantes `MODELS.{powerful,balanced,default}` vivent dans `@/lib/agents/base` (fichier à récupérer).

### 4.3 Agents métier (UI / config) — [agentConfig.ts](src/components/ai/agentConfig.ts)

| ID | Nom affiché | Rôle |
|----|-------------|------|
| `planning` | Coach Planning | Analyse / ajuste la semaine |
| `strategy` | Coach Stratégie | Progression long terme, cycles, compétition |
| `adjustment` | Coach Adaptation | Gestion blessures, reprise, stress |
| `readiness` | Coach Récupération | HRV, sommeil, surmenage |
| `sessionBuilder` | Coach Séances | Génère séances à la carte |
| `nutrition` | Coach Nutrition | Macros, repas, plans |
| `performance` | Coach Training | Analyse activités, zones |
| `profiling` | Coach Performance | Profil physio, tests — route vers Managed Agent via `managedAgentAction` (`analyzeProfile`, `analyzeTest`, `explainData`, `getLacunes`, `getProgression`) |

### 4.4 Aliases UI `THWModel`
Dans [AIPanel.tsx](src/components/ai/AIPanel.tsx) (~ligne 4890+), les quick actions référencent des modèles nommés **`hermes`, `athena`, `zeus`** — ce sont des alias internes, pas des IDs Anthropic, probablement mappés côté `lib/agents/`.

---

## 5. Features en cours de développement

D'après CLAUDE.md §"En cours / à venir" :
- **CTL / ATL / TSB** — pas encore commencé, architecture à valider (aujourd'hui mock dans [app/page.tsx](src/app/page.tsx))
- **Training load analytics** — EWMA, table dédiée, recalcul post-sync Strava (non démarré)

D'après code :
- **Stripe** — onboarding prêt côté UI, lien paiement à brancher ([onboarding/page.tsx:71](src/app/onboarding/page.tsx:71))
- **Recovery daily logs** — UI prête, upsert Supabase TODO ([recovery/page.tsx:718](src/app/recovery/page.tsx:718))
- **Session templates** — lecture Supabase TODO, actuellement mock ([session/page.tsx:149](src/app/session/page.tsx:149))

---

## 6. TODO / FIXME / Mock data dans le code

### 6.1 TODO explicites
| Fichier:Ligne | Commentaire |
|---------------|-------------|
| [onboarding/page.tsx:71](src/app/onboarding/page.tsx:71) | `/* TODO: lien Stripe */` |
| [session/page.tsx:149](src/app/session/page.tsx:149) | `/* TODO: charger depuis Supabase session_templates */` |
| [recovery/page.tsx:718](src/app/recovery/page.tsx:718) | `// TODO: await supabase.from('recovery_daily_logs').upsert(...)` |

### 6.2 Mock data en production (viole CLAUDE.md)
| Fichier | Détail |
|---------|--------|
| [injuries/page.tsx:111](src/app/injuries/page.tsx:111) | `MOCK_INJURIES` hardcodé |
| [recovery/page.tsx:20-23](src/app/recovery/page.tsx:20) | `MOCK` readiness / sommeil / trends |
| [session/page.tsx:150](src/app/session/page.tsx:150) | `MOCK_TEMPLATES` pour la library |
| [athletes/page.tsx](src/app/athletes/page.tsx) | Array d'athlètes hardcodé |
| [connections/page.tsx](src/app/connections/page.tsx) | Mock status pour providers non-Strava |
| [onboarding/page.tsx](src/app/onboarding/page.tsx) | Plans tarifaires locaux (admissible — config statique) |

### 6.3 Fichiers suspects / résiduels
- `B5C73A6A-8052-46C8-901B-B764F09A0E57.PNG` — à la racine **et** dans `src/`
- `jsconfig.json.bak` — trace d'une migration JS → TS
- `src/app/activities/page.backup.tsx`, `page.v2.backup.tsx`

---

## 7. Violations de CLAUDE.md

| Règle | Statut |
|-------|--------|
| "Zéro mock data en production" | ❌ violée dans 5 pages (§6.2) |
| "Zéro lib de chart externe" | ✅ respectée (aucun import recharts/chart.js) |
| "SVG raw uniquement" | ✅ respectée |
| "TypeScript strict — pas de `any`" | À auditer — non vérifié file by file |
| "Ne jamais modifier src/lib/sync/strava.ts" | ⚠️ le fichier est **introuvable localement** |
| "Mapping streams : `r.streams ?? r.raw_data?.streams`" | À vérifier dans le code SyncCharts |

---

## 8. État actuel — synthèse

### ✅ Ce qui fonctionne (côté code présent)
- Structure Next.js App Router complète, 18 pages
- Routes API Anthropic complètes (7 endpoints IA + orchestrator)
- Routes OAuth Strava + multi-provider (Wahoo, etc.)
- Config agents IA (8 coachs + quick actions + managed agent IDs)
- UI components (Button, Card, Badge, AnimatedBar)
- Middleware auth Supabase
- Pages riches : activities (SyncCharts SVG), planning (drag & drop), injuries (Three.js 3D), session builder
- Layout responsive : sidebar hover desktop + mobile touch scroll

### 🟡 En cours / partiel
- Recovery : UI complète mais persistance Supabase TODO
- Session library : templates en mock, migration vers Supabase à faire
- Onboarding : écrans prêts, intégration Stripe à brancher
- Connections : Strava OK, autres providers en placeholder

### ❌ Cassé / bloquant
- ~~`src/lib/` et `src/hooks/` manquants~~ ✅ **Restaurés 2026-04-23** (38 fichiers depuis GitHub, tous les imports résolvent)
- **`node_modules` absent** → `npm install` requis pour valider le build
- **CTL/ATL/TSB** non démarré (mock dans dashboard)
- **Schéma Supabase** non versionné localement (aucune migration SQL dans le repo)

---

## 9. Actions recommandées (avant tout nouveau dev)

1. **Récupérer `src/lib/` et `src/hooks/`** depuis l'ancien poste ou le repo distant `alexandreet92-lang/thw-appli` — sinon rien ne compile.
2. **Initialiser le repo git local** (`git init` + remote) — actuellement non-git côté poste.
3. `npm install` pour peupler `node_modules`.
4. Créer `.env.local` depuis `.env.local.example` avec les vraies clés.
5. **Nettoyer** : supprimer `*.backup.tsx`, `jsconfig.json.bak`, `B5C73A6A-*.PNG` (racine + src/).
6. `npm run build` pour valider la compilation TS stricte.
7. `npm run dev` et smoke-test chaque page (login, dashboard, activities, planning, session).
8. Vérifier que `src/lib/sync/strava.ts` est bien présent (règle critique CLAUDE.md).

---

_Document généré par Claude Code — mettre à jour après chaque jalon majeur._
