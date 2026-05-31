# AI Coach — Corrections ciblées CSS

## Règle absolue
Aucun composant existant réécrit. Corrections CSS et ajouts ciblés uniquement.

## Fichiers modifiés
- `src/components/ai/AIPanel.tsx` — corrections CSS block + JSX chips/pills/input
- `src/components/ai/AIMessageBubble.tsx` — ajustements alignement bulles

## Diagnostic avant corrections

| Élément | Problème | Fix |
|---|---|---|
| Input wrapper | `var(--ai-bg2)` = `#ffffff` en clair | → `var(--input-bg)` = `#f0f6f9` |
| `focus-within` | Bleu `rgba(37,99,235,…)` | → Cyan `var(--ai-accent-dim)` |
| Bouton `+` | Tailwind hardcodé `#F2F2F2 / #2A2A2A` | → `var(--ai-bg2)` |
| Chips | Animation `ai_slidein` au lieu de `fadeUp` | → `fadeUp` + bons délais |
| Pills | `padding: '0 14px'` | → `'5px 14px'` |
| Bulle user | Manque `marginLeft: auto` | → ajouté |

## FIX 6 — fadeUp
Existe déjà dans globals.css (ligne 127). Aucun ajout nécessaire.
