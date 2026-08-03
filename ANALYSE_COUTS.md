# ANALYSE DE COÛT RÉEL & MARGE — THW Coaching

> **Version 2** (corrige 3 failles + 2 vérifications de la V1 — voir `PROMPT_COUTS_V2.md`). Analyse fondée sur la
> **logique réelle du code** (fichiers cités). Volumes réels inconnus → signalés `[À MESURER]`, remplacés par des
> fourchettes. Change : **1 USD ≈ 0,93 €**.

## Journal des corrections V1 → V2

1. **web_search et TTS sont HORS du budget de tokens** (vérifié dans le code) → le budget pondéré **ne cape PAS**
   ces coûts. La V1 était contradictoire. Corrigé + coût pire cas chiffré (§A).
2. **Marge recalculée TOUS COÛTS INCLUS** (IA + web_search + TTS + Stripe). La marge réelle **typique** est
   **~79–88 %** (pas 82–92 %) et la marge **pire cas** tombe à **24–56 %**. La phrase « marge meilleure que
   l'annoncé grâce aux coûts oubliés » était logiquement fausse — supprimée (§Étape 4, §Q2).
3. **Packs tokens** : « négatif mathématiquement impossible » **retiré**. La consommation d'un pack peut déclencher
   web_search (coût hors pack) → marge dégradable (§Étape 4.3).
