# Planning — Corrections page séance

## 1. Génération IA : respecter les données utilisateur à la lettre
Quand l'utilisateur demande à l'IA de générer une séance avec des 
paramètres précis (ex: "sprints de 20 secondes avec 4'40 de récup 
à 180w et sprints à 800w"), l'IA doit utiliser EXACTEMENT ces valeurs 
dans les blocs générés.

Vérifier le prompt système envoyé à l'IA pour la génération de séance.
Ajouter l'instruction suivante dans le prompt système :
"Quand l'utilisateur spécifie des valeurs précises (durée, watts, 
allure, FC, zone, récupération), les utiliser exactement telles 
quelles dans la séance générée. Ne pas arrondir, ne pas modifier, 
ne pas interpréter. L'athlète sait ce qu'il veut."

Vérifier aussi que les valeurs retournées par l'IA sont correctement 
mappées aux champs du composant (watts effort, watts récup, durée 
effort, durée récup). Pas d'inversion ni d'écrasement lors du parsing.

## 2. Afficher les watts de la récupération
Dans le bloc "Récupération" d'un intervalle, le champ WATTS 
n'est pas visible actuellement. L'utilisateur ne peut pas voir 
ni modifier la puissance de la récupération.

Ajouter un champ "WATTS" dans la section RÉCUPÉRATION de chaque 
bloc intervalle, identique au champ watts de la section EFFORT.
Avec :
- Input numérique
- Affichage du %FTP calculé en dessous
- Couleur de la zone correspondante
Quand l'IA génère une séance, les watts de récup doivent aussi 
être remplis.

## 3. TSS — calcul au watt près
Le TSS actuel se calcule uniquement par zone d'intensité, ce qui 
donne le même TSS pour 180w et 190w si les deux sont en Z2.

Corriger le calcul TSS pour utiliser les watts exacts :
Formule standard :
TSS = (durée_secondes × NP × IF) / (FTP × 3600) × 100
Où :
- NP (Normalized Power) = puissance en watts du bloc
- IF (Intensity Factor) = NP / FTP
- FTP = valeur FTP de l'utilisateur (récupérer depuis son profil)

Pour chaque bloc de la séance :
- TSS_bloc = (durée_sec × watts × (watts / FTP)) / (FTP × 3600) × 100
- TSS_total = somme de tous les TSS_blocs

Cela donnera un TSS plus élevé pour 190w que pour 180w, même 
en zone Z2.

## 4. Ajouter les zones 6 et 7
Il manque les zones 6 (VO2max) et 7 (Sprint/Neuromuscular) dans 
le système de zones.

Trouver où les zones d'intensité sont définies (tableau de zones, 
config, ou constantes) et ajouter :
- Zone 6 : VO2max — typiquement 121-150% FTP
- Zone 7 : Sprint / Neuromuscular — > 150% FTP

800w pour un FTP autour de 300w = ~266% FTP = Zone 7 Sprint.

Mettre à jour :
- Le sélecteur de zone dans les blocs
- Le label affiché sous les watts (ex: "Z7 Sprint" au lieu de 
  "Z5 VO2max" pour 800w)
- La barre d'intensité visuelle en haut de la séance
- Les couleurs de zone (ajouter des couleurs pour Z6 et Z7 
  cohérentes avec le design existant : Z6 rouge foncé, Z7 violet 
  ou noir par exemple)

## 5. Jauge de temps en haut — mise à jour automatique
La barre de progression bleue en haut ("DURÉE TOTALE 1h30") ne se 
met pas à jour automatiquement quand la séance est modifiée ou 
générée par l'IA.

Corriger : recalculer la durée totale et le TSS estimé à chaque 
modification d'un bloc (ajout, suppression, modification de durée, 
modification de watts ou de nombre de répétitions).
Ce recalcul doit être immédiat (pas besoin de refresh).

## 6. IA — ne pas ajouter de récupération finale automatique
Actuellement l'IA ajoute systématiquement un bloc "Recovery 10min" 
à la fin de chaque séance générée.

Modifier le prompt système de l'IA pour ajouter l'instruction :
"Ne jamais ajouter de bloc de récupération / retour au calme / 
cool-down à la fin de la séance. L'athlète structure sa propre 
séance, l'IA génère uniquement les blocs demandés."

## 7. Écran vide au retour après enregistrement
Quand l'utilisateur enregistre une séance puis revient sur la page 
Planning, il y a un flash d'écran vide (skeleton loaders visibles 
pendant quelques secondes).

Diagnostiquer :
- Soit la page refait un fetch complet au montage alors que les 
  données sont déjà en cache → utiliser les données en cache et 
  revalider en arrière-plan (pattern SWR / stale-while-revalidate)
- Soit le composant se démonte et se remonte pendant la navigation 
  → vérifier les transitions de route
- Soit le skeleton s'affiche même quand les données existent déjà 
  dans le state → conditionner l'affichage du skeleton à l'absence 
  de données (pas juste isLoading = true)

Corriger pour que la page affiche immédiatement les données 
disponibles, sans flash blanc/squelette.
