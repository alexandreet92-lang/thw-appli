# Dashboard — Modèle 1 (proposition page d'accueil)

> **Statut : lecture seule / investigation.** Aucun code modifié, aucun commit, aucun push.
> Rapport établi à partir du code (`src/`) et d'une inspection directe de la base
> Supabase active (`thw-v2` / `sfrcnyzntgrxlwlmwifi`).

## Avertissement sur les chiffres de « disponibilité »

La base active est aujourd'hui **mono-utilisateur** (`profiles` = 1 ligne, le compte
créateur `alexandre.et92@gmail.com`). Les volumes ci-dessous reflètent donc **les données
du compte créateur**, pas une moyenne d'utilisateurs réels. La distinction utile est :
**l'infrastructure existe-t-elle ET est-elle alimentée régulièrement ?**

Légende dispo : **OK** = donnée présente et fraîche · **PARTIELLE** = table alimentée mais
trous / données périmées / source intermittente · **VIDE** = table vide ou non calculée
aujourd'hui (l'infra peut exister).

---

## 1. Modules proposés pour la page d'accueil

Intention : **léger, lisible d'un coup d'œil, peu technique**. Répond à 4 questions —
*comment je vais ? je fais quoi aujourd'hui ? suis-je dans les clous cette semaine ?
qu'est-ce qui arrive ?* — et expose abonnement + jauges IA. Les analyses poussées
restent sur leurs pages dédiées ; le Dashboard **renvoie** vers elles.

| Module | Ce qu'il affiche (niveau utilisateur) | Hook / Table(s) | Dispo aujourd'hui ? | Renvoie vers (au tap) |
|---|---|---|---|---|
| **0. En-tête** | Salutation + date du jour + avatar/prénom | `useProfile` → `profiles` | **OK** | `/profile` |
| **1. Comment je vais aujourd'hui ? (Forme du jour)** | Une pastille « forme » + 2-3 chiffres simples : énergie/fatigue ressentie, sommeil, HRV. Bouton « Faire mon check-in » si pas rempli | `daily_checkin` (subjectif) + `health_data` (HRV/sommeil, via sync) ; pas de hook dédié — requête directe | **PARTIELLE** — `daily_checkin` = 1 ligne, dernière le **2026-05-19** (pas de check-in « du jour ») ; `health_data` = 11 lignes (HRV/sleep), dernière **2026-05-22**, source intermittente (Polar/Withings). Aucun « score de forme » auto-calculé n'est stocké | `/recovery` |
| **2. Je fais quoi aujourd'hui ? (Séance du jour)** | Carte séance planifiée du jour : sport, titre, durée, intensité, TSS, notes — ou « Jour de repos » | Requête directe (logique identique à `/briefing`) → `planned_sessions` filtré `week_start`+`day_index`+`status='planned'` | **OK** — 58 séances dont **6 futures** ; structure riche (blocks, intensité, tss) | `/planning` (ou page séance dédiée) |
| **3. Tâches du jour** | Check-list des tâches du jour (entraînement annexe, admin), cochables | `usePlanning` → `week_tasks` (`week_start`+`day_index`) | **OK** — 26 lignes | `/planning` ou `/briefing` |
| **4. Suis-je dans les clous cette semaine ?** | Résumé hebdo *léger* : séances faites / prévues, volume (h ou km), nb jours d'intensité prévus | `usePlanning` → `planned_sessions` + `day_intensity` ; réalisé via `activities` (semaine courante) | **OK (réalisé/prévu)** — `planned_sessions` OK, `day_intensity` = 42 lignes OK, `activities` = 1412 OK. ⚠ pas de notion de « charge cible » fiable (voir §3) | `/planning` puis `/training` |
| **5. Dernière activité** | Mini-carte de la dernière sortie : sport, date, distance/durée, charge | `useStrava` / requête `activities` (dernière ligne) | **OK** — 1412 activités | `/activities/[id]` (détail) |
| **6. Qu'est-ce qui arrive ? (Prochaine compétition)** | Compte à rebours vers la prochaine course : nom, date, J-x, objectif | `usePlanning` → `planned_races` (date ≥ aujourd'hui) | **OK** — 12 courses dont **9 futures**, prochaine **2026-06-27** | `/planning` / page compétition |
| **7. Charge & forme (mini, optionnel)** | Indicateur très simplifié « frais / chargé / en forme » (TSB) + flèche vers le PMC complet | `metrics_daily` (`ctl`/`atl`/`tsb`) | **VIDE** — table = 1 ligne (2026-05-19) et **aucun calcul EWMA/CTL n'existe dans le code** (cf. `CLAUDE.md` : « CTL/ATL/TSB : pas encore commencé »). À ne PAS afficher tant que non branché | `/training` (PMC) |
| **8. Abonnement + jauges IA** | Badge du plan (Premium/Pro/Expert) + jauges de consommation IA (hebdo, 6h, bonus) | `/api/tokens/limits` (`getUserTokenLimits`) + `/api/subscriptions/summary` (`getUsageSummary`) — voir §2 | **PARTIELLE** — plan **OK** (`user_subscriptions` = premium/active) ; jauges *tokens* basées sur `token_usage` = **VIDE** (0 ligne) → afficheraient 0 % ; jauges *quota messages* basées sur `usage_logs` = **OK** (99 lignes) | `/settings/subscription` |
| **9. Records récents (optionnel, léger)** | 1-2 PR récents (« nouveau record 10 km ! ») en format félicitation, pas tableau | `useRecords` → `personal_records` | **OK** — 116 PR | `/performance` / `/record` |
| **10. Actions rapides** | Boutons : Coach IA, Analyser une activité, Créer un plan, Check-in (cf. backlog Notion) | navigation pure | **OK** (navigation) | `/session` (coach), `/activities`, `/planning` |
| **11. Briefing « Actu du jour »** | *Volontairement EXCLU du dashboard athlète* | `daily_briefing` | **PARTIELLE + créateur-only** — table = 1 ligne (2026-04-24) ; section réservée au créateur (`CREATOR_USER_ID`), c'est un fil d'actu marketing, **pas** une feature athlète | — (reste sur `/briefing`) |

