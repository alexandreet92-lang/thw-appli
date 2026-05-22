# Calendar — Vue mensuelle style Apple + sélecteur d'année

## 1. Remplacer la vue mensuelle actuelle
Dans la page Calendar (onglet Race), la "Vue mensuelle" utilise
actuellement un grid calendrier classique avec navigation par flèches.

Remplacer par le MÊME composant calendrier style Apple que celui
implémenté dans la page Training > Analyse > Calendrier :
- Scroll continu vertical (mois qui se suivent)
- Header de mois sticky (nom du mois gros, gras, gauche)
- Jours de la semaine fixe en haut (L M M J V S D)
- Jour actuel = cercle rouge
- Cellules aérées (min-height 90px desktop, 70px mobile)

Différence avec Training : au lieu des dots d'activités Strava,
afficher les courses et événements de la table `races` et
`race_events` :
- Courses : dot coloré selon le niveau (GTY noir, principal rouge,
  important orange, secondaire vert) + nom tronqué
- Événements/stages : dot bleu + nom tronqué
- Au clic sur un jour : ouvre RaceModal en création avec date
  pré-remplie (si jour vide) ou affiche les détails (si événement)

Réutiliser le composant Apple Calendar existant et le rendre
générique : il accepte une prop `events` qui contient la liste
des éléments à afficher, avec pour chaque : date, nom, couleur,
onClick.

## 2. Sélecteur d'année
Ajouter un sélecteur d'année au-dessus du calendrier,
visible dans les deux vues (annuelle et mensuelle).

Design :
- Année actuelle affichée en gros (ex: "2026"), cliquable
- Au clic : dropdown ou pills avec les années disponibles
- Plage : de 2024 à 2030 (pour planifier les objectifs futurs)
- Au changement d'année : recharger les courses et événements
  de cette année depuis Supabase

Le sélecteur doit aussi s'appliquer à la vue annuelle (les 12 mois
affichés correspondent à l'année sélectionnée).

Le GoalBanner "GOAL OF THE YEAR" et le compteur de courses
se mettent à jour selon l'année sélectionnée.
