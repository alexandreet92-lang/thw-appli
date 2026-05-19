# Récupération — Refonte complète

## ⚠️ Contrainte d'implémentation
Décomposer en composants séparés, max 200 lignes par fichier.
Exécuter section par section, valider le build entre chaque.

Avant de commencer : lire le code complet de la page Récupération
et identifier TOUTES les valeurs hardcodées (constantes, mocks,
données en dur dans le JSX).

---

## SECTION A — Nettoyage

### A1. Supprimer le bouton "Analyse IA"
Retirer le bouton "Analyse IA" de la section "État du jour".
Ne pas toucher au bouton "Check-in du matin".

### A2. Supprimer TOUTES les données hardcodées
Chercher dans le code toute valeur en dur :
- 52bpm (FC repos)
- 65ms (HRV)
- 7h32 (sommeil)
- 78/100 (score)
- Phases de sommeil (1h20, 1h40, 4h24)
- 23:08 / 06:40 (coucher/lever)
- 12 min (latence)
- 1x (réveils)
- 91% (efficacité)
- 7/10 (qualité)
- Toutes les valeurs des mini-graphiques tendances
- Toutes les valeurs des barres (fatigue 4, énergie 7, etc.)

Tout remplacer par des données dynamiques lues depuis Supabase
ou des états vides.

---

## SECTION B — Check-in du matin (source de données principale)

### B1. Table Supabase
Vérifier si une table de check-in existe déjà. Sinon créer :

Table `daily_checkin` :
- id : uuid pk
- user_id : uuid fk auth.users
- date : date (unique par user + date)
- fatigue : integer 1-10
- energy : integer 1-10
- stress : integer 1-10
- motivation : integer 1-10
- pain : integer 1-10
- pain_location : text (nullable — où a-t-il mal)
- sleep_quality : integer 1-10 (auto-évaluation)
- sleep_hours : decimal (nullable — heures dormies estimées)
- notes : text (nullable)
- created_at : timestamptz

RLS : user_id = auth.uid()

### B2. Modal Check-in du matin
Vérifier le modal existant. S'assurer qu'il contient :
- Sliders ou pills (1 à 10) pour : Fatigue, Énergie, Stress,
  Motivation, Douleurs
- Si Douleurs > 5 : champ texte "Où as-tu mal ?"
- Qualité de sommeil (1 à 10)
- Heures de sommeil estimées (input décimal, ex: 7.5)
- Notes libres (textarea)
- Bouton "Enregistrer" → INSERT ou UPSERT dans daily_checkin

### B3. Un seul check-in par jour
Si l'utilisateur a déjà fait un check-in aujourd'hui :
- Le bouton "Check-in du matin" affiche "Modifier le check-in"
- Au clic : ouvre le modal pré-rempli avec les données du jour
- UPSERT au save (pas de doublon)

---

## SECTION C — État du jour (basé sur check-in réel)

### C1. Score de récupération
Le score /100 doit être CALCULÉ depuis le check-in du jour :

Formule :
score = (
  (10 - fatigue) * 15 +     // moins fatigué = mieux
  energy * 15 +               // plus d'énergie = mieux
  (10 - stress) * 15 +        // moins stressé = mieux
  motivation * 10 +            // plus motivé = mieux
  (10 - pain) * 15 +          // moins de douleurs = mieux
  sleep_quality * 15           // meilleur sommeil = mieux
) / 85 * 100

Arrondir à l'entier.
Le cercle de progression et le badge ("Correct", "Bon", "Excellent",
"Faible") se mettent à jour selon le score :
- 0-40 : "Faible" (rouge)
- 41-60 : "Moyen" (orange)
- 61-80 : "Correct" (bleu)
- 81-90 : "Bon" (vert)
- 91-100 : "Excellent" (vert foncé)

Si pas de check-in aujourd'hui : afficher "—" au lieu du score,
message "Fais ton check-in du matin pour voir ton score",
cercle gris vide.

### C2. Barres Fatigue / Énergie / Stress / Motivation / Douleurs
Alimentées par les valeurs du check-in du jour.
Si pas de check-in : barres grises, valeurs "—".

### C3. Cartes FC Repos / HRV / Sommeil (en haut)
Ces 3 cartes dépendent d'un device externe (Garmin/Whoop/Oura).
Aucun device n'est connecté actuellement.

