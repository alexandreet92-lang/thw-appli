# PROMPT_REGLAGES_ABONNEMENT — Sous-page Abonnement dans les Réglages IA

## Objectif
Remplacer le Sheet (bottom-sheet) hardcodé de la section "Abonnement" dans IASettingsBloc
par une vraie sous-page qui slide-in depuis la droite (iOS style), avec des données réelles
depuis Supabase + Stripe.

## Fichiers créés/modifiés
- src/app/api/subscription/details/route.ts     (NEW)
- src/app/api/subscription/cancel/route.ts      (NEW)
- src/app/profile/page.tsx                      (MODIFIED : IASettingsBloc)

## API : /api/subscription/details (GET)
Agrège :
- `user_subscriptions` : tier, stripe_subscription_id, stripe_customer_id,
                         current_period_end, status, cancel_at_period_end
- `getUserTokenLimits(userId)` : monthly, rolling_6h (used/limit/resets_at), plan
- Stripe : `stripe.subscriptions.retrieve(subscriptionId)` → nextBillingDate, amount, cancelAtPeriodEnd, currency
- Stripe : `stripe.invoices.list({ customer, limit:2 })` → 2 derniers paiements (amount_paid, created, status, hosted_invoice_url)
- Stripe : `stripe.customers.retrieve(customerId)` → default payment method (brand, last4, exp_month, exp_year)

Response JSON :
```json
{
  "tier": "premium",
  "status": "active",
  "cancel_at_period_end": false,
  "current_period_end": "2025-07-01T00:00:00Z",
  "monthly": { "used": 12340, "limit": 250000, "resets_at": "..." },
  "rolling_6h": { "used": 1200, "limit": 60000, "resets_at": "..." },
  "stripe": {
    "nextBillingDate": "2025-07-01T00:00:00Z",
    "amount": 1490,
    "currency": "eur",
    "cancelAtPeriodEnd": false
  },
  "invoices": [
    { "amount": 1490, "currency": "eur", "date": "2025-06-01T00:00:00Z", "status": "paid", "url": "https://..." }
  ],
  "paymentMethod": { "brand": "visa", "last4": "4242", "exp_month": 12, "exp_year": 2028 }
}
```
Si pas d'abonnement Stripe (tier=trial), retourner seulement tier + tokens, pas de données Stripe.

## API : /api/subscription/cancel (POST)
- Auth supabase
- Récupère stripe_subscription_id depuis user_subscriptions
- `stripe.subscriptions.update(id, { cancel_at_period_end: true })`
- Met à jour `user_subscriptions.cancel_at_period_end = true`
- Return { ok: true }

## Composant AbonnementSubPage (dans profile/page.tsx)
```typescript
interface SubDetails {
  tier: string
  status: string
  cancel_at_period_end: boolean
  current_period_end?: string | null
  monthly?: { used: number; limit: number; resets_at: string }
  rolling_6h?: { used: number; limit: number; resets_at: string }
  stripe?: {
    nextBillingDate?: string | null
    amount?: number | null
    currency?: string | null
    cancelAtPeriodEnd?: boolean | null
  } | null
  invoices?: { amount: number; currency: string; date: string; status: string; url?: string | null }[]
  paymentMethod?: { brand: string; last4: string; exp_month: number; exp_year: number } | null
}
```

Props: `{ onBack: () => void }`

Fetch au mount : GET /api/subscription/details → setDetails, setLoading(false)

### Animation slide-in
CSS keyframes à ajouter dans styleBlock :
```css
@keyframes slideInFromRight  { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes slideOutToRight   { from { transform: translateX(0); }   to { transform: translateX(100%); } }
.sub-page-enter { animation: slideInFromRight 280ms cubic-bezier(0.32,0.72,0,1) forwards; }
.sub-page-exit  { animation: slideOutToRight  240ms cubic-bezier(0.32,0.72,0,1) forwards; }
```

Wrapper : position:fixed, inset:0, zIndex:300, background:var(--bg), overflowY:auto
Header : `← Abonnement` avec bouton retour.
Closing state : `closing` boolean → applique `.sub-page-exit`, attendre 240ms puis appeler `onBack()`

### Layout de la sous-page

#### 1. Carte Plan actuel
- Tier badge (trial=amber, premium=cyan, pro=indigo, expert=purple)
- Titre plan, statut
- Si cancel_at_period_end=true : "Résiliation en cours · expire le {date}"
- Si trial : barre de jours restants (utiliser current_period_end pour calcul)
- Si premium/pro/expert : "Prochain paiement : {date} · {amount/100}€"
- Boutons : 
  - Si trial/pas-stripe : "Upgrader le plan" → /profile?tab=ia (pour l'instant)
  - Si actif non-annulé : "Gérer la facturation" → POST /api/stripe/portal → redirect url
  - Si cancel_at_period_end : message rouge "Résiliation programmée"

#### 2. Jauges tokens
Section "Utilisation IA" 
- Jauge mensuelle : used/limit tokens, barre colorée, reset date
- Jauge 6h glissantes : used/limit tokens, barre colorée, reset time
- Formatage : `${Math.round(v/1000)}k` si v >= 1000

#### 3. Derniers paiements (si invoices.length > 0)
Section "Derniers paiements"
- Rows : date formatée, montant, badge statut (paid=vert, open=ambre)
- Lien "Voir la facture" si url fourni

#### 4. Moyen de paiement (si paymentMethod)
Section "Moyen de paiement"
- Card brand + •••• last4, expiry
- Bouton "Modifier" → POST /api/stripe/portal

#### 5. Actions bas de page
- Si actif non-annulé : bouton "Résilier l'abonnement" (texte rouge, fond transparent, border rouge)
  → Modal confirmation (Are you sure) → POST /api/subscription/cancel → reload details
- Link "Voir tous les plans" → /profile?tab=ia

## Modifications IASettingsBloc (profile/page.tsx)
1. Supprimer state `subOpen` et le Sheet Abonnement
2. Ajouter state `subPageOpen: boolean` (remplace subOpen)
3. NavRow Abonnement : onClick → setSubPageOpen(true)
4. Rendre AbonnementSubPage conditionnellement au-dessus du contenu (via portal ou fixed)
5. Ajouter les keyframes `slideInFromRight` / `slideOutToRight` dans styleBlock
