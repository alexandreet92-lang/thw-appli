# THW Coaching — Documentation technique de l'application

> Inventaire technique exhaustif du code réellement implémenté.
> Généré le 2026-06-03 par lecture du code source (aucune feature inventée).
> Légende : ✅ implémenté · ⚠️ partiel (précisé) · 🚧 stub vu dans le code, non fonctionnel.

## Sommaire
1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture des pages](#2-architecture-des-pages)
3. [Authentification](#3-authentification)
4. [Coach IA](#4-coach-ia)
5. [Système de tokens](#5-système-de-tokens)
6. [Abonnements](#6-abonnements)
7. [Pages principales — détails](#7-pages-principales--détails)
8. [Intégrations externes](#8-intégrations-externes)
9. [Notifications](#9-notifications)
10. [Base de données Supabase](#10-base-de-données-supabase)
11. [Routes API](#11-routes-api)
12. [Variables d'environnement](#12-variables-denvironnement)
13. [Branding et thème](#13-branding-et-thème)
14. [Sécurité et confidentialité](#14-sécurité-et-confidentialité)
15. [Build et déploiement](#15-build-et-déploiement)
- [Annexe — zones d'ombre & questions au PO](#annexe--zones-dombre--questions-au-po)

---

## 1. Vue d'ensemble

- **Produit** : THW Coaching (« The Hybrid Way » / « Hybrid Training ») — app de coaching sportif hybride (endurance + force). Benchmark UI/UX : Strava + TrainingPeaks.
- **Domaine de prod** : déploiement Vercel, domaine app `thw-appli.vercel.app` (référencé dans les emails top-up : `https://thw-appli.vercel.app/branding/...`). Domaine d'envoi email : `the-hybridway.com`. Site marketing externe via `NEXT_PUBLIC_MARKETING_SITE_URL`.
- **Repo** : `alexandreet92-lang/thw-appli` (branche `main` → Vercel).

### Stack technique (d'après `package.json`)
| Domaine | Techno | Version |
|---|---|---|
| Framework | **Next.js** (App Router) | `16.0.10` |
| UI runtime | **React** / React-DOM | `19.2.0` |
| Langage | **TypeScript** (strict) | `^5.3.3` |
| CSS | **Tailwind CSS v4** (`@tailwindcss/postcss`) | `^4.1.3` |
| BDD / Auth | **Supabase** (`@supabase/ssr` + `supabase-js`) | ssr `0.10.0` / js `2.101.1` |
| IA | **Anthropic SDK** (`@anthropic-ai/sdk`) | `^0.88.0` |
| Paiement | **Stripe** | `^16.0.0` |
| Email | **Resend** | `^4.8.0` |
| Cartes | **Leaflet** + `react-leaflet` | `^1.9.4` / `^5.0.0` |
| 3D | **three** + `@react-three/fiber` + `drei` | three `^0.183.2` |
| Anim | **framer-motion** | `^11.18.2` |
| Markdown | **react-markdown** | `^10.1.0` |
| PDF | **jspdf** + `jspdf-autotable` | `^2.5.2` |
| PWA | **@ducanh2912/next-pwa** | `^10.2.9` |
| Thème | **next-themes** (présent) | `^0.2.1` — ⚠️ le thème réel est géré par un hook custom `useTheme` |
| Icônes | **lucide-react** | `^0.447.0` |
| Node | engines | `>=20` |

### Services externes
- **Supabase** (PostgreSQL, Auth, Storage, RLS) — projet `thw-v2`.
- **Anthropic** (Claude — Haiku 4.5 & Sonnet 4.6 + Managed Agents beta).
- **Stripe** (abonnements + paiements one-shot top-up).
- **Resend** (emails transactionnels — liens de recharge tokens).
- **Strava / Polar / Wahoo / Withings** (OAuth + sync données sportives/santé).
- **Instagram Graph API v21** (marketing, compte créateur uniquement).
- Cartographie : **Mapbox / MapTiler / OpenRouteService** (variables `NEXT_PUBLIC_*`).

---

## 2. Architecture des pages

32 routes `page.tsx` sous `src/app/`. Navigation principale via sidebar + barre mobile (composant `SectionLayout` unifié sur Profil/Planning/Calendar).

| Route | Nom affiché | Sous-sections | Composants/contenu clés | Statut |
|---|---|---|---|---|
| `/` | Accueil/Dashboard | — | `src/app/page.tsx` | ✅ |
| `/login` | Connexion | login / signup | email-password, Google OAuth | ✅ |
| `/auth` | Connexion (Hybrid) | Connexion / Créer un compte | Google + Apple OAuth, force mdp, CGU | ✅ |
| `/auth/reset-password` | Réinit. mot de passe | — | flux `PASSWORD_RECOVERY` Supabase | ✅ |
| `/auth/update-password` | Nouveau mot de passe | — | post-callback | ✅ |
| `/auth/profile` | Complétion profil | — | `ProfileCompletion` | ✅ |
| `/onboarding` | Onboarding | multi-étapes | sélection sport, objectif, matériel | ✅ |
| `/questionnaire` | Questionnaire coaching | — | formulaire inscription externe | ✅ |
| `/briefing` | Briefing du jour | — | séance du jour, tâches, news (créateur) | ✅ |
| `/performance` | Performance | Profil · Tests · Données · Courses · Climbs | Radar, tests, scoring, KPIs | ✅ |
| `/planning` | Planning | **Entraînement** · **Semaine** | `TrainingTab`, `WeekTab` (`SectionLayout`) | ✅ |
| `/calendar` | Calendar | **Course · Pro · Perso · Tout** | `RaceTab`, `CategoryTab`, `AllTab` | ✅ |
| `/activities` | Activités | filtres/onglets/KPIs | courbes SVG, MMP, laps, cartes | ✅ |
| `/data` | Données | — | ⚠️ redirige vers `/recovery` |
| `/recovery` | Récupération | — | HRV, sommeil, PMC, steps, body | ⚠️ (données partiellement mock) |
| `/nutrition` | Nutrition | repas/macros/poids | kcal, donut macros, templates, scanner | ✅ |
| `/zones` | Zones | run/bike/swim | 5 zones par LTHR/FTP/CSS | ✅ |
| `/record` | Enregistrer | multi-sports | GPS, écrans par sport | ✅ |
| `/session` | Séance | library/build/execute | builder muscu/endurance | ✅ |
| `/injuries` | Blessures | — | mapper 3D corps, suivi douleur | ✅ |
| `/competences` | Compétences | par sport | bibliothèque 70 compétences | ✅ |
| `/profile` | Mon Profil | **Profil · Notifications · Réglages IA** | `SectionLayout`, gear, règles IA | ✅ |
| `/connections` | Connexions | catégories d'apps | OAuth Strava/Polar/Wahoo/Withings | ✅ |
| `/settings/subscription` | Abonnement | — | plans, usage, Stripe | ✅ |
| `/topup` | Recharge tokens | — | packs, Stripe Checkout | ✅ |
| `/topup/success` | Paiement réussi | — | confirmation | ✅ |
| `/topup/expired` | Lien expiré | — | erreur lien | ✅ |
| `/access-expired` | Accès expiré | — | abonnement expiré/annulé | ✅ |
| `/athletes` | Athlètes (coach) | — | dashboard multi-athlètes | ⚠️ mock |
| `/admin/marketing` | Admin Marketing | — | créateur only, Instagram/briefs | ⚠️ (créateur) |
| `/legal/cgu` | CGU | — | 🚧 « en cours de rédaction » |
| `/legal/privacy` | Confidentialité | — | 🚧 « en cours de rédaction » |

---

## 3. Authentification

- **Méthode** : ✅ **Supabase Auth** (PostgreSQL-backed).
- **Providers OAuth (login)** : ✅ Google, ✅ Apple (boutons sur `/auth`), + ✅ email/mot de passe.
- **Pages** : `/login` (email+Google), `/auth` (version brandée Hybrid : Google+Apple, barre de force du mot de passe, cases CGU/confidentialité), `/auth/reset-password`, `/auth/update-password`, `/auth/profile` (complétion).
- **Vérification email** : ✅ flux de confirmation Supabase → redirection complétion profil.
- **Callback OAuth** : `src/app/api/auth/...` + `auth/callback` (échange code/OTP).
- **Sessions / middleware** (`src/middleware.ts`) :
  - Routes publiques : `/login`, `/auth`, `/onboarding`, `/access-expired`, `/legal/*`, et toutes les `/api/*`.
  - Non authentifié → redirige `/auth`.
  - Vérifie `user_subscriptions.status` → si `trial_expired`/`cancelled`/`canceled` → `/access-expired`.
  - Vérifie `profiles.onboarding_completed` → force onboarding.
  - Exclut `/branding/*` et `/logos/*` du contrôle d'auth (images d'emails accessibles publiquement).

---

## 4. Coach IA

### 4.1 Modèles disponibles
Source : `src/lib/subscriptions/tier-limits.ts` (`MODEL_IDS`, `MODEL_MAX_TOKENS`), `src/lib/tokens/multipliers.ts`.

| Nom | Modèle Claude sous-jacent | max_tokens | Multiplicateur tokens | Cas d'usage | Tier par défaut |
|---|---|---|---|---|---|
| **Hermès** | `claude-haiku-4-5-20251001` | 8 192 | **×1** | Questions simples, conseils rapides, chat léger | Trial/Premium |
| **Athéna** | `claude-sonnet-4-6` | 12 000 | **×3** | Coaching standard, analyses, plans | Pro |
| **Zeus** | `claude-sonnet-4-6` (contexte/créativité max) | 16 000 | **×8** | Analyses très poussées, programmes complexes | Expert |

> Note : Athéna et Zeus pointent sur le **même** modèle API (`claude-sonnet-4-6`) ; Zeus se distingue par `max_tokens` plus élevé et le multiplicateur ×8.

### 4.2 Agents
Source : `src/lib/agents/*`, `src/lib/coach-engine/orchestrator.ts`, `src/app/api/{coach-engine,coach-stream,performance-agents,training-plan}/route.ts`.

- **Managed Agent Anthropic** ✅ (beta header `managed-agents-2026-04-01`) :
  - Utilisé par la page **Performance** (`src/lib/agents/performanceAgents.ts`, agent id `agent_011CaA6jzcmrj51wUc8qTc7y`) : `analyzeProfile`, `analyzeTest`, `explainData`, `getLacunes`, `getProgression` (SSE, gestion de session).
  - Utilisé par **`/api/training-plan`** (agent managé dédié + fallback orchestrateur local).
- **Agents internes** (`src/lib/agents/`, orchestrés par `coach-engine`) ✅ — 8 actions : `generate_program`, `analyze_planning`, `build_session`, `readiness_check`, `adjust_plan`, `analyze_performance`, `nutrition`, `chat`. Fichiers : `strategyAgent`, `programAgent`, `sessionBuilderAgent`, `planningAnalysisAgent`, `readinessAgent`, `performanceAgent`, `adjustmentAgent`, `nutritionAgent`, `chatAgent`.
- **Modèles internes** (`src/lib/agents/base.ts`) : `fast` (Haiku), `balanced`/`powerful` (Sonnet).

### 4.3 Compétences
Source : `src/app/competences/*`, table `competences` (70 lignes vérifiées en base).

- **Total seedé** : **70 compétences** ✅.
- **Catégories** (8) : Méthodologie, Périodisation, Adaptation, Nutrition, Récupération, Force, Hypertrophie, Performance.
- **Sports** (10 + « Tous ») : Running, Trail, Cyclisme, Triathlon, Natation, Rowing, Muscu, Hyrox, Transversale.
- **Activation** : table `user_competences` (`user_id, competence_id, active, activated_at`), upsert via `useUserCompetences.ts`. Détection de conflits entre compétences.
- **Limites par plan** (compétences actives max) : **Premium 3 · Pro 7 · Expert 20**.

### 4.4 Recherche web
- **Par défaut** : ❌ désactivée (`user_settings.ai_web_search_default = false`).
- **Toggle utilisateur** : Profil → Réglages IA → « Recherche web par défaut » (optimistic + localStorage `thw_ai_web_search_default` + persistance DB via `PATCH /api/user/ai-settings`).
- ⚠️ Le bouton « Recherche Web » dans le menu « + » du chat (`AIPanel.tsx`) est un **placeholder inactif** (`pointerEvents:none`) — la préférence est stockée mais l'activation fonctionnelle dans le chat n'est pas encore câblée.
- Côté **briefing**, `briefing_web_search` est activé pour Pro/Expert (config `tier-limits.ts`).

### 4.5 Actions rapides
Source : `src/components/ai/AIPanel.tsx`, `src/lib/quick-actions/models.ts`. 14 actions, modèle forcé + estimation tokens.

| Action | Flow | Catégorie | Modèle forcé | Estimation |
|---|---|---|---|---|
| Créer un plan d'entraînement | `training_plan` | Plan | **Zeus** | ~50 000 |
| Créer un plan nutritionnel | `nutrition` | Nutrition | Athéna | ~50 000 |
| Identifier mes points faibles | `weakpoints` | Entraînement | Athéna | ~30 000 |
| Stratégie de course | `strategie_course` | Course | Athéna | ~30 000 |
| Analyser ma progression | `analyser_progression` | Entraînement | Athéna | ~30 000 |
| Training Analyse | `analyze_training` | Entraînement | Athéna | ~8 000 |
| Créer une séance | `sessionbuilder` | Entraînement | Athéna | ~8 000 |
| Analyser ma semaine | `analyser_semaine` | Entraînement | Athéna | ~8 000 |
| Analyser ma récupération | `analyser_recuperation` | Récupération | Athéna | ~8 000 |
| Analyser un test | `analyzetest` | Course | Athéna | ~8 000 |
| Recharge glucidique | `recharge` | Nutrition | Athéna | ~8 000 |
| Estimer mes zones | `estimer_zones` | Course | Athéna | ~8 000 |
| Conseils sommeil | `conseils_sommeil` | Récupération | Hermès | ~3 000 |
| Comprendre l'application | `app_guide` | Application | Hermès | ~3 000 |

### 4.6 Mémoire et règles — « Mes règles IA »
Source : table `ai_rules`, `RulesCard` (`src/app/profile/page.tsx`), `src/app/api/rule-helper/route.ts`.

- **Stockage** : `ai_rules` (`id, user_id, category, rule_text, active, created_at, updated_at`), RLS par user.
- **Catégories** (6) : Style de réponse, Entraînement, Santé, Nutrition, Organisation, Autre.
- **CRUD** : insert/select/toggle `active`/delete via hook `useAiRules`.
- **Aide IA** ✅ : `POST /api/rule-helper` (modèle Haiku) reformule l'intention et propose des suggestions avant création (`{ rule, suggestions[] }`).
- Les règles actives sont injectées dans les prompts système des flux chat.
- ⚠️ Mémoire conversationnelle longue (historique persistant des discussions) : table `ai_conversations` existe (0 ligne) — feature « mémoire chat » listée comme à venir dans les notes produit.

---

## 5. Système de tokens

### 5.1 Quotas par plan
Source : `src/lib/tokens/limits.ts` (`FALLBACK_LIMITS`) + table `token_plan_limits` (4 lignes seedées). Le code lit la DB, avec fallback codé en dur.

| Plan | Hebdomadaire* | 6h glissantes | Par requête |
|---|---|---|---|
| Trial | 50 000 | 15 000 | 8 000 |
| Premium | 250 000 | 60 000 | 15 000 |
| Pro | 750 000 | 150 000 | 25 000 |
| Expert | 2 000 000 | 350 000 | 50 000 |

> *Colonne DB nommée `monthly_tokens` mais libellée « Hebdomadaire » côté UI (reset aligné sur la période). Le **compte créateur** est forcé en limites Expert + bypass (cf. §6.4).

### 5.2 Packs achetables (top-up)
Source : `src/app/topup/shared.tsx`, `src/app/api/topup/create-checkout/route.ts`.

| Pack | Tokens | Prix | €/100k | Remise |
|---|---|---|---|---|
| Découverte (`discovery`) | 100 000 | 4,00 € | 4,00 | — |
| Performance (`performance`) | 500 000 | 15,00 € | 3,00 | −25 % |
| Elite (`elite`) | 1 000 000 | 25,00 € | 2,50 | −37 % |

### 5.3 Flow d'achat
1. **`POST /api/topup/request-link`** : l'utilisateur saisit son email → génération d'un `session_token` (hex 32 octets, expiration 24 h) en table `topup_sessions` → **email Resend** avec lien sécurisé `{TOPUP_BASE_URL}?session=…`. Expéditeur : `Hybrid Training <noreply@the-hybridway.com>` (le code ignore tout `RESEND_FROM` contenant `lavoiehybride`). Email premium personnalisé (logo, prénom via `profiles.full_name`, plan, solde restant).
2. **`POST /api/topup/verify-session`** : valide le token (existe, non expiré, non utilisé) → renvoie `{ user_id, plan, monthly, rolling_6h, bonus_tokens }`.
3. **`POST /api/topup/create-checkout`** : crée une ligne `token_purchases` (`status=pending`) + une **Stripe Checkout Session** (mode paiement one-shot), metadata `{ purchase_id, user_id, pack_id, tokens_amount }`.
4. **`POST /api/topup/webhook`** : sur `checkout.session.completed` → `token_purchases.status=completed`, **crédit** `user_token_wallet.bonus_tokens += tokens_amount`, marque la session `used_at`.

### 5.4 Multiplicateurs
Source : `src/lib/tokens/multipliers.ts`. Tokens pondérés = `ceil(raw × multiplicateur)`, stockés dans `token_usage` (`tokens_used` pondéré, `raw_tokens` brut, `multiplier`, `source: plan|bonus`).
- **Hermès ×1** (Haiku) · **Athéna ×3** (Sonnet) · **Zeus ×8** (Sonnet contexte max).
- Détection par nom (insensible casse) : hermes/haiku→1, athena/sonnet→3, zeus/opus→8 ; défaut ×3.

---

## 6. Abonnements

### 6.1 Plans disponibles
⚠️ **Incohérence détectée** entre deux définitions de prix :

**A. Page de facturation `src/app/settings/subscription/page.tsx`** (source réelle Stripe, cohérente avec l'en-tête de `tier-limits.ts` « €14/€26/€49 ») :
| Plan | Mensuel | Annuel | Équiv. mensuel annuel |
|---|---|---|---|
| Premium | 14 € | 132 € | 11 € |
| Pro | 26 € | 249 € | 20,75 € |
| Expert | 49 € | 468 € | 39 € |

**B. Modal « Upgrader » dans `src/app/profile/page.tsx`** (constante `PLANS`, valeurs divergentes) :
| Plan | Mensuel | Annuel | Remise affichée |
|---|---|---|---|
| Premium | 15 € | 129 € | −28 % |
| Pro | 29 € | 199 € | −43 % |
| Expert | 49 € | 349 € | −41 % |

**Limites de fonctionnalités par tier** (`tier-limits.ts`, soft caps) :
| Limite | Trial | Premium | Pro | Expert |
|---|---|---|---|---|
| Messages IA / mois | 30 | 30 | 100 | 300 |
| Messages / conversation | 15 | 15 | 25 | 50 |
| Plans entraînement / mois | 2 | 2 | 6 | 20 |
| Plans nutrition / mois | 1 | 1 | 3 | 10 |
| Actions outils / mois | 50 | 50 | 150 | 400 |
| Briefings / semaine | 4 | 4 | 7 | 7 |
| Recherche web (briefing) | ✗ | ✗ | ✓ | ✓ |
| Modèle | Hermès | Hermès | Athéna | Zeus |
| Historique | 6 mois | 6 mois | 24 mois | ∞ |
| Sync Strava / mois | 100 | 100 | ∞ | ∞ |
| Stockage | 1 Go | 1 Go | 5 Go | 20 Go |
| Compétences actives | — | 3 | 7 | 20 |

### 6.2 Période d'essai
- **Durée** : 14 jours · **Plan offert** : Premium (mêmes limites). Sans carte.
- ⚠️ **Relance email (J+X) & auto-expiration** : **🚧 spécifié** dans `PROMPT_TRIAL_MAIL_SYSTEM.md` (trigger signup, pg_cron 08:00, Edge Function `send-trial-expired-email`, downgrade Premium) **mais non déployé** dans le code. Le tier `trial` est stocké mais jamais auto-converti.

### 6.3 Flow de paiement (abonnements)
- **`POST /api/stripe/checkout`** : input `{ tier, billingPeriod }` → résout le Price ID `STRIPE_PRICE_{TIER}_{PERIOD}` → crée/retrouve le customer → Checkout Session (mode `subscription`, promo codes, locale `fr`). Retourne `{ url }`.
- **`POST /api/stripe/webhook`** (signature vérifiée) : `checkout.session.completed` (upsert `user_subscriptions`), `customer.subscription.updated` (recalcul tier/dates), `customer.subscription.deleted` (downgrade Premium + `canceled`), `invoice.payment_failed` (`past_due`).
- **`POST /api/stripe/portal`** : Billing Portal (moyen de paiement, factures, annulation fin de période).
- **`POST /api/subscription/cancel`** : `cancel_at_period_end=true` (accès maintenu jusqu'à `current_period_end`).
- **`GET /api/subscription/details`** : agrège Supabase + Stripe + limites tokens (plan, jauges, factures, moyen de paiement).
- **Renouvellements** : gérés par les webhooks Stripe (mise à jour `current_period_*`).

### 6.4 Compte créateur
Source : `src/lib/subscriptions/check-quota.ts` (`isCreatorAccount`).
- ✅ Existe : **allowlist email** (1 adresse, non divulguée ici), lookup caché via service client.
- **Comportement** : bypass de tous les quotas (tokens, messages, briefings, plans), forcé en **tier `expert`** (limites 2 000 000 / 350 000), `unlimited: true` dans le résumé d'usage. La consommation est loggée mais jamais rejetée.

---

## 7. Pages principales — détails

### 7.1 AI Coach (`src/components/ai/AIPanel.tsx`)
- **Composants** : champ de saisie (auto-grow, dictée vocale via Web Speech API), menu « + » (Compétences, Recherche, Recherche Web 🚧, Actions rapides), sélecteur de modèle, bulle des jauges de tokens (`TokenUsageBubble`), pills compétences actives (`ActiveCompetencesBadge`), historique de conversations.
- **Fonctionnalités** : streaming SSE (`/api/coach-stream`), actions rapides à modèle forcé, injection des règles IA, compétences actives, badges. Recherche web 🚧 (placeholder).
- **Interactions** : nouvelle conversation, sélection d'action rapide, changement de modèle, focus/recherche conv (Cmd/Ctrl+F).

### 7.2 Performance (`src/app/performance/page.tsx`)
- **Sous-sections** : Profil (benchmarks), Tests, Données (`DatasTab` — volumes mensuels par sport, records MMP), Courses (`RacesSection`), Climbs (`ClimbsSection`).
- **Tests** : table `test_definitions` (35 lignes). Bandeau tests Hyrox (Force, Endurance fonctionnelle, Explosivité), tests par sport (`PerformanceTestLevels`).
- **Scoring** : échelle 7 niveaux — Alien (10) → Elite (9) → AHN (8) → TBA (7) → BA (6) → Amateur (5) → Débutant (3), `scoreH()` (plus haut = mieux) / `scoreL()` (plus bas = mieux), seuils par genre. Tables `performance_scores`, `performance_tests`, `test_results` (0 ligne — non encore utilisées).
- **Profils benchmarks** (`athlete_performance_profile`, `athlete_sport_profile`) : FTP, poids, FC max/repos, LTHR, VMA, VO2max, allure seuil, CSS, + spécifiques run/bike/swim/hyrox.
- **Graphiques** : mini-radars par sport, jauge semi-circulaire de niveau, cartes stat → analyse IA (Managed Agent). Courbe MMP + records (page activités).

### 7.3 Planning (`src/app/planning/page.tsx`)
- **Vue Entraînement** (`TrainingTab`) : planning hebdo, séances, plan ; lit `?week=YYYY-MM-DD`.
- **Vue Semaine** (`WeekTab`) : vue hebdomadaire détaillée.
- **Sources** : hook `usePlanning` (tables `planned_sessions`, `planned_races`, `day_intensity`), zones (`useTrainingZones`).
- Navigation via `SectionLayout` (rail desktop + onglets mobile).

### 7.4 Calendar (`src/app/calendar/page.tsx`)
- **Sous-sections** : **Course** (`RaceTab`, table `planned_races`), **Pro** / **Perso** (`CategoryTab`, `calendar_events` filtrées par `category`), **Tout** (`AllTab`, fusion). Types d'événements `calendar_event_types` (catégorie pro/perso).
- **Vues** : mensuelle / annuelle (`AppleCalendarView`, `AnnualView`, `ClockView`). Modales `RaceModal`, `EventModal`, `DayModal`.
- Navigation via `SectionLayout`.

### 7.5 Données / Stats
- `/data` ⚠️ : redirige vers `/recovery`.
- `/recovery` ⚠️ : readiness, HRV, FC repos, fatigue/énergie/stress/motivation, sommeil (durée, score, REM/deep/light, hypnogramme), PMC (CTL/ATL/TSB — composant présent, données partiellement mock), tendances 7 jours, steps, body tracking. Composants dans `src/app/recovery/components/` (PmcChart, SleepHypnogram, RecoveryTrends, BodyTracking, DailyStepsCard, etc.).
- **Sources** : Strava (connecté), Polar/Withings (santé via `health_data`, `metrics_daily`, `body_weight`).

### 7.6 Mon Profil (`src/app/profile/page.tsx`)
- **Sous-sections** (via `SectionLayout`, deep-link `?tab=`) : **Profil** (identité + Matériel : vélos/chaussures + stats via `user_bikes`/`user_running_shoes`/`gear`), **Notifications**, **Réglages IA** (Modèles, Abonnement — bottom sheets ; Mes compétences ; Comportement ; Modèle par défaut ; Police du chat ; Mes règles IA ; Connexion aux données).
- **Données stockées** : `profiles`, `user_settings` (préférences IA dont `ai_web_search_default`), `ai_rules`, `user_competences`, `user_notification_preferences`.

### 7.7 Compétences (`src/app/competences/page.tsx`)
- Bibliothèque de 70 compétences, filtres par sport + catégorie, sidebar sport, modal détail (philosophie, règles, exclusions, adaptations). Activation limitée par plan.

### 7.8 Autres pages
- `/record` ✅ : enregistrement multi-sports (cyclisme, course, trail, rando, MTB, natation, rowing, ski, yoga, padel, eau libre, home trainer, muscu, hyrox) + GPS.
- `/session` ✅ : builder de séance (library/build/execute), muscu (circuits/EMOM/superset) + endurance (intervalles par zone).
- `/injuries` ✅ : mapper 3D du corps, type (douleur/gêne/blessure), intensité, contexte, statut, historique + analyse IA.
- `/questionnaire` ✅ : formulaire d'inscription coaching (externe), statut (nouveau/en_cours/accepté/refusé).
- `/briefing` ✅ : briefing du jour (séance, tâches, news créateur) généré par IA (`/api/briefing`).
- `/athletes` ⚠️ : dashboard coach multi-athlètes (données mock ; tables `managed_athletes`/`athlete_messages` à 0 ligne).
- `/admin/marketing` ⚠️ : créateur only (gate email), génération d'idées, briefs, sync Instagram, analyse perf.
- `/access-expired` ✅ · `/legal/cgu` & `/legal/privacy` 🚧.

---

## 8. Intégrations externes

Tokens OAuth stockés dans **`oauth_tokens`** (`user_id, provider, access_token, refresh_token, expires_at, provider_user_id, scope, provider_data, is_active, last_used_at`). Routes génériques : `/api/oauth/{connect,callback,status,disconnect}` + `/api/sync/[provider]`. Logs : `sync_logs`.

| Provider | OAuth | Sync | Webhooks | Statut |
|---|---|---|---|---|
| Strava | ✅ | Activités + streams | ✅ push | ✅ Actif |
| Polar | ✅ (v4) | Physio, sommeil, HRV, daily, exercices | ❌ | ✅ Actif |
| Wahoo | ✅ | Workouts | ❌ | ✅ Actif |
| Withings | ✅ | Poids/corps, sommeil, activité | ❌ | ✅ Actif |
| Instagram | ❌ (token direct) | Graph API insights | ❌ | ✅ (marketing, créateur) |
| Garmin, Suunto, Coros, Zwift, Whoop, Oura, Apple Health, … (~47) | ❌ | ❌ | ❌ | 🚧 « en cours » (UI) |

### 8.1 Strava ✅
- OAuth scope `read,activity:read_all,profile:read_all` (`src/lib/oauth/config.ts`).
- Sync activités (`src/lib/sync/strava.ts`) : backfill + incrémental, jusqu'à 200/page, champs (titre, sport, distance, dénivelé, vitesse, watts, kJ, FC, cadence, calories, suffer/tss, trainer, commute, temp, is_race), gestion 429.
- Streams (9 types : time, distance, altitude, heartrate, velocity_smooth, watts, cadence, temp) pour activités <90 j + courses. Backfill temp.
- **Webhooks** : `/api/strava/webhook` (challenge GET + push POST → fetch détail+streams → upsert), `/api/strava/webhook-subscribe` (setup admin).
- Routes : activities, streams, stats, import-history, activity-laps, sync-maps (polylines), upload-activity (GPX depuis GPS navigateur), disconnect.
- ⚠️ `src/lib/sync/strava.ts` : fichier protégé (ne pas modifier sans demande explicite — règle projet).

### 8.2 Polar ✅ (AccessLink v4 « Dynamic API »)
- OAuth scope `nightly_recharge:read sleep:read daily_activity:read exercise:read physical_information:read`. Échange token en Basic Auth, user id via `id_token.sub`.
- Sync (`src/lib/sync/polar.ts`, helper `src/lib/polar.ts` `callPolarV4`) : physical-information (FC repos/max, poids, taille, VO2max), sleeps (chunks 30 j), nightly-recharge (HRV rmssd, chunks 28 j → `health_data` data_type='hrv'), daily-activity (steps/calories), exercises (activités, dédup ±5 min).
- Diagnostics : `GET /api/sync/polar?live=1` / `?debug=1`.
- ⚠️ Migration v3→v4 : la page connexions détecte les anciens tokens v3 (scope) → badge « Reconnecter v4 ».

### 8.3 Wahoo ✅
- OAuth scope `user_read workouts_read`. Sync workouts (`src/lib/sync/wahoo.ts`, API `api.wahooligan.com/v1`) : name, type, durée, distance, ascent, vitesse, power avg/max/NP, kJ, FC avg/max, calories. Incrémental.

### 8.4 Withings ✅
- OAuth scope `user.info,user.metrics,user.activity` (action `requesttoken` non standard). Sync (`src/lib/sync/withings.ts`) : body metrics (poids, %masse grasse, masse musculaire, %eau, IMC → `health_data`), sommeil, activités (steps/distance/calories/FC → `activities` sport_type='other'). Fenêtre 30 j.

### 8.5 Autres apps (UI seulement)
La page `/connections` affiche ~51 apps groupées (Entraînement, Récupération & Santé, Balance & Corps, Nutrition, Biométrie, Sommeil). Seules Strava/Polar/Wahoo/Withings sont connectables ; les ~47 autres (Garmin, Suunto, Coros, Zwift, Whoop, Oura, Apple Health, Google Fit, Fitbit, MyFitnessPal, Stryd, Dexcom, etc.) sont `provider=null` → **🚧 « en cours d'intégration »** (bouton désactivé).

### 8.6 Instagram / Marketing ✅ (créateur)
- Pas d'OAuth — token direct `INSTAGRAM_ACCESS_TOKEN` (Graph API v21). `src/lib/marketing/*` : insta-sync (profil, médias, insights → `instagram_insights_snapshots`), insta-upload (captures → Claude Vision), analyze-performance (Claude → `marketing_performance_analyses`), daily-brief, ideas. Réservé au compte admin/créateur.

---

## 9. Notifications

Source : table `user_notification_preferences`, `/api/notifications/preferences`, UI `NotificationsBloc` (`src/app/profile/page.tsx`).

- **Système actuel** : ⚠️ **préférences UI uniquement** (stockage des choix). Pas d'envoi push ni email transactionnel branché sur ces préférences (le seul email réel implémenté est le lien de recharge tokens via Resend).
- **Stockage** : `user_notification_preferences` (`user_id`, `global_enabled`, `preferences` JSONB), RLS + trigger, upsert (merge) via `GET`/`PATCH`.
- **UI** : 9 catégories / 42 toggles, interrupteur global, optimistic + rollback.
- Champs legacy dans `user_settings` : `notif_morning_check`, `notif_session_reminder`, `notif_weekly_recap` (booléens).

---

## 10. Base de données Supabase

88 tables dans le schéma `public`. **RLS activé sur 100 % des tables**. Principales par domaine (row counts au 2026-06-03 entre parenthèses) :

**Identité / réglages** : `profiles` (1), `user_settings` (1, +préfs IA), `user_sections` (6), `sport_page_configs` (6), `running_settings` (1), `athlete_sports` (3), `athlete_sport_profile` (1), `athlete_performance_profile` (1).

**Activités / sync** : `activities` (1405 ; colonnes clés `streams`/`raw_data`/`power_curve`/`pace_curve`/`laps` JSONB, watts/hr/cadence, etc.), `activity_splits` (0), `oauth_tokens` (4), `sync_logs` (544), `parcours` (42), `routes` (1), `workout_sessions` (3).

**Planning / calendrier** : `planned_sessions` (59), `planned_races` (12), `day_intensity` (38), `week_tasks` (26), `daily_tasks` (14), `daily_subtasks` (0), `calendar_events` (5), `calendar_event_types` (1), `session_library` (3), `session_templates` (0), `session_favorites` (1), `training_plans` (2), `training_plan_messages` (36).

**Performance / records** : `personal_records` (43), `performance_records` (10), `performance_tests` (0), `performance_scores` (0), `test_definitions` (35), `test_results` (0), `climb_records` (16), `race_records` (1), `race_results` (0), `race_events` (2), `race_files` (0), `race_event_files` (1), `hyrox_races` (0), `training_zones` (8), `athlete_zones` (0).

**Santé / récup** : `health_data` (11), `metrics_daily` (1), `recovery_daily_logs` (0), `daily_checkin` (1), `body_weight` (1), `body_measurements` (5), `hydration` (1), `pain_log` (0), `injuries` (0).

**Nutrition** : `nutrition_logs` (0), `nutrition_meal_logs` (24), `nutrition_daily_logs` (1), `nutrition_plans` (1), `nutrition_plan` (0), `nutrition_meal_templates` (1), `nutrition_saved_meals` (0), `nutrition_weight_logs` (3), `nutrition_habits` (1).

**IA / coaching** : `ai_rules` (1), `ai_conversations` (0), `competences` (70), `user_competences` (4), `daily_briefing` (1), `athlete_questionnaires` (1), `activity_feedback` (1).

**Tokens / abonnements** : `token_plan_limits` (4), `user_token_wallet` (0), `token_usage` (0), `topup_sessions` (7), `token_purchases` (3), `user_subscriptions` (1), `usage_logs` (98).

**Coach / multi-athlètes** : `managed_athletes` (0), `athlete_messages` (0).

**Notifications / matériel** : `user_notification_preferences` (1), `user_bikes` (0), `user_running_shoes` (0).

**Marketing** : `marketing_briefs` (3), `marketing_raw_ideas` (0), `marketing_posts` (0), `marketing_insta_snapshots` (0), `instagram_insights_snapshots` (2), `marketing_performance_analyses` (1).

> ⚠️ **Schéma vs code** : `activities` **n'a pas** de colonnes `records_processed` / `records_beaten` (migration non appliquée sur thw-v2) → le pipeline auto-records (`/api/activities/{process,backfill}-records`) est inopérant (0 record `event_type=auto_session`). Les 43 records sont saisis manuellement. Triggers connus : création auto `user_settings`, `user_token_wallet`, `user_notification_preferences`.

---

## 11. Routes API

64 routes sous `src/app/api/`. Auth = session Supabase requise sauf webhooks (signature) / endpoints publics.

### IA / Coaching
| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/coach-stream` | Chat coach streaming (SSE) + parseur de séance | ✅ |
| POST | `/api/coach-engine` | Orchestrateur 8 actions (non-stream) | ✅ |
| POST | `/api/performance-agents` | Managed Agent perf (analyse profil/test/data) | ✅ |
| POST | `/api/training-plan` | Génération de plan (Managed Agent + fallback) | ✅ |
| POST | `/api/nutrition-plan` | Plan nutritionnel | ✅ |
| POST | `/api/session-builder` | Construction de séance | ✅ |
| POST | `/api/analyze-training` · `/api/analyze-planning` · `/api/analyze-test` | Analyses | ✅ |
| POST | `/api/weakpoints` · `/api/recharge-stream` · `/api/yoga-tip` | Analyses/conseils | ✅ |
| POST | `/api/ai-analysis` · `/api/competences-ai` · `/api/rule-helper` | IA diverses / règles | ✅ |
| POST | `/api/estimate-meal-macros` · `/api/analyze-meal-photo` · `/api/nutrition-weekly-summary` | Nutrition IA | ✅ |
| POST | `/api/briefing` · `/api/briefing/generate` | Briefing du jour | ✅ |
| POST | `/api/questionnaire` · `/api/parse-course-file` · `/api/parse-activity-file` · `/api/parcours` | Parsing / questionnaire | ✅ |

### Tokens / Paiement
| Méthode | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/tokens/limits` | Limites + usage tokens | ✅ |
| GET | `/api/user/ai-settings` · PATCH | Préférences IA (web search) | ✅ |
| POST | `/api/topup/request-link` | Email lien recharge (Resend) | public (email) |
| POST | `/api/topup/verify-session` | Validation token + solde | token |
| POST | `/api/topup/create-checkout` | Stripe Checkout one-shot | token |
| POST | `/api/topup/webhook` | Crédit wallet (Stripe) | signature |
| POST | `/api/stripe/checkout` | Abonnement Checkout | ✅ |
| POST | `/api/stripe/portal` | Billing Portal | ✅ |
| POST | `/api/stripe/webhook` | Events abonnement | signature |
| POST | `/api/subscription/cancel` | Résiliation fin période | ✅ |
| GET | `/api/subscription/details` · `/api/subscriptions/summary` | Détails/usage abonnement | ✅ |

### Intégrations / Sync
| Méthode | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/oauth/connect` · `/api/oauth/callback` · `/api/oauth/status` · POST `/api/oauth/disconnect` | OAuth générique | ✅ |
| GET/POST | `/api/sync/[provider]` | Sync strava/polar/wahoo/withings | ✅ |
| GET | `/api/auth/strava/connect` · `/api/auth/strava/callback` | OAuth Strava dédié | ✅ |
| GET | `/api/strava/{activities,streams,stats,connected,import-history,activity-laps,sync-maps}` | Données Strava | ✅ |
| POST | `/api/strava/{upload-activity,webhook-subscribe,disconnect}` · GET/POST `/api/strava/webhook` | Strava actions/webhook | mixte |
| GET/POST | `/api/activities` · `/api/activities/process-records` · `/api/activities/backfill-records` | Activités + records (⚠️ records inopérant) | ✅ |
| POST | `/api/gear` (GET/POST/DELETE) | Matériel (vélos/chaussures) | ✅ |
| GET/PATCH | `/api/notifications/preferences` | Préférences notifs | ✅ |

### Marketing (créateur)
| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/marketing/{daily-brief,ideas,insta-sync,insta-upload,analyze-performance}` | Marketing/Instagram | admin |

---

## 12. Variables d'environnement
(noms uniquement, aucune valeur)

- **Supabase** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **App** : `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_SITE_URL`, `NEXT_PUBLIC_ADMIN_EMAIL`, `ADMIN_EMAIL`, `CREATOR_USER_ID`, `TOPUP_BASE_URL`, `NODE_ENV`
- **IA** : `ANTHROPIC_API_KEY`, `ANTHROPIC_ENVIRONMENT_ID`
- **Stripe** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TOPUP_WEBHOOK_SECRET`, `STRIPE_PRICE_{PREMIUM,PRO,EXPERT}_{MONTHLY,YEARLY}` (6)
- **Email** : `RESEND_API_KEY`, `RESEND_FROM`, `EMAIL_LOGO_URL`
- **Strava** : `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `STRAVA_API_BASE`, `STRAVA_WEBHOOK_VERIFY_TOKEN`
- **Wahoo** : `WAHOO_CLIENT_ID`, `WAHOO_CLIENT_SECRET`, `WAHOO_REDIRECT_URI`
- **Polar** : `POLAR_CLIENT_ID`, `POLAR_CLIENT_SECRET`, `POLAR_REDIRECT_URI`
- **Withings** : `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET`, `WITHINGS_REDIRECT_URI`
- **Cartes** : `NEXT_PUBLIC_MAPBOX`, `NEXT_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_ORS_KEY`
- **Marketing** : `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- **Divers** : `QUESTIONNAIRE_API_KEY`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`

---

## 13. Branding et thème

- **Couleur principale** : cyan **#06B6D4** (`--primary`). Accent IA violet **#9D7DFF**.
- **Couleurs sport** (immuables) : run `#f97316`, bike `#3b82f6`, swim `#06b6d4`, gym `#8b5cf6`, hyrox `#ec4899`, rowing `#14b8a6`.
- **Couleurs zones** : Z1 `#9ca3af`, Z2 `#22c55e`, Z3 `#eab308`, Z4 `#f97316`, Z5 `#ef4444`.
- **Thème jour/nuit** : hook custom `useTheme` (`src/hooks/useTheme.ts`), localStorage `thw-theme`, défaut **dark**, auto-reset après 4 h. (`next-themes` est en dépendance mais non utilisé pour ce système.)
  - Dark : `--bg #080A0F`, `--bg-card #0F1117`, `--text #EEF2F7`, `--border #1E2533`.
  - Light : `--bg #ffffff`, `--bg-card #ffffff`, `--text #0d1117`, `--border rgba(0,0,0,0.07)`.
- **Polices** : **Syne** (700/800 titres), **DM Sans** (corps), **DM Mono** (data). + Nunito, Barlow Condensed, Bebas Neue, Roboto Mono.
- **Layout** : `--nav-w 220px`, `--header-height 56px`, safe-area insets.
- **Logos** (`public/`) : `branding/logo-thw-{light,dark,original}.png`, `logo.png` (favicon), `logos/logo_{3,4,6}bras.png`, `logos/logo_app.png`, `logos/apps/*.png` (logos intégrations).

---

## 14. Sécurité et confidentialité

- **RLS Supabase** : ✅ activé sur **100 %** des 88 tables `public` (isolation par `user_id`). Service-role utilisé côté serveur pour les opérations privilégiées (webhooks, sync).
- **Auth** : Supabase Auth (email vérifié, OAuth Google/Apple). Middleware contrôle auth + abonnement + onboarding.
- **Mot de passe** : barre de force sur `/auth` (politique exacte non centralisée — gérée par Supabase Auth).
- **Secrets** : clés via env (jamais en clair côté client hors `NEXT_PUBLIC_*`). Webhooks Stripe à signature vérifiée.
- **RGPD** : ⚠️ **partiel** — cases consentement CGU/confidentialité à l'inscription ; pages `/legal/cgu` et `/legal/privacy` sont 🚧 des placeholders « en cours de rédaction ». **Export / suppression de données utilisateur : 🚧 non trouvés dans le code.**

---

## 15. Build et déploiement

- **Hosting** : **Vercel** (branche `main` → déploiement auto). Domaine app `thw-appli.vercel.app`.
- **PWA** : `@ducanh2912/next-pwa` (manifeste/installable).
- **Scripts** : `dev` / `build` (`next build`) / `start` / `lint` (`next lint`).
- **CI/CD** : pas de workflow GitHub Actions dédié repéré ; déploiement piloté par Vercel sur push `main`. (Variables `GITHUB_*` présentes pour usage applicatif, pas CI.)
- **Statut dernier déploiement** : non déterminable depuis le code (voir tableau de bord Vercel).

---

## Annexe — zones d'ombre & questions au PO

### Sections les mieux documentées (haute confiance)
- ✅ Tokens (quotas, packs, multiplicateurs, flow) — valeurs lues en code + DB.
- ✅ Intégrations Strava/Polar/Wahoo/Withings (scopes, champs, webhooks).
- ✅ Coach IA (modèles, multiplicateurs, 14 actions rapides, compétences, règles).
- ✅ Base de données (88 tables, RLS, row counts réels).
- ✅ Auth, branding/thème, routes API.

### Zones d'ombre / incohérences à clarifier
1. **Prix des plans divergents** : `settings/subscription` (14/26/49 €, annuel 132/249/468) vs modal `profile` (15/29/49 €, annuel 129/199/349). Laquelle fait foi ? (la première est cohérente avec Stripe / `tier-limits.ts`).
2. **Quota « hebdomadaire » vs colonne `monthly_tokens`** : libellé UI « hebdomadaire » mais colonne/logique nommée « monthly ». Période de reset réelle à confirmer.
3. **Records de puissance auto** : colonnes `activities.records_processed`/`records_beaten` absentes en base → pipeline backfill inopérant (0 record auto). Appliquer la migration ou retirer la feature ?
4. **Recherche web chat** : préférence stockée mais bouton « Recherche Web » du chat = placeholder inactif. Activer côté chat ?
5. **Période d'essai** : tier `trial` stocké mais ni auto-expiration ni emails de relance (spécifiés dans `PROMPT_TRIAL_MAIL_SYSTEM.md`, non déployés). Déployer ?
6. **Notifications** : UI + stockage des préférences uniquement — aucun canal d'envoi (push/email) branché. Quel canal cible ?
7. **PMC / Récupération** : composants CTL/ATL/TSB présents mais données partiellement mock ; `/data` redirige vers `/recovery`. Statut visé ?
8. **Multi-athlètes (coach)** : `/athletes` + tables `managed_athletes`/`athlete_messages` à 0 ligne (mock). Roadmap ?
9. **Légal/RGPD** : CGU + confidentialité = placeholders ; pas d'export/suppression de données. Conformité à finaliser.
10. **Deux jeux d'agents** : Managed Agents Anthropic (performance + training-plan) **et** orchestrateur local 8 actions. Lequel est canonique selon le flux ?

### Questions à poser au product owner
- Quelle grille tarifaire est officielle (corriger l'autre) ?
- Le reset des tokens est-il hebdomadaire ou mensuel (aligner libellé/colonne) ?
- Faut-il activer le pipeline records auto (migration) et la recherche web dans le chat ?
- Les emails de relance d'essai et un canal de notifications (push/email) sont-ils prioritaires ?
- Le module coach multi-athlètes et les pages légales sont-ils dans la roadmap court terme ?
