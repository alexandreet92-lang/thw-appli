# Refonte Interface IA — Style Claude.ai

## Objectif
Refonte visuelle de l'interface IA THW pour s'inspirer de Claude.ai.
4 nouveaux composants extraits d'AIPanel.tsx pour modulariser l'UI.

## Règles
- AISidebar.tsx < 180 lignes
- AIInputBar.tsx < 120 lignes
- AIQuickActionsSheet.tsx < 100 lignes
- AIMessageBubble.tsx < 80 lignes
- Aucun emoji
- npm run build doit passer
- Ne pas modifier agents ni routes API existantes
- TypeScript strict — pas de any
- Conversations dans localStorage `thw_ai_convs_v3` (inchangé)

## AISidebar.tsx
Remplace HistoryDrawer dans AIPanel. Sidebar conversations.
- Header : titre "Conversations" + bouton nouvelle conv + bouton fermer (mobile)
- Search input
- Liste conversations pinned puis recent
- Animation slide-in depuis gauche (mobile overlay)
- Desktop : colonne persistante (width : 220px, borderRight)
- Props minimal : convs, activeId, onSelect, onDelete, onNew, onPin, onClose, persistent?

## AIInputBar.tsx
Barre de saisie flottante style Claude.ai.
- Bouton "+" gauche -> ouvre le bottom sheet
- Textarea auto-resize (max 200px), Enter envoie, Shift+Enter newline
- Slot children pour model picker
- Bouton send (fleche haut) cyan quand input non vide
- Style : border-radius 24px, background var(--ai-bg2), no border-top

## AIQuickActionsSheet.tsx
Sheet bottom style Claude.ai (remplace PlusMenu).
- Slide from bottom, handle gris en haut
- Section "Joindre" (grille icones)
- Liste actions rapides par categorie
- Overlay semi-transparent derriere, clic ferme

## AIMessageBubble.tsx
Bulle message unique — pur layout/style, pas de logique.
- role=user : bulle bleue #3B8FD4 a droite + avatar initiales
- role=assistant : texte libre a gauche + logo modele (img tag)
- Accept children pour le contenu rendu (TypedText reste dans AIPanel)
- Props : role, modelId?, userInitials?, isStreaming?, children