4. **Plafond micro-BNC corrigé : 83 600 €** (2026–2028, l'ancien 77 700 € était périmé) → **~363 abonnés** (§Étape 6).
5. **Prix API sourcés et datés par modèle réellement câblé** (§Étape 1.1) + **tableau de sensibilité** (§Étape 5).
   Conclusion : la promo Sonnet 5 (fin 01/09) **ne s'applique pas** (le code est sur Sonnet 4.6) ; le risque Fable 5
   est réel **si** on repointe Zeus dessus.

> ⚠️ **Sécurité (hors chiffres)** : `CLAUDE.md` versionne en clair un token Meta/Instagram, un `client_secret`
> Facebook et une clé secrète → **à révoquer et sortir du dépôt**.

---

## 0. TL;DR (verdict corrigé)

| Question | Réponse |
|---|---|
| Les prix couvrent-ils les coûts ? | **Oui en usage typique** (marge 79–88 %, tous coûts inclus). **Non garanti en pire cas** : Pro 38 %, Expert 24 %, et **potentiellement négatif via l'abus de TTS** (non plafonné, même en Free). |
| Marge réelle vs 70–80 % annoncés ? | Le **70–80 % correspond à l'usage TYPIQUE** (79–88 % réel, tous coûts inclus) — donc ~exact. Ce **n'est pas un plancher** : en usage intensif la marge chute à 24–56 %. |
| Bascule 34 % & seuils fiscaux ? | Ratio charges/CA **~16 %** typique → 34 % **non atteint** en exploitation normale (mais **~55 % en pire cas flotte**). **TVA 37 500 €/an ≈ 163 abonnés** ; **plafond micro 83 600 €/an ≈ 363 abonnés**. |
| Risque n°1 | **Le TTS (`/api/tts`) et le web_search ne sont PLAFONNÉS par AUCUN budget de tokens.** Le TTS n'est même pas limité par le quota de messages ni par le tier → **coût non borné**. Priorité : poser un plafond. |

---

## A. FAILLE 1 corrigée — web_search et TTS sont HORS du plafond de tokens

Le budget de tokens **pondérés** ne compte que les **tokens API** (`recordTokenUsage` enregistre
`input_tokens + output_tokens`, `src/app/api/coach-stream/route.ts` ~L1160). Or :

- **web_search** (`coach-stream`, outil serveur `web_search_20260209`, `max_uses: 5`, Athéna/Zeus) est facturé
  **par recherche** (~**10 $/1000 ≈ 0,009 €/recherche**), en plus des tokens. Ce **frais par recherche n'est pas
  un token** → **hors budget**. Il est seulement **borné indirectement** par le quota de messages (× 5 recherches).
- **TTS** (`src/app/api/tts/route.ts`) : la route ne vérifie **que l'authentification** + présence de
  `OPENAI_API_KEY`, et tronque à 4000 caractères. **Aucun décompte de tokens, aucun quota de messages, aucun
  contrôle de tier.** ➡️ **N'importe quel utilisateur connecté — y compris Free/Trial — peut appeler le TTS
  autant de fois qu'il veut.** C'est le **coût non plafonné le plus dangereux**.

### Coût PIRE CAS web_search + TTS par utilisateur / mois

| Poste | Formule | Premium | Pro | Expert |
|---|---|---|---|---|
| **web_search** (borné par messages × 5, + briefings) | `msgs×5×0,009 €` | 30×5 → **1,35 €** | 100×5 +briefings → **5,6 €** | 300×5 +briefings → **14,9 €** |
| **TTS** *(non borné)* — usage humain intensif | `~150 appels × ~0,03 €` | **~3 €** | **~4 €** | **~6 €** |
| **TTS** *(abus / script)* | **non borné** — 4000 car./appel, ~0,05 €/appel, aucune limite | **∞** | **∞** | **∞** |

> Coût unitaire TTS : `gpt-4o-mini-tts` ≈ 0,015 $/min d'audio ; repli `tts-1` = 15 $/1M car. → **~0,02–0,05 €**
> par appel de 4000 car. Un `Free` qui scripte 10 000 appels/mois = **~500 € de coût OpenAI pour 0 € de revenu.**

**Action prioritaire** : plafonner le TTS (quota mensuel par tier + rate-limit) et idéalement décompter son coût
du budget de tokens ; réserver/réduire `web_search` (`max_uses: 2`, ou Pro/Expert only). `[À MESURER : facture OpenAI]`

---

## Étape 1 — Cartographie des appels IA

### 1.1 Prix par modèle réellement câblé (sourcé + daté)

Réf. **Anthropic officiel au 2 août 2026** (fournie) + skill `claude-api` (cache **2026-06-24**) :

| Slot code | ID Anthropic (dans le code) | Modèle | Prix in/out $/M | Source / date |
|---|---|---|---|---|
| **Hermès** (`MODEL_IDS.hermes`) | `claude-haiku-4-5-20251001` | Haiku 4.5 | **1 / 5** | Anthropic 02/08/2026 ✓ = V1 |
| **Athéna** (`MODEL_IDS.athena`, `MODELS.balanced`/`powerful`) | `claude-sonnet-4-6` | **Sonnet 4.6** | **3 / 15** | skill 24/06/2026 — Sonnet **4.6** est à 3/15 **stable** |
| **Zeus** (`MODEL_IDS.zeus`) | `claude-opus-4-8` | Opus 4.8 | **5 / 25** | Anthropic 02/08/2026 (= Opus 5) ✓ = V1 |
| Agent **marketing** (`lib/marketing/*.ts`, `api/marketing/analyze-performance`) | `claude-sonnet-4-6` | Sonnet 4.6 | 3 / 15 | usage **créateur** (ton Instagram) → ton opex, pas facturé aux abonnés |
| Routes de fond (training-plan, nutrition-plan, analyze-*, session-builder, briefing) | `claude-sonnet-4-6` | Sonnet 4.6 | 3 / 15 | idem |
| **TTS** (`api/tts`) | OpenAI `gpt-4o-mini-tts` / `tts-1` | — | ~0,02–0,05 €/appel | OpenAI |

**Les prix V1 étaient corrects.** Point important : **aucun agent n'utilise Sonnet 5 (2/10 promo) ni Fable 5.**
Le code est câblé sur **Sonnet 4.6 (3/15)** et **Opus 4.8 (5/25)**. Conséquences pour tes deux alertes → §Étape 5.

### 1.2 Tokens pondérés = plafond de coût… mais seulement pour les tokens

`src/lib/tokens/multipliers.ts` : Hermès ×1, Athéna ×3, Zeus ×6. Coût réel de **1 M de tokens pondérés**
(blended ~20 % output) :

| Modèle | Prix in/out | mult | Coût 1 M pondérés |
|---|---|---|---|
| Hermès (Haiku 1/5) | 1/5 | ×1 | **~1,67 €** |
| Athéna (Sonnet 4.6, 3/15) | 3/15 | ×3 | **~1,67 €** |
| Zeus (Opus 4.8, 5/25) | 5/25 | ×6 | **~1,40 €** |

➡️ Le multiplicateur normalise le coût à **~1,5–2,2 €/M pondéré** (central **1,67 €**, borne haute Hermès/Athéna) ;
Opus (×6) est même sur-facturé (coût réel 5× Haiku) → **le budget pondéré est un plafond fiable POUR LES TOKENS
uniquement.** Il **ne cape ni web_search ni TTS** (§A). Incohérence marketing : `topup/shared.tsx` affiche « Zeus ×8 »
alors que le code applique **×6**.

*(Quotas d'actions et budgets de tokens par tier : inchangés vs V1 — voir tableaux ci-dessous.)*

**A) Quotas d'actions** (`tier-limits.ts`, comptés dans `usage_logs`) : Free 5 msg · Premium 30 msg / 2 plans /
1 nutrition / 4 briefings · Pro 100 / 6 / 3 / 7 · Expert 300 / 20 / 10 / 7.
Modèle défaut : Free/Premium = Hermès, Pro = Athéna, Expert = Zeus ; **plafond sélectionnable = Zeus** pour tous
les payants.

**B) Budget tokens pondérés** (`tokens_limits_rebalance.sql`) : Premium **700k** · Pro **3 M** (+300k Studio) ·
Expert **8 M** (+1 M Studio). Glissant 6 h : 200k / 800k / 2 M.

