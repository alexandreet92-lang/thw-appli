# PROMPT_ACTIVITY_FIXES3 — 3 correctifs page activité

## FIX 1 — Records MMP depuis personal_records (même source que Performance)

### Diagnostic
- Page Performance (DatasTab.tsx) : table `personal_records`, sport='bike',
  distance_label ∈ ['Pmax','10s','30s','1min','3min','5min','8min','10min',
  '12min','15min','20min','30min','1h','90min','2h','3h','4h','5h','6h'],
  performance = watts en string
- Page activité : calcul dynamique depuis activities.streams.watts
  → incohérent avec Performance, potentiellement vide si streams partiels

### Correction
Dans PowerCurveChart (page.tsx ~line 767) :
- Garder le fetch streams pour prMmp (courbe visuelle 24m sur le graphique)
- Remplacer yearMmp/allTimeMmp par un fetch personal_records
- Mapping BIKE_DUR_TO_IDX : 'Pmax'→0, '10s'→2, '30s'→3, '1min'→4, '3min'→5,
  '5min'→6, '8min'→7, '10min'→8, '15min'→9, '20min'→10, '30min'→11,
  '1h'→13, '90min'→14, '2h'→15, '3h'→16, '6h'→17

## FIX 2 — Boîtes d'explication → accordéon InfoAccordion

### Composant InfoAccordion (dans page.tsx)
Props : title, summary, children
- État interne [open, setOpen]
- Background : var(--bg-card2), border : 1px solid var(--border), borderRadius: 10px
- Header row (flex, space-between) : titre + bouton "En savoir plus" / "Réduire"
- Résumé toujours visible (1-2 lignes)
- Contenu détaillé : transition maxHeight + opacity, borderTop quand ouvert

### Deux boîtes remplacées
1. DecouplingChart (~line 1329) : titre "Dérive cardiaque",
   résumé "Mesure comment votre FC évolue par rapport à votre puissance au fil de l'effort."
2. HrCumulativeChart (~line 1487) : titre "Durée cumulée par FC",
   résumé "Temps total passé à chaque niveau de fréquence cardiaque."

## FIX 3 — PowerDistribution : bins 25W, hauteur 320px

### Fichier : src/components/activity/PowerDistribution.tsx
- BIN : 10 → 25
- SVG minHeight : 280 → 320, maxHeight : 420 → 420
- Labels Y : afficher seulement si i * BIN % 50 === 0 (toutes les 50W)
- Labels fontSize : 8 → 11
- Valeur sur la barre si barW > 20 (au lieu de 36)

## Fichiers modifiés
- src/app/activities/page.tsx (FIX 1 + FIX 2)
- src/components/activity/PowerDistribution.tsx (FIX 3)
