# Sidebar & Header Redesign — AI Coach (façon Claude.ai)

## Règle : CSS + ajouts ciblés. Logique (streaming, historique, agents, modèles) intacte.

## État lu avant modification
- Header inline dans `AIPanel.tsx` (~19182) : dropdown agent "Hybrid Training/Networks" + boutons (history, export, fullscreen, close) + `border-bottom`
- Sidebar = `HistoryDrawer` (~11470) : header "Conversations" + search + liste + Réglages. Ne reçoit PAS `activeAgent`.
- Le switch d'agent (`setActiveAgent`) est dans le dropdown du HEADER → à déplacer dans la sidebar
- Champ saisie : `.aip-input-wrap`, bouton envoi `#00c8e0`, textarea `var(--ai-text)`

## Changements (AIPanel.tsx)

### FIX 1+2+8 — Sidebar fond/largeur/séparateur
- Conteneur persistant : `width: 240`, `background: var(--bg-card)`, `borderRight: 0.5px solid var(--border)`
- Overlay mobile : `background: var(--bg-card)`

### FIX 3 — Structure sidebar (HistoryDrawer)
Nouvel ordre : **Hybrid** (titre 16/500) → **+ Nouvelle conversation** → **Projets** (placeholder) → divider → label **AGENTS** + Training (point cyan #06B6D4, actif) + Networks (point rose #EC4899, opacity 0.38, disabled) → divider → label **DISCUSSIONS** + liste convs scrollable → flex spacer → **Réglages IA** (bas).
- `HistoryDrawer` reçoit 2 nouvelles props : `activeAgent`, `onAgentChange`
- Labels sections : 10px/600/letter-spacing 1.2px/uppercase/var(--text-dim)
- Dividers : 1px var(--border), margin 8px 12px. Aucune bordure verticale colorée.

### FIX 4+5 — Header nettoyé
- Affiche `active ? active.title : 'Hybrid Training'` (nom conversation)
- `border-bottom` supprimé
- Boutons droite (style commun 26×26, radius 8, border 0.5px var(--border), bg var(--bg-hover), hover var(--bg-alt)) :
  - mobile : history (ouvre sidebar overlay)
  - desktop : fullscreen (Maximize2)
  - toujours : close (ChevronRight) → `onClose()` existant

### FIX 6 — Champ de saisie
- `.aip-input-wrap` : `max-width: 680px; margin: 0 auto`, bg var(--bg-card), border 0.5px var(--border-mid), radius 14, **box-shadow none, pas de changement au focus** (suppression du glow)
- `.aip-textarea:focus { outline: none; box-shadow: none }`
- Bouton envoi : `background: #06B6D4`, disabled → var(--border)

### FIX 7 — Animations slide-up
- `@keyframes slideUp/slideDown` ajoutés dans globals.css ; menus (PlusMenu/ModelPicker) utilisent déjà `ai_slidein` (équivalent)
