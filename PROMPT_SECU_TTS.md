# PROMPT + NOTES — Sécurisation TTS & web_search (denial-of-wallet)

> Brief exécuté + **actions manuelles** (dont le hard cap OpenAI) et **checklist de test**.
> Objectif : fermer deux coûts NON plafonnés par le budget de tokens, sans dégrader l'UX des payants.

## Contexte / urgence

`src/app/api/tts/route.ts` ne vérifiait **que l'authentification** → n'importe quel compte connecté (même
Free/Trial à 0 €) pouvait appeler le TTS en boucle et générer une facture OpenAI illimitée. `web_search`
(Anthropic, ~10 $/1000, **hors** budget de tokens) était ouvert à tout modèle Athéna/Zeus, `max_uses: 5` en chat
et `max_uses: 20` en briefing.

## Ce qui a été implémenté (défense en couches, 100 % côté serveur)

### Partie 1 — `/api/tts`
- **Couche 1 (tier)** : Free **bloqué** (403) ; Trial = petite dégustation ; payants = quota généreux.
- **Couche 2 (quota mensuel)** : plafond de **caractères/mois** par tier, stocké/décompté dans `usage_logs`
  (type `tts`, `metadata.chars`), reset le 1er du mois → **429** avec `reset_at` quand atteint.
- **Couche 3 (rate-limit)** : fenêtre glissante 60 s **par compte ET par IP** (en mémoire, best-effort) → **429**.
- **Couche 4 (hard cap OpenAI)** : **action MANUELLE** de ta part (voir ci-dessous) — kill-switch ultime.

Choix de conception signalés :
- **Quota en CARACTÈRES, pas en appels** : la voix est streamée **phrase par phrase**
  (`VoiceConversation.tsx` → 1 réponse coach = plusieurs appels courts). Compter les appels pénaliserait les
  réponses longues ; les caractères suivent le vrai coût OpenAI.
- **Trial = dégustation (30 000 car.) plutôt que blocage total** : le Trial est censé montrer l'expérience
  Premium (conversion). **Si tu préfères bloquer**, mets `TTS_CHARS_TRIAL=0` (ou change le défaut dans
  `src/lib/ai/cost-limits.ts`). ⚠️ **Décision à valider.**
- **Fail-open sur panne infra** (DB HS) : on n'interrompt pas les payants ; la couche 3 + le hard cap OpenAI
  restent actifs. C'est la convention existante du repo (`enforceQuota`).

### Partie 2 — `web_search`
- Chat (`coach-stream`) : réservé aux tiers **Pro/Expert** (+ créateur), `max_uses` **5 → 2**.
- Briefing (`briefing/generate`) : `max_uses` **20 → 5** (déjà réservé Pro/Expert via `briefing_web_search`).
- Aucune raison métier forte trouvée d'ouvrir le web_search chat à Premium/Free ; les briefings Premium étaient
  déjà sans web_search. Si tu veux l'ouvrir à Premium, ajoute `'premium'` à `WEB_SEARCH_CHAT_TIERS`.

## ⚙️ Réglage des seuils — POINT UNIQUE

Tout est dans **`src/lib/ai/cost-limits.ts`**, surchargeable par variables d'env (aucun redéploiement de code) :

| Constante | Env | Défaut proposé |
|---|---|---|
| Caractères TTS/mois Free | `TTS_CHARS_FREE` | **0 (bloqué)** |
| Caractères TTS/mois Trial | `TTS_CHARS_TRIAL` | 30 000 |
| Caractères TTS/mois Premium | `TTS_CHARS_PREMIUM` | 300 000 |
| Caractères TTS/mois Pro | `TTS_CHARS_PRO` | 1 000 000 |
| Caractères TTS/mois Expert | `TTS_CHARS_EXPERT` | 2 500 000 |
| Max caractères/appel | `TTS_MAX_CHARS_PER_CALL` | 4000 |
| Rate-limit compte/min | `TTS_RATE_ACCOUNT` | 60 |
| Rate-limit IP/min | `TTS_RATE_IP` | 90 |
| web_search chat max/message | `WEB_SEARCH_MAX_USES_CHAT` | 2 |
| web_search briefing max | `WEB_SEARCH_MAX_USES_BRIEFING` | 5 |
| Tiers web_search chat | *(code)* | `pro`, `expert` (+ créateur) |

**Ordre de grandeur des coûts couverts** (tts-1 = 15 $/1M car., pire cas ; `gpt-4o-mini-tts` moins cher) :
Premium 300k car. ≈ **≤4,2 €/mois** · Pro 1M ≈ ≤14 € · Expert 2,5M ≈ ≤35 €. Ce sont des **plafonds anti-abus**,
pas l'usage attendu (réel ~3–4× plus bas). Ajuste après lecture de ta **vraie facture OpenAI**.

