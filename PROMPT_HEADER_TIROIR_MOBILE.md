# PROMPT — Mobile : header flottant + tiroir style Claude (la page glisse sur la sidebar)

> **MOBILE UNIQUEMENT. NE PAS TOUCHER À L'INTERFACE DESKTOP.** Toutes les modifications
> sont conditionnées au breakpoint mobile ; l'affichage desktop reste tel quel. App en
> clair ET sombre. Tokens uniquement. Fichiers < 200 lignes.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Header flottant (mobile)
1. Supprimer la barre d'en-tête pleine + le logo à gauche.
2. Boutons flottants translucides (backdrop-blur, contour léger, ombre douce) :
   gauche = menu (☰) ; droite = shuriken IA seul (l'avatar quitte le header → sidebar).
3. Boutons ~38 px (max 40), icônes ~18 px.
4. Shuriken IA : RÉUTILISER l'asset/composant existant du repo (4 branches = Athéna),
   dans son squircle dégradé de marque. Ne pas redessiner.
5. Contenu décalé via `env(safe-area-inset-top)` + scrim léger en haut.

## B. Tiroir — effet Claude
- Sidebar fixe EN DESSOUS (z-index inférieur). C'est la PAGE qui glisse vers la droite
  par-dessus (coins arrondis + ombre portée à gauche quand décalée).
- Décalage ≈ 60–65 % de la largeur.
- Ouverture/fermeture au tap ☰ ET au glissement du doigt (drag + snap au seuil ~40 %).
- `transform: translateX` (pas de left/width), gestes en refs (pas de setState/frame),
  60 fps. `prefers-reduced-motion` → bascule instantanée.
- Fermeture aussi en tapant la zone visible de la page quand le tiroir est ouvert.

## C. Sidebar (contenu)
- Fond BLANC = page (`var(--bg)`), pas de gris. Séparation par ombre + coins arrondis de
  la page au-dessus.
- En haut : titre « Hybrid » + photo de profil (avatar) au même niveau, même ligne.
- Réutiliser les entrées de navigation existantes. Item actif discret (fond léger).

## Implémentation
- `MobileShell.tsx` (md:hidden) : sidebar fixe dessous (z1, fond `var(--bg)`) + page qui
  glisse au-dessus (z2, `transform: translateX`, coins arrondis + ombre), header flottant
  (menu + shuriken `/logos/logo_4bras.png` dans squircle dégradé `--primary`→`--ai-accent`).
  Gestes en refs (transform peint par frame, aucun setState/frame).
- `Sidebar.tsx` : `SidebarContent`/`Avatar` exportés + `headerSlot` optionnel (override
  de l'en-tête) → desktop inchangé. MobileShell réutilise toute la nav existante.
- `layout.tsx` : branche mobile = `<MobileShell>`. Desktop intact.
- `globals.css` : tokens `--glass-bg`/`--glass-border` (clair+sombre) ; fade de la
  bottom-bar quand `body.drawer-open`.

## Checklist (cochée avant commit)
- [x] Modifs limitées au mobile ; desktop intact (branche desktop non touchée ; ajouts additifs).
- [x] Barre pleine + logo supprimés ; boutons flottants 38 px (icônes ~18-22).
- [x] Droite du header = shuriken IA seul (asset existant `logo_4bras.png`, non redessiné).
- [x] Sidebar : fond BLANC (`var(--bg)`), « Hybrid » + avatar sur la même ligne.
- [x] Tiroir : sidebar fixe dessous, PAGE glisse au-dessus (ombre + coins arrondis).
- [x] Ouverture au tap ☰ ET glissement, avec snap (seuil 40 %).
- [x] 60 fps (transform + refs, pas de setState/frame), `prefers-reduced-motion` respecté.
- [x] Fermeture au tap sur la page visible (overlay quand ouvert).
- [x] Rendu clair ET sombre (tokens themed).

### Réserves documentées
- **Ouverture au glissement = edge-swipe** depuis le bord gauche (≤ 28 px) quand fermé,
  pour ne pas capturer les scrolls horizontaux internes (graphes SyncCharts). Fermeture
  par glissement depuis n'importe où quand le tiroir est ouvert.
- **Barre d'onglets du bas** : ne glisse pas avec la page (composant séparé) ; elle
  s'efface (`opacity 0`) quand le tiroir est ouvert, pour ne pas flotter au-dessus de la
  sidebar révélée.
- `/competences` conserve son header propre → boutons flottants masqués sur cette page
  (comme avant) ; le tiroir reste ouvrable par edge-swipe.
- `touchmove` non `preventDefault` (listeners React passifs) ; le conflit de scroll est
  géré par la détection de direction + `overflow-x: hidden`.
- Vérification visuelle sur device réel non effectuée dans cet environnement (pas de
  rendu mobile interactif) ; logique validée par revue + `npm run build`.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` passe. Aucun emoji.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
