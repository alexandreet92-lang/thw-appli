# DESIGN.md — garde-fou visuel THW

Lu en premier par Claude avant tout écran / composant UI. Source complète : `docs/DESIGN_SYSTEM.md`.

1. **Aucun écran n'invente** : on assemble `src/components/shadcn/*` (Button, Card, Badge, Input, Switch, Tabs, Sheet, Dialog, Skeleton), `src/components/ui/*` (Segmented, SlideView, SlideOverlay, PageTransition) et `src/components/motion/*` (AnimatedList, Reveal). Vitrine : `/styleguide`.
2. **Polices** : `var(--font-display)` (Fraunces, ≥ 18 px, titres) et `var(--font-body)` (Inter, tout le reste, chiffres tabulaires). Jamais de littéral (`DM Sans`, `Syne`, `DM Mono`…).
3. **Rayons** : `var(--r-sm|md|lg|pill)` uniquement. **Couleurs** : tokens `var(--…)` uniquement. **Pas de bordure décorative** (fond `--bg-card2` à la place). **Squelette, jamais de spinner.**
4. **Mouvement** : navigation = glissement (SlideView / SlideOverlay / PageTransition), listes = AnimatedList, boutons = micro-animation intégrée. Jamais de transition ad hoc.
5. **Référence visuelle** : Claude iOS / Strava / ChatGPT (barre capsule, bulles, gros boutons ronds). En cas de doute : Figma (connecteur) puis `/styleguide`.
6. **Vérification automatique** : `npm run design:check` (cliquet) et `node scripts/design-shots.mjs <label>` (captures de tous les écrans). Pas de commit UI sans les avoir passés.