---

## Étape 2 — BUILD vs RUN (inchangé)

- **BUILD (exclus du coût/user)** : pics Vercel 70–80 €/mois en dev actif ; ton temps ; seed Spoonacular.
- **RUN fixe** : OVH ~2,5 €/mois, **Vercel Pro ~18 €** (usage commercial obligatoire), Supabase Free→**Pro ~23 €**,
  **Apple 99 $/an ~8 €** (si app iOS).
- **RUN variable** : Anthropic (tokens), **web_search + TTS (hors budget)**, Stripe, egress Supabase.

---

## Étape 3 — Inventaire des coûts (mise à jour du variable)

| Poste variable/user | Base | Premium | Pro | Expert |
|---|---|---|---|---|
| IA tokens (budget pondéré ×1,67 €/M) | plafonné | ≤1,17 € | ≤5,51 € | ≤15,0 € |
| **web_search** (hors budget) | ≤ msgs×5×0,009 € | ≤1,35 € | ≤5,6 € | ≤14,9 € |
| **TTS** (hors budget, **non plafonné**) | ~0,03 €/appel | ~0–3 €→**∞** | ~0–4 €→**∞** | ~0–6 €→**∞** |
| Stripe (1,5 %+0,25 €+~0,5 %) | par prélèvement | 0,53 € | 0,77 € | 1,23 € |
| Infra marginale (egress, push VAPID gratuit) | faible | ~0,1 € | ~0,15 € | ~0,2 € |

Fixes RUN : ~29 €/mois au lancement → ~52 € (Supabase Pro) → ~160 € vers 3000 abonnés. `[À MESURER factures]`
Mapbox/OpenRouteService : tiers gratuits probables `[À VÉRIFIER]`. Emails : provider non trouvé → sans doute
Supabase Auth `[À VÉRIFIER]`. Strava/Polar/Instagram : gratuits.

---

## Étape 4 — Coût & marge par produit (TOUS COÛTS INCLUS)

### 4.1 Abonnements ATHLÈTES — marge **typique** et **pire cas**

| | **Premium 14 €** | **Pro 26 €** | **Expert 49 €** |
|---|---|---|---|
| IA tokens pire cas | 1,17 € | 5,51 € | 15,0 € |
| web_search pire cas | 1,35 € | 5,6 € | 14,9 € |
| TTS pire cas (humain intensif) | ~3 € | ~4 € | ~6 € |
| Stripe + infra | 0,63 € | 0,92 € | 1,43 € |
| **Coût variable PIRE CAS** | **~6,1 €** | **~16,0 €** | **~37,3 €** |
| **Marge PIRE CAS (€ / %)** | **7,9 € / 56 %** | **10,0 € / 38 %** | **11,7 € / 24 %** |
| **Coût variable TYPIQUE** (~30 % quota, web/TTS légers) | **~1,75 €** | **~4,65 €** | **~10,4 €** |
| **Marge TYPIQUE (€ / %)** | **12,3 € / 88 %** | **21,4 € / 82 %** | **38,6 € / 79 %** |
| **+ abus TTS** | marge **→ négative possible** (TTS non borné, même en Free) | idem | idem |

