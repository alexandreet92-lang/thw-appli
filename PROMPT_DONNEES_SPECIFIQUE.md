# PROMPT_DONNEES_SPECIFIQUE — Redesign onglet Spécifique (SectionDonneesSpecifiques)

## Architecture
File: src/app/activities/page.tsx — function SectionDonneesSpecifiques only

## Couleurs des pills par sport
- Cyclisme (bike): #06B6D4
- Running (run): #10B981
- Trail (trail_run): #F97316
- Natation (swim): #0EA5E9
- Gym (gym): #8B5CF6
- Hyrox (hyrox): #7C3AED
- Aviron (rowing): #EF4444

## Pills de sport
- Remplacer SportTabs par des pills inline
- Afficher uniquement les sports présents dans inRange
- Inclure trail_run dans la liste (actuellement absent)
- Pill actif : background couleur sport, color white
- Pill inactif : background var(--bg-card2), color var(--text-dim), border var(--border)
- borderRadius: 20, padding '5px 14px', fontSize 13, fontWeight 600

## Nouveaux composants inline (avant SectionDonneesSpecifiques)

### SportZoneDonut
SVG donut 80×80, anneaux colorés par zone, hole 40%
Props: `timesS: number[], colors: string[], size?: number`

### ZoneTableWithHR
Tableau zones sportives + colonne FC si hrTimesZ dispo
Colonnes: Zone (dot+label) | Plage | Temps | % | Barre
Props: `zones: ParsedZone[], timesS: number[], hrZones?: ParsedZone[], hrTimesZ?: number[]`
Layout: si hrTimesZ fourni → 2 tables côte à côte (2 cols grid)
Sinon: 1 table pleine largeur

### HorizontalBars
Barres H simples pour distribution (cadence, allures, etc.)
Props: `items: {label: string, value: number, color: string}[], unit?: string`

## Contenu par sport

### Run (course à pied)
Stats (4 cards): Allure moy | FC moy | Cadence moy | TSS total période
Zone allure + FC: ZoneTableWithHR(runZones, runTimesZ, hrZones, hrTimesZ)
Donut: SportZoneDonut(runTimesZ ou hrTimesZ, couleurs ZONE_COLORS)
Si aucun runZones → afficher seulement zones FC

### Bike (vélo)
Stats (5 cards): Watts moy | NP moy | IF moy | Cadence moy | Découplage moy
Zone puissance + FC: ZoneTableWithHR(bikeZones, bikeTimesZ, hrZones, hrTimesZ)
Donut: SportZoneDonut(bikeTimesZ ou hrTimesZ, ZONE_COLORS)

### Trail (trail_run)
Stats (4 cards): D+ total | D- total | Distance tot | Séances
Zones FC: ZoneBars(hrZones, hrTimesZ) — zones spécifiques trail non dispo
Note si pas de D+ dispo: "Dénivelé non disponible"

### Swim (natation)
Stats (4 cards): Séances | Distance tot | Temps tot | Allure moy /100m
Pas de zones puissance/allure en général → afficher empty state "Zones non disponibles"
Si hrTimesZ.some > 0: ZoneBars(hrZones, hrTimesZ)

### Gym (musculation)
Stats (3 cards): Séances | Temps tot | Calories moy
Note informative: "Analyse spécifique muscu à venir"

### Hyrox
Stats (3 cards): Séances | Temps moy | Distance tot
Note informative: "Analyse détaillée Hyrox à venir"

### Rowing (aviron)
Stats (4 cards): Séances | Distance tot | Temps tot | Split moy (allure /500m)
Si hrTimesZ: ZoneBars(hrZones, hrTimesZ)
Split moy: calculé depuis avg_pace_s_km / 2 (500m = half km pace)

## Calcul allure natation /100m
avg_pace_s_km / 10 = s/100m (car 1km = 1000m = 10×100m → pace/km / 10 = pace/100m)

## Empty states
Si sport sélectionné a 0 activités → message "Aucune activité [sport] dans la période"
Si données spécifiques manquantes → ne pas afficher le bloc (pas de zéro inventé)

## Fichier modifié
- src/app/activities/page.tsx (SectionDonneesSpecifiques uniquement)
