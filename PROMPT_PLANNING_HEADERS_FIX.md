# Fix — En-têtes de jours en noir (WeekGrid)

## Fichier cible
`src/app/planning/page.tsx` — composant `WeekGrid`

## Problèmes identifiés

| Ligne | Problème |
|-------|----------|
| 2492 | `background:'var(--bg-card2)'` sur le div de grille d'en-tête → remplacer par `'var(--card)'` |
| 2495 | `background:'#161b22'` fixe sombre sur chaque cellule de jour → remplacer par `'var(--bg-card)'` |
| 2495 | `border: '1px solid rgba(255,255,255,.06)'` fixe → remplacer par `'1px solid var(--border)'` |
| 2496 | `color:'rgba(230,237,243,.25)'` fixe → remplacer par `'var(--text-dim)'` |
| 2497 | `color:'#e6edf3'` fixe → remplacer par `'var(--text)'` |

## Fixes appliqués

- Fond du container d'en-tête : `var(--bg-card2)` → `transparent`
- Fond de chaque cellule de jour : `#161b22` → `var(--bg-card)`
- Bordure par défaut : `rgba(255,255,255,.06)` → `var(--border)`
- Couleur du label du jour (LUN/MAR…) : `rgba(230,237,243,.25)` → `var(--text-dim)`
- Couleur du chiffre du jour : `#e6edf3` → `var(--text)` (cyan conservé pour aujourd'hui)
- Pills intensité : utilisent déjà `cfg.bg` / `cfg.border` — pas de changement nécessaire
