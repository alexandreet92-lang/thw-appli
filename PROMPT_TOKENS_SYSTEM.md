# Système de gestion des tokens

Comptage tokens / jauges / achat de packs via lien email (Resend) + Stripe.
Page `/topup` gérée séparément (Claude Design) — cette implé backend est
COMPATIBLE avec elle.

## Adaptations au code réel
- Supabase server : `createClient()` (async, user) + `createServiceClient()`
  (service role, bypass RLS). PAS de `createServerClient` exporté → les libs
  serveur utilisent `createServiceClient` (inserts token_usage/wallet bloqués
  par RLS sinon).
- `user_subscriptions` a `tier` / `status` / `current_period_start` (pas `plan`).
  Le plan tokens = `getUserTier()` existant (premium/pro/expert ; défaut premium).
- Stripe : réutilise l'instance partagée `@/lib/stripe/config` (`stripe`).
- Webhook topup : `STRIPE_TOPUP_WEBHOOK_SECRET` (fallback `STRIPE_WEBHOOK_SECRET`).

## Parties
1. **Migration** `src/supabase/migrations/tokens_system.sql` : tables
   `token_plan_limits` (+seed trial/premium/pro/expert), `user_token_wallet`
   (+trigger création à l'inscription), `token_usage`, `topup_sessions`,
   `token_purchases`, RLS (SELECT own).
2. **`src/lib/tokens/limits.ts`** : `getUserTokenLimits`, `consumeTokens`
   (check + débit plan→bonus) et `recordTokenUsage` (insert best-effort).
3. **Chat** (`/api/coach-stream`) : pré-check (estimation input) → 402 si
   au-delà ; post-réponse → `recordTokenUsage(input+output)`. **Fail-open**
   (try/catch) : n'interrompt jamais le coach.
4. **`/api/tokens/limits`** (GET) : jauges JSON pour l'UI.
5. **`TokenUsageBubble`** : bouton CircleGauge à gauche du micro + point d'état
   (vert/orange/rouge) + popover 3 jauges + bouton « Acheter des tokens ».
6. **`TopupEmailModal`** : demande l'email (pré-rempli), envoie le lien.
7. **`/api/topup/request-link`** (Resend) : crée `topup_sessions` + email.
8. **`/api/topup/verify-session`** : valide le token, renvoie infos + jauges.
9. **`/api/topup/create-checkout`** : Stripe Checkout (packs discovery/
   performance/elite) + `token_purchases` pending.
10. **`/api/topup/webhook`** : `checkout.session.completed` → crédite le wallet.
11. **402** dans le chat → message + ouverture `TopupEmailModal`.

## Env à ajouter (Vercel + .env.local)
`RESEND_API_KEY`, `TOPUP_BASE_URL` (=https://thwcoaching.com/topup),
`STRIPE_TOPUP_WEBHOOK_SECRET`. Dépendance : `resend`.

npm run build : 0 erreur TypeScript.
