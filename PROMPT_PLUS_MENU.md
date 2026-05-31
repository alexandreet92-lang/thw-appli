# Menu "+" — Architecture multi-écrans + connecteurs

## Règle : logique (streaming/historique/agents/modèles) intacte. Adapter l'existant.

## État lu
- Champ saisie + bouton "+" → ouvre `PlusMenu` (AIPanel.tsx ~11293)
- `PlusMenu` utilisait `PLUS_CATS` (liste plate) → remplacé
- Actions rapides avec modèle : `QUICK_ACTIONS` (label/sub/model/flow) → réutilisé pour le sous-écran Actions
- Logos : `/public/logos/apps/` (strava.png, polar.png ✅) ; Garmin **absent**, Notion/Sheets **absents**
- Agents sidebar (HistoryDrawer) : points colorés cyan/rose → remplacés par icônes Lucide
- Page Connexions : `/connections`
- Animations : keyframes globaux `slideUp` déjà pris (bottom-sheets) → noms uniques `aip_*` dans le `<style>` de AIPanel

## Partie 1 — Logos
- `public/logos/apps/notion-logo.png` ✅ téléchargé (Wikimedia)
- `public/logos/apps/google-sheets-logo.svg` ✅ téléchargé (Wikimedia)
- `public/logos/apps/garmin.svg` créé localement (Wikimedia rate-limité 429) — carré bleu Garmin + delta

## Partie 2 — Agents sidebar
- Training → icône `Zap` (lucide), `var(--text-mid)`, 15px ; actif : bg var(--bg-hover), texte var(--text), poids 500 (icône reste var(--text-mid))
- Networks → icône `Globe`, var(--text-mid), opacity 0.38, not-allowed, title "Bientôt disponible"

## Partie 3 — Menu "+" : 4 écrans
- État `MenuScreen = 'main' | 'actions' | 'connecteurs' | 'competences'` + `animating`
- Menu : `bottom: calc(100% + 8px)`, bg var(--bg-card), border 0.5px var(--border-mid), radius 14, shadow var(--shadow), overflow hidden, anim `aip_menu_up`
- **main** : section JOINDRE (Photos/Fichiers/Caméra mobile) + 3 items navigables (Actions rapides/Zap, Connecteurs/Plug, Compétences/Brain) avec ChevronRight
- **actions** : header retour + `QUICK_ACTIONS` (icône + nom + badge modèle), clic → onFlow/onEnriched/onPrepare existants + fermeture
- **connecteurs** : Strava+Polar (toggle ON #06B6D4 + pulse au mount), Garmin+Sheets+Notion (toggle OFF + "Connecter →" vers /connections)
- **competences** : état vide (Brain + textes)
- Navigation : `aip_slide_in_right` (entrée sous-écran), retour via ArrowLeft

## Partie 4 — TypeScript
- Types stricts, `animating` bloque les clics pendant transition (220/200ms)

## Keyframes ajoutés (style AIPanel)
`aip_menu_up`, `aip_slide_in_right`, `aip_toggle_pulse`
