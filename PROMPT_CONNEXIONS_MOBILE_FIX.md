# Connexions — Fix URGENT page mobile

## Problème
La page Connexions est inutilisable sur mobile.
Les cartes d'apps s'affichent comme des rectangles bleus/violets 
géants qui prennent tout l'écran.

## Diagnostic obligatoire avant de corriger
1. Ouvrir le fichier de la page Connexions
2. Chercher tous les styles qui utilisent des hauteurs ou largeurs 
   fixes en px ou des pourcentages problématiques
3. Vérifier si des background-color ou background-image sont 
   appliqués aux cartes d'apps (probablement la cause des blocs 
   bleus géants)

Commandes de recherche :
grep -n "height\|width\|background" [fichier page connexions]
grep -n "grid\|flex\|column" [fichier page connexions]

## Diagnostic réel (trouvé)
Le corps de page utilise display:flex sans flexDirection explicite
→ flex-direction: row par défaut.
Sur mobile, le div des pills catégories a width:100% + flexShrink:0
dans un conteneur flex-row. Le parent (flex:1) s'étire en hauteur 
(align-items:stretch par défaut), et les pills s'étirent elles aussi
sur toute la hauteur de la page → boutons actifs background:#5b6fff
= rectangles bleus géants.

## Correction appliquée
1. flexDirection: isMobile ? 'column' : 'row' sur le conteneur body
2. Pills de filtre : overflowX auto + flexWrap nowrap → scroll horizontal
3. Bouton Sync All : height 44px sur mobile (spec)

## Résultat attendu
- Mobile : pills au-dessus, contenu en dessous, scroll vertical
- Desktop : sidebar gauche, contenu à droite (inchangé)
- Aucun rectangle géant