## COUCHE 4 (MANUEL) — Hard cap de dépense sur ta clé OpenAI

Le code plafonne l'usage *légitime* ; le hard cap OpenAI est ton **dernier rempart** si un bug/une fuite de clé
contourne les couches applicatives.

1. Connecte-toi sur **https://platform.openai.com/**.
2. Menu **Settings → Organization → Billing → Limits** (ou **Usage limits**).
3. Renseigne :
   - **« Set a monthly budget »** (budget mensuel) : mets un montant que tu es prêt à perdre au pire
     (ex. **50 $**). Au-delà, l'API renvoie des erreurs → coupe la dépense.
   - **« Set an email notification threshold »** (alerte e-mail) : ex. **20 $**, pour être prévenu avant.
4. **Restreins la clé** : dans **API keys**, utilise une **clé dédiée au TTS** (projet séparé) avec des
   **project-level limits** si possible, pour isoler le risque du reste.
5. Vérifie que la clé n'est **pas** exposée côté client (elle est bien server-only : `OPENAI_API_KEY`, lue dans
   `src/app/api/tts/route.ts`).

> Rappel sécurité connexe : `CLAUDE.md` versionne des secrets en clair (token Meta, `client_secret` Facebook) —
> à révoquer et sortir du dépôt.

## Fichiers touchés

| Fichier | Changement |
|---|---|
| `src/lib/ai/cost-limits.ts` | **(nouveau)** config unique (quotas TTS, rate-limit, max_uses web_search, tiers) |
| `src/lib/tts/guard.ts` | **(nouveau)** `guardTts()` (tier + quota + rate-limit) et `logTtsUsage()` |
| `src/supabase/migrations/add_tts_usage_type.sql` | **(nouveau)** autorise `type='tts'` dans `usage_logs` |
| `src/app/api/tts/route.ts` | appelle `guardTts` avant OpenAI, `logTtsUsage` après succès, IP via `x-forwarded-for` |
| `src/lib/subscriptions/check-quota.ts` | ajoute `'tts'` au type `UsageType` |
| `src/app/api/coach-stream/route.ts` | web_search réservé Pro/Expert (+créateur), `max_uses` 5→2 |
| `src/app/api/briefing/generate/route.ts` | `max_uses` 20→5 |

## À FAIRE avant de merger / déployer

1. **Appliquer la migration `add_tts_usage_type.sql` AVANT le déploiement.** Sinon l'insert `type='tts'` échoue
   (best-effort → pas d'erreur visible, mais **le quota mensuel ne s'accumule pas** tant que la migration n'est
   pas passée). L'accès Free reste bloqué (couche 1) et le rate-limit reste actif ; seule la couche 2 dépend d'elle.
2. **Poser le hard cap OpenAI** (couche 4 ci-dessus).
3. (Optionnel) Décider Trial : dégustation (défaut) vs blocage (`TTS_CHARS_TRIAL=0`).

## Checklist de test manuel

- [ ] **Compte Free** → clic « écouter » : réponse **403** `tts_tier_blocked` ; le front doit retomber sur la voix
      navigateur (le composant fait déjà `if (!res.ok) return null`). ✔ pas de crash.
- [ ] **Compte Trial** → fonctionne jusqu'à 30 000 car./mois puis **429** `tts_quota_exceeded`.
- [ ] **Payant (Premium/Pro/Expert)** en usage normal (une conversation vocale, plusieurs phrases) → **tout passe**,
      pas de 429 (rate-limit 60/min ≫ nb de phrases d'une réponse).
- [ ] **Quota atteint** : forcer un petit quota (`TTS_CHARS_PREMIUM=1000`) → au 2ᵉ appel, **429** avec `reset_at`.
- [ ] **Rate-limit** : forcer `TTS_RATE_ACCOUNT=3` puis envoyer 4 appels en <60 s → 4ᵉ = **429** `tts_rate_account`,
      `Retry-After: 60`.
- [ ] **web_search chat** : en **Premium**, la recherche web ne se déclenche plus ; en **Pro/Expert**, elle se
      déclenche mais bornée à 2 recherches/message (logs `[coach-stream]`).
- [ ] **Créateur** : TTS illimité + web_search actif (bypass).
- [ ] Vérifier en base : `select type, count(*), sum((metadata->>'chars')::int) from usage_logs where type='tts' group by 1;`

## Ce qui reste à mesurer

- **Facture OpenAI réelle** (TTS) → caler les quotas de caractères sur la marge cible.
- Volume réel d'appels TTS/user et longueur moyenne (logs `usage_logs` type `tts`).
- Part web_search de la facture Anthropic (pour valider `max_uses` et les tiers).
