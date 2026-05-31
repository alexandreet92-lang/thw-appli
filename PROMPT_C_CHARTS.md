# PROMPT_C_CHARTS — Distribution de puissance + Efficacité aérobie

## Insertion
Après les Zones, avant le MMP (PowerCurveChart).

## Section 1 : PowerDistribution
Fichier : `src/components/activity/PowerDistribution.tsx`

Données :
- streams.watts (bins 10W, 1 point = 1 s)
- ftp : activity.ftp_at_time

Histogramme horizontal (barres allant vers la droite) :
- Y : tranches de puissance (0W en bas, max en haut)
- X : temps passé dans chaque tranche
- Couleur par zone FTP :
  Z1 <55%  → #94A3B8
  Z2 55-75% → #10B981
  Z3 75-90% → #06B6D4
  Z4 90-105%→ #F97316
  Z5 105-120%→ #EF4444
  Z6 >120%  → #7C3AED
- Si pas de FTP : tout en gris
- Toggle : Absolu (min) / Relatif (%)
- Légende zones + temps
- Insight texte auto (Z2 >50% / Z3 >40% / variable)

## Section 2 : AerobicEfficiency
Fichier : `src/components/activity/AerobicEfficiency.tsx`

Données :
- streams.watts + streams.heartrate
- Fenêtre glissante 5 min (300 échantillons à 1Hz)
- EF(t) = avg_watts / avg_hr, ignoré si avg_hr < 100 bpm

Courbe SVG native :
- Couleur ligne : #06B6D4, fill rgba(6,182,212,0.1)
- Ligne de tendance pointillée : #64748B
- Titre : EF moyenne + flèche tendance (↑/↓/→)
- Note explicative 1 ligne

## Modifications page.tsx
- Import PowerDistribution + AerobicEfficiency
- Insertion entre ANALYSE AUTO et GRAPHIQUES D'ANALYSE AVANCÉE
- Condition : isBike && streams.watts && streams.heartrate

## Fichiers
- `src/components/activity/PowerDistribution.tsx` (nouveau)
- `src/components/activity/AerobicEfficiency.tsx` (nouveau)
- `src/app/activities/page.tsx`
