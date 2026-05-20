# Polar — Fix définitif du sync réel

## Le problème exact
Le live test (/api/sync/polar?live=1) retourne des données :
physical ok (resting_hr: 52, weight: 74), daily_activity ok.

Le vrai sync (/api/sync/polar en POST) retourne 404 sur les
mêmes endpoints avec le même token et le même polar_user_id.

## La cause la plus probable
Le code du live test et du real sync utilisent des fonctions
DIFFÉRENTES pour appeler l'API Polar.

## La solution
SUPPRIMER toute duplication. Créer UNE SEULE fonction partagée :

async function callPolarAPI(endpoint: string, token: string) {
  const url = `https://www.polaraccesslink.com${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  })
  console.log(`[Polar API] ${endpoint} → ${response.status}`)
  return response
}

Utiliser cette fonction DANS LES DEUX MODES (live et real).

## Implémentation
1. Créer lib/polar.ts avec la fonction callPolarAPI
2. Le live test l'utilise pour lire sans commit
3. Le real sync l'utilise pour lire ET insérer en base

Dans le real sync, le flux exact doit être :

a) Récupérer token + polar_user_id depuis Supabase
   (UNE SEULE requête, la même que le live test)

b) Physical information :
   const res = await callPolarAPI(
     `/v3/users/${polarUserId}/physical-information`, token)
   Si 200 → parser et INSERT dans metrics_daily + profiles
   Si 404 → logger et continuer

c) Daily activity :
   const res = await callPolarAPI(
     `/v3/users/${polarUserId}/daily-activity`, token)
   Si 200 → transaction flow → INSERT dans health_data
   Si 204 → pas de nouvelles données
   Si 404 → logger et continuer

d) Exercises :
   const res = await callPolarAPI(
     `/v3/users/${polarUserId}/exercise-transactions`, token)
   Si 200 → transaction flow → INSERT dans activities
   Si 204 → pas de nouvelles données

e) Retourner le résumé JSON

## Vérification
Après implémentation, lancer le real sync et vérifier que les
status HTTP sont IDENTIQUES au live test.
Si toujours 404 en real mais 200 en live : il y a encore une
différence dans le code. Ajouter un diff log qui compare les
headers et URLs exacts des deux modes.
