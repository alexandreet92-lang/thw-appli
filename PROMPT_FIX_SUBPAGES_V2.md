# Sous-pages V2 — slide bottom-up + format tokens + hebdo

## FIX 1 — Animation depuis le bas (iOS sheet)
`src/app/profile/page.tsx` (bloc `<style>`) : les keyframes de
`.sub-page-enter` / `.sub-page-exit` passent de translateX (droite) à translateY :
- entrée : `translateY(100%) → 0`, **320ms** cubic-bezier(0.32,0.72,0,1)
- sortie : `translateY(0) → 100%`, **280ms**
`handleBack` des deux sous-pages : `setTimeout(onBack, 240)` → **280** (= durée
de l'animation de sortie).

## FIX 2 — Format des tokens (FR, pas de « k »)
`fmtTokens(v)` retournait `${Math.round(v/1000)}k` (« 2000k », « 750k »…).
→ `return v.toLocaleString('fr-FR')` → « 2 000 000 », « 750 000 », « 350 000 ».
Appliqué aux jauges de la sous-page Abonnement (used / limit / restants). La
bulle des jauges (`TokenUsageBubble`) utilise déjà `toLocaleString('fr-FR')`.

## FIX 3 — Quotas hebdomadaires
Jauges de la sous-page Abonnement : label « Mensuelle » → **« Hebdomadaire »**,
« 6h glissantes » → « Sur 6 heures glissantes ». (La bulle affiche déjà
« Limite hebdomadaire ».)

## Conservé (note du prompt)
Les **prix** restent en « €/mois » (paiement mensuel). Seul le **quota de
tokens** est hebdomadaire.

npm run build : 0 erreur.
