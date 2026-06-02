# Sous-pages Abonnement / Modèles — bouton retour visible (Option A)

## Cause racine (pourquoi le z-index ne suffisait pas)
Les sous-pages (`AbonnementSubPage` / `ModelesSubPage`) sont rendues **dans
`<main>`**, qui a `position:relative; zIndex:10` → un **stacking context**. Le
header/sidebar de l'app est un **sibling** de `<main>` (z 50/100) dans le
contexte racine → il peint TOUJOURS au-dessus de tout le sous-arbre de `<main>`,
quel que soit le z-index interne de la sous-page (même 1000). → Les 56px du haut
de la sous-page (dont le bouton « ← ») sont couverts par le header app.

## FIX 1 — Option A (recommandée) : décaler le contenu sous le header
- Conteneur des deux sous-pages : `padding-top: calc(var(--header-height) +
  env(safe-area-inset-top))` (= 56px + encoche iOS) → pousse le contenu (donc le
  bouton « ← ») SOUS le header de l'app → visible et cliquable.
- Header collant : `top: calc(var(--header-height) + env(safe-area-inset-top))`
  → reste visible (collé juste sous le header app) même en scrollant ; padding
  ramené à `16px 20px` (l'offset/safe-area vient désormais du conteneur + top).

`var(--header-height)` = 56px (header mobile de l'app). Sur desktop, la même
valeur dégage aussi le hamburger flottant (top-left).

## FIX 2 — « En savoir plus sur les abonnements »
Déjà ajouté sur `AbonnementSubPage` (après « Moyen de paiement », avant
« Résilier ») → `/comprendre/abonnements`. `ModelesSubPage` a le sien
(`/comprendre/ia`). Conservés.

npm run build : 0 erreur.
