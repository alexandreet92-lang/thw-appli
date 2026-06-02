# PROMPT_THEME_GLOBAL_FINAL — Thème global Jour/Nuit

## ÉTAPE 1 — Variables CSS dans globals.css
Variables `--bg`, `--bg2`, `--fg`, `--fg2`, `--fg3`, `--border` définies pour :
- `:root` (mode jour : blanc)
- `.dark` (mode nuit : noir)
- `@media (prefers-color-scheme: dark)` (fallback système)
- `html, body { background-color: var(--bg); color: var(--fg); }`

## ÉTAPE 2 — Remplacer les couleurs hardcodées
Chaque occurrence de blanc/noir/gris remplacée par var(--bg), var(--fg), etc.
Ne pas toucher aux couleurs fonctionnelles (cyan, rouge, vert, orange...).

## ÉTAPE 3 — Supprimer les overrides manuels
- Supprimer les useEffect / querySelectorAll qui forcent des couleurs
- Supprimer les règles CSS data-sheet-panel, data-bottom-sheet, data-info-box
- Les variables globales prennent le relais

## ÉTAPE 4 — Vérification
- Mode jour : tout blanc/clair
- Mode nuit : tout noir/sombre

## Fichiers principaux
- `src/app/globals.css`
- `src/app/activities/page.tsx`
- `src/app/globals.css` (suppressions overrides)
