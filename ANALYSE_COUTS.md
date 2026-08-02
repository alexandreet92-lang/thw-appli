# ANALYSE DE COÛT RÉEL & MARGE — THW Coaching

> Analyse produite à partir de la **logique réelle du code** (fichiers cités). Les tarifs des fournisseurs sont
> sourcés (voir §Tarifs sourcés). Les **volumes réels** (taux de consommation des quotas, mix entre tiers,
> factures effectives) sont **inconnus** : ils sont signalés `[À MESURER]` et remplacés par des fourchettes.
>
> Hypothèse de change utilisée : **1 USD ≈ 0,93 €** (les API sont facturées en USD). Convertir avec le taux du jour.
>
> ⚠️ **Note sécurité (hors chiffres)** : `CLAUDE.md` contient en clair un token Meta/Instagram, un `client_secret`
> Facebook et une clé secrète. Ces secrets sont versionnés dans le repo → **à révoquer et sortir du dépôt**
> (variables d'environnement). Sans lien avec le coût, mais critique.

---

## 0. TL;DR (verdict)

| Question | Réponse courte |
|---|---|
| Les prix couvrent-ils les coûts ? | **Oui, largement**, en usage typique (marge 82–92 % sur tous les tiers). Le seul point fragile est **Expert en usage "power-user" pire cas** (marge pouvant tomber à ~20–40 %). |
| Marge réelle vs 70–80 % annoncés ? | En **usage typique la marge est plutôt 82–92 %** (donc *meilleure* qu'annoncé). Le 70–80 % correspond en fait à un **pire cas modéré**. L'écart vient de coûts oubliés (web_search, TTS, Stripe, pire cas Expert) — voir §Q2. |
| Bascule 34 % & seuil TVA ? | Le ratio charges/CA reste **~10–14 %** en usage typique → le **34 % n'est jamais atteint** par l'exploitation. La contrainte réelle est le **seuil TVA (37 500 €/an ≈ 163 abonnés)** puis le **plafond micro-BNC (77 700 €/an ≈ 337 abonnés)**. |

---

## Étape 1 — Cartographie des appels IA (poste décisif)

### 1.1 Les trois modèles et leurs identifiants réels

`src/lib/subscriptions/tier-limits.ts` (`MODEL_IDS`) :

| Nom interne | ID Anthropic réel | Modèle | Prix API (in / out, $/M tok) |
|---|---|---|---|
| **Hermès** | `claude-haiku-4-5-20251001` | Haiku 4.5 | **1 / 5** |
| **Athéna** | `claude-sonnet-4-6` | Sonnet 4.6 | **3 / 15** |
| **Zeus** | `claude-opus-4-8` | Opus 4.8 | **5 / 25** |

> Détail d'incohérence : le commentaire de `tier-limits.ts` décrit Zeus comme « Sonnet 4.6 contexte max », mais
> `MODEL_IDS.zeus = claude-opus-4-8` → **Zeus appelle bien Opus** (le plus cher). Commentaire à corriger.
>
> Deuxième mapping distinct dans `src/lib/agents/base.ts` : `MODELS.fast=Haiku`, `MODELS.balanced=Sonnet`,
> **`MODELS.powerful=Sonnet`** (pas Opus). Donc les routes « lourdes » de fond (plans, analyses) tournent sur
> **Sonnet**, pas Opus — c'est important pour le coût (voir 1.3).

### 1.2 Le mécanisme central : tokens **pondérés** (multiplicateur)

`src/lib/tokens/multipliers.ts` : **Hermès ×1, Athéna ×3, Zeus ×6**. Le budget de tokens de chaque tier est
exprimé en **tokens pondérés** ; les tokens API réels consommés = `pondérés ÷ multiplicateur`.

**Constat clé (le cœur de l'économie de l'app)** — coût réel d'un million de tokens **pondérés** selon le modèle,
en supposant ~20 % d'output (`f≈0.2`), prix Haiku de référence :

| Modèle | Tokens API réels par 1 M pondérés | Prix blended ($/M réel) | **Coût de 1 M pondérés** |
|---|---|---|---|
| Hermès (×1) | 1 000 000 | 1,8 | **~1,8 $** |
| Athéna (×3) | 333 000 | 5,4 | **~1,8 $** |
| Zeus (×6) | 167 000 | 9,0 | **~1,5 $** |

➡️ Le multiplicateur **normalise** presque parfaitement le coût : 1 M pondérés coûte **~1,8 $ (~1,7 €)** quel que
soit le modèle. Mieux : comme Opus ne coûte que **5×** Haiku (et non 15× comme l'ancienne génération Opus 4.1),
le multiplicateur ×6 **sur-facture légèrement** Zeus → Zeus est le modèle le **moins cher** par token pondéré.
**Le budget de tokens pondérés est donc un plafond de coût $ fiable.**

> Fourchette retenue pour la suite : **1,5 – 2,2 € par million de tokens pondérés** (selon la part d'output
> `f=0,15→0,35`), central **~1,7 €/M pondéré** (pire cas = chemin Hermès/Athéna).
>
> ⚠️ Incohérence marketing : `src/app/topup/shared.tsx` annonce « Zeus ×8 » alors que le code applique **×6**.
> À aligner (×8 serait encore plus favorable pour ta marge ; ×6 est déjà rentable).

### 1.3 Qui appelle quoi (par déclencheur)

| Déclencheur | Fichier | Modèle réel | Sortie max | Compté sur… |
|---|---|---|---|---|
| **Chat coach** (boucle agentique, outils, web_search) | `api/coach-stream/route.ts` | Modèle **choisi** par l'user, plafonné à Zeus pour tous les payants (`TIER_MAX_MODEL`) | 8–16k | **budget tokens pondérés** + quota messages |
| Parser de séance | `api/coach-stream` (mode 1) | modèle du tier | 8k | budget tokens |
| Génération plan d'entraînement | `api/training-plan/route.ts` | **Sonnet** (`MODELS.powerful`) | 12k | quota `plans_per_month` |
| Plan nutrition | `api/nutrition-plan/route.ts` | **Sonnet** | 16k | `nutrition_plans_per_month` |
| Analyse d'entraînement | `api/analyze-training/route.ts` | **Sonnet** | 8–10k | quotas |
| Session builder | `api/session-builder/route.ts` | **Sonnet** | 3k | quotas |
| Points faibles / test | `api/weakpoints`, `analyze-test` | **Sonnet** | 4–7k | quotas |
| Briefing matinal | `api/briefing/generate/route.ts` | **Sonnet + web_search** | 8k | `briefings_per_week` |
| Nutrition rapide (repas, macros, photo) | `api/suggest-next-meal`, `estimate-meal-macros`, `analyze-meal-photo` | **Haiku** | 0,3–0,9k | quotas |
| Yoga tip / règles | `api/yoga-tip`, `rule-helper` | **Haiku** | 0,15–0,5k | quotas |
| Agent marketing (Instagram) | `lib/marketing/*.ts`, `api/marketing/*` | **Sonnet** | — | usage créateur (pas facturé aux abonnés) |
| **TTS** (voix du coach) | `api/tts/route.ts` | **OpenAI** `gpt-4o-mini-tts` (repli `tts-1`) | audio | **hors budget tokens Anthropic** |

**Boucle agentique du chat** (`coach-stream`) : `MAX_STEPS = 6` appels modèle par message, **prompt caching**
`ephemeral` sur le bloc système + outils (lecture cache facturée 10 %), **web_search** serveur Anthropic
(`max_uses: 5` par message, Athéna/Zeus uniquement), **extended thinking** adaptatif sur Athéna/Zeus.
Le token pré-check (`getUserTokenLimits`) bloque en **402** si l'estimation dépasse le reste `rolling_6h` ou mensuel
(fail-open). Consommation enregistrée en pondéré via `recordTokenUsage`.

**Coûts NON couverts par le budget de tokens** (à part) :
- **web_search** : ~**10 $/1000 recherches** (facturé par Anthropic, hors wallet).
- **TTS OpenAI** : `tts-1` = 15 $/1M caractères ; `gpt-4o-mini-tts` ≈ 0,60 $/1M tok texte + audio (moins cher).
- **Mapbox** geocoding (`lib/coach/write-tools.ts`), **OpenRouteService** snapping/altitude (`lib/openrouteservice`)
  — appelés par les outils `preview_route`/parcours.

---

## Quotas réels par tier (les deux systèmes de plafonnement)

L'app a **deux limiteurs parallèles** — les deux doivent être respectés :

**A) Quotas d'actions** (`src/lib/subscriptions/tier-limits.ts`, comptés dans `usage_logs`) :

| Tier | messages/mois | plans/mois | nutrition/mois | briefings/sem | modèle défaut | plafond modèle |
|---|---|---|---|---|---|---|
| free | 5 | 0 | 0 | 0 | Hermès | Hermès |
| trial (14 j) | 30 | 2 | 1 | 4 | Hermès | Zeus |
| **Premium** | 30 | 2 | 1 | 4 | Hermès | **Zeus** |
| **Pro** | 100 | 6 | 3 | 7 | Athéna | Zeus |
| **Expert** | 300 | 20 | 10 | 7 | Zeus | Zeus |

**B) Budget de tokens pondérés** (`src/supabase/migrations/tokens_limits_rebalance.sql` + `lib/tokens/limits.ts`
`FALLBACK_LIMITS`) :

| Tier | mensuel (pondéré) | glissant 6 h | par requête | Studio mensuel (`lib/studio/offers.ts`) |
|---|---|---|---|---|
| trial | 120 000 | 40 000 | 12 000 | 0 |
| **Premium** | **700 000** | 200 000 | 25 000 | 0 |
| **Pro** | **3 000 000** | 800 000 | 60 000 | 300 000 |
| **Expert** | **8 000 000** | 2 000 000 | 150 000 | 1 000 000 |

Le **budget mensuel pondéré** est le vrai plafond de coût $ (voir 1.2).

---

## Étape 2 — BUILD (dev) vs RUN (production)

| Poste | Nature | Traitement |
|---|---|---|
| **Vercel** (monte à 70–80 €/mois en dev actif, faible sinon) | **BUILD** | **Exclu** du coût/utilisateur. En prod (usage commercial → plan **Pro obligatoire ~20 $/mois**), le socle RUN est faible ; les pics de dev ne scalent pas avec les abonnés. |
| Ton temps de dev | **BUILD** | Non déductible en micro-entreprise (pas une charge). Ignoré ici. |
| Spoonacular (seed dishes, `npm run seed:dishes`) | **BUILD** | One-shot, tier gratuit. Exclu. |
| Anthropic / OpenAI / Supabase egress / Stripe | **RUN** | Imputés par utilisateur (variables) ou en socle (fixes). |
| OVH domaine, Apple Developer, socle Supabase/Vercel Pro | **RUN fixe** | Fixes de production, ne scalent pas linéairement. |

➡️ Les pics Vercel 70–80 €/mois sont un **coût de construction** : ils **ne sont pas** dans le coût par abonné.
Vercel bascule Hobby→Pro dès l'usage **commercial** (obligatoire) ; les dépassements viennent de la bande
passante/exécutions de fonctions (streaming SSE de l'IA) — modérés en prod.

---

## Étape 3 — Inventaire exhaustif des coûts (RUN)

### Fixes de production (socle, ne scalent pas linéairement)

| Poste | Prix sourcé | €/mois (approx) | Palier de bascule |
|---|---|---|---|
| **OVH** domaine | ~30 €/an | ~2,5 | fixe |
| **Vercel Pro** | 20 $/siège/mois | ~18 | obligatoire dès usage commercial ; dépassements bande passante/fonctions au-delà de 1 To / 1 M invocations |
| **Supabase** | Free 0 $ → **Pro 25 $/mois** | 0 → ~23 | Free : 500 Mo DB, 1 Go storage, 5 Go egress, 50 000 MAU, **pause après 7 j d'inactivité**. Bascule Pro nécessaire dès ~**50 000 MAU** ou dépassement storage/egress. Overages Pro : DB +0,125 $/Go, egress +0,09 $/Go, storage +0,021 $/Go, MAU +0,00325 $. |
| **Apple Developer** | 99 $/an | ~8 | si app iOS publiée (la « RÈGLE APPLE » du code — pas de prix dans l'app — suggère une distribution iOS prévue) |
| Google Play (si Android) | 25 $ one-shot | ~0 | négligeable |

**Socle fixe RUN** : **~29 €/mois** au lancement (Vercel + OVH + Apple, Supabase Free) → **~50 €** dès Supabase Pro
→ **~160 €** vers 3000 abonnés (overages Supabase/Vercel). `[À MESURER sur factures Vercel/Supabase]`

### Variables par utilisateur

| Poste | Base de calcul | Remarque |
|---|---|---|
| **Anthropic (chat + fond)** | budget tokens pondérés × ~1,7 €/M | plafonné par le budget mensuel |
| **web_search** | ~0,0086 €/recherche (10 $/1000) | **hors** budget tokens ; jusqu'à 5/message + briefings |
| **OpenAI TTS** | tts-1 : 15 $/1M car. | selon usage voix `[À MESURER]` |
| **Stripe** | ~**1,5 % + 0,25 €**/transaction (carte EEA) + ~0,5 % Stripe Billing | par prélèvement mensuel |
| Supabase egress/storage marginal, push (VAPID gratuit) | faible | ~0,05–0,20 €/user |
| Mapbox geocoding | tier gratuit 100k/mois puis 0,75 $/1000 | probablement gratuit à basse échelle `[À VÉRIFIER]` |
| OpenRouteService | tier gratuit 2000 req/jour | gratuit / auto-hébergeable `[À VÉRIFIER]` |
| Strava / Polar AccessLink / Instagram Graph | gratuits | 0 |
| Emails transactionnels | **non trouvé de provider** dans `.env.local.example` | probablement emails Supabase Auth (limités) → **à confirmer** ; un provider (Resend/Postmark) ajouterait ~0 en tier gratuit, sinon ~0,001 €/mail `[À VÉRIFIER]` |
| Monitoring/analytics | analytics **désactivé** par défaut (`NEXT_PUBLIC_ANALYTICS_ENABLED=false`) ; pas de Sentry/PostHog en env | 0 |

**Coût Stripe par tier** (1,5 % + 0,25 € + ~0,5 %) : Premium ≈ **0,53 €** · Pro ≈ **0,77 €** · Expert ≈ **1,23 €**.

---

## Étape 4 — Coût & marge par produit (PIRE CAS = quota consommé à 100 %)

Convention : coût IA pire cas = **budget mensuel pondéré × 1,7 €/M** (borne haute Hermès/Athéna) ;
+ web_search pire cas (quota messages × 5 recherches) ; + Stripe ; + part infra.

### 4.1 Abonnements ATHLÈTES

| | **Premium 14 €** | **Pro 26 €** | **Expert 49 €** |
|---|---|---|---|
| Budget tokens pondérés (chat + studio) | 0,70 M | 3,0 M + 0,3 M = 3,3 M | 8,0 M + 1,0 M = 9,0 M |
| **Coût IA pire cas** (×1,7 €/M) | ~1,2 € | ~5,6 € | ~15,3 € |
| web_search pire cas | ~1,3 € (si Athéna/Zeus) | ~5,3 € | ~14 € |
| TTS pire cas (voix intensive) | ~0,6 € | ~3 € | ~6 € |
| Stripe + infra | ~0,6 € | ~0,9 € | ~1,4 € |
| **Coût variable total PIRE CAS** | **~3,7 €** | **~14,8 €** | **~36,7 €** |
| **Marge pire cas (€ / %)** | **10,3 € / 74 %** | **11,2 € / 43 %** | **12,3 € / 25 %** |
| **Coût variable TYPIQUE** (~30 % quota, web/TTS modérés) | **~1,2 €** | **~4,0 €** | **~9 €** |
| **Marge typique (€ / %)** | **12,8 € / 91 %** | **22 € / 85 %** | **40 € / 82 %** |

➡️ **Signal marge faible : le tier Expert en pire cas power-user (~25 %).** C'est le produit le plus exposé
(quota 300 messages × Zeus/Opus × web_search × TTS). En usage typique il reste à ~82 %.
Le garde-fou `rolling_6h` (2 M pondérés/6 h) limite les rafales, mais le budget mensuel 8 M autorise un coût
IA de ~13–20 € à lui seul.

> ⚠️ **Débordement possible** : le pré-check tokens n'estime que l'**input** de la requête suivante ; une boucle
> agentique de 6 étapes peut dépasser l'estimation. Le dernier message avant blocage peut sur-consommer
> (jusqu'à ~la valeur d'un message lourd). À surveiller sur Expert.

### 4.2 Abonnements COACH (`src/lib/subscriptions/coach-packs.ts`)

Base commune à tous : expérience athlète **Premium** + toutes les fonctions coach + **1 M tokens Studio/mois**
(`studioTokens: 1_000_000`, pondérés). Le pack = la **capacité d'athlètes gérés** (les athlètes ont leurs propres
comptes/abonnements — ils ne sont pas « servis » par le budget du coach).

| Pack | Prix/mois | Prix/an | Coût IA base pire cas (Premium 0,7 M + Studio 1 M = 1,7 M ×1,7 €) | **Marge/mois pire cas** |
|---|---|---|---|---|
| Solo (10) | 29 € | 290 € | ~2,9 € + Stripe/infra ~0,9 € = **~3,8 €** | **25,2 € / 87 %** |
| Équipe (50) | 59 € | 590 € | ~3,8 € | **55,2 € / 94 %** |
| Club (100) | 99 € | 990 € | ~3,8 € | **95,2 € / 96 %** |
| Académie (200) | 169 € | 1690 € | ~3,8 € | **165 € / 98 %** |
| Élite (300) | 229 € | 2290 € | ~3,8 € | **225 € / 98 %** |
| Fédération (500) | 349 € | 3490 € | ~3,8 € | **345 € / 99 %** |

➡️ **Coût de base identique** pour tous les packs (~3,8 € pire cas) → **la marge grimpe mécaniquement avec le prix**.
Tous largement positifs. L'annuel = 2 mois offerts (−17 %) → marge encore ~85–99 %.

**Option coach (surcoût tokens)** : `getUserTier` renvoie `coach_subscriptions.included_tier` (`premium`/`pro`/`expert`).
Passer l'expérience athlète du coach de Premium à **Pro** ou **Expert** relève son budget chat (0,7 M → 3 M → 8 M) :
- Option Pro : +2,3 M pondérés → **+~3,9 € pire cas**.
- Option Expert : +7,3 M pondérés → **+~12,4 € pire cas**.
Le Studio reste 1 M quel que soit le tier (`max(coachStudio 1M, STUDIO_MONTHLY[tier])`).
➡️ Tant que l'option est facturée **> ~4 €/mois** (Pro) ou **> ~13 €/mois** (Expert), elle reste rentable.
`[À VÉRIFIER : le prix de ces options n'est pas dans le code — ce sont des add-ons Stripe.]`

### 4.3 Packs TOKENS rechargeables (POINT CRITIQUE)

`src/app/topup/shared.tsx` + `src/app/api/topup/create-checkout/route.ts` — vendent des **tokens pondérés** :

| Pack | Tokens (pondérés) | Prix | **Coût API pire cas** (×~2,2 €/M, borne haute) | **Marge € / %** |
|---|---|---|---|---|
| Découverte | 100 000 | 4 € | ~0,22 € | **3,78 € / ~95 %** |
| Performance | 500 000 | 15 € | ~1,10 € | **13,9 € / ~93 %** |
| Elite | 1 000 000 | 25 € | ~2,20 € | **22,8 € / ~91 %** |

Packs **Studio** (coach, `lib/studio/offers.ts`) : Découverte 200k, Builder 2M, Architecte 5M —
**prix non présents dans le code** (règle Apple : tarifs sur le site). Coût API pire cas : 0,44 € / 4,4 € / 11 €.
`[À VÉRIFIER prix de vente ; s'ils suivent ~2,5 €/100k comme le chat, marge ~90 %+.]`

➡️ **Réponse à la question critique : les packs tokens sont à marge POSITIVE et confortable (~91–96 %).**
Aucun scénario ne les rend négatifs : il faudrait un coût > 40 $/M pondéré, impossible (max Haiku tout-output = 5 $/M).
Le seul coût annexe est web_search si les tokens servent à du chat web-intensif (~0,0086 €/recherche, marginal).

---

## Étape 5 — Sensibilité

1. **Une tâche Sonnet → Opus, dans le système à budget pondéré (chat)** : **baisse** le coût pire cas
   (Zeus = 0,83× le coût/pondéré d'Athéna). Contre-intuitif mais réel : le multiplicateur ×6 sur-facture Opus.
2. **Une route de fond Sonnet → Opus (plans, nutrition, analyses — non plafonnées par le wallet, gérées par
   `plans_per_month`)** : coût **×1,67** sur ces lignes. Ex. plan d'entraînement 12k sortie : Sonnet ~0,17 € →
   Opus ~0,28 €. Sur Expert (20 plans/mois) : +~2,2 €/mois. **C'est là que monter en gamme coûte vraiment.**
3. **Hausse des prix API Anthropic** : marge typique si robuste que **×2 sur les prix API** garde >80 % en typique.
   Le point de rupture est **Expert pire cas** : à ×2, son coût variable pire cas passe de ~37 € à ~60 € > 49 €
   → **marge négative**. Idem si Opus repassait aux tarifs "ancienne génération" (15/75) : le multiplicateur ×6
   deviendrait **sous-calibré** (coût réel 15× Haiku) → chat Zeus deviendrait le poste le plus cher et Expert
   passerait sous ~0 en pire cas.
4. **web_search** est le poste caché le plus sensible : non plafonné par le wallet. Le passer à `max_uses: 2`
   ou le réserver à Pro/Expert réduit fortement le pire cas.

---

## Étape 6 — Modèle global & verdict

**Mix par défaut** (paramétrable) : **72 % Premium · 20 % Pro · 8 % Expert** → **ARPU = 19,20 €/mois**.
Coût variable **typique** blended ≈ **2,3 €/user** ; **pire cas** blended ≈ **7,2 €/user**.
`[MIX RÉEL À MESURER — le mix pilote tout : plus d'Expert = ratio plus haut.]`

### Scénario TYPIQUE (consommation ~30 % des quotas)

| Abonnés | CA mensuel | CA annuel | Coûts run variables | Coûts fixes prod | Coût total | **Ratio coûts/CA** | Marge nette |
|---|---|---|---|---|---|---|---|
| 100 | 1 920 € | 23 040 € | 230 € | ~29 € | 259 € | **13,5 %** | 1 661 € |
| 500 | 9 600 € | 115 200 € | 1 150 € | ~52 € | 1 202 € | **12,5 %** | 8 398 € |
| 1 000 | 19 200 € | 230 400 € | 2 300 € | ~76 € | 2 376 € | **12,4 %** | 16 824 € |
| 3 000 | 57 600 € | 691 200 € | 6 900 € | ~161 € | 7 061 € | **12,3 %** | 50 539 € |

### Scénario PIRE CAS (toute la flotte à ~100 % des quotas + web/TTS max)

| Abonnés | CA mensuel | Coût variable | Ratio coûts/CA |
|---|---|---|---|
| 3 000 | 57 600 € | ~21 700 € | **~37,7 %** |

➡️ Le **34 % n'est franchi qu'en pire cas extrême** (flotte entière saturée en IA). En exploitation typique,
le ratio reste **~12–13 %** à toutes les échelles.

### Franchissements de seuils

- **Seuil TVA — 37 500 € de CA annuel** : `37 500 ÷ (19,20 € × 12) ≈` **~163 abonnés** (CA mensuel ~3 125 €).
  → franchi **entre les paliers 100 et 500**. Tolérance majorée jusqu'à 41 250 € (~180 abonnés).
- **Plafond micro-BNC — 77 700 € de CA annuel** : `77 700 ÷ 230,4 ≈` **~337 abonnés**. Au-delà, sortie du micro
  **obligatoire**.
- **Bascule 34 % (charges > abattement micro)** : **jamais atteint** par l'exploitation typique (~12 %). Ne serait
  atteint qu'en pire cas flotte (~37 %) ou avec un mix très riche en Expert power-users.

**Lecture micro-entreprise** : avec des charges réelles ~12 % du CA, l'**abattement forfaitaire de 34 %** (micro-BNC)
est **très avantageux** : tu déduis 34 % alors que tu ne dépenses que ~12 %. Rester en micro est rationnel
**tant que le CA < 77 700 €**. La vraie décision fiscale est pilotée par :
1. le **seuil TVA (~163 abonnés)** — à partir de là tu factures la TVA (ou tu la supportes), ce qui érode l'avantage
   prix et pousse à réfléchir à la récupération de TVA sur tes achats (Anthropic, Vercel…) ;
2. le **plafond 77 700 € (~337 abonnés)** qui force la sortie.
Le « 34 % » comme signal de bascule ne se déclenche donc **pas** via les coûts — il faudrait des charges bien plus
lourdes (ta rémunération, salaires) qui, elles, ne sont pas des charges en micro.

---

## Réponses aux 3 questions finales

### Q1 — Chaque prix couvre-t-il son coût avec une marge saine ?

**Oui pour tous en usage typique** (82–96 %). En **pire cas** :
- Premium ✅ (74 %), Coach (87–99 %) ✅, Packs tokens ✅ (91–96 %).
- **Pro** : correct (43 %) mais moins confortable.
- **Expert** : **point de vigilance** — 25 % en pire cas power-user, et **négatif si les prix API doublent**.
  Leviers : plafonner `web_search` (max_uses), réserver le TTS aux tiers élevés, ou abaisser le budget mensuel 8 M.

### Q2 — Marge réelle vs 70–80 % annoncés ?

- **En usage typique, la marge est plutôt 82–92 %** → **meilleure** que les 70–80 % annoncés.
- Les **70–80 %** correspondent en réalité à un **pire cas modéré** (quota bien utilisé, web/TTS présents).
- **Écart expliqué** par des coûts souvent oubliés dans l'estimation « 70–80 % » :
  1. **web_search** (~10 $/1000) et **TTS OpenAI**, tous deux **hors** budget de tokens ;
  2. **frais Stripe** (~1,5 % + 0,25 € + Billing) ;
  3. **pire cas Expert** (Opus + 300 messages) qui tire la moyenne vers le bas ;
  4. le fait que le multiplicateur ×6 sur Opus **améliore** la marge côté chat (compense partiellement).
- **Ta marge annoncée est donc plausible, voire prudente, en moyenne — mais elle masque une queue de
  distribution (Expert power-users) où elle chute.**

### Q3 — Bascule 34 % & seuil TVA

- **34 %** : non franchi par l'exploitation (ratio ~12 % typique ; ~37 % seulement en pire cas flotte totale).
- **TVA (37 500 €/an)** : franchi vers **~163 abonnés** (entre 100 et 500).
- **Plafond micro (77 700 €/an)** : **~337 abonnés** → sortie du micro obligatoire.
- Ordre de priorité des décisions : d'abord **TVA (~163)**, ensuite **plafond micro (~337)** ; le « 34 % » n'est
  pas le déclencheur pertinent ici.

---

## Ce qu'il reste à MESURER (pour fiabiliser)

| Inconnue | Où la trouver | Impact |
|---|---|---|
| Taux réel de consommation des quotas de tokens | table `token_usage` (somme `tokens_used` / limite, par user) | déplace tout le calcul entre « typique » et « pire cas » |
| Mix réel entre tiers | `user_subscriptions.tier` + `coach_subscriptions` | pilote l'ARPU et le ratio coûts/CA |
| Facture **Anthropic** réelle (dont part web_search) | console Anthropic (usage + web search) | valide le 1,7 €/M et le poste web_search |
| Facture **OpenAI TTS** | dashboard OpenAI | poste voix aujourd'hui non quantifié |
| Factures **Vercel** et **Supabase** (egress, MAU, storage) | dashboards | valide le socle fixe et les paliers |
| Part réelle input/output des messages | logs `token_usage` (`raw_tokens` vs `tokens_used`) | affine le €/M pondéré (fourchette 1,5–2,2) |
| Prix des **options coach** et des **packs Studio** | config Stripe / site | confirmer marge des add-ons |
| Provider d'**emails transactionnels** | Supabase Auth vs Resend/Postmark | coût actuellement supposé ~0 |
| App **iOS** publiée ? | App Store Connect | active/désactive les 99 $/an Apple |

## Tarifs sourcés (à re-vérifier à chaque relance)

- **Anthropic** (skill `claude-api`, cache 2026-06-24) : Haiku 4.5 **1/5**, Sonnet 4.6 **3/15**, Opus 4.8 **5/25** $/M ;
  cache read ~0,1×, cache write ~1,25× ; **web_search ~10 $/1000 recherches**.
- **OpenAI TTS** : `tts-1` 15 $/1M caractères ; `gpt-4o-mini-tts` ≈ 0,60 $/1M tok texte (+ audio).
- **Vercel** : Hobby 0 $ (non commercial) ; **Pro 20 $/siège/mois** (commercial obligatoire) + dépassements.
- **Supabase** : Free 0 $ (500 Mo DB, 1 Go storage, 5 Go egress, 50k MAU) ; **Pro 25 $/mois** + overages.
- **OVH** domaine : ~30 €/an. **Apple Developer** : 99 $/an. **Google Play** : 25 $ one-shot.
- **Stripe** : ~1,5 % + 0,25 € (cartes EEA) ; +~0,5 % Stripe Billing sur les récurrents.
- **Mapbox** : 100k geocoding/mois gratuits puis 0,75 $/1000. **OpenRouteService** : ~2000 req/jour gratuits.
- Change : **1 USD ≈ 0,93 €**.
