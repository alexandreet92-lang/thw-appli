# PROMPT_ANALYSE_COMPLETE — Page Analyse complète

## Fichier concerné
src/app/activities/page.tsx (3900+ lignes)

---

## PARTIE 1 — Hero strip (déjà OK)
Exactement 5 métriques : Distance, Durée, D+, Watts moy./Allure moy., TSS

---

## PARTIE 2 — Petites données (BLOC 2 colonne droite)
Ajouter après TSS/TRIMP/Durée Z2 dans BLOC 2 :
- FC moy. (si a.avg_hr)
- FC max (si a.max_hr ?? maxHrStream)
- Découplage P/FC (si a.aerobic_decoupling, avec coloration verte/jaune/rouge)

---

## PARTIE 3 — Ordre des courbes SyncCharts
Avant : Altitude, FC, Puissance/Allure, Cadence, Vitesse, Température
Après : Altitude, FC, Puissance/Allure, Vitesse, Cadence, Température

---

## PARTIE 4 — PowerCurveChart amélioré
- Hauteur SVG : 220px (était 80)
- Nouvelles durées : [5,10,30,60,180,300,600,1200,1800,3600,5400,7200,10800,14400] filtrées par durée activité
- Échelle X logarithmique : x = ((log(d) - log(min)) / (log(max) - log(min))) * W
- Labels fixes : 5s, 10s, 30s, 1', 3', 5', 10', 20', 30', 1h, 1h30, 2h, 3h, 4h
- Courbe PR rouge (#EF4444) : fetch activités vélo 24 derniers mois, calcul MMP par durée
- Loading state "Calcul des records..." pendant fetch
- Légende sous le graphique (bleu = cette séance, rouge = record 24 mois)

---

## PARTIE 5 — DecouplingChart amélioré
- Fonction utilitaire calculateDecoupling(watts, heartrate) → number | null
- Hauteur SVG : 180px (était 72)
- Tooltip hover positionné au curseur (position absolute, left: mouseX+12, top: mouseY-20)
  pas dans la barre du dessus
- Coloration valeur : < 5% → #22c55e, 5-8% → #eab308, > 8% → #ef4444
- Texte explicatif sous le chart :
  "Le découplage mesure la dérive cardiaque relative à la puissance.
   < 5% : excellent (bonne résistance aérobie)
   5–8% : normal sur les longues sorties
   > 8% : fatigue ou base aérobie insuffisante"

---

## PARTIE 6 — Zones : toggle Jauges / Donuts
- Deux boutons en haut de la section Zones : "Jauges" et "Donuts"
- Vue Jauges : ZoneBars existant (durée + %)
- Vue Donuts : composant DonutChart SVG inline
  strokeDasharray / strokeDashoffset
  diamètre 80px, stroke 10, anneau par zone, légende à droite
- BottomSheet au clic sur segment donut avec description de la zone :
  Z1 Récupération : effort très léger, fréquence cardiaque basse
  Z2 Endurance : base aérobie, conversation possible
  Z3 Tempo : allure soutenue, légèrement inconfortable
  Z4 Seuil : effort intense, proche du seuil lactique
  Z5 VO2max : sprint, effort maximal court

---

## PARTIE 7 — HrCumulativeChart corrections
- fmtCumTime : afficher les secondes
  Avant : `${Math.round(s/60)}'`
  Après : `${Math.floor(s/60)}'${(s%60).toString().padStart(2,'0')}`
- Tooltip hover positionné au curseur (comme PARTIE 5)
- Texte explicatif sous le chart :
  "Durée cumulée passée à ou au-dessus de chaque fréquence cardiaque.
   Exemple : si 1h30 s'affiche à 140 bpm, vous avez pédalé 1h30 à ≥ 140 bpm."
