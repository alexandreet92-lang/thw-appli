# PROMPT_ACTIVITY_FIXES2 — Fixes page activité (4 correctifs)

## FIX 1 — Tooltip noir dans DecouplingChart
Tooltip (data-chart-tooltip) ligne ~1229 manquait de background/border.
Ajout : background: T.surface, border: `1px solid ${T.border}`, boxShadow.

## FIX 2 — Réorganisation layout bas de page (desktop)
Nouvel ordre après les Zones + Analyse automatique + PowerCurveChart/GapChart :

  A) DecouplingChart — pleine largeur (seul)
  B) PowerDistribution + HrCumulativeChart — grille 2 cols (gap: 24px)
     PowerDistribution : minHeight 280px
     HrCumulativeChart : H=200 → height 220px
  C) AerobicEfficiency — pleine largeur (déplacée depuis avant le bloc)

Les sections PowerDistribution et AerobicEfficiency retirées de leurs
anciens emplacements (avant le bloc GRAPHIQUES D'ANALYSE AVANCÉE).

## FIX 3 — Tooltip MMP au survol
Ajout de mmpContainerRef + mmpMousePos dans PowerCurveChart.
Tooltip positionné au curseur : durée + watts séance + watts record.
Style : bg var(--bg), border var(--border), borderRadius 8, shadow.
Flip côté gauche si souris > 50% width pour éviter débordement.

## FIX 4 — Format durée : 74' → 1h14
fmtDur modifiée :
  - sous 1h : `${m}'${sec>0 ? sec.padStart(2) : ''}` au lieu de `${m}min...`
  - exactement 1h : `1h` (suppression des 00 traînants)
  - ex: 3600s → "1h", 4440s → "1h14", 2700s → "45'"

## Fichiers modifiés
- src/app/activities/page.tsx (FIX 1,2,3,4)
- src/components/activity/PowerDistribution.tsx (minHeight 280)
