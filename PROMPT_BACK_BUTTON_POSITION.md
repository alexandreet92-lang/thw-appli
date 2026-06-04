# PROMPT_BACK_BUTTON_POSITION — Bouton retour descendu sous la status bar iOS

## Fichier modifié
- `src/app/activities/page.tsx` (1 ligne)

## Changement
Le bouton retour mobile utilise un style inline (pas la classe CSS `.thw-activity-back-btn` qui ne gère que les couleurs adaptatives light/dark). Le `top` était calé à 12 px sous la safe-area iOS, ce qui le laissait partiellement chevauché par la dynamic island / notch sur certains modèles.

**Avant** (ligne 5341) :
```ts
top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
```

**Après** :
```ts
top: 'calc(env(safe-area-inset-top, 0px) + 20px)',
```

## Ce qui n'a PAS changé
- Taille 40×40 inchangée
- `left: 12` inchangé
- `z-index: 10` inchangé
- `boxShadow` inchangé
- Couleurs adaptatives via `.thw-activity-back-btn` inchangées
- Icône `<ChevronLeft size={20} strokeWidth={2.5} />` inchangée
- `onClick={onClose}` inchangé
- Branche desktop : strictement intouchée (le bouton est uniquement dans la branche mobile)

## Vérification
- npm run build : 0 erreur
- Mobile iOS : le bouton est entièrement visible sous la dynamic island / notch, garde sa cliquabilité et sa lisibilité
- Mobile Android : `env(safe-area-inset-top, 0px)` résout à 0 → bouton à 20 px du haut (au lieu de 12 px), reste correct
- Desktop : aucune modification (le bouton n'existe que dans la branche mobile)
