# Connexions — Synchroniser les statuts + activer les données

## 1. Diagnostic : trouver où sont stockées les connexions

Chercher dans le code TOUTES les sources de vérité pour les 
connexions d'apps externes :

grep -r "strava" --include="*.ts" --include="*.tsx" -l
grep -r "wahoo" --include="*.ts" --include="*.tsx" -l
grep -r "withings" --include="*.ts" --include="*.tsx" -l
grep -r "oauth" --include="*.ts" --include="*.tsx" -l
grep -r "access_token" --include="*.ts" --include="*.tsx" -l
grep -r "connected" --include="*.ts" --include="*.tsx" -l

Identifier :
- La table Supabase qui stocke les tokens/connexions 
  (probablement user_connections, oauth_tokens, integrations 
  ou similaire)
- Comment la page Profil lit les connexions Wahoo et Withings
- Comment la page Connexions lit les connexions (probablement 
  une autre source ou un hardcode)

## 2. Unifier la source de vérité

La page Connexions DOIT lire depuis la MÊME table que le Profil.
Si la page Profil lit depuis une table `user_integrations` ou 
`oauth_connections`, la page Connexions doit lire la même table.

Pour chaque service dans la liste de la page Connexions :
- Vérifier si un enregistrement existe dans la table de connexions 
  pour cet utilisateur + ce service
- Si oui : afficher "Connecté" + date dernière synchro + 
  boutons "Sync" et "Déconnecter"
- Si non : afficher "Disponible" + bouton "Connecter"

Services concernés immédiatement :
- Strava → déjà connecté et visible ✓
- Wahoo → connecté mais invisible sur page Connexions ✗
- Withings → connecté mais invisible sur page Connexions ✗

## 3. Withings — activer la synchro des données

Withings fournit : poids, composition corporelle, sommeil, 
tension artérielle, SpO2, température.

Si Withings est connecté avec un token valide :
a) Récupérer les données de poids depuis l'API Withings
   (endpoint : /measure - getmeas)
   → Stocker dans une table ou dans la table existante du profil
   → La page Récupération et Nutrition lisent le poids depuis là

b) Récupérer les données de sommeil depuis l'API Withings
   (endpoint : /v2/sleep - getsummary)
   → Stocker les phases de sommeil, durée, score
   → La page Récupération affiche ces données dans la section 
   Sommeil (activer le composant hypnogramme)

Vérifier d'abord si les appels API Withings sont déjà implémentés 
quelque part dans le code (peut-être dans une route API Next.js).

## 4. Wahoo — activer la synchro des données

Wahoo fournit : activités vélo (puissance, FC, cadence).
Si Wahoo est connecté :
- Récupérer les activités récentes
- Les stocker dans la même table que les activités Strava 
  (avec un champ `source: 'wahoo'`)
- Éviter les doublons si l'activité existe déjà via Strava

## 5. Polar — préparer la connexion

L'utilisateur a une montre Polar. C'est la prochaine connexion 
prioritaire.

Polar fournit : activités, sommeil détaillé (phases, cycles, score), 
FC repos, température.

Vérifier si un flux OAuth Polar existe déjà dans le code.
Si non, préparer :
- Route API `/api/auth/polar` pour le flux OAuth2
- Polar API : https://www.polar.com/accesslink-api
- Scopes nécessaires : user, activity, sleep
- Stocker le token dans la même table que Strava/Wahoo/Withings

NE PAS implémenter le flux complet si les credentials Polar 
(client_id, client_secret) ne sont pas encore configurées.
Préparer le code et afficher un message "Configure tes identifiants 
Polar dans les variables d'environnement" dans la console.

## 6. Page Connexions — améliorations mineures

- Withings n'apparaît pas dans la liste → l'ajouter dans la 
  catégorie "Balance & Corps" avec description "Balance connectée, 
  composition corporelle, sommeil"
- Vérifier que TOUTES les catégories de la sidebar fonctionnent 
  (Entraînement, Récupération & Santé, Balance & Corps, 
  Nutrition, Biométrie & Capteurs, Sommeil)
- Le bouton "Synchroniser tout" en haut à droite doit déclencher 
  une synchro de TOUTES les apps connectées (pas juste Strava)
