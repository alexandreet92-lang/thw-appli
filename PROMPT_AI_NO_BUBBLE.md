# Messages IA — suppression de la bulle (style Claude.ai)

## Règle : CSS uniquement. Streaming/markdown intacts.

## État lu
Bulle IA (rendu inline dans AIPanel, `active.msgs.map`) avait au tour précédent :
`background var(--bg-card)`, `border 1px var(--border)`, `borderRadius 4px 18px 18px 18px`, `padding 12px 16px`.

## FIX
Le texte IA s'affiche directement sur le fond de la page :
- `background` → transparent
- `border` → none
- `borderRadius` → 0
- `boxShadow` → none
- `padding` → 0 (conteneur texte sans padding)
- Conservé : `flex: 1`, `color var(--text)`, `fontSize 14`, `lineHeight 1.65`, `wordBreak`, `fadeUp`, layout flex + avatar, alignement 680px, rendu markdown (MsgContent), indicateur 3 points, curseur

Avatar IA (cercle Zap) : `alignSelf flex-start`, `marginTop 4` (inchangé sinon).

Message utilisateur : **inchangé** (bulle cyan #06B6D4).

## Fichier : src/components/ai/AIPanel.tsx
