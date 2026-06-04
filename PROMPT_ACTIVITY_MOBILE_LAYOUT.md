# PROMPT_ACTIVITY_MOBILE_LAYOUT — Map en haut + reorder + Records simplifiés

## Diagnostic préalable (espace blanc géant)

Le wrapper mobile `<div data-fullscreen-activity>` est rendu À L'INTÉRIEUR d'une chaîne d'ancêtres qui contiennent **deux containing blocks créés par `transform`** :

1. `<div className="fade-up">` — animation CSS `forwards` retient `transform: translateY(0)`
2. `<ScrollReveal>` — `motion.div` framer-motion avec `y` animé retient `transform: translateY(0)`

CSS spec : tout `transform ≠ none` crée un containing block pour les descendants `position: fixed`. Du coup le `top: env(safe-area-inset-top)` (ou `top: 0`) de la carte se résout au top du `<div.fade-up>`, **pas du viewport**. Le décalage cumulé inclut la `padding: 14px 12px` du second `<main>` interne dans `TrainingPageInner`.

**Fix retenu** : rendre le wrapper mobile via `createPortal(document.body)`. C'est le même mécanisme utilisé pour `SelectionSheet` (PROMPT_ACTIVITY_CSSFIX). Le portal court-circuite tous les containing blocks de la chaîne (fade-up, ScrollReveal, mains paddées) → la carte se cale exactement à `env(safe-area-inset-top)` du viewport.

## Fichiers modifiés
- src/app/activities/page.tsx                                  (portal mobile + reorder)
- src/components/activity/RecordsBeaten.tsx                    (UI simplifiée)

## Étape 2 — Map collée en haut (portal + safe-area)
- La branche mobile de `ActivityDetail` retourne `createPortal(node, document.body)` (SSR-safe via `typeof document` guard).
- Le wrapper carte `position: fixed`, `top: env(safe-area-inset-top, 0px)`, `left/right: 0`, `height: 52vh` (cohérent avec le bottom-sheet `marginTop: 52vh` déjà calé). Edge-to-edge, pas de border-radius en haut.
- Bouton retour inchangé (déjà à `top: calc(env(safe-area-inset-top) + 12px)`).

## Étape 3 — Réorganisation des sections mobile
Dans la branche mobile (bottom-sheet), nouvel ordre :
1. **Map** (fixed)
2. **Titre + sous-ligne (sport · date)**
3. **Stats 3 cols**
4. **Records battus**
5. Reste du contenu (analyse, courbes, laps, etc.) inchangé

Avant : Titre → Records → Stats. Après : Titre → Stats → Records.

## Étape 4 — Card Records simplifiée

`RecordsBeaten.tsx` :
- Si aucun record battu → composant retourne `null` (déjà le cas).
- Header simplifié :
  ```
  [TrophyIcon doré 16px] Félicitations · New PR
  ```
  Padding 12 14, font 13 / 600 / `var(--text)`. Pas de border-bottom sous le header.
- **Suppression des sous-headers** « ALL TIME · N records » et « RECORD 2026 · N records ».
- Une seule liste plate triée :
  - All Time d'abord (sorted Pmax → 6h)
  - puis Année (sorted Pmax → 6h)
- Lignes inchangées dans leur structure (barre verticale 3×24 + durée 50px + valeur + tag droite).
- Style card : `background: rgba(234, 179, 8, 0.04)` (voile doré subtil), border `var(--border)`, radius 12, margin 12 verticale.

## Vérification
- npm run build : 0 erreur TS
- Mobile : map collée sous notch, plus d'espace blanc, ordre Titre → Stats → Records
- Records : header trophée + texte, sans sous-headers, lignes triées All Time→Année par durée
- Desktop : intouché
