# Fix API /topup — diagnostic + compléments

## Diagnostic
Les **4 routes existent déjà** (créées au PROMPT_TOKENS_SYSTEM) :
`verify-session`, `request-link`, `create-checkout`, `webhook`.

Le `GET /api/topup/verify-session → 405` est **normal** : la route n'expose que
`POST`. 405 (pas 404) prouve que la route EXISTE. La cause probable de l'ancien
mauvais affichage : le build Vercel était rouge (erreur TS `FlowId` corrigée au
commit `8a5ecde`) → rien n'était déployé. + le compte créateur affichait Premium
avant le fix `1a4ade3` (désormais 2M via `getUserTokenLimits` → plan `expert`).

## ⚠️ Adaptation obligatoire
Le code du prompt utilise `createServerClient` qui **n'existe pas** dans ce
projet (exports réels : `createClient` async + `createServiceClient`). Les routes
existantes utilisent déjà les bons clients — **NE PAS les remplacer** par la
version `createServerClient` (casserait le build). Vérifié : 0 occurrence de
`createServerClient` dans `api/topup/`.

## Compléments appliqués (sans écraser)
- `verify-session` : ajout de `rolling_6h` dans la réponse JSON (cohérent avec
  le prompt ; la page peut l'utiliser).
- `create-checkout` : ajout de `customer_email: session.email` (pré-remplit
  Stripe + reçu au bon email).

## Page /topup (déjà connectée — Partie 5)
`app/topup/page.tsx` lit `?session=`, appelle `POST verify-session`, affiche le
solde réel (`monthly.limit - monthly.used + bonus_tokens`), le plan et la date
de reset ; 410/404 → `/topup/expired` ; clic pack → `POST create-checkout` →
redirection `checkout_url`. Aucune valeur hardcodée.

## Env requis (Vercel)
`RESEND_API_KEY`, `TOPUP_BASE_URL`, `STRIPE_TOPUP_WEBHOOK_SECRET` (fallback
`STRIPE_WEBHOOK_SECRET`), `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

npm run build : 0 erreur.
