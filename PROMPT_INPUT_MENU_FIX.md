# Champ de saisie + Menu "+" — contraste & liste compacte

## Règle : CSS + écran main du menu. Logique (streaming/historique/agents/modèles) intacte.

## État lu
- Champ saisie = `.aip-input-wrap` (CSS dans `<style>` AIPanel) → actuellement `var(--bg-card)` (#0F1117 sombre) = trop proche du fond
- Menu "+" = `PlusMenu` (réécrit au tour précédent) : écran main avec grille "Joindre" + 3 items navigables
- Sous-écrans actions/connecteurs/compétences : conservés

## FIX 1 — Champ de saisie contraste fort (CSS `.aip-input-wrap`)
- Clair : `background #FFFFFF`, `border 1px rgba(0,0,0,0.15)`, `box-shadow 0 2px 8px rgba(0,0,0,0.08)`
- Sombre (`html.dark`) : `background #1C2333`, `border 1px #2E3A4E`, `box-shadow 0 0 0 1px rgba(255,255,255,0.06)`
- Commun : radius 16, max-width 680, margin auto
- Focus : pas de changement de couleur. `.aip-textarea:focus { outline:none; box-shadow:none }` + `*:focus-visible` neutralisé dans le wrap

## FIX 2 — Menu "+" liste compacte
- Conteneur : classe `aip-plus-menu`, `position absolute`, `bottom calc(100%+6px)`, `left 0`, `minWidth 260`, radius 12, padding 6, `box-shadow 0 8px 32px rgba(0,0,0,0.24)`, anim `aip_menu_up`
  - Clair : bg #FFFFFF, border 1px rgba(0,0,0,0.12) ; Sombre : bg #1C2333, border 1px #2E3A4E
- Écran main = liste verticale :
  1. Paperclip — "Ajouter des fichiers…" → onFiles
  2. Camera — "Prendre une photo" → onCamera (mobile only)
  3. séparateur
  4. Zap — "Actions rapides" [›] → sous-écran actions
  5. Plug — "Connecteurs" [›] → sous-écran connecteurs
  6. Brain — "Compétences" [›] → sous-écran compétences
  7. séparateur
  8. Search — "Recherche" (inactif, opacity 0.45, not-allowed)
  9. Globe — "Recherche Web" (inactif)
- Sous-écrans : inchangés (slide aip_slide_in_right)

## Import lucide ajouté : `Search`
