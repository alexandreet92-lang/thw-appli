# Connexions — Esthétique et navigation

## 1. Fix sidebar navigation
Le menu à gauche (Entraînement, Récupération & Santé, Balance & Corps, 
Nutrition, Biométrie & Capteurs, Sommeil) ne fonctionne pas au clic.

Au clic sur un item de la sidebar : scroller automatiquement vers 
la section correspondante dans le contenu principal.
Utiliser un scroll smooth (behavior: 'smooth') vers l'élément 
qui a l'id correspondant à la catégorie.

Ajouter des id HTML sur chaque section :
- id="entrainement"
- id="recuperation-sante"
- id="balance-corps"
- id="nutrition"
- id="biometrie-capteurs"
- id="sommeil"

Sidebar sticky (position: sticky, top: 100px) pour qu'elle reste 
visible pendant le scroll.

Highlight actif : quand l'utilisateur scrolle, le label de la 
catégorie visible doit se mettre en surbrillance automatiquement
(IntersectionObserver sur chaque section).

## 2. Cartes d'apps — améliorations
Chaque ligne d'app :
- Hover : légère élévation (translateY(-1px) + shadow), transition 150ms
- Logo : fond blanc 44×44px, border-radius 10px, padding 4px, 
  légère ombre
- Nom de l'app : 15px, font-weight 500
- Description : 13px, gris moyen
- Status badges :
  - "Connecté" : fond vert pâle, texte vert, point vert
  - "Disponible" : fond gris clair, texte gris
  - "En cours d'intégration" : fond orange pâle, texte orange
- Boutons :
  - "+ Connecter" : outline bleu accent app (pas vert), 
    hover fond bleu texte blanc
  - "Sync" : outline gris, icône refresh
  - "Déconnecter" : texte rouge discret, pas de fond

## 3. Header de section (ENTRAÎNEMENT, RÉCUPÉRATION...)
- Label uppercase 11px, gris moyen, letter-spacing 1px
- Ligne horizontale fine à droite du label (flex + border)
- Compteur "X apps" et "X connectée(s)" aligné à droite
- Espacement : 32px au-dessus, 16px en dessous

## 4. Barre de recherche
- Border-radius : 12px (plus arrondi)
- Icône loupe : gris clair
- Focus : bordure bleu accent
- Pills de filtre (Tout / Connecté / Disponible / En cours) :
  - Active : fond bleu accent, texte blanc
  - Inactive : fond gris très clair, texte gris

## 5. Bouton "Synchroniser tout"
- Fond : bleu accent app (cohérent, pas vert)
- Icône refresh
- Au clic : animation de rotation sur l'icône pendant la synchro
- Disabled si aucune app connectée
