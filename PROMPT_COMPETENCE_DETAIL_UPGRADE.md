# Modal détail compétence — refonte visuelle + mobile

NE PAS changer la structure des données ni la table competences. Le
`prompt_base` reste en 4 blocs `[Philosophie] [Règles] [Exclusions]
[Adaptations]` — on le PARSE pour l'afficher en 4 sections colorées.

## PARTIE 1 — Refonte visuelle (desktop + mobile)
- `parsePrompt(promptBase)` → `{ philosophie, regles, exclusions, adaptations }`
  (extraction entre marqueurs). Si aucun marqueur trouvé → fallback : affiche
  le prompt brut dans une section neutre (police Inter, plus de monospace).
- 4 sections colorées via classes CSS (couleurs light + override `html.dark`) :
  - Philosophie : rose `#FEF2F2`/`#FECACA`, icône Target, label `#DC2626`
  - Règles : bleu `#EFF6FF`/`#BFDBFE`, icône ClipboardList, label `#2563EB`
  - Exclusions : rouge `#FEF2F2`/`#FCA5A5`, icône AlertTriangle, label `#DC2626`
  - Adaptations : vert `#F0FDF4`/`#BBF7D0`, icône Sliders, label `#059669`
- Section Remodeler : icône MessageSquare, fond blanc (`.cmp-section-remodeler`),
  input style AI Coach (`.comp-input-wrap`) déjà blanc.
- Header : badge icône Zap (24×24, `rgba(6,182,212,0.12)`), nom (18px/600),
  sous-titre `Sport · Catégorie` (11px), pill « Active » si actif + tags conflit,
  bouton X 32×32.

## PARTIE 2 — Typographie
Contenu des sections en `Inter, system-ui, -apple-system, BlinkMacSystemFont,
sans-serif` (Inter non chargée dans le projet → fallback system-ui propre),
14px / line-height 1.65 / letter-spacing -0.01em. Plus de monospace.

## PARTIE 3 — Cyan cohérent #06B6D4
Swap mécanique (sûr pour le build) du teal de marque vers `#06B6D4` :
`#00c8e0`/`#00C8E0`, `#00B8D4`, `rgba(0,200,224,x)`, `rgba(0,184,212,x)`
→ `#06B6D4` / `rgba(6,182,212,x)`, dans tout `src/` (hors `*.backup.*`).
Variable `--primary` mise à `#06B6D4`. (Le `#0EA5E9` sky-blue est laissé tel
quel : couleur distincte de séries graphiques, risque de collision.)

## PARTIE 4 — Mobile : header /competences plus coupé
- Header global de l'app (`[data-app-header]`, rendu par `Sidebar`) masqué sur
  `/competences` via `usePathname()` (composant client) — robuste.
- `:has` conserve `margin-top:0` + `height:100vh` du `<main>` (filet CSS).
- Header dédié de la page : sticky top 0 + `env(safe-area-inset-top)` (déjà fait).

## PARTIE 5 — Animation slide modal mobile (iOS sheet)
- Bottom sheet : `position:fixed; bottom:0; height:92vh; border-radius:16 16 0 0;`
  fond blanc pur (`.comp-modal-fullscreen`). Handle gris en haut. Overlay
  `rgba(0,0,0,0.5)` (tap = fermer).
- Ouverture : `slideUpMobile 320ms cubic-bezier(.32,.72,0,1)` + `fadeInOverlay`.
- Fermeture : état `isClosing` → `slideDownMobile` + `fadeOutOverlay` 300ms,
  puis `onClose()`.

npm run build : 0 erreur.
