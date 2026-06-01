# Compétences — Corrections bugs + esthétique

Corrections ciblées (CSS + ajustements). Pas de réécriture de composants,
pas de changement de logique (activation/conflits/IA).

## Bugs
- **BUG 1** — Clic "Compétences" dans menu "+" ne faisait rien : déjà corrigé
  (onClick = `onClose()` + `router.push('/competences')`, `useRouter` importé).
  L'ancien comportement `goTo('competences')` ouvrait un sous-écran vide.
- **BUG 2** — Item "Compétences" supprimé de la sidebar du Coach IA
  (HistoryDrawer). Accès via menu "+" et Réglages IA uniquement.

## Fixes esthétiques (page /competences + globals.css)
1. SportSidebar : icônes alignées (conteneur 18×18, flex center, flex-shrink 0).
2. Espacement Sports / Catégories : divider `margin: 14px 10px`, label
   Catégories `margin-top: 10px`.
3. Contraste items sidebar : couleur de base `var(--text)` (au lieu de
   `--text-mid`), hover `--bg-hover`, actif `rgba(6,182,212,0.10)` / `#06B6D4`.
4. Toggle ON/OFF visible en clair : nouvelle variable `--toggle-off`
   (clair `#D1D5DB`, sombre `var(--border-mid)`) + bordure légère, dot ombré.
5. Bouton X du modal : 32×32, rond, `--bg-hover`, icône 16 `var(--text)`.
6. Footer modal : 3 boutons (Supprimer rouge si custom à gauche, Fermer +
   Enregistrer à droite, `justify-content: space-between`).
7. Input "Remodeler" identique à l'AI Coach : classe `.comp-input-wrap`
   (border 1.5px, radius 14, focus glow cyan), textarea + row mic/envoi.
8. Colonne "Créer" : message d'accueil enrichi + 3 chips d'exemples cliquables
   (insèrent le texte + focus), input style AI Coach.
9. CompetencesLibrary : `gap: 12px`, padding `8px 14px 16px` entre cartes.
10. Badge header : `font-size 12`, `font-weight 500`, `color var(--text)`,
    fond `--bg-alt`, bordure `--border-mid`, X en cyan bold 13px.

## globals.css
- `--toggle-off` (clair/sombre)
- `.comp-input-wrap` + `:focus-within`

Mode jour ET sombre vérifiés. `npm run build` : 0 erreur TypeScript.
