# Planning — Bugs données vue Week

## Bug 1 : "[RUN] Repos" fantômes
Des blocs "[RUN] Repos" apparaissent certains jours (dimanche, 
mercredi) alors que l'utilisateur ne les a jamais créés.

Diagnostiquer l'origine :
1. Vérifier si ces entrées existent réellement en base Supabase
   → Faire un SELECT sur la table des séances/planning pour 
   l'utilisateur, filtrer sur name LIKE '%Repos%'
   → Si elles existent : elles ont été créées par un bug 
   (probablement l'IA qui ajoute des "Recovery" automatiques)
   → Les supprimer et corriger la source

2. Si elles n'existent PAS en base mais s'affichent quand même :
   → Le composant génère des entrées "Repos" par défaut pour 
   les jours sans séance. Trouver cette logique et la supprimer.
   Un jour vide doit rester vide, pas afficher "Repos".

3. Vérifier aussi si c'est un résidu du template de semaine type
   ou d'une logique "jour de repos automatique" → désactiver.

## Bug 2 : Tâches qui disparaissent après quelques heures
Les tâches s'enregistrent correctement (visibles immédiatement 
après save) mais disparaissent quand l'utilisateur revient 
plusieurs heures plus tard.

Causes probables à vérifier dans cet ordre :

1. RLS Supabase trop restrictif
   → Vérifier que les policies de la table des tâches/planning 
   permettent bien la LECTURE pour user_id = auth.uid()
   → Tester un SELECT direct via le dashboard Supabase pour 
   confirmer que les données sont toujours en base

2. Filtre de date incorrect
   → Le composant filtre peut-être sur "cette semaine" avec un 
   calcul de date qui exclut certains jours après minuit ou 
   après changement de timezone
   → Logger les dates de début/fin du filtre et les comparer 
   aux dates des tâches en base
   → Vérifier que les dates sont stockées en UTC et converties 
   correctement en heure locale à l'affichage

3. Cache / état local écrasé
   → Si le composant utilise un state local initialisé à [] puis 
   fetch les données, vérifier qu'il n'y a pas une race condition 
   où le state se reset avant la fin du fetch
   → Vérifier qu'il n'y a pas un useEffect qui écrase les données

4. Confusion entre tables
   → Il y a peut-être deux tables différentes (tâches personnelles 
   vs séances d'entraînement) et la vue Week mélange les sources
   → Identifier toutes les tables lues par la vue Week et vérifier 
   que chaque source retourne les bonnes données

Pour chaque vérification : logger le résultat en console.log 
temporaire pour identifier la cause exacte.
Corriger la cause racine identifiée.
