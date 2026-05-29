# PROMPT_TEMP_NUCLEAR — Diagnostic complet stream temp

## Étape 1 : STREAM_KEYS
Vérifier que 'temp' est dans STREAM_KEYS (strava.ts + streams.ts).

## Étape 2 : Appel API Strava direct
Chercher le TOKEN valide + provider_id de "Le Four" en DB.
curl `activities/{id}/streams?keys=temp&key_by_type=true`

## Étape 3 : Résultat
- Si temp présent → sauvegarder en DB
- Si temp absent → confirmer par données hardcodées que le code affiche
  bien la courbe, puis supprimer les données de test

## Conclusion
✅ Strava fournit le stream temp pour "Le Four" (16 777 points, 20–38°C).
Données sauvegardées en DB (jsonb_array_length = 16 777 confirmé).
La courbe Température est disponible sur la page activité.
