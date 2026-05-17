# CALENDAR — Refonte visuelle vue circulaire

Réécrire le composant SVG de la vue circulaire dans 
app/calendar/components/CircularView.tsx (ou son nom actuel).
Ne pas changer la logique des données, uniquement le rendu visuel.

## Cercle principal
Deux cercles concentriques :
- Cercle extérieur : stroke fin (1px), couleur très subtile (gris clair)
- Cercle intérieur légèrement plus petit (rayon - 18px) : stroke encore 
  plus fin (0.5px), même couleur encore plus transparente
Effet de profondeur minimal, pas de remplissage.

## Mois
Chaque tick mark : remplacer les simples traits par de petits segments 
plus épais (2px, 12px de long) avec un léger arrondi.
Labels : appliquer une rotation pour suivre la tangente du cercle 
(texte orienté vers l'extérieur). Taille 11px, couleur gris moyen.
Mois actuel : label en gras, couleur accent de l'app.

## Arc "compte à rebours"
Tracer un arc coloré sur le cercle extérieur entre la position 
d'aujourd'hui et la position de la prochaine course GTY.
Couleur : accent de l'app (cyan/bleu), opacity 0.35, stroke-width 4px, 
linecap round.
Si aucune course GTY : pas d'arc.

## Aiguille
Remplacer la simple ligne par :
- Un cercle pivot au centre (rayon 6px, rempli couleur accent)
- Une ligne effilée : large à la base (3px), fine à la pointe (1px)
- Longueur = rayon du cercle × 0.85
- Petite contre-aiguille courte à l'opposé (longueur = rayon × 0.15)
- Couleur : accent de l'app
- Pas d'animation, position statique calculée au rendu.

## Événements (dots)
Augmenter la taille : 10px de diamètre standard, 14px pour GTY.
Positionner les dots légèrement à l'extérieur du cercle (rayon + 16px).
GTY : ajouter un anneau extérieur (cercle stroke 1.5px, rayon dot + 4px, 
même couleur que le dot, opacity 0.5).
Ajouter le nom court de l'événement en texte rotatif à côté du dot :
- Taille 9px, couleur texte principal de l'app
- Rotation = angle du dot sur le cercle pour suivre la courbure
- Tronquer à 14 caractères si trop long
Hover sur un dot : 
- Agrandir le dot (×1.3, transition CSS 150ms)
- Afficher tooltip avec nom complet, date, catégorie + niveau

## Centre
Garder la même structure (année / date / heure) mais :
- "2026" : taille augmentée, font-weight 800, couleur texte principal
- "17 Mai" : taille medium, couleur gris moyen
- Heure : taille small, font monospace, couleur encore plus gris
- Ajouter un séparateur horizontal fin (40px, centré) entre l'année 
  et la date

## Fond
Ajouter de très subtils cercles concentriques en arrière-plan 
(3 cercles, rayons 20% / 40% / 60% du rayon principal, 
stroke 0.5px, opacity 0.06) pour donner de la profondeur.

## Légende
Repositionner sous le SVG, centré, avec espacement généreux.
Ajouter le nom "GTY" avec le dot + anneau pour cohérence visuelle.
