# PROMPT_SELECTEUR_PANEL_FORMAT3 — Hero KPIs + détails compacts + 3 donuts + ActivityCurves

## Fichier modifié
- `src/app/activities/page.tsx` — `SelectionSheet`

## Police Inter
Déjà globale via `globals.css` l. 163 :
```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```
Aucune modification de `layout.tsx`. Le panneau hérite Inter par défaut ; ajout d'un `fontFamily` inline sur le wrapper en sécurité (en cas d'override par un ancêtre).

## Structure mise à jour
```
HEADER (titre 22 + sous-titre 13)
HERO KPIs (4 stats × 36 px + unité collée + séparateurs verticaux)
DÉTAILS COMPACTS (4 colonnes catégorisées en lignes label/valeur)
3 DONUTS (FC / Puissance / Vitesse)
COURBES (ActivityCurves réutilisé)
```

## Étape 1 — Header
- Padding 14 28 20 28, border-bottom var(--border)
- Titre 22 / 700, sous-titre 13 / tabular / var(--text-dim) marginTop 2
- Bouton ✕ : 32×32, fs 18, var(--text-dim)

## Étape 2 — Hero KPIs
4 cellules `HeroCell` :
- text-align center, padding 0 12
- border-right `1px var(--border)` (sauf dernière)
- Label 11 / 600 / 0.1em / uppercase / var(--text-dim) + mb 8
- **Valeur 36 / 600 / line-height 1 / tabular-nums**
- Unité (span) 14 / 500 / var(--text-dim) / ml 4

Logique des 4 stats (avec fallback) :
- **Distance** : `distM/1000` formaté → unité `km` (sinon `—`)
- **Puissance moy.** : `avg(wS)` → unité `W`. Si pas de puissance, bascule en **Allure moy.** depuis vS (en s/km, formatée `m:ss`) avec unité `/km`.
- **FC moy.** : `avg(hrS)` → `bpm`
- **Vit. moy.** : `avg(vS)` → `km/h`

Stats vides → `—` 36 px en `var(--text-dim)`, sans unité.

## Étape 3 — Détails compacts
Grille 4 colonnes (responsive 2 → 1). Composant `DetailLine` :
- flex justify-between, padding 4 0, fs 12
- Label gauche `var(--text-dim)`
- Valeur droite 600 / tabular-nums / `var(--text)`

4 colonnes :
- **Effort** : Durée / Vit. max / Roue libre (avec %)
- **Puissance** : Watts max / NP / W/kg (stub `—`)
- **FC & Cadence** : FC max / Cad. moy. / Cad. max
- **Terrain & Temp.** : D+ / D− combiné / Alt. moy/max combiné / T moy/max combiné

Titre section 10 / 700 / 0.12em / uppercase / var(--text-dim) + mb 10.

## Étape 4 — 3 donuts

### Composants donuts existants
Aucun composant FC / Power Donut réutilisable trouvé (`grep -ri ZoneDonut|FCZones|PowerZones|Doughnut`). Le `ZoneDonut` créé au précédent prompt est conservé et étendu.

### `ZoneDonut` actualisé
- SVG 130×130 (était 150×150)
- Fond circle `var(--bg-card2)` (donne le fond #f1f5f9 en mode clair)
- Titre 10 / 700 / 0.12em / center
- Légende verticale gap 4, fs 11, dot 9×9 borderRadius 2, label var(--text-dim), %  var(--text) 700
- **Masque les tranches à 0 %** (filter `pct > 0` sur la légende)

### Calcul `hrDist` (5 zones FC)
- Couleurs : `#3b82f6` / `#10b981` / `#eab308` / `#f97316` / `#ef4444`
- Noms : `Z1 Récup / Z2 Aérobie / Z3 Tempo / Z4 Seuil / Z5 VO2max`
- Buckets : `hrZones` config user si ≥ 5 ; sinon fallback 60 % / 70 % / 80 % / 90 % de max(hrS)

### Calcul `pwDist` (7 zones Coggan FTP)
- Couleurs violet gradient pâle → foncé : `#ddd6fe` → `#581c87`
- Buckets : <55% / 56-75% / 76-90% / 91-105% / 106-120% / 121-150% / >150%
- Skip si pas de FTP ou pas de watts

### Calcul `vitDist` (7 tranches vitesse) — NOUVEAU
- `À l'arrêt` (NaN/null/négatif) : `#1e293b`
- `0-10 km/h` : `#475569`
- `11-20 km/h` : `#06b6d4`
- `20-25 km/h` : `#3b82f6`
- `25-30 km/h` : `#8b5cf6`
- `30-35 km/h` : `#ec4899`
- `> 35 km/h` : `#ef4444`
- Compté sur vS (km/h) de la portion

## Étape 5 — Courbes
Inchangée : `<ActivityCurves activity={slicedActivity} />` avec streams sliced.

## Étape 6 — Style global
- `background: var(--bg)`
- `borderRadius: 16 16 0 0`
- `boxShadow: 0 10px 40px rgba(0,0,0,0.3)`
- `maxHeight: 90vh, overflowY: auto`
- Portal sur `document.body` (déjà OK)
- `fontFamily: Inter, system-ui, -apple-system, sans-serif` inline en sécurité

## Étape 7 — Responsive
```css
.sel-hero-grid    { grid-template-columns: repeat(2, 1fr); row-gap: 24px; }
.sel-details-grid { grid-template-columns: 1fr; }
.sel-donuts-grid  { grid-template-columns: 1fr; }
@media (min-width: 640px) {
  .sel-details-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .sel-hero-grid    { grid-template-columns: repeat(4, 1fr); row-gap: 0; }
  .sel-details-grid { grid-template-columns: repeat(4, 1fr); }
  .sel-donuts-grid  { grid-template-columns: repeat(3, 1fr); }
}
```

- < 640 : Hero 2 cols, détails 1 col, donuts 1 col
- 640-1024 : Hero 2 cols, détails 2 cols, donuts 1 col
- ≥ 1024 : Hero 4 cols, détails 4 cols, donuts 3 cols

## Inchangé
- `SelectionSheet` API (props identiques sauf ajout de `activity` au prompt précédent)
- Animations CSS `selSheetUp/Down/FadeIn/FadeOut`
- Portal sur `document.body`
- Calculs npSeg / dPlus / freePct / avgOf / maxOf / minOf
- `ActivityCurves` (réutilisé tel quel)
- Caller principal `ActivityCurves → SelectionSheet` — passé inchangé

## Vérification
- ✅ `npm run build` exit 0
- ✅ Header 22 / 13
- ✅ Hero KPIs : Distance / Puiss. moy. / FC moy. / Vit. moy. à 36 px
- ✅ Hero fallback : si pas de watts → Allure moy. en /km
- ✅ Stats vides → `—` en var(--text-dim) sans unité
- ✅ Détails 4 colonnes catégorisées avec lignes label/valeur 12 px
- ✅ 3 donuts FC / Power / Vitesse avec leurs palettes respectives
- ✅ Tranches 0 % masquées dans la légende
- ✅ Vitesse : tranche `À l'arrêt` pour NaN/null/négatif
- ✅ Courbes : ActivityCurves identique à la fiche principale
- ✅ Inter hérité globalement + inline en sécurité
- ✅ Responsive : 1024 → 4/4/3, 640 → 2/2/1, 0 → 2/1/1
