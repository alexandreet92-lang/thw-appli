# PROMPT_ANALYSE_REDESIGN — Refonte visuelle page Analyse activité

## Fichier principal
- src/app/activities/page.tsx
  - SyncCharts (lignes ~958-1375) : courbes, layout desktop
  - ActivityDetail (lignes ~2161-2549) : données en haut

## FIX 1 — Courbes fines + nouvelles couleurs
strokeWidth: 1.5 partout. fillOpacity max 0.12.

| Courbe      | stroke    | fill                      |
|-------------|-----------|---------------------------|
| Altitude    | #94A3B8   | rgba(148,163,184,0.15)    |
| FC          | #F87171   | rgba(248,113,113,0.10)    |
| Puissance   | #818CF8   | rgba(129,140,248,0.10)    |
| Cadence     | #F472B6   | rgba(244,114,182,0.10)    |
| Vitesse     | #60A5FA   | rgba(96,165,250,0.10)     |
| Température | #6EE7B7   | rgba(110,231,183,0.10)    |

## FIX 2 — Nouvelles courbes
- Vitesse : velocity × 3.6 → km/h, cyclisme + course
- Température : stream temp, cyclisme + course

## FIX 3 — Layout desktop (≥ 768px)
CSS classes : .sync-left-col, .sync-right-val, .sync-mobile-header
- Mobile : header label + range min-max au-dessus de la courbe (inchangé)
- Desktop : left col 140px (label coloré + Max + Moy) + chart flex-1 + right val 60px (valeur hover ou moy)

## FIX 4 — Nouvelles données KPI (ActivityDetail hero strip)
- Durée Z2 : segments HR dans zone 2 (120-150 bpm hardcodé si pas de zones perso)
- W. Norm. : normalized_watts ou calculé (30s rolling RMS depuis stream watts)
- Cad. Max : a.max_cadence
- Roue libre : vel > 2 km/h AND watts < 10W (secondes cumulées)
- Temp. Max : max du stream temp
- EF : NP / FC_moy