➡️ **La marge est bien calculée APRÈS tous les coûts.** En **typique** : **79–88 %** (cohérent avec ton 70–80 %,
légèrement au-dessus). En **pire cas** : **24–56 %**. **Expert reste le point noir (24 %)**, et **le TTS non plafonné
peut rendre n'importe quel tier négatif** (y compris un compte Free à 0 € de revenu).

### 4.2 Abonnements COACH (inchangé, ajout TTS/web)

Base identique tous packs : expérience **Premium** + **1 M Studio pondéré**. Coût IA base pire cas ~2,9 € (+ web/TTS
si le coach chatte/écoute) + Stripe. Marge pire cas : **Solo (29 €) ~80 %** → **Fédération (349 €) ~98 %**.
**Option tier inclus** (`coach_subscriptions.included_tier`) : Pro **+~3,9 €** pire cas IA, Expert **+~12,4 €** ;
rentable si facturée respectivement **> ~4 €** et **> ~13 €**/mois (`[prix add-on à confirmer]`). Web_search/TTS
s'appliquent aussi au coach → mêmes réserves qu'en 4.1.

### 4.3 Packs TOKENS rechargeables (FAILLE 3 corrigée)

`topup/shared.tsx` + `api/topup/create-checkout` (tokens **pondérés**) :

| Pack | Tokens pondérés | Prix | Coût API tokens (≤2,2 €/M) | Marge tokens |
|---|---|---|---|---|
| Découverte | 100 000 | 4 € | ~0,22 € | ~3,78 € / 95 % |
| Performance | 500 000 | 15 € | ~1,10 € | ~13,9 € / 93 % |
| Elite | 1 000 000 | 25 € | ~2,20 € | ~22,8 € / 91 % |

**Correction (retrait de « impossible ») :** la marge ci-dessus **ne couvre que les tokens**. La consommation du
pack via le **chat Zeus/Athéna déclenche web_search** (≈0,009 €/recherche, ≤5/message), **coût NON couvert par le
prix du pack**. Scénario de dégradation : un pack Elite (1 M pondéré) consommé en petits messages web-intensifs
(~500 messages × 5 recherches ≈ 2 500 recherches ≈ **22,5 €** de frais search) ramènerait la marge **de 91 % vers
~0 %**. Peu probable (les résultats de recherche gonflent les tokens et vident le pack avant), mais **plus
« mathématiquement impossible »**. Le **TTS n'est pas payé par le pack** → il reste un coût parallèle non couvert.
➡️ **Les packs restent nettement rentables sur les tokens, mais l'exposition web_search/TTS s'y applique aussi.**

---

## Étape 5 — Sensibilité au prix des modèles (VÉRIF 2)

Coût de **1 M de tokens pondérés** selon le modèle réellement placé dans chaque « slot » :

| Slot | Modèle | Prix in/out $/M | mult | **Coût 1 M pondéré** | vs Haiku-path | Réel dans le code ? |
|---|---|---|---|---|---|---|
| Hermès | Haiku 4.5 | 1 / 5 | ×1 | 1,67 € | 1,00× | **Oui** |
| Athéna | Sonnet 4.6 | 3 / 15 | ×3 | **1,67 €** | 1,00× | **Oui (actuel)** |
| Athéna→? | Sonnet 5 (promo ≤31/08) | 2 / 10 | ×3 | 1,11 € | 0,67× | Non |
| Athéna→? | Sonnet 5 (≥01/09) | 3 / 15 | ×3 | 1,67 € | 1,00× | Non |
| Zeus | Opus 4.8 / Opus 5 | 5 / 25 | ×6 | **1,40 €** | 0,84× | **Oui (actuel)** |
| Zeus→? | **Fable 5** | 10 / 50 | ×6 | **2,79 €** | **1,67×** | Non |

