# CALENDAR — Corrections événements jour

## 1. Suppression d'un jour dans EventModal
Dans EventModal, chaque bloc jour (textarea + upload) doit avoir 
un bouton "×" en haut à droite du bloc.
Au clic : supprimer ce jour du daily_program ET supprimer le fichier 
associé dans race_event_files si existant (Supabase Storage + base).
Ne pas permettre de supprimer si l'événement n'a plus qu'un seul jour.

## 2. Fix upload fichier par jour — déboguer complètement
Le fichier uploadé par jour ne persiste pas après fermeture du modal.
Corriger le flux dans l'ordre suivant et logger chaque étape :

Étape 1 : upload du fichier vers Supabase Storage bucket `race-files`
→ vérifier que l'URL publique est bien retournée

Étape 2 : INSERT dans race_event_files avec 
{ event_id, file_url, file_name, event_date }
→ vérifier que event_id est bien défini au moment de l'insert
(problème probable : l'event_id n'existe pas encore si c'est 
un nouvel événement non encore sauvegardé)

Solution : en mode création, sauvegarder d'abord l'événement 
dans race_events pour obtenir l'id, PUIS uploader les fichiers.
En mode édition, l'event_id existe déjà, utiliser directement.

Étape 3 : au rechargement du modal en mode édition, 
récupérer les fichiers depuis race_event_files 
filtrés par event_id et afficher par event_date.

## 3. Visualisation GPX complète dans DayModal
Dans le modal "Détail du jour" (DayModal), quand un fichier GPX 
est présent pour ce jour :
Afficher le même composant GPX complet que la page Planning avec :
- Carte avec tracé du parcours
- Profil altimétrique en bas
- Jauge/curseur de défilement interactif sur le tracé
Trouver et importer exactement ce composant depuis Planning.
Ne pas réécrire la logique GPX.

## 4. Hover sur les bulles d'événement dans MonthlyView
Les barres bleues "Stage" dans MonthlyView représentent chaque jour 
d'un événement multi-jours.

Au hover sur une barre :
Afficher un popover (max-width 320px) positionné au-dessus ou 
en-dessous selon l'espace disponible, contenant :
- Nom de l'événement + date précise du jour (ex: "Jeudi 9 Juillet")
- Description/programme de ce jour spécifique (depuis daily_program)
- Si fichier GPX pour ce jour : miniature du tracé carte 
  (version compacte du composant GPX, sans profil altimétrique, 
  juste la carte avec le tracé, hauteur 150px)
- Distance du parcours si disponible dans les métadonnées GPX
- Si pas de GPX : juste le texte du programme
Fermeture : mouseleave ou clic ailleurs.
