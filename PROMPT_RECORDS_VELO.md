# PROMPT — Refonte Records / Vélo + feuille « Modifier un record »

> Application du Design System (`docs/DESIGN_SYSTEM.md`) à la vue Records/Vélo
> (onglet Performance › Datas › Records) **et** à la bottom sheet d'édition d'un
> record. App en mode sombre — tokens uniquement, jamais de couleur en dur.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

---

## Principe

« Le calme par soustraction » (§0). Une vue = neutres + **un** accent (`--primary`)
+ points sémantiques sport. On retire : aplats colorés, badges dégradés, chiffres
teintés « pour faire joli », polices hors Fraunces/Inter (DM Mono, Syne supprimées),
bordures décoratives.

---

## Section B — Feuille « Modifier un record » (`RecordDrawer`, `DatasTab.tsx`)

Bottom sheet via `createPortal` (déjà en place). Neutralisation complète :

- [x] **Conteneur** : bordure `var(--border)` (plus de `${color}30`), classe
      `.rec-drawer` pour le focus piloté par tokens.
- [x] **Header** : fond transparent + `borderBottom var(--border)` (plus d'aplat
      `${color}10`). Le sport est porté par un **point de 7px** `background:color`
      (palette sport sanctionnée) + libellé neutre. Tag distance neutre
      (`--bg-card2`, sans bordure). Titre en `var(--font-display)` 17 « Modifier
      le record » (plus de Syne).
- [x] **Champs** : `--r 10px`, `border var(--border-mid)`, `font-body` (plus de
      DM Mono). Focus `var(--primary)` + halo `var(--primary-dim)` via la règle
      CSS `.rec-drawer input:focus / textarea:focus / select:focus` dans
      `globals.css`.
- [x] **Sections** (Performance / Conditions) : `secBox` = fond `--bg-card2` sans
      bordure (séparation par le fond, §3). Labels de section neutres
      `var(--text-dim)` font-body (plus de jaune/Syne). Icônes en `var(--text-dim)`.
- [x] **Valeurs calculées** (allure, W/kg, split…) : texte inline neutre
      `→ {valeur}` en `var(--text-mid)` tabulaire (plus de pastille teintée
      `${color}18` + DM Mono). **W/kg n'est plus un badge jaune** mais du texte neutre.
- [x] **Segmenté** (Home trainer / Extérieur, Surface, Bassin, Support…) : chip
      actif élevé sur `--bg-elev`, inactif transparent (plus d'aplat sport plein
      ni texte `#000`).
- [x] **Récap** : fond `--bg-card2` sans bordure (plus de boîte verte
      `rgba(34,197,94,…)`). Label « Résumé » neutre. Valeurs `var(--text)`
      tabulaires (plus de DM Mono ni de teinte sport).
- [x] **Bouton « Enregistrer ce record »** : `var(--primary)` plein +
      `var(--on-primary)`, font-body (PAS de dégradé sport, PAS de jaune,
      PAS de texte noir). État désactivé `--bg-card2` / `--text-dim`.
- [x] Avertissement « Renseignez votre poids » : `var(--text-dim)` (plus de `#f59e0b`).

## Section A — Vue Records / Vélo (`DatasTab.tsx`, `RadarChart.tsx`)

- [x] **A6 — Courbe de puissance** (`PowerCurveLogSVG`) : suppression des **aplats
      de remplissage** (`<polygon>` + gradients `defs` retirés). Lignes **fines**
      (1.25–1.75). **Année active nette en `var(--primary)`** (année sélectionnée,
      ou la plus récente en « All Time ») ; les autres années en `getPCColor`
      (tokens `--year-*`) à **opacité 0.4**. Points seulement sur l'année active /
      au survol. Crosshair `var(--border-mid)`, labels d'axes + tooltip en
      font-body tabulaire (plus de DM Mono ni de blanc en dur).
- [x] **Radar** (`RadarSVG`, partagé Profil + Records) : **polygone athlète unique
      en `var(--primary)`** (fill 0.14), anneaux de niveau en **pointillés neutres**
      (`--border` / `--border-mid` pour la cible 10) au lieu de l'arc-en-ciel par
      niveau. Vertex en `var(--primary)`. Labels font-body. Les axes restent
      **normalisés séparément** par leurs benchmarks par-axe (`scoreH`/`scoreL`),
      ce qui évite le « pic unique » dû à des échelles hétérogènes ; un seul axe
      renseigné = un seul sommet (comportement attendu, pas un bug).

### Reste à faire (non couvert par ce passage — à traiter dans un lot dédié)

- [ ] Sous-nav / pills sport & période de la page Records → segmented controls
      neutres + points sport (actuellement encore pills colorées).
- [ ] Jauges de records de puissance (gauges mod/bike) → version neutre.
- [ ] Scatters → version neutre + actions en lien `var(--primary)`.
- [ ] Chrome `RadarCard` (toggle M/F, bouton Barème, badge niveau global) encore
      en couleur sport / Syne — à neutraliser globalement avec le lot Profil.

---

## Contraintes communes

- TypeScript strict, zéro `any`, fichiers feature visés < 200 lignes quand créés.
- `npm run build` doit passer (inclut `check-colors --enforce` sur ENFORCED_PATHS).
- `DatasTab.tsx` et `RadarChart.tsx` ne sont pas (encore) dans ENFORCED_PATHS :
  la dette couleur restante n'échoue pas le build mais est neutralisée au fil de l'eau.
- Ne jamais toucher `src/lib/sync/strava.ts`. Aucune migration / schéma Supabase.
- **Commit local uniquement. NE PAS PUSH. Aucun déploiement Vercel.**
