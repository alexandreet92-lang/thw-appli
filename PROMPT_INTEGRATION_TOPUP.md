# Intégration page /topup (achat de tokens)

Design source : bundle Claude Design « Achat de tokens.html » (prototype
React/Babel dark-only, brand #00c8e0 + gradient #5b6fff).

## Adaptation au projet
- Next.js 15 App Router, composants client + inline styles + un `<style>` local
  pour les classes utilitaires du proto (.eyebrow, .btn-primary-lg, .l-card,
  .reveal, keyframes).
- **Couleurs/thème du projet** : variables existantes (`var(--bg)`, `--bg-card`,
  `--border`, `--text`, `--text-mid`, `--text-dim`, …) + cyan projet **#06B6D4**
  (au lieu de #00c8e0). Gradient = `linear-gradient(135deg,#06B6D4,#5b6fff)`.
- **Jour/nuit** : `useTheme()` appliqué ; tout passe par les variables → s'adapte.
- Polices Syne / DM Sans / DM Mono déjà chargées dans globals.css.

## Fichiers
- `src/app/topup/shared.tsx` — module commun (non-route) : `GRAD`, `fmt`,
  `useCountUp`, `TokenGauge`, `Header`, `Footer`, `TopupStyles`, `PACKS`,
  `USAGES`, `STEPS`. Icônes via lucide-react.
- `src/app/topup/page.tsx` — page principale. Lit `?session=` , appelle
  `POST /api/topup/verify-session` (solde réel : monthly + bonus) ; au choix
  d'un pack → `POST /api/topup/create-checkout` → redirige vers `checkout_url`
  Stripe. Session 410 → redirige vers `/topup/expired`. (Suspense pour
  `useSearchParams`.)
- `src/app/topup/success/page.tsx` — confirmation paiement (check animé,
  retour app). Générique (le webhook crédite le wallet).
- `src/app/topup/expired/page.tsx` — lien expiré.

## NE PAS faire
- Pas de création des routes `api/topup/*` (déjà existantes). La page est
  seulement COMPATIBLE avec elles (`session_token`, `pack_id`, `checkout_url`).

## Packs (cohérents avec /api/topup/create-checkout)
discovery 100k €4 · performance 500k €15 (recommandé) · elite 1M €25.

npm run build : 0 erreur TypeScript.
