# Navigation — Fix desktop + hamburger mobile

## 1. Desktop (≥ 768px) — REMETTRE COMME AVANT
La barre d'onglets en bas NE DOIT PAS apparaître sur desktop.
La supprimer complètement pour les écrans ≥ 768px.

Remettre la navigation desktop exactement comme elle était avant :
- Bouton hamburger (3 traits) en haut à gauche
- Sidebar/drawer qui s'ouvre au clic avec toutes les pages
- Logo app à gauche, logo IA à droite, photo profil à droite

Ne rien changer au desktop. Media query stricte :
La MobileTabBar doit avoir display: none sur ≥ 768px.

## 2. Mobile (< 768px) — garder les DEUX
Sur mobile, il faut les DEUX systèmes de navigation :

### Barre d'onglets en bas (nouveau)
- Reste en place comme implémentée
- 5 onglets : Plan, Stats, Enregistrer, Plus, IA

### Hamburger en haut (existant)
- REMETTRE le bouton hamburger (3 traits) en haut à gauche
  dans la navbar mobile
- Au clic : ouvre le même drawer/sidebar qu'avant avec
  TOUTES les pages de l'app listées
- Le hamburger donne accès à toutes les pages sans exception
- La tab bar en bas est un raccourci rapide, le hamburger
  est la navigation complète

### Navbar mobile (haut de l'écran)
De gauche à droite :
- Hamburger (3 traits, sans bulle/cercle autour)
- Logo app (36px)
- [espace flexible]
- Logo IA (36px, ouvre Coach IA)
- Photo profil (32px, cercle)