**Modules retenus pour un Modèle 1 « léger »** : 0, 1, 2, 3, 4, 5, 6, 8 + (9 et 10 si place).
Modules 7 et 11 mis de côté tant que la donnée n'est pas branchée / pertinente.

---

## 2. Abonnement & système IA (existant précis)

### Type d'abonnement
- **Table** : `user_subscriptions` (1 ligne aujourd'hui).
- **Champs clés** : `tier`, `status`, `current_period_start/end`, `stripe_customer_id`,
  `stripe_subscription_id`, `cancel_at_period_end`, `trial_started_at`, `trial_ends_at`.
- **Valeurs `tier`** : `trial | premium | pro | expert` (déf. dans
  `src/lib/subscriptions/tier-limits.ts`). Prix : Premium 14 €, Pro 26 €, Expert 49 €/mois.
- **Valeurs `status`** : `active`, `trialing`, … (alimenté par les **webhooks Stripe**,
  `src/app/api/stripe/webhook`).
- **Lecture** : `getUserTier(userId)` → défaut `premium` si pas d'abo actif. Le compte
  créateur est forcé en **expert / illimité** via `isCreatorAccount()` (détection par email,
  `CREATOR_EMAILS`).
- **Exposé via** : `/api/subscriptions/summary` et `/api/subscription/details` (ce dernier
  agrège aussi Stripe : prochaine facture, montant, moyen de paiement, factures).
- État actuel : **premium / active** → **OK et affichable**.

### Deux systèmes de quotas IA coexistent (point important)

**A. Quotas par compteur d'actions — `usage_logs` (ALIMENTÉ)**
- Table `usage_logs` (99 lignes, type `message`), un log par action IA.
- Logique : `src/lib/subscriptions/check-quota.ts` (`checkQuota`, `getUsageSummary`, `logUsage`).
- Types comptés : `message`, `plan_generation`, `tool_use`, `briefing`, `nutrition_plan`,
  `micro_agent` (cumulé avec `message`).
- Fenêtres : **mensuelle** (1ᵉʳ du mois) pour tout, **hebdomadaire** (7 j glissants) pour le briefing.
- Limites par tier (`TIER_LIMITS`) : ex. messages/mois 30 (premium) / 100 (pro) / 300 (expert).
- Écrivains réels : `coach-stream`, `briefing/generate`, `performance-agents`,
  `recharge-stream`, `ai-analysis`, `competences-ai`, `quota-middleware`.
- **Affichable aujourd'hui** : oui (page `/settings/subscription` consomme `/api/subscriptions/summary`).

**B. Jauges de tokens pondérés — `token_usage` (VIDE aujourd'hui)**
- Tables : `token_usage` (**0 ligne**), `token_plan_limits` (4 lignes, par plan),
  `user_token_wallet` (**0 ligne** → bonus = 0).
- Logique : `src/lib/tokens/limits.ts` (`getUserTokenLimits`, `recordTokenUsage`, `consumeTokens`).
- **3 jauges** affichées (`TokenUsageBubble`, page profil, `/settings/subscription`) :
  - **Mensuelle/hebdo** : conso `source='plan'` depuis `current_period_start`, reset `+7 j`.
  - **6 h glissantes** : conso toutes sources sur fenêtre `SIX_HOURS_MS`.
  - **Bonus** : `user_token_wallet.bonus_tokens` (rechargeable via top-up Stripe).
  - + plafond **par requête** (`per_request_tokens`).
- **Multiplicateurs modèle** (`src/lib/tokens/multipliers.ts`) : on stocke des tokens
  *pondérés* = tokens réels × multiplicateur :
  - **Hermès** (Haiku) = **×1**
  - **Athéna** (Sonnet) = **×3**
  - **Zeus** (Opus/Sonnet contexte max) = **×8**
  - `raw_tokens` (réel) et `tokens_used` (pondéré) + `multiplier` sont stockés séparément.
- Limites par plan (`token_plan_limits`, fallback codé) : monthly / rolling_6h / per_request,
  ex. premium 250k / 60k / 15k · pro 750k / 150k / 25k · expert 2M / 350k / 50k.
- Écrivain réel : **uniquement `coach-stream`** (`consumeTokens`/`recordTokenUsage`).
- **Affichable aujourd'hui** : l'infra et l'UI existent, mais comme `token_usage` est **vide**,
  les jauges montrent **0 % consommé** (et bonus = 0). Donc *affichables mais non significatives*
  tant que le coach n'a pas généré de conso dans cette base.

> **Recommandation Dashboard** : pour le badge plan → fiable (système A + `user_subscriptions`).
> Pour la jauge IA visible sur l'accueil, le **système A (`usage_logs`, ex. « 12 / 30 messages »)**
> est le plus représentatif aujourd'hui ; le système B (tokens Hermès/Athéna/Zeus) est plus fin
> mais actuellement à zéro.

---

## 3. Ce qui est ABSENT, vide ou non branché aujourd'hui (le plus utile)

- **PMC / Charge d'entraînement (CTL/ATL/TSB)** — **non calculé**. La table `metrics_daily`
  a les colonnes (`ctl`, `atl`, `tsb`, `tss_day`…) mais **1 seule ligne (2026-05-19)** et
  **aucun code de calcul EWMA** dans `src/lib` (confirmé par `CLAUDE.md`). → Tout module
  « forme/charge » chiffré est **prématuré**.
- **Récupération structurée — `recovery_daily_logs` = VIDE (0 ligne)**. La page `/recovery`
  lit cette table : elle est donc à sec. Le seul ressenti disponible est `daily_checkin`
  (1 ligne, périmée).
- **Sommeil / HRV / health_data — PARTIEL & périmé**. 11 lignes (hrv, sleep), dernière
  **2026-05-22**. Dépend d'une connexion Polar/Withings/Wahoo active ; intermittent.
  Pas de garantie de donnée « du jour ». `activity_splits`, `athlete_zones`, `race_results`
  = vides.
- **Jauges de tokens (système B) — `token_usage` & `user_token_wallet` VIDES**. Les jauges
  Hermès/Athéna/Zeus afficheraient 0. Bonus tokens = 0.
- **Nutrition — partiel** : `nutrition_meal_logs` 24, `nutrition_daily_logs` 1,
  `nutrition_logs`/`nutrition_plan` vides. Pas assez pour un module « du jour » fiable.
- **Briefing « Actu du jour » (`daily_briefing`)** : 1 ligne, **2026-04-24**, et
  **créateur-only** — ce n'est pas une donnée athlète généralisable ; à ne pas mettre sur
  l'accueil athlète.
- **`metrics_daily` n'a pas d'écrivain de calcul** : il est seulement *lu* (recovery,
  activities, AIPanel) et partiellement écrit par `polar.ts` — donc non fiable comme source
  de KPI d'accueil.

### Synthèse « ce sur quoi on peut bâtir l'accueil dès maintenant »
**Solide (OK)** : séance du jour (`planned_sessions`), tâches (`week_tasks`),
semaine prévue (`day_intensity`), activités/dernière sortie (`activities`),
prochaine compétition (`planned_races`), records (`personal_records`),
plan d'abonnement (`user_subscriptions`), quota messages (`usage_logs`).

**Fragile/à éviter pour des chiffres** : forme du jour (check-in/HRV périmés),
PMC/charge (non calculé), jauges tokens (vides), récupération (`recovery_daily_logs` vide),
nutrition.
