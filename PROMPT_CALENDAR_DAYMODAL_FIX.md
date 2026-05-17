# CALENDAR — Fix persistance DayModal

## Problème
Cliquer "Enregistrer" dans DayModal semble fonctionner mais les données
disparaissent au rechargement. Rien ne persiste en base.

## Diagnostic à faire en premier
Ouvrir le code de DayModal et tracer le flux complet du bouton Enregistrer.
Identifier précisément où ça échoue parmi ces causes probables :

1. L'event_id est undefined ou null au moment du save
2. Le fichier est uploadé mais l'INSERT dans race_event_files échoue silencieusement
3. Le daily_program est mis à jour localement mais le UPDATE sur race_events 
   n'est jamais appelé
4. Les erreurs Supabase sont catchées mais pas affichées

## Corrections à apporter

### Save du programme journalier
Au clic "Enregistrer" dans DayModal, exécuter dans l'ordre :

ÉTAPE 1 — Mettre à jour daily_program dans race_events :
Récupérer le daily_program existant de l'événement,
modifier uniquement l'entrée correspondant à la date du jour,
faire un UPDATE race_events SET daily_program = [nouveau tableau]
WHERE id = event_id.
Logger le résultat (succès ou erreur) dans la console.

ÉTAPE 2 — Si un nouveau fichier est sélectionné :
a) Upload vers Supabase Storage bucket `race-files`
b) Vérifier que file_url est bien retournée
c) Vérifier si un fichier existe déjà pour cet event_id + event_date
   → Si oui : UPDATE l'entrée existante
   → Si non : INSERT nouvelle entrée
Logger chaque étape.

ÉTAPE 3 — Afficher un message de succès visible dans le modal
("Enregistré ✓") ou une erreur explicite si l'une des étapes échoue.
Ne pas fermer le modal automatiquement.

### Chargement au montage du DayModal
Au montage, récupérer depuis Supabase :
- Le daily_program de l'événement et extraire l'entrée pour la date du jour
- Le fichier depuis race_event_files WHERE event_id = X AND event_date = Y
Pré-remplir le textarea et afficher le fichier existant.
Logger ce qui est récupéré.

### Vérification event_id
S'assurer que DayModal reçoit bien l'event_id en prop et qu'il n'est
jamais undefined. Ajouter une guard : si event_id est undefined,
afficher une erreur dans le modal et bloquer le save.
