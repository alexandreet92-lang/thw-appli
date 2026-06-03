# Page activité cyclisme — 4 améliorations (chirurgicales)

`npm run build` doit passer. Lire chaque fichier avant de modifier.

## Point 3 — Tableau des laps de puissance
Composant du tableau des laps (T1/T2/T3 + stats). Améliorations typographiques :
- Chiffres en **Barlow Condensed**, `font-variant-numeric: tabular-nums`, taille cohérente.
- Labels de colonnes 9-10px, uppercase, letter-spacing, couleur `var(--fg3)`.
- Numéro de tour + durée + stats sur une ligne aérée, padding cellules ≥ 8px 12px.
- Bordures `var(--border)`.
- Indicateur de zone : **fin border-left coloré 4px**, plus un bloc pleine largeur.

## Point 4 — Panneau détail lap
Ajouter **Température moyenne** après Cadence moy. Lire `temp_avg`/équivalent du lap.
Absent → « — ». Rien d'autre modifié.

## Point 5 — Surpage sélection (slide-up)
Remplacer la modale centrée (drag sur courbes) par un panneau slide-up bottom :
translateY(100%)→0 300ms ease-out, overlay rgba(0,0,0,.3) (clic = ferme), ✕ + drag-down,
fixed bottom:0, radius 18px haut, `var(--bg)`, handle 36×4. Titre « Sélection — Xm Ys ».
Stats en 5 groupes (Effort, Puissance, Cadence, Terrain, Température) — desktop colonnes,
mobile empilé. Valeurs Barlow Condensed tabular-nums `var(--fg)`. 6 mini-courbes du segment
(Altitude/FC/Puissance/Vitesse/Cadence/Température) avec crosshair synchronisé + tooltip.
2 jauges zones (puissance polarisée + FC). Données absentes → « — ».

## Point 6 — Bug crosshair hors zone
Ligne verticale + tooltip uniquement si curseur dans [xMin,xMax] du tracé. Sinon rien.

## Règles
Couleurs fond/texte/bordure via variables CSS. Couleurs fonctionnelles fixes
(#06B6D4, #EF4444, #10B981, #F97316). Jamais de hardcode fond/texte. Absent → « — ».
