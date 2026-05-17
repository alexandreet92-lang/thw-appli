# CALENDAR — Vue Verticale : simplification visuelle

## Principe
Une seule couleur par ligne = la catégorie.
Tout le reste est neutre (gris, noir, blanc).

## Ce qu'on supprime
- Les fonds de ligne colorés (supprimer toutes les background-colors)
- Les badges RACE / PRO / PERSO avec fond coloré 
  → remplacés par le dot uniquement
- Les countdowns colorés (J-21 en vert, J-41 en orange, etc.)
  → un seul style : texte gris foncé, même couleur pour tous

## Ce qu'on garde et simplifie

**Dot gauche** (seul élément coloré) :
- RACE : rouge
- PRO : bleu
- PERSO : violet
- Taille 8px

**Jour du mois** : petit, gris moyen, avant le nom (ex: "7")

**Nom de l'événement** : texte principal, noir, font-weight 500

**Badge niveau** : texte seul sans fond coloré, 
juste une bordure fine gris clair, texte gris foncé, 
taille 10px, border-radius arrondi
Valeurs : Principal / Important / Secondaire / GTY

**Abréviation sport** : texte gris clair, taille 10px, 
après le badge niveau

**Countdown** : "J-21" aligné à droite, 
texte gris moyen, taille 13px, font-weight 500.
Si passé : "Passé" + checkmark, gris clair.

**Séparateur entre lignes** : border-bottom 1px, 
gris très clair (pas de fond de ligne).

**Headers de mois** : FÉV / AVR etc. en majuscules, 
taille 11px, gris moyen, font-weight 600, 
avec le compte "3 événements" à côté en gris clair.
Padding-top généreux pour aérer entre les mois.

## Résultat attendu
Page quasi monochrome. Le dot coloré = seul repère visuel.
Sobre, lisible, professionnel.
