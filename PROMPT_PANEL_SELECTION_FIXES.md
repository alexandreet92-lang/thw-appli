# PROMPT_PANEL_SELECTION_FIXES — 4 fixes panel SelectionSheet

## Cause racine commune des Fixes 1 & 2
Les classes `.sel-hero-grid` / `.sel-details-grid` / `.sel-donuts-grid` étaient définies dans un `<style>` au sein de **`SyncCharts`** (composant orphelin depuis `faee52e`). `SyncCharts` n'étant plus monté, **les règles CSS n'étaient jamais injectées dans le document** → seul `display: grid` inline subsistait, sans `grid-template-columns` → chaque enfant prend toute la largeur, layout cassé (stats empilées verticalement, valeurs poussées au bord droit du panneau).

### Fix appliqué
Bloc `<style>` injecté **directement dans le `sheetNode`** (premier enfant du fragment, avant les divs) → ré-injecté à chaque ouverture du sheet, indépendamment de `SyncCharts`. Contient :
- Animations `selSheetUp/Down/FadeIn/FadeOut`
- Règles responsive `.sel-hero-grid` (2 → 4 cols), `.sel-details-grid` (1 → 2 → 4 cols), `.sel-donuts-grid` (1 → 2 → N cols dynamique)

## Fix 1 — Hero KPIs (4 stats côte à côte)
`.sel-hero-grid` → `grid-template-columns: repeat(4, 1fr)` à partir de 1024 px, sinon `repeat(2, 1fr)` avec `row-gap: 24px`. Les `HeroCell` ont déjà `text-align: center` + `border-right` (sauf dernière). **Aucune modification structurelle** — juste l'injection de la CSS qui manquait.

## Fix 2 — Détails compacts (4 colonnes catégorisées)
`.sel-details-grid` → mobile 1 col, ≥ 640 px 2 cols, ≥ 1024 px 4 cols. Le composant `DetailLine` utilise déjà `display: flex; justify-content: space-between` (scopé à sa colonne, pas au panneau global). Pareil : seule l'injection CSS manquait.

## Fix 3 — Donut Puissance affiche "—"

### Diagnostic ajouté
```ts
if (typeof window !== 'undefined') {
  console.log('[SelectionSheet][DIAG Power]', {
    hasStreams:    !!activity.streams,
    streamsKeys:   activity.streams ? Object.keys(activity.streams) : [],
    wattsSamples:  wS?.slice(0, 5),
    wattsLen:      wS?.length ?? 0,
    ftp,
    ftp_at_time:   activity.ftp_at_time,
    hasAnyPositive: wS?.some(w => w != null && w > 0) ?? false,
  })
}
```

### Cause probable
La condition d'avant ne calculait rien si `ftp` était `null` ou `≤ 0` → array vide → ZoneDonut affichait `'—'`. Sur une activité vélo avec watts mais sans FTP renseigné, le donut était caché.

