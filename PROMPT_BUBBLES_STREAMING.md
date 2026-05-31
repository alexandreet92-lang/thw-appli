# Bulles de messages + streaming — alignées 680px

## Règle : CSS + rendu. Logique de streaming (TypedText/loading/isStreaming) intacte.

## État lu
- Messages rendus inline dans AIPanel (`active.msgs.map`), pas de composant séparé (AIMessageBubble supprimé)
- Curseur streaming existant : `▍` + animation `ai_cursor` (TypedText)
- `Dots` existant (ai_dot) utilisé ailleurs → non touché
- Avatar IA actuel = logo PNG du modèle ; bulle IA = texte libre sans fond
- Bulle user actuelle = `#3B8FD4`, borderRadius symétrique, maxWidth 78%

## FIX — Conteneur & bulles
- Wrapper liste messages : `maxWidth 680, margin 0 auto, width 100%` (le `.aip-messages` reste full pour le scroll)
- **Bulle user** : `alignSelf flex-end, marginLeft auto, maxWidth 70%, background #06B6D4, color #fff, borderRadius 18px 18px 4px 18px, padding 10px 16px, fontSize 14, lineHeight 1.5, wordBreak break-word, animation fadeUp` (avatar user conservé)
- **Avatar IA** : cercle 28px `rgba(6,182,212,0.12)` + icône `Zap` 14px `#06B6D4`
- **Bulle IA** : `background var(--bg-card), border 1px var(--border), borderRadius 4px 18px 18px 18px, padding 12px 16px, fontSize 14, lineHeight 1.65, wordBreak, animation fadeUp` (markdown via MsgContent existant ; tables/pre gardent overflow-x auto)
- **Indicateur 3 points** : dans la bulle IA quand `isStreaming && contenu vide` → 3 points `dotPulse` (var(--text-dim), délais 0/200/400ms)
- **Curseur ▋** : caractère `▍`→`▋`, couleur `var(--text-dim)` (animation ai_cursor conservée), disparaît quand isStreaming=false

## Keyframes (globals.css)
- `fadeUp` : existe déjà
- `dotPulse` : ajouté
- curseur : `ai_cursor` existant réutilisé (équivalent cursorBlink)

## Fichiers : globals.css, src/components/ai/AIPanel.tsx