Afficher un état vide pour chaque carte :
- FC REPOS : "—" + sous-texte "Garmin, Polar ou Whoop"
- HRV : "—" + sous-texte "Garmin, Whoop ou Oura"
- SOMMEIL : valeur du check-in (sleep_hours) si disponible,
  sinon "—" + sous-texte "Estimé via check-in"

---

## SECTION D — Analyse du sommeil

### D1. Sans device connecté (état actuel)
Remplacer toute la section détaillée (phases, latence, réveils,
efficacité) par une version simplifiée :
- Durée estimée : depuis le check-in (sleep_hours)
- Qualité ressentie : depuis le check-in (sleep_quality) sur 10
- Message : "Connecte Garmin ou Oura pour voir les phases
  de sommeil détaillées"
Si pas de check-in : section masquée entièrement.

### D2. Avec device connecté (futur)
Garder la structure visuelle actuelle (phases, coucher, lever,
latence, etc.) mais conditionnée à la présence de données
device. Pour l'instant ce code est mort mais préparé.

---

## SECTION E — Tendances

### E1. Source des données
Les mini-graphiques doivent afficher les 7 derniers check-ins
de l'utilisateur (pas forcément 7 jours consécutifs — les jours
sans check-in sont ignorés).

Récupérer : SELECT * FROM daily_checkin
WHERE user_id = auth.uid()
ORDER BY date DESC LIMIT 7

### E2. Métriques affichées
Remplacer les 5 cartes actuelles (HRV, FC Repos, Readiness,
Fatigue, Sommeil) par des cartes basées sur des données réelles :

- SCORE : score de récupération calculé (même formule que C1)
  + mini graphique sur 7 check-ins
- FATIGUE : valeur fatigue sur 7 check-ins
- ÉNERGIE : valeur energy sur 7 check-ins
- STRESS : valeur stress sur 7 check-ins
- SOMMEIL : sleep_quality sur 7 check-ins

Chaque carte :
- Valeur du jour (grande, colorée)
- Variation vs moyenne des 7 jours (+2, -1, etc.)
- Mini graphique (sparkline) des 7 points
- "moy. X" pour la moyenne

Si moins de 3 check-ins : masquer la section Tendances entièrement,
afficher "Continue tes check-ins quotidiens pour voir tes tendances"

### E3. Sélecteur de période
Garder le bouton "7 jours" mais ajouter aussi "30 jours".
30 jours = SELECT des 30 derniers check-ins.

---

## SECTION F — Charge d'entraînement depuis Strava

### F1. Nouvelle section "Charge d'entraînement"
Ajouter une section entre "État du jour" et "Tendances".
Titre : "TRAINING LOAD" / "Charge d'entraînement"

Contenu :
- Nombre d'activités cette semaine (depuis Strava)
- Volume total (heures) cette semaine
- Répartition par sport (barres horizontales)
- Comparaison semaine précédente : "+2h vs semaine dernière"

Données récupérées depuis les activités Strava déjà stockées
en Supabase. Trouver la table existante des activités Strava
et faire les calculs.

---

## SECTION G — Sources de données

### G1. Remonter la section
Déplacer la section "Sources de données" juste sous le header
de la page (avant "État du jour") si AUCUN device n'est connecté.
Si au moins un device est connecté : la laisser en bas.

### G2. Message d'incitation
Quand aucun device n'est connecté (seulement Strava) :
Afficher un bandeau en haut de page :
"Connecte un appareil de suivi (Garmin, Whoop, Oura) pour
débloquer HRV, sommeil détaillé et FC repos."
Bouton "Voir les sources" → scroll vers la section Sources.

### G3. Boutons "Connecter"
Les boutons "Connecter" pour Garmin, Polar, Whoop, Oura
restent présents mais affichent un tooltip ou message
"Bientôt disponible" au clic. Pas de fonctionnalité pour
l'instant.

---

## Résumé de l'ordre d'exécution
1. A (nettoyage) — rapide
2. B (check-in matin) — fondation
3. C (état du jour dynamique) — dépend de B
4. D (sommeil simplifié) — rapide
5. E (tendances réelles) — dépend de B
6. F (charge Strava) — indépendant
7. G (sources et incitation) — rapide

Valider le build après chaque section.
