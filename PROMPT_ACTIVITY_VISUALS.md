# PROMPT_ACTIVITY_VISUALS — Visuels Activity (puissance + altimétrie)

## Fichiers modifiés
- src/components/activity/MmpTable.tsx     (FIX 1 typographie + FIX 3 durées)
- src/app/activities/page.tsx              (FIX 2 altimétrie en fond + BIKE_DUR_TO_IDX)

## FIX 1 — Typographie tableau Records/Durée/Cette séance
- Wattages → `<span className="stat-number">` (Barlow Condensed, tabular-nums)
- Cellules : padding vertical augmenté (5→7), padding horizontal lift léger
- En-têtes : padding 8/14, fs 11, plus aéré
- Aligne les colonnes "Records" et "Cette séance" sur les chiffres (textAlign right pour records, left pour séance)

## FIX 2 — Profil altimétrique en fond
Pour chaque track (HR, Puissance, Vitesse, Cadence, Allure, Température),
on ajoute un area chart de l'altitude en fond léger (rgba(148,163,184,0.15))
juste avant le `<path d={fillPath}>`.

```tsx
{alt && !track.isAlt && (
  <path d={buildFillPath(alt, track.H, 4, false)} fill="rgba(148,163,184,0.15)" />
)}
```

Pas de label, pas d'interaction : c'est un fond discret.

`buildFillPath` calcule déjà ses propres min/max depuis le tableau passé,
donc le path scale correctement à la hauteur du track courant.

La track "Altitude" elle-même (track.isAlt) reste intacte — aucun overlay.

## FIX 3 — Durées 12', 4h, 5h dans le tableau de puissance

### Nouvelle liste MMP_TABLE_DURATIONS (21 entrées)
```
[1, 5, 10, 30, 60, 180, 300, 480, 600, 720, 900, 1200, 1800, 2700,
 3600, 5400, 7200, 10800, 14400, 18000, 21600]
```

### Nouvelles labels MMP_TABLE_LABELS
```
["Pmax", "5''", "10''", "30''", "1'", "3'", "5'", "8'", "10'", "12'",
 "15'", "20'", "30'", "45'", "1h", "1h30", "2h", "3h", "4h", "5h", "6h"]
```

### BIKE_DUR_TO_IDX (mapping personal_records → indices)
Décalage causé par l'insertion de 12' (idx 9), 4h (idx 18), 5h (idx 19) :

| label     | ancien | nouveau |
|-----------|--------|---------|
| Pmax      | 0      | 0       |
| 10s       | 2      | 2       |
| 30s       | 3      | 3       |
| 1min      | 4      | 4       |
| 3min      | 5      | 5       |
| 5min      | 6      | 6       |
| 8min      | 7      | 7       |
| 10min     | 8      | 8       |
| 12min     | —      | 9       |
| 15min     | 9      | 10      |
| 20min     | 10     | 11      |
| 30min     | 11     | 12      |
| 1h        | 13     | 14      |
| 90min     | 14     | 15      |
| 2h        | 15     | 16      |
| 3h        | 16     | 17      |
| 4h        | —      | 18      |
| 5h        | —      | 19      |
| 6h        | 17     | 20      |

Durée non atteinte dans l'activité → `'—'` (logique existante : `d > sessionN`).

## Vérifications
- npm run build : 0 erreur
- Tableau aéré, chiffres alignés en Barlow Condensed
- Profil altimétrique gris léger derrière chaque courbe
- 12', 4h, 5h présents et triés correctement
