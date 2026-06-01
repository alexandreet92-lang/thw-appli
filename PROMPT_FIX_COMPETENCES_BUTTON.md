# Fix — Bouton "Compétences" du menu "+" ne redirige pas

## Symptôme
Cliquer sur "Compétences" dans le menu "+" du Coach IA ne fait rien
(visuellement).

## Cause racine identifiée
Le Coach IA n'est PAS une page : c'est un **overlay global**. `GlobalAIButton`
(monté dans le layout root, persistant sur toutes les routes) rend `<AIPanel
open={open} onClose={() => setOpen(false)} />`.

Quand on clique sur "Compétences" :
- `router.push('/competences')` change bien la route…
- …mais l'état `open` du panneau vit dans le layout (qui ne démonte pas à la
  navigation). Le panneau **reste ouvert par-dessus** /competences.
- `onClose()` passé à PlusMenu ne ferme QUE le sous-menu "+" (`setPlusOpen(false)`),
  pas le panneau.

Résultat : la navigation a lieu mais l'overlay masque la page → "rien ne se passe".

Autres causes écartées :
- `useRouter` bien importé depuis `next/navigation`. ✅
- Route `/competences` existe (`src/app/competences/page.tsx`). ✅
- Pas d'interception de clic (le bouton est dans `ref` du menu, le handler
  mousedown outside-click ne se déclenche pas dessus). ✅

## Correctif
Fermer le panneau entier en plus du menu avant de naviguer.
- `PlusMenu` reçoit une nouvelle prop `onClosePanel` (= le `onClose` au niveau
  panneau, qui remonte jusqu'à `setOpen(false)` dans `GlobalAIButton`).
- onClick de l'item Compétences : `onClose(); onClosePanel?.(); router.push('/competences')`.
- Au rendu de `<PlusMenu>`, on passe `onClosePanel={onClose}` (la prop panneau).

## Vérif
- Clic "Compétences" → ferme le panneau + atterrit sur /competences.
- npm run build : 0 erreur.
