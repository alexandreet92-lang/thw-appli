# CALENDAR — Fix vue circulaire (clustering + labels)

## Problème
Trop d'événements proches créent des labels illisibles (cluster juillet).

## Corrections

### 1. Supprimer tous les labels permanents sur les dots
Ne plus afficher les noms en texte rotatif autour du cercle.
Les noms s'affichent UNIQUEMENT au hover via tooltip.
Garder le tooltip existant (nom complet, date, catégorie, niveau).

### 2. Gestion du clustering
Quand plusieurs dots tombent dans un secteur de moins de 8° d'écart :
- Les empiler radialement : premier dot à rayon + 16px, 
  suivant à rayon + 32px, etc.
- Ne pas les décaler angulairement (garder la date précise).

### 3. Badge de compte par mois
Pour chaque mois ayant au moins 2 événements :
Afficher un petit badge numérique (ex: "5") positionné à 
rayon + 40px sur l'angle du milieu du mois (ex: Juil = 180°).
Style : cercle gris foncé 16px, texte blanc 9px, font-weight 600.
Ce badge remplace la lecture des labels illisibles.

### 4. Légende
Déplacer la légende complètement hors du SVG, 
sous le composant, centrée, avec margin-top 16px.
Format : ○ GTY  ● RACE  ● PRO  ● PERSO  (espacés, taille 12px)
