# CALENDAR — Corrections

## 1. Vue mensuelle — clic sur un jour
Restaurer le comportement précédent : cliquer sur une cellule jour 
dans MonthlyView.tsx doit ouvrir RaceModal avec la date du jour 
pré-remplie dans le champ date.
Ne pas casser le clic sur une course existante (qui ouvre le modal en mode édition).

## 2. GoalBanner — compteurs sous le nom
Sous le nom de la course GTY et l'objectif de temps, ajouter une ligne 
avec le nombre total de compétitions dans l'année et la répartition 
par discipline.
Format : "12 courses — 3 Running · 2 Cyclisme · 4 Triathlon · 1 Hyrox · 2 Natation"
Compter uniquement les entrées de la table `races` pour l'année en cours 
et l'utilisateur connecté.
Affichage : texte petit, gris clair, sur la même bannière noire.
N'afficher que les disciplines qui ont au moins 1 course.

## 3. Onglet All — vue unique Circulaire
Supprimer complètement les vues Vertical et Horizontal.
L'onglet All affiche uniquement la vue circulaire (clock view).
Supprimer le toggle de vue.
Implémenter la vue circulaire selon ces specs :

SVG centré, responsive entre 600px et 800px, hauteur = largeur.
Cercle fin centré, rayon ≈ 42% de la taille.

12 mois autour du cercle : Janvier en haut (12h), sens horaire, 
espacement régulier (30° par mois).
Tick mark + label abrégé à l'extérieur pour chaque mois.

Aiguille unique depuis le centre pointant vers le jour actuel 
(calcul : (dayOfYear / 365) × 360°, 0° = haut, sens horaire).
Style : ligne fine, couleur accent de l'app, petite flèche au bout.

Centre : 
- Ligne 1 : année (ex: "2026") — grand, gras
- Ligne 2 : date du jour (ex: "17 Mai") — moyen  
- Ligne 3 : heure HH:MM:SS — petit, mise à jour chaque seconde via setInterval

Événements = points colorés sur le cercle à leur position angulaire :
- RACE : rouge
- PRO : bleu  
- PERSO : violet
- Taille 8px, GTY : 12px avec légère lueur
- Si deux événements trop proches (< 3°) : décaler l'un vers l'extérieur
- Hover : tooltip avec nom, date complète, catégorie

Légende en bas : ● RACE  ● PRO  ● PERSO

Composant SVG pur, pas de librairie externe.
Visible uniquement sur md: et plus (masqué sur mobile).
Données : merger races + tables Pro et Perso existantes, 
filtrées par user_id = auth.uid() et année en cours.
