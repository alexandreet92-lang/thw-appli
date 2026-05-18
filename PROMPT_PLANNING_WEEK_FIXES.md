# Planning — Corrections vue Week (tâches)

## 1. Bug couleurs des tâches
Les tâches ne s'affichent pas dans la bonne couleur après 
enregistrement. Toutes apparaissent en rouge quel que soit 
la catégorie.

Chaque catégorie a sa propre couleur (définie dans le modal 
"Nouvelle tâche" avec les dots colorés) :
- App → rouge
- Réseaux → rose
- Récup → vert
- Business mind → jaune

Le problème est probablement dans le code qui lit la catégorie 
de la tâche sauvegardée et applique la couleur. Vérifier :
1. Que la catégorie est bien sauvegardée en Supabase lors du INSERT
2. Que le composant d'affichage de la tâche lit la catégorie et 
   applique la bonne couleur (pas une couleur hardcodée)
3. Que le mapping catégorie → couleur est cohérent entre le modal 
   de création et le composant d'affichage

## 2. Modal édition — afficher tous les champs
Le modal "Modifier la tâche" (image 2) n'affiche que titre, heure, 
durée et priorité. Il manque :
- Catégorie (pills colorés comme dans le modal de création)
- Description (textarea)
- Sous-tâches (liste avec checkboxes)
- Tâche récurrente (checkbox)
- Heure de fin calculée automatiquement (début + durée)

Reprendre exactement la structure du modal "Nouvelle tâche" 
(image 1) pour le modal "Modifier la tâche" :
- Même champs dans le même ordre
- Pré-remplis avec les données existantes de la tâche
- Boutons : Supprimer (rouge texte) | Annuler | Sauvegarder

## 3. Affichage des détails sur la bulle dans le planning
Quand une tâche est affichée dans la vue Week, la bulle doit 
montrer un aperçu des infos clés :
- Ligne 1 : titre (gras) + horaire "14h-16h45"
- Ligne 2 : description tronquée (1 ligne, ellipsis) si elle existe
- Ligne 3 : si sous-tâches → "2/4 sous-tâches" en petit gris
- Fond de la bulle : couleur de la catégorie avec opacity 0.15
- Bordure gauche : 3px solide couleur catégorie pleine
