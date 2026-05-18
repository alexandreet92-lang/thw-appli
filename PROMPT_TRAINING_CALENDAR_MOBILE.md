# Training — Refonte vue calendrier mobile

## Contexte
La vue calendrier dans la page Training est trop dense sur mobile.
Refonte inspirée du calendrier Apple natif.
S'applique UNIQUEMENT sur mobile (< 768px). La vue desktop reste 
inchangée.

## Design cible

### Navigation : scroll continu vertical
Pas de pagination par mois. Pas de boutons précédent/suivant.
Les mois se suivent verticalement dans un scroll continu :
- Scroller vers le bas = mois suivants
- Scroller vers le haut = mois précédents
- Au chargement : positionner le scroll sur le mois actuel
- Lazy load : charger 3 mois avant et 3 mois après le mois visible,
  charger les mois suivants au fur et à mesure du scroll

### En-tête de chaque mois (sticky)
- Nom du mois en gros, gras, aligné à gauche : "Mai"
- Taille : 28px, font-weight 800, couleur texte principal
- Sticky en haut de l'écran pendant le scroll dans ce mois,
  puis remplacé par le mois suivant quand on scroll plus bas
  (comme le calendrier Apple exactement)

### Jours de la semaine
- En-tête fixe tout en haut (ne scroll pas) : L M M J V S D
- Taille : 12px, gris moyen, uppercase
- Espacement régulier sur toute la largeur
- Samedi et dimanche : couleur légèrement différente (gris plus clair)

### Grille des jours
- Chaque cellule = une journée
- Hauteur de cellule : min 70px
- Numéro du jour : 18px, font-weight 500, centré horizontalement
  en haut de la cellule
- Séparation entre semaines : ligne fine 0.5px, gris très clair

### Jour actuel
- Numéro dans un cercle plein rouge (#EF4444) comme sur Apple Calendar
- Texte blanc
- Taille du cercle : 32px

### Jours hors du mois courant
- Ne pas afficher les jours du mois précédent/suivant dans la grille
- Les semaines incomplètes en début/fin de mois montrent des 
  cellules vides (comme Apple Calendar)

### Activités dans chaque cellule
Afficher sous le numéro du jour :
- Un petit dot coloré (6px) par activité, disposés en ligne
- Couleurs existantes par sport : Course = orange, Vélo = bleu, 
  Muscu = violet, Natation = cyan, Autre = gris
- Maximum 3 dots. Si > 3 : afficher un petit "+" en gris (10px)
- Pas de texte dans les cellules

### Clic sur un jour
Au tap sur un jour :
- Ouvrir un bottom sheet (panneau glissant du bas) avec la liste 
  des activités de ce jour
- Chaque activité : dot couleur + type sport + durée
- Tap sur une activité → ouvre le détail existant

### Fond
Dark mode : fond noir pur (#000) ou très foncé, texte blanc.
Light mode : fond blanc, texte noir.
Cohérent avec le mode déjà actif dans l'app.

## Éléments à modifier
- Remplacer "5 sem. / 10 sem." par rien sur mobile (scroll continu)
- Le toggle "Liste / Calendrier" reste
- Le header "Training" reste

## Important
- Vue desktop inchangée (media query ou useMediaQuery)
- Performance : ne pas rendre tous les mois d'un coup, utiliser 
  IntersectionObserver ou virtualisation pour le scroll infini
- Scroll initial positionné sur le mois en cours
