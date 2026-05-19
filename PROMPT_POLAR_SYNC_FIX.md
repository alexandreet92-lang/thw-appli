# Polar — Fix affichage connexion + synchro données

## 1. Polar doit apparaître comme connecté partout
La page Connexions montre Polar comme connecté mais la section 
"Sources de données" de la page Récupération montre "Connecter".

Les deux doivent lire depuis la MÊME table.
Trouver :
- Quelle table la page Connexions utilise pour savoir que Polar 
  est connecté
- Quelle table la section Sources de la page Récupération utilise

Unifier : la page Récupération doit lire la même table.
Polar connecté → afficher "Connecté" + "Sync" dans les deux pages.

## 2. Synchro données Polar — remonter à 3 mois
La synchro doit récupérer toutes les données disponibles 
sur les 3 derniers mois (90 jours), pas uniquement aujourd'hui.

Dans la route /api/sync/polar :
- Récupérer les données de sommeil des 90 derniers jours
- Récupérer les activités des 90 derniers jours
- Récupérer les données physiques (FC repos) des 90 derniers jours
- Logger le nombre d'enregistrements reçus, dates, erreurs

## 3. Afficher les dernières données disponibles
La page Récupération ne doit PAS chercher uniquement la date du jour.
Elle doit :
- Chercher la donnée sommeil la PLUS RÉCENTE disponible
- L'afficher avec la date : "Dernière nuit : 28 avril"
- L'hypnogramme montre cette dernière nuit

Même logique pour FC repos et HRV :
- Afficher la dernière valeur disponible + sa date
- Pas uniquement aujourd'hui

## 4. Vérifier la synchro
Après correction, déclencher un sync et logger :
- Réponse brute de l'API Polar (status + body tronqué)
- Nombre de records insérés dans sleep_data
- Nombre de records insérés dans daily_metrics
- Erreurs éventuelles

Note : Polar AccessLink fonctionne par transactions. Une fois 
les données lues et la transaction commitée, elles ne sont plus 
disponibles au prochain appel. Si l'API retourne 0 données, 
vérifier si elles sont déjà en base depuis un sync précédent.