### Fix appliqué
- Calcul `hasPowerData = !!wS && wS.length > 0 && wS.some(w => w != null && w > 0)` (gate sur la présence effective des samples watts, pas sur FTP)
- `ftpForZones = (ftp && ftp > 0) ? ftp : 200` — fallback **200 W** si FTP manquant, pour qu'on puisse quand même répartir
- `ZoneDonut` retourne **`null`** quand `totalPct ≤ 0` (au lieu d'afficher `—`) → la grille s'ajuste automatiquement
- Le donut Puissance n'est rendu QUE si `hasPowerData` (gate `visibleDonuts.push(...)` côté JSX)

## Fix 4 — Remplacer Vitesse par Température + ajouter Cadence

### Données et présence
- `hasHrData`    : ≥ 1 sample FC > 0
- `hasPowerData` : ≥ 1 sample watts > 0
- `hasTempData`  : ≥ 1 sample temp valide
- `hasCadData`   : ≥ 1 sample cadence > 0

### Donut **Température** (7 tranches) — `TEMP_ZONES_DEF`
```
< 10 °C     #1e40af   (froid)
10-15 °C    #3b82f6
15-20 °C    #06b6d4   (frais)
20-25 °C    #10b981   (tempéré)
25-30 °C    #eab308   (chaud)
30-35 °C    #f97316
> 35 °C     #ef4444   (caniculaire)
```
Compte chaque sample `temp` non-null. Masqué si pas de stream.

### Donut **Cadence** (7 tranches) — `CADENCE_ZONES_DEF`
```
< 50 rpm    #1e293b   (quasi à l'arrêt)
50-60       #475569
61-70       #06b6d4
71-80       #3b82f6
81-90       #10b981   (zone optimale)
91-100      #eab308   (rapide)
> 100 rpm   #f97316   (sprint)
```
**Samples ≤ 0 rpm exclus** du calcul (roue libre, capteur off). Masqué si aucun sample > 0.

### Suppression donut Vitesse
`SPEED_ZONES_DEF` et `vitDist` supprimés.

### Liste dynamique
```ts
const visibleDonuts = []
if (hasHrData)    visibleDonuts.push({ title: 'Répartition FC',          data: hrDist   })
if (hasPowerData) visibleDonuts.push({ title: 'Répartition Puissance',   data: pwDist   })
if (hasTempData)  visibleDonuts.push({ title: 'Répartition Température', data: tempDist })
if (hasCadData)   visibleDonuts.push({ title: 'Répartition Cadence',     data: cadDist  })
```
Si `visibleDonuts.length === 0` → la section entière disparaît (pas d'espace vide).

## ZoneDonut compact (100×100 + légende dessous)
- SVG 100×100 (au lieu de 130×130)
- Légende **sous** le donut (pas à côté), 1 colonne, `display: flex; flex-direction: column; gap: 3`
- Lignes légende : dot 8×8 + label var(--text-dim) avec ellipsis + % gras
- Font 10 px (au lieu de 11)
- Tranches à 0 % masquées
- `null` retourné si totalPct ≤ 0 (pas de `—`)

## CSS injecté
```css
.sel-hero-grid    { grid-template-columns: repeat(2, 1fr); row-gap: 24px; }
.sel-details-grid { grid-template-columns: 1fr; }
.sel-donuts-grid  { grid-template-columns: 1fr; }
@media (min-width: 640px) {
  .sel-details-grid { grid-template-columns: repeat(2, 1fr); }
  .sel-donuts-grid  { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .sel-hero-grid    { grid-template-columns: repeat(4, 1fr); row-gap: 0; }
  .sel-details-grid { grid-template-columns: repeat(4, 1fr); }
  .sel-donuts-grid  { grid-template-columns: repeat(${visibleDonuts.length}, 1fr); }
}
```
Le nombre de cols donuts est **dynamique** : si 2 donuts visibles, 2 cols sur desktop (pas 4 avec colonnes vides).

## Inchangé
- `ActivityCurves` (section courbes) — strictement aucune modification
- API SelectionSheet
- Animations CSS / portal
- Calculs `npSeg`, `dPlus`, `freePct`
- `hrDist` (Fix #1 OK), structure de `DetailLine` et `HeroCell`

## Vérification
- ✅ `npm run build` exit 0
- ✅ Hero KPIs : 4 cols sur desktop (1024+), 2 cols dessous, séparateurs verticaux préservés
- ✅ Détails : 4 cols sur desktop avec valeurs scopées à leur colonne (plus de fuite vers le bord droit)
- ✅ Donut Puissance : rendu si `wS` contient ≥ 1 sample > 0, fallback FTP 200 W
- ✅ Donut Vitesse : **supprimé**
- ✅ Donut Température : 7 tranches `#1e40af` → `#ef4444`, masqué si pas de stream temp
- ✅ Donut Cadence : 7 tranches `#1e293b` → `#f97316`, 0 rpm exclus, masqué si stream cadence vide
- ✅ Layout donuts dynamique : 1 / 2 / 3 / 4 cols selon le nombre de donuts visibles
- ✅ Diagnostic console.log Puissance ajouté
- ✅ Mode jour/nuit OK (var(--bg-card2), var(--border), var(--text), var(--text-dim))
