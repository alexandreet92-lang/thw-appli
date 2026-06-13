# Fix — Variables CSS incorrectes (SessionEditor + WeekGrid)

## Statut : DÉJÀ APPLIQUÉ (commit 264047d → 88d3070)

## Cause initiale
Le refactor SessionEditor (layout flex) avait introduit des variables CSS inexistantes :
`var(--card)`, `var(--muted)`, `var(--foreground)`, `var(--muted-foreground)`.

## Mapping de remplacement appliqué

| Incorrect                 | Correct            |
|---------------------------|--------------------|
| `var(--card)`             | `var(--bg-card)`   |
| `var(--muted)`            | `var(--bg-card2)`  |
| `var(--foreground)`       | `var(--text)`      |
| `var(--muted-foreground)` | `var(--text-dim)`  |

## État vérifié

- SessionEditor.tsx : 0 occurrence de var(--card/muted/foreground/muted-foreground)
- Sheet background = `var(--bg-card)` ✓
- Backdrop zIndex: 998, Sheet zIndex: 999 ✓
- WeekGrid header background = `var(--bg-card)` ✓
- Cellules de jours : background `var(--bg-card)`, bordure `var(--border)` ✓
