# PROMPT_HEADER_PADDING — Header mobile fixe + padding contenu

## Diagnostic
Le header mobile (Sidebar.tsx) a `height: 56` sur le topBar (data-app-header).
Le layout mobile (layout.tsx) a déjà `marginTop: '56px'` sur `<main>`.
La valeur 56px est dupliquée → centraliser en CSS variable.

## Solution
1. `globals.css` : ajouter `--header-height: 56px` dans `:root`
2. `globals.css` : ajouter règle `@media (max-width: 767px) { main { padding-top: var(--header-height) !important; } }`
   → filet de sécurité si un `<main>` interne override le marginTop
3. `layout.tsx` : remplacer les deux occurrences hardcodées `56px` par `var(--header-height)`

## Fichiers modifiés
- `src/app/globals.css`
- `src/app/layout.tsx`
