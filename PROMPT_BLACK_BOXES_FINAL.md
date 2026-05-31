# PROMPT_BLACK_BOXES_FINAL — Suppression des fonds noirs

## Diagnostic

Source : `src/app/globals.css`, lignes 527-528

```css
@media (prefers-color-scheme: dark) {
  :root {
    --info-bg:    #020617;   ← COUPABLE
    --info-border: #1e293b;  ← COUPABLE
```

## Cause exacte

L'app utilise `.dark` / `.light` class sur `<html>` (via useTheme).
`getAutoMode()` retourne toujours 'dark' → JS applique `.dark` par défaut.

Le bloc `@media (prefers-color-scheme: dark) { :root { ... } }` cible `:root`
avec spécificité (0,1,0). Il apparaît APRÈS `.dark { ... }` dans le source,
donc il surclasse `:root { --info-bg: #F8FAFC }` quand l'OS est en dark mode.

Quand l'utilisateur passe en "Mode Jour" (classe `.light` sur html) :
- `.light` n'a PAS de règle `--info-bg`
- Le `@media` s'active si l'OS est dark → `--info-bg: #020617` → boîte noire
- Alors que `:root` avait `#F8FAFC` (clair)

Quand `.dark` est actif : spécificité (0,1,1) > (0,1,0) → `.dark` gagne.
Donc seul `.light` + OS dark → bug.

## Correction

Supprimer uniquement les lignes `--info-bg` et `--info-border` du bloc
`@media (prefers-color-scheme: dark)`. Les règles `.dark` les gèrent déjà
correctement avec une spécificité supérieure.

## Fichier modifié
- src/app/globals.css (suppression de 2 lignes)
