# Fix compte créateur (2M tokens) + layout shift actions rapides

## BUG 1 — Compte créateur doit afficher 2M tokens (Expert)
Cause : `getUserTokenLimits` détermine le plan via `getUserTier()` (lit
`user_subscriptions.tier`, défaut `premium`). Le compte créateur n'est PAS
identifié par un plan en DB mais par **email** (`isCreatorAccount` dans
`check-quota.ts`, interne). Donc le créateur tombait sur les limites Premium
(250k / 60k / 15k).

Fix :
- `check-quota.ts` : exporter `isCreatorAccount`.
- `lib/tokens/limits.ts` `getUserTokenLimits` : `unlimited = isCreatorAccount(userId)`
  → `plan = unlimited ? 'expert' : getUserTier(userId)`. Affiche donc
  2 000 000 / 350 000 / 50 000.
- `consumeTokens` : si `unlimited`, enregistrer la conso mais **ne jamais bloquer**
  (return success sans vérif de limite).
- `/api/topup/verify-session` appelle déjà `getUserTokenLimits` → corrigé
  automatiquement (2M sur /topup). Pas de valeur hardcodée côté React (la page
  lit `monthly.limit` de l'API).

## BUG 2 — La page « bouge » au survol des thèmes (Actions rapides)
Cause : dans le menu « + » → Actions rapides, survoler un thème (gauche)
déclenche `setActiveTheme` → la colonne droite affiche un nombre d'actions
différent → **hauteur variable** du menu (ancré en `position:absolute`,
`bottom: calc(100%+8px)`) → il saute à chaque survol. Aggravé par les cartes
passées sur 2 lignes (badge modèle + estimation).

Fix : **hauteur fixe** du conteneur 2 colonnes (`height: 360` au lieu de
`maxHeight: 360`), les colonnes scrollant en interne (`overflow-y:auto` déjà
présent). Le menu garde une hauteur constante quel que soit le thème survolé.

npm run build : 0 erreur.
