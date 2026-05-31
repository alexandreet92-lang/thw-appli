# Mode sombre noir pur + position menu "+"

## Règle : corrections ciblées. Logique (streaming/historique/agents) intacte.

## FIX 1 — Couleurs mode sombre (globals.css `.dark`)
Passage du bleu-marine au noir pur façon Claude.ai. Seules ces 9 valeurs changent :
| Variable | Avant | Après |
|---|---|---|
| --bg | #080A0F | #0A0A0A |
| --bg-alt | #0B0E15 | #111111 |
| --bg-card | #0F1117 | #171717 |
| --bg-card2 | #0D1219 | #1C1C1C |
| --bg-hover | rgba(255,255,255,0.05) | rgba(255,255,255,0.06) |
| --border | #1E2533 | rgba(255,255,255,0.10) |
| --border-mid | #263042 | rgba(255,255,255,0.15) |
| --input-bg | #0B0E15 | #1C1C1C |
| --nav-bg | #080A0F | #0A0A0A |
Texte, primary, shadow, gty-* : inchangés.

## FIX 2 — Champ de saisie via variables (plus de hardcode bleu)
`.aip-input-wrap` : `background var(--input-bg)`, `border 1px var(--border-mid)`.
Suppression des hardcodes #FFFFFF / #1C2333 / #2E3A4E (clair ET sombre gérés par les vars).
Focus : pas de changement de couleur (bordure var(--border-mid)).
`.aip-plus-menu` : `background var(--bg-card)`, `border 1px var(--border-mid)` (idem, plus de #1C2333).

## FIX 3 — Position du menu "+" ancrée au bouton
- Le bouton "+" enveloppé dans un `<div style={{ position:'relative' }}>`
- Rendu de `PlusMenu` déplacé DANS ce div (juste après le bouton), retiré du haut du footer
- Menu CSS : `position absolute, bottom calc(100%+8px), left 0, zIndex 200`
- Plus de positionnement relatif au footer entier ; pas de position:fixed

## Fichiers : globals.css, src/components/ai/AIPanel.tsx
