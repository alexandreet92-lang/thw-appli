# CALENDAR — Corrections événements et fichiers

## 1. Clic sur un événement dans MonthlyView
Actuellement cliquer sur un événement (course ou stage) ne fait rien.

Pour les courses (table `races`) :
- Clic → ouvrir RaceModal en mode édition avec les données pré-remplies

Pour les stages/camps (table `race_events`) :
- Clic → ouvrir EventModal en mode édition avec les données pré-remplies

Vérifier que les deux modals acceptent un prop `mode: 'create' | 'edit'`
et un prop `initialData` pour pré-remplir les champs.
Même correction à appliquer dans AnnualView (clic sur une course/événement).

## 2. Upload multiple dans RaceModal
La zone d'upload parcours doit accepter plusieurs fichiers simultanément
(attribut `multiple` sur l'input file).
Afficher la liste de tous les fichiers uploadés sous la zone,
chacun avec son nom et un bouton de suppression individuel.
Triathlon : même chose pour les deux zones séparément.

## 3. EventModal — un fichier par jour
Supprimer la zone d'upload globale actuelle de l'EventModal.

À la place : pour chaque jour dans la plage de dates,
afficher sous le textarea du programme de ce jour
une zone d'upload individuelle labellisée "Fichier du jour
(GPX, PDF, image...)".
Accepter un seul fichier par jour (pas multiple).
Afficher le fichier uploadé avec son nom + bouton suppression.

Stocker les fichiers dans Supabase Storage bucket `race-files`.
Dans `race_event_files`, ajouter une colonne `event_date` (date)
si elle n'existe pas, pour associer chaque fichier à son jour.
Vérifier le schéma existant avant migration.
