# PROMPT_SHEET_BG_FINAL — BottomSheet fond opaque garanti

## Problème
Fond du BottomSheet transparent : la page reste visible derrière.
Cause : `var(--background)` et `bg-white` ne résolvent pas en couleur
opaque (conflit oklch / Safari). Toutes les tentatives précédentes ont échoué.

## Solution
Bypasser entièrement CSS variables et Tailwind.
Utiliser uniquement des couleurs hexadécimales hardcodées via attribut HTML.

## ÉTAPE 1 — globals.css (fin du fichier)

```css
/* BottomSheet — fond opaque garanti, bypasse oklch / Tailwind */
[data-sheet-panel] {
  background-color: #ffffff !important;
}
.dark [data-sheet-panel] {
  background-color: #0f172a !important;
}
@media (prefers-color-scheme: dark) {
  [data-sheet-panel] {
    background-color: #0f172a !important;
  }
}
```

## ÉTAPE 2 — BottomSheet.tsx

Sur le div panneau (borderRadius, maxHeight, flexDirection: column) :
1. Ajouter `data-sheet-panel=""`
2. Supprimer toute propriété backgroundColor / bg-* / var(--background)
3. Aucun div parent ne doit avoir opacity < 1 (sauf overlay backdrop)

## Fichiers modifiés
- src/app/globals.css
- src/components/ui/BottomSheet.tsx
