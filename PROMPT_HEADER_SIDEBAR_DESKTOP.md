# PROMPT — Desktop : sidebar ancrée (push) + header flottant, sans barre du haut

> **DESKTOP UNIQUEMENT. NE PAS TOUCHER À L'INTERFACE MOBILE** (tiroir glissant déjà
> traité). Toutes les modifications sont conditionnées au breakpoint desktop. App en
> clair ET sombre. Tokens uniquement. Fichiers < 200 lignes.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Sidebar ancrée (push, PAS d'overlay)
1. Ancrée à gauche, visible par défaut (dépliée au chargement).
2. Fond blanc = page (`var(--bg)`).
3. Séparation discrète : ombre douce sur le bord droit + filet `var(--border)`.
4. En haut : « Hybrid » + avatar au même niveau (titre gauche, avatar droite).
5. Nav = entrées existantes. Item actif `var(--primary-dim)`, icônes neutres.

## B. Repli + contenu qui se décale
- ☰ flottant replie/déplie la sidebar. Au repli : sidebar sort à gauche, le contenu
  reprend toute la largeur (push, jamais d'overlay).
- Transition ~0,3 s, `prefers-reduced-motion` respecté.

## C. Header flottant (barre du haut supprimée)
- Supprimer la barre pleine + le logo desktop.
- Boutons flottants translucides (backdrop-blur, contour léger, ombre) ~38 px (icônes
  ~18) : gauche = ☰ (repli) ; droite = shuriken IA seul.
- Shuriken IA : asset existant (4 branches = Athéna), non redessiné, squircle dégradé.
- Scrim léger en haut.

## Implémentation
- `DesktopShell.tsx` (`hidden md:flex`) : sidebar ancrée en flux (largeur 248→0 animée =
  push), fond `var(--bg)` + ombre `3px 0 16px rgba(0,0,0,0.05)` + filet `var(--border)`,
  en-tête « Hybrid » + avatar (headerSlot), nav existante via `SidebarContent`. Header
  flottant : ☰ (suit le bord de la sidebar) + shuriken `logo_4bras.png` (squircle dégradé
  `--primary`→`--ai-accent`). Scrim léger. Transition 0,3 s, `prefers-reduced-motion`.
- `layout.tsx` : branche desktop = `<DesktopShell>` (ancien `<Sidebar/>` overlay +
  hamburger retirés). Mobile (`<MobileShell>`, `<MobileTabBar>`) inchangé.

## Checklist (cochée avant commit)
- [x] Modifs limitées au desktop (`hidden md:flex`) ; mobile intact.
- [x] Sidebar ancrée, dépliée par défaut, fond blanc + ombre de séparation discrète.
- [x] Haut de sidebar : « Hybrid » + avatar au même niveau.
- [x] ☰ replie/déplie ; le contenu se décale (flex, push), jamais recouvert (aucun overlay).
- [x] Barre du haut supprimée ; boutons flottants 38 px ; shuriken IA (asset existant) à
      droite ; aucun avatar dans le header.
- [x] Transition douce 0,3 s ; `prefers-reduced-motion` respecté (bascule instantanée).
- [x] Rendu clair ET sombre (tokens themed `--glass-*`, `--bg`).

### Réserves documentées
- L'ancien composant `Sidebar()` (overlay desktop + chrome mobile) n'est plus rendu nulle
  part ; laissé en place (export inerte) pour limiter le risque — suppression possible
  ultérieurement. `SidebarContent`/`Avatar` du même fichier restent utilisés par les 2 shells.
- Le shuriken flottant en haut à droite peut chevaucher une action de page placée en
  haut à droite (ex. `headerExtra`) ; acceptable, dans la gouttière droite.
- Vérification visuelle sur navigateur non effectuée dans cet environnement ; logique
  validée par revue + `npm run build`.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` passe. Aucun emoji.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
