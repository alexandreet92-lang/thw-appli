# PROMPT — SessionEditor desktop (modale 2 colonnes)

## PÉRIMÈTRE
DESKTOP UNIQUEMENT. Le mobile (`PROMPT_SESSION_EDITOR_MOBILE.md` +
`PROMPT_BLOCS_MUSCU_HYROX.md`) ne bouge pas. Breakpoint : desktop = largeur ≥ 1024px.
En dessous : layout mobile actuel intact. Réf : `maquette_desktop_velo.html`,
`maquette_desktop_muscu.html`.

## PRINCIPE — on RÉORGANISE, on ne réécrit pas
Le desktop réutilise EXACTEMENT les mêmes composants éditoriaux que le mobile
(mêmes builders par sport, mêmes cartes, mêmes calculs SM/SN, mêmes champs). Seule
la MISE EN PAGE du conteneur change : d'une colonne (sheet mobile) à DEUX colonnes
(modale desktop). Aucune duplication de logique builder.

## 1 — Conteneur : modale centrée
Modale centrée au-dessus d'un overlay assombri (pas un bottom sheet). Largeur max
~1200px centrée, hauteur max ~90vh, coins ~18px, ombre marquée, au-dessus de la nav
desktop (z-index). Header sticky, footer sticky, corps scrollable.

## 2 — Header
chip sport coloré + UN titre (Fraunces ~23px) + badge Plan A + ✕. Bordure basse.

## 3 — Corps : deux colonnes (grid 370px / 1fr)
- GAUCHE (370px) « Paramètres », scroll indépendant : sélecteur 7 sports · sous-discipline ·
  type · date/heure · effort perçu · durée · SM/SN · mini-stats · description (= MainFields).
- DROITE (1fr) « Construction de la séance », scroll indépendant : en-tête + toggle
  Manuel/IA, bandeau 4 cases, builder du sport (endurance = profil + blocs ; muscu/hyrox =
  groupes + exercices + presets). Les rangées de champs d'un bloc passent sur UNE ligne
  (4 colonnes) au lieu de 2×2 (grille responsive `.se-fgrid`, pas de composant dupliqué).

## 4 — Footer sticky
‹ Fermer · PDF · ★ Favori · (espace) · Enregistrer (accent sport). Toujours visible.

## 5 — Grand écran
Au-delà de ~1280px, modale gardée à max-width et centrée (colonnes non étirées).

## IMPLÉMENTATION
- Breakpoint `wide = innerWidth >= 1024` dans SessionEditor ; rendu :
  `wide → SessionEditorDesktop`, sinon `mobile (<640) → SessionEditorMobile`, sinon legacy
  (640–1024 inchangé).
- Composants partagés extraits sans réécriture : `panelProps.ts` (props communes),
  `BuilderSection.tsx` (routeur sport→builder), `PanelChrome.tsx` (header + footer),
  `SessionEditorDesktop.tsx` (mise en page 2 colonnes). Mobile refactoré pour réutiliser
  ces pièces (rendu identique).
- Thème éditorial appliqué à `.se-m, .se-d` ; `.se-fgrid` = 2 col → 4 col à ≥1024 sous `.se-d`.

## CONTRAINTES
Desktop seulement. Mobile strictement inchangé. Réutilisation des composants (zéro
duplication de logique). Variables CSS, pas de hex en composant. Pas d'emoji. Icônes
Tabler. Fraunces + sans. TS strict, pas de `any`. Max ~200 lignes/fichier. SM/SN,
sauvegarde, plan A/B inchangés. `npm run build` lançable → vérifié.
