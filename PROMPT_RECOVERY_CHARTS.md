# Récupération — Fix hypnogramme + nouveaux graphiques

## 1. Fix hypnogramme — afficher les données Polar réelles
L'hypnogramme affiche toujours l'overlay "Aperçu — Connecte Polar" 
alors que Polar EST connecté.

Déboguer :
a) Vérifier si la table sleep_data contient des données :
   SELECT * FROM sleep_data WHERE user_id = auth.uid() 
   ORDER BY date DESC LIMIT 5
   Logger le résultat.

b) Si la table est vide : la synchro Polar n'a pas inséré de données.
   Aller dans /api/sync/polar et ajouter des logs détaillés pour 
   comprendre pourquoi (API retourne vide ? erreur silencieuse ?)

c) Si la table contient des données : le composant SleepHypnogram 
   ne les lit pas. Vérifier la variable hasDeviceSleepData — elle 
   doit être true quand sleep_data a des enregistrements pour 
   cet utilisateur. Corriger la condition.

d) Supprimer l'overlay "Aperçu" quand Polar est connecté.
   L'overlay ne doit apparaître QUE si aucun device sommeil 
   n'est connecté.

## 2. Supprimer le volume hebdomadaire
Retirer complètement la section "VOLUME / Volume hebdomadaire" 
de la page Récupération. Cette donnée est déjà visible dans 
la page Training.

## 3. Nouveaux graphiques à ajouter

### 3a. Courbe HRV (si données disponibles)
Section : dans "Données physiologiques", remplacer la carte 
vide HRV par un vrai graphique quand des données existent.

- Line chart sur 7 / 14 / 30 jours (toggle)
- Axe X : dates
- Axe Y : HRV en ms
- Ligne principale : valeur quotidienne
- Ligne secondaire en pointillé : moyenne mobile 7 jours
- Couleur : vert (#10B981)
- Animation tracé 1.2s
- Hover : tooltip avec date + valeur exacte
- Si pas de données : garder la carte vide actuelle avec "—"

Source : table daily_metrics, colonne hrv_ms

### 3b. Courbe heures de sommeil
Nouveau graphique dans la section Sommeil, sous l'hypnogramme.

- Line chart / bar chart combiné
- Toggle période : 1 sem / 2 sem / 4 sem
- Axe X : dates (jours)
- Barres : durée totale de sommeil par nuit (heures:minutes)
- Ligne : qualité de sommeil /10 (axe Y secondaire)
- Couleurs : barres violet (#8B5CF6), ligne bleue
- Zone horizontale de référence : 7h-9h en fond vert très pâle 
  ("zone recommandée")
- Animation barres montantes 800ms
- Hover : tooltip avec durée exacte + qualité + date

Source : table sleep_data (duration_minutes, sleep_score) 
OU daily_checkin (sleep_hours, sleep_quality) si pas de device

### 3c. Courbe FC repos
Dans "Données physiologiques", remplacer la carte vide FC repos 
par un graphique quand des données existent.

- Line chart sur 7 / 14 / 30 jours
- Axe Y : bpm
- Couleur : rouge (#EF4444)
- Ligne pointillée : moyenne mobile 7 jours
- Alert visuelle : si FC repos augmente de +5bpm vs moyenne 
  → point en rouge vif + tooltip "FC repos élevée"
- Animation tracé 1.2s

Source : table daily_metrics, colonne resting_hr

### 3d. Score de sommeil trend
Sous la courbe heures de sommeil.

- Line chart sur 4 semaines
- Axe Y : 0-100 (sleep_score)
- Zones de fond : 0-50 rouge pâle, 50-75 orange pâle, 75-100 vert pâle
- Couleur ligne : violet
- Points : cercles sur chaque valeur
- Animation tracé 1s

Source : sleep_data, colonne sleep_score

### 3e. Évolution du score de récupération
Remplacer le message "Tendances à débloquer" par ce graphique 
dès qu'il y a au moins 3 check-ins :

- Line chart sur 14 / 30 / 90 jours
- Score de récupération quotidien (calculé depuis check-in)
- Zones de fond colorées (comme défini précédemment)
- Points cliquables
- Moyenne mobile 7 jours en pointillé
- Animation tracé 1.5s

Source : daily_checkin, calcul du score

## 4. Organisation des sections sur la page
Ordre de haut en bas :
1. État du jour (score + barres + résumé semaine)
2. Charge d'entraînement (PMC, ACWR, monotonie)
3. Sommeil (hypnogramme + courbe heures + score sommeil)
4. Tendances récupération (score récup + sparklines métriques)
5. Données physiologiques (HRV + FC repos + SpO2 + temp)
6. Sources de données
