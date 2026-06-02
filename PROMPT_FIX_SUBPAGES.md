# Sous-pages Abonnement / Modèles — bouton retour visible + En savoir plus

Cibles réelles : `AbonnementSubPage` et `ModelesSubPage` dans
`src/app/profile/page.tsx` (slide-in `position:fixed; inset:0`, header sticky
avec bouton « ← »).

## FIX 1 — bouton retour entièrement visible
- Conteneur des deux sous-pages : `zIndex` 300 → **1000** → garantit qu'elles
  passent AU-DESSUS du header/sidebar de l'app (z 50/100) et du bouton IA (z 90).
- Header collant : `padding-top: calc(16px + env(safe-area-inset-top))` → le
  bouton retour n'est plus rogné par la status bar / l'encoche iOS.

## FIX 2 — « En savoir plus sur les abonnements »
`ModelesSubPage` a déjà « En savoir plus » (`/comprendre/ia`). Ajout du pendant
sur `AbonnementSubPage` : lien « En savoir plus sur les abonnements » →
`/comprendre/abonnements`, placé **après** la carte « Moyen de paiement » et
**avant** « Résilier l'abonnement » (style identique : bordure 0.5px,
ExternalLink). Page cible inexistante (V1).

## Note
Découverte en cours de route : le `main` distant avait déjà remplacé les
anciens bottom-sheets par ces vraies sous-pages slide-in (mon 1er essai était
basé sur une version locale périmée → rebase abandonné, reset sur origin/main,
fix réappliqué sur les bons composants). Le fix token des laps (oauth_tokens)
est bien présent sur le distant.

npm run build : 0 erreur.
