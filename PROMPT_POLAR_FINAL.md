# Polar — Fix sync + auto-sync

## RÈGLE : npm run build DOIT passer AVANT tout commit

## 1. Fix bouton Sync
Le bouton Sync de Polar sur la page Connexions ne fonctionne plus.
Déboguer :
- Vérifier la console navigateur pour les erreurs
- Vérifier que la route /api/sync/polar accepte bien POST
- Tester en local avant de push

## 2. Corriger les endpoints
Tous les endpoints Polar AccessLink sont des transactions :
- /v3/users/{id}/exercise-transactions
- /v3/users/{id}/physical-information-transactions
- /v3/users/{id}/daily-activity-transactions

Le flux pour CHAQUE endpoint :
a) POST {endpoint} → 200 avec resource-uri OU 204 (rien de nouveau)
b) GET {resource-uri} → liste des items
c) GET {resource-uri}/{item-url} → détail
d) PUT {resource-uri} → commit

Stocker les données en base AVANT de commit (étape d).

## 3. Auto-sync
Ajouter une synchronisation automatique qui se déclenche :
- Au chargement de la page Récupération (si Polar connecté
  et dernière sync > 1 heure)
- Au chargement de la page Connexions (idem)

Stocker la date de dernière sync dans la table des connexions :
colonne `last_sync_at` (timestamptz).

Logique :
if (polarConnected && (now - lastSyncAt > 3600000)) {
  fetch('/api/sync/polar', { method: 'POST' })
  // fire and forget, ne pas bloquer l'affichage
}

## 4. Vérification obligatoire
Après implémentation :
1. npm run build → doit passer sans erreur
2. Tester /api/sync/polar?live=1 → vérifier les status
3. Tester le bouton Sync → vérifier la réponse
4. SEULEMENT APRÈS : git push
