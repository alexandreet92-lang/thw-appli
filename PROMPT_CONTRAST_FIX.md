# Contrast Fix — AI Coach (hiérarchie visuelle façon Claude.ai)

## Règle : CSS uniquement, aucune logique touchée.

## Diagnostic (après lecture du code restauré 19 mai)

Le CSS de l'AI Coach est inline dans `AIPanel.tsx` (`<style>`), variables locales `--ai-*` :
- `--ai-bg: #ffffff` (clair) / `#13161e` (sombre) — hardcodées, ne suivent pas le thème global
- **La sidebar `HistoryDrawer` utilise `background: var(--ai-bg)`** = exactement le fond de la zone chat → zéro contraste
- Cartes actions rapides : `background: var(--ai-bg2)` (#0f121a sombre = plus foncé que le chat) sans ombre → fade
- Champ saisie `.aip-input-wrap` : `#F4F4F5`/`#2A2A2E` hardcodés, sans bordure ni ombre

## Solution — hiérarchie à 3 niveaux (comme Claude.ai)

| Surface | Variable | Clair | Sombre |
|---|---|---|---|
| Sidebar | `var(--bg-alt)` | #e4eaf2 (gris) | #0B0E15 |
| Zone chat / cartes / input | `var(--bg-card)` | #ffffff | #0F1117 |
| Séparation | `var(--border-mid)` + ombre | visible | #263042 |

## Changements (AIPanel.tsx uniquement)

### FIX 1 — Variables `.aip-root` remappées sur le thème global
- `--ai-bg → var(--bg-card)`, `--ai-bg2 → var(--bg-alt)`, `--ai-border → var(--border)`, `--ai-text → var(--text)`, `--ai-mid → var(--text-mid)`, `--ai-dim → var(--text-dim)`
- Bloc `html.dark .aip-root` supprimé (le thème global gère déjà jour/nuit)

### FIX 2 — Cartes actions rapides
- `background: var(--bg-card)`, `border: 1px solid var(--border-mid)`, `boxShadow: var(--shadow-card)`, `borderRadius: 12`
- hover : `borderColor var(--primary)` + `boxShadow 0 4px 16px rgba(0,200,224,0.10)` + `translateY(-1px)`

### FIX 3 — Champ de saisie `.aip-input-wrap`
- `background: var(--bg-card)`, `border: 1.5px solid var(--border-mid)`, `borderRadius: 14`, `boxShadow: 0 2px 8px rgba(0,0,0,0.06)`
- focus-within : `borderColor var(--primary)` + `boxShadow 0 0 0 3px rgba(0,200,224,0.12)`

### FIX 4 — Typographie
- Sous-titre "Comment puis-je t'aider" : `var(--ai-dim)` → `var(--ai-mid)`
- Label "Actions rapides" : fontSize 11, letterSpacing 0.12em

### FIX 5 — Séparateur sidebar
- `HistoryDrawer` (persistant + overlay) : `background: var(--bg-alt)` + `borderRight: 1px solid var(--border-mid)`
