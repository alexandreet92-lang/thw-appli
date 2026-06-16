# PROMPT — Brancher le HRV réel dans l'UI Récupération + sommeil "en attente"

## Contexte
Le HRV remonte réellement (table `health_data`, colonne `hrv_rmssd`, `data_type='hrv'`
issu du nightly recharge — valeurs ex. 60/62/65/68). Le sommeil détaillé est bloqué
côté Polar (extended content demandé, en attente). On branche le HRV dans l'UI
Récupération maintenant, et on affiche le sommeil en "en attente d'autorisation".

## PARTIE 1 — alimenter le graphe Vue d'ensemble avec le vrai HRV
Page Récupération / `RecoveryTrendChart` :
- Série `hrv` : remplir avec les vraies valeurs `hrv_rmssd` de `health_data`, mappées
  par date sur la semaine affichée. Jours sans donnée → `null` (trous gérés).
- Série `sommeil` : `null` partout (pas de donnée tant que Polar n'a pas activé le
  détail). Tuile KPI → "—" + libellé "en attente Polar".

## PARTIE 2 — onglet "Sommeil & HRV" : séparer les deux états
Scinder en DEUX sections :

### Section HRV — DONNÉES RÉELLES
- Dernière valeur `hrv_rmssd` + mini-courbe de tendance (style des cartes existantes).
- Source ("Polar · Nightly Recharge") + date de dernière nuit reçue.

### Section Sommeil — ÉTAT "EN ATTENTE" (pas "erreur")
- Message : "Détail du sommeil en attente d'activation côté Polar. L'index des nuits
  est bien reçu, mais durée/phases/score nécessitent l'accès étendu Polar (demande en
  cours)."
- Ne PAS afficher "erreur" ni "non connecté" : Polar EST connecté, c'est une
  autorisation de contenu qui manque.

## PARTIE 3 — Sources : statut Polar honnête
Ligne Polar :
- Statut "Connecté" (vert) pour HRV/recharge.
- Sous-ligne : "Sommeil détaillé : accès étendu en attente".
- Pas de "Sommeil KO".

## Données
- Lire `health_data` via le hook/clients existants. Ne PAS créer de nouveau pipeline.
- Si Readiness / Fatigue n'ont pas de source → série `null`, tuile "—".

## Contraintes
- Variables CSS projet uniquement, pas de hex en dur (séries = `--rec-hrv` etc.).
- `npm run build` : dire si l'env permet de le lancer ; sinon revue TS stricte manuelle,
  Vercel validera le build.
- Max 200 lignes/fichier.

**Commit local. NE PAS PUSH.**
