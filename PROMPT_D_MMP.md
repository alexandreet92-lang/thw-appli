# PROMPT_D_MMP — Marqueurs MMP + Tableau Records vs Séance

## Partie 1 — Marqueurs moments clés sur la courbe
Dans PowerCurveChart (page.tsx) :
- Durées marquées : 5'(300s) / 20'(1200s) / 30'(1800s) / 45'(2700s) / 1h(3600s)
- Seulement si durée <= durée de la sortie
- Ligne verticale pointillée #94A3B8
- Pastille : rect + text au-dessus de la courbe, alternance de hauteur
- Valeur en watts (ex: "242W")
- Dérivé de sessionMmpTable (calculé depuis TABLE_DURATIONS)

## Partie 2 — Tableau Records vs Séance
Composant : `src/components/activity/MmpTable.tsx`

Colonnes : Records (rouge) | Durée (centre gris) | Cette séance (violet)

Durées : Pmax/5''/10''/30''/1'/3'/5'/8'/10'/15'/20'/30'/45'/1h/1h30/2h/3h/6h
→ TABLE_DURATIONS = [1,5,10,30,60,180,300,480,600,900,1200,1800,2700,3600,5400,7200,10800,21600]

Coloration séance :
- = record ou mieux → fond rgba(22,163,74,0.08), texte #166534, ★
- 95-100% record → texte #F97316
- < 95% → var(--text) normal
- durée > durée sortie → —

Filtre : [Cette année] [All time]
Records fetch : 3 requêtes parallèles (24m pour chart PR, year, 3ans pour alltime)
Exclusion de l'activité courante par id

## Modifications page.tsx
- TABLE_DURATIONS + TABLE_LABELS constants (18 durées)
- PowerCurveChart : nouveaux props activityId, activityDurationS
- Nouveaux states : yearMmp, allTimeMmp, recordFilter
- sessionMmpTable (computeMmpCurve sur TABLE_DURATIONS)
- keyMoments (avec altY pour alternance de hauteur)
- useEffect remplacé : calcule prMmp + yearMmp + allTimeMmp en parallèle
- MmpTable importé et rendu sous le chart
- Mise à jour des 2 call sites

## Fichiers
- `src/components/activity/MmpTable.tsx` (nouveau)
- `src/app/activities/page.tsx`
