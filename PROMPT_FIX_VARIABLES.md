# Fix — Variables CSS incorrectes (SessionEditor + WeekGrid)

## Cause
Le refactor précédent a introduit des variables CSS qui n'existent pas dans ce projet :
`var(--card)`, `var(--muted)`, `var(--foreground)`, `var(--muted-foreground)`.

## Mapping de remplacement

| Incorrect           | Correct            |
|---------------------|--------------------|
| `var(--card)`       | `var(--bg-card)`   |
| `var(--muted)`      | `var(--bg-card2)`  |
| `var(--foreground)` | `var(--text)`      |
| `var(--muted-foreground)` | `var(--text-dim)` |

## Fichiers touchés
- `src/components/planning/SessionEditor.tsx` — replace_all sur les variables
- `src/app/planning/page.tsx` — WeekGrid header background (déjà corrigé dans commit précédent, vérification)