**Alerte 1 — « promo Sonnet, −50 % de marge au 01/09 » : NON RÉELLE aujourd'hui.** Le code utilise **Sonnet 4.6
(3/15, stable)**, pas Sonnet 5 (2/10). La falaise du 01/09 ne concerne que Sonnet **5**. Tu n'y es exposé **que si**
tu bascules Athéna/routes de fond sur `claude-sonnet-5` pour profiter de la promo — auquel cas ton coût Sonnet
**+50 % au 01/09** (1,11 € → 1,67 €/M pondéré). **Recommandation : rester sur Sonnet 4.6**, ou si tu prends la
promo, prévoir la remontée.

**Alerte 2 — « Fable 5 (×10) + multiplicateur ×6 = vente à perte » : PARTIELLEMENT réelle, et NON active
aujourd'hui.** Aucun agent n'est sur Fable 5. **Si** tu repointais Zeus → `claude-fable-5` (10/50), le
multiplicateur ×6 serait **sous-calibré** (il devrait être ~**×10–11** pour normaliser). Effet :

| Produit | Coût sur Opus 4.8 (actuel) | Coût sur Fable 5 | Verdict Fable |
|---|---|---|---|
| Pack Elite (1 M pondéré, 25 €) | 1,40 € (94 %) | 2,79 € (**89 %**) | encore **positif** — pas « à perte » |
| **Expert pire cas** (9 M + web+TTS+Stripe) | 37,3 € (24 %) | **≈47,4 € (3 %)** | **quasi-perte** |

➡️ **Fable 5 ne fait pas vendre les packs à perte** (marge ~89 %), mais **écrase la marge Expert pire-cas à ~3 %
(breakeven)** et divise par ~1,7 la marge partout. **Si un jour tu passes Zeus sur Fable 5, relève le multiplicateur
à ×10–11**, sinon ta calibration casse. Même logique si Opus repassait aux tarifs « ancienne génération » (15/75).

**Sensibilité globale prix API** : la marge **typique** encaisse **×2 sur les prix API** en restant >75 %.
Le point de rupture est **Expert pire cas** (déjà 24 %) : à ×2 sur Anthropic **il passe négatif**.

---

## Étape 6 — Modèle global & seuils (VÉRIF 1)

**Mix par défaut** (paramétrable) : 72 % Premium · 20 % Pro · 8 % Expert → **ARPU 19,20 €/mois**.
Coût variable **typique** blended = **~3,0 €/user** (tous coûts inclus) ; **pire cas** blended = **~10,6 €/user**.
`[MIX RÉEL À MESURER]`

### Scénario TYPIQUE (tous coûts inclus)

| Abonnés | CA mensuel | CA annuel | Var. | Fixes | Total | **Ratio coûts/CA** | Marge nette |
|---|---|---|---|---|---|---|---|
| 100 | 1 920 € | 23 040 € | 302 € | 29 € | 331 € | **17,2 %** | 1 589 € |
| 500 | 9 600 € | 115 200 € | 1 510 € | 52 € | 1 562 € | **16,3 %** | 8 038 € |
| 1 000 | 19 200 € | 230 400 € | 3 020 € | 76 € | 3 096 € | **16,1 %** | 16 104 € |
| 3 000 | 57 600 € | 691 200 € | 9 060 € | 161 € | 9 221 € | **16,0 %** | 48 379 € |

### Scénario PIRE CAS (flotte à ~100 % quota + web/TTS intensifs)

| Abonnés | CA mensuel | Var. | Ratio coûts/CA |
|---|---|---|---|
| 3 000 | 57 600 € | ~31 800 € | **~55 %** *(+ abus TTS : non borné)* |

### Franchissements de seuils (corrigés)

- **Seuil TVA — 37 500 €/an** : `37 500 ÷ (19,20 € × 12) ≈` **~163 abonnés** (entre 100 et 500). Tolérance majorée
  41 250 € ≈ ~179 abonnés.
