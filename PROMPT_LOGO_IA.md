# LOGO IA — Intégration globale + modèles

## Fichiers fournis
Trois fichiers PNG sont déposés à la racine du repo :
- logo_4bras.png
- logo_3bras.png
- logo_6bras.png

## 1. Déplacer les fichiers
Déplacer les trois PNG dans public/logos/ :
- public/logos/logo_4bras.png
- public/logos/logo_3bras.png
- public/logos/logo_6bras.png

## 2. Logo principal dans la navbar (toutes pages)
Identifier le composant de navigation/header global de l'application 
(layout.tsx, Header.tsx, Navbar.tsx, ou équivalent).

Ajouter le logo 4 bras en haut à droite de la barre principale, 
visible depuis TOUTES les pages.

Spécifications :
- Image : /logos/logo_4bras.png
- Taille : 32px × 32px
- Position : extrême droite de la navbar, marge-right ~16px
- Cliquable : au clic, ouvre l'interface Coach IA / Assistant IA
  (la même action que l'ancien bouton "Coach IA" qui a été supprimé)
- Curseur pointer au hover
- Léger effet hover : opacity 0.85, transition 150ms
- Alt text : "Assistant IA"

Vérifier que le logo apparaît bien sur toutes les pages :
Calendar, Planning, Performance, Récupération, et toutes les autres.

## 3. Remplacement des logos de modèles IA
Trouver dans le code l'endroit où les modèles IA Hermès / Athèna / Zeus 
sont affichés (probablement un sélecteur de modèle dans l'interface 
Coach IA ou les paramètres).

Remplacer les logos actuels par :
- Hermès → /logos/logo_3bras.png
- Athèna → /logos/logo_4bras.png
- Zeus → /logos/logo_6bras.png

Garder les tailles d'affichage existantes de ces logos.
Vérifier la cohérence visuelle (les 3 logos ont le même style et 
la même couleur bleue, ils doivent paraître comme une famille).
