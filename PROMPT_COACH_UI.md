# PROMPT_COACH_UI — Corrections UI interface AI Coach

## FIX 1 — Fond du champ de saisie
`.aip-input-wrap` CSS : `background: var(--bg-card)` → `background: var(--ai-bg2)`
Légèrement plus clair que `var(--ai-bg)` (fond du panel), cohérent avec les bulles suggestions.

## FIX 2 — Sidebar 1cm plus large (+38px)
- Persistent desktop : `width: 240` → `width: 278`
- Overlay mobile : `width: 260` → `width: 298`
(ligne ~11782 et ~11802 dans HistoryDrawer)

## FIX 3 — Champ de saisie plus large
`.aip-input-wrap` CSS : `max-width: 680px` → `max-width: 756px`
`.aip-input-footer` CSS : `padding: 0 16px 16px` → `padding: 0 4px 16px`
Les deux ensemble donnent +76px de largeur utile.

## Fichier modifié
- src/components/ai/AIPanel.tsx
