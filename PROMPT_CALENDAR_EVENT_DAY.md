# CALENDAR — Événements : fix upload + vue par jour

## 1. Fix upload fichiers EventModal
Les fichiers uploadés par jour ne sont pas sauvegardés en base.
Déboguer et corriger le flux complet :
- Upload vers Supabase Storage bucket `race-files`
- Insertion dans table `race_event_files` avec les colonnes :
  event_id, file_url, file_name, event_date
- Vérifier que la colonne `event_date` existe, la créer si manquante
- Au chargement du modal en mode édition : récupérer les fichiers 
  existants depuis `race_event_files` et les afficher par jour

## 2. Hover sur un jour d'événement dans MonthlyView
Quand un événement multi-jours s'affiche dans le calendrier
(ex: "Stage" sur 3 jours), chaque cellule jour est cliquable/hoverable.

Au hover sur une cellule jour d'un événement :
Afficher un popover positionné près de la cellule avec :
- Label du jour (ex: "Jeudi 9 Juillet")
- Texte du programme de ce jour (depuis daily_program)
- Si un fichier GPX existe pour ce jour : afficher le tracé du parcours
  en utilisant le même composant de visualisation GPX que la page Planning.
  Trouver ce composant dans le code existant et l'importer.
- Si pas de GPX mais un autre fichier : afficher le nom du fichier
  avec icône et lien de téléchargement
- Fermeture du popover : au mouseleave ou clic ailleurs

## 3. Clic sur un jour d'événement dans MonthlyView
Au clic sur une cellule jour d'un événement :
Ouvrir un modal léger "Détail du jour" (pas EventModal complet) avec :
- Header : nom de l'événement + date du jour cliqué
- Programme complet de ce jour (textarea éditable)
- Visualisation GPX si fichier GPX présent pour ce jour
  (même composant que Planning, taille plus grande)
- Si autre type de fichier : nom + bouton télécharger
- Zone pour uploader/remplacer le fichier de ce jour
- Bouton "Enregistrer" → met à jour daily_program et race_event_files
  pour ce jour uniquement dans Supabase
- Bouton "Fermer"

Ce modal jour est distinct de EventModal (qui reste pour créer/éditer 
l'événement complet). Ne pas modifier EventModal.

## Important
Réutiliser le composant GPX existant de Planning dans les deux cas 
(hover popover et modal jour). Ne pas réécrire la logique GPX.