- **Plafond micro-BNC — 83 600 €/an** (2026–2028, **corrigé** ; l'ancien 77 700 € était périmé) :
  `83 600 ÷ 230,4 ≈` **~363 abonnés**. Au-delà → sortie du micro **obligatoire**.
- **Bascule 34 % (charges > abattement)** : **non atteint** en exploitation typique (~16 %). Atteint **~55 %** en
  pire cas flotte, ou instantanément via **abus TTS**. En pratique, tant que l'usage reste normal, l'abattement
  forfaitaire micro de 34 % est **très avantageux** (tu déduis 34 % en ne dépensant que ~16 %).

**Ordre des décisions fiscales** : **TVA (~163 abonnés)** d'abord, puis **plafond micro (~363 abonnés)**.
Le « 34 % » n'est pas le déclencheur (charges réelles ~16 %).

---

## Réponses aux 3 questions (corrigées)

**Q1 — Chaque prix couvre-t-il son coût avec une marge saine ?**
Oui **en usage typique** (79–88 %, tous coûts inclus). **Non garanti en pire cas** : Pro 38 %, **Expert 24 %**, et
**le TTS non plafonné peut rendre n'importe quel tier négatif** (y compris Free/Trial à 0 € de revenu). Priorité :
**plafonner TTS + web_search**.

**Q2 — Marge réelle vs 70–80 % annoncés ? (FAILLE 2)**
Le **70–80 % ≈ ta marge TYPIQUE réelle (79–88 %), tous coûts inclus** — donc ton estimation était juste, voire
légèrement pessimiste en usage normal. **Mais ce n'est pas un plancher** : en usage intensif (web_search + TTS +
quota Zeus plein), la marge **tombe à 24–56 %**. L'écart ne vient pas de « coûts oubliés qui augmentent la marge »
(impossible) mais du fait que **le 70–80 % décrit l'usage moyen, pas la queue power-user**.

**Q3 — Bascule 34 % & seuil TVA ? (VÉRIF 1)**
34 % non atteint en typique (~16 %) ; atteint en pire cas (~55 %) ou via abus TTS. **TVA ≈ 163 abonnés** ;
**plafond micro 83 600 € ≈ 363 abonnés** (corrigé).

---

## Ce qu'il reste à MESURER

| Inconnue | Où | Pourquoi |
|---|---|---|
| **Facture OpenAI (TTS)** | dashboard OpenAI | poste **non plafonné** — quantifier l'exposition réelle |
| **Part web_search** de la facture Anthropic | console Anthropic (web search usage) | valider ~0,009 €/recherche et le volume |
| Taux réel de consommation des quotas de tokens | table `token_usage` (`tokens_used` vs limite) | déplace le calcul typique ↔ pire cas |
| Mix réel entre tiers | `user_subscriptions.tier` | pilote ARPU et ratio coûts/CA |
| Nb réel d'appels TTS/user, longueur moyenne | logs applicatifs `/api/tts` | borne l'abus |
| Part input/output des messages | `token_usage.raw_tokens` | affine 1,5–2,2 €/M |
| Factures Vercel / Supabase | dashboards | valide socle fixe & paliers |
| Prix options coach & packs Studio | Stripe / site | confirmer marge add-ons |
| Provider emails | env / Supabase | coût supposé ~0 |
| App iOS publiée ? | App Store Connect | active/désactive 99 $/an Apple |

## Tarifs sourcés

- **Anthropic** (réf. 02/08/2026 + skill 24/06/2026) : Haiku 4.5 **1/5**, Sonnet 4.6 **3/15**, Opus 4.8/Opus 5 **5/25**,
  Sonnet 5 **2/10** promo→**3/15** au 01/09, Fable 5 **10/50** ($/M). web_search **~10 $/1000**. Cache read 0,1×, write 1,25×.
- **OpenAI TTS** : `gpt-4o-mini-tts` ≈ 0,015 $/min ; `tts-1` 15 $/1M car.
- **Vercel Pro** 20 $/mois ; **Supabase** Free→Pro 25 $/mois ; **OVH** ~30 €/an ; **Apple** 99 $/an ;
  **Stripe** ~1,5 %+0,25 € (+~0,5 % Billing) ; **Mapbox** 100k/mois gratuit puis 0,75 $/1000 ; **ORS** ~2000 req/j gratuit.
- **Micro-BNC** : plafond CA **83 600 €** (2026–2028) ; **franchise TVA services 37 500 €** (majoré 41 250 €).
- Change **1 USD ≈ 0,93 €**.
