# Récupération — Interconnexion données + nettoyage

## RÈGLE FONDAMENTALE — à appliquer sur TOUTE l'app
Les pages ne doivent JAMAIS dupliquer une donnée qui existe déjà 
ailleurs. Elles doivent LIRE la donnée depuis sa source.

Avant d'implémenter : identifier dans Supabase les tables existantes 
qui contiennent les données nécessaires. Ne pas créer de nouvelle 
table si la donnée existe déjà.

---

## 1. Supprimer de la page Récupération

Supprimer complètement ces sections :
- **Poids** : input + graphique → SUPPRIMER (existe dans Nutrition 
  et/ou Profil utilisateur). À la place, LIRE le poids depuis la 
  table existante (chercher dans les tables : user_profile, 
  nutrition, athletes, ou similaire)
- **Zones de douleur** : grille de boutons + bonhomme → SUPPRIMER
- **Hydratation** : pills + icône verre → SUPPRIMER

Supprimer aussi les tables Supabase créées pour ces features 
si elles viennent d'être créées (body_weight, hydration, pain_log) 
— ou les laisser mais ne plus les utiliser dans cette page.

---

## 2. CTL / ATL / TSB — lire depuis Training

Le graphique PMC (CTL/ATL/TSB) dans la page Récupération est vide 
alors que les données d'activités Strava et les calculs TSS existent 
déjà dans la page Training.

Chercher dans le code de la page Training :
- Comment les activités Strava sont stockées (table, colonnes)
- Si le TSS est déjà calculé par activité
- Si CTL/ATL/TSB sont déjà calculés quelque part

Puis dans la page Récupération :
- Importer la MÊME logique de calcul (ou mieux : extraire dans un 
  hook/util partagé `useTrainingLoad()` ou `calculatePMC()`)
- Lire les activités depuis la MÊME table Supabase
- Calculer CTL/ATL/TSB avec les mêmes formules
- Afficher dans le graphique PMC

Si le TSS n'est pas encore calculé par activité dans Training :
le calculer à la volée depuis les données disponibles (durée, 
puissance moyenne, FC moyenne, FTP de l'utilisateur).

---

## 3. Volume hebdomadaire — lire depuis les activités Strava

Le graphique "Volume hebdomadaire" est vide.
Les activités Strava sont déjà en base (la page Training les affiche).

Chercher la table des activités Strava, puis :
- Grouper par semaine (ISO week)
- Sommer les durées par sport
- Afficher en barres empilées
- Format : heures et minutes (jamais de décimales)

---

## 4. Résumé semaine — alimenter avec des vraies données

La carte "Résumé semaine" affiche "0min" et "— Séances".
Alimenter depuis les activités Strava de la semaine en cours :
- Volume total : somme des durées (format Xh Xmin)
- Nombre de séances : count des activités
- Score moyen : moyenne des check-ins de la semaine
- Meilleur jour : jour avec le score check-in le plus élevé

---

## 5. Charge aiguë / chronique (ACWR)

ACWR = charge aiguë (7 jours) / charge chronique (28 jours).
Utiliser les TSS des activités Strava en base.
Si TSS pas disponible : utiliser la durée × un facteur d'intensité 
estimé comme proxy.

La jauge est déjà en place mais affiche 0.00.
La connecter aux vraies données.

---

## 6. Monotonie & Strain

Monotonie = moyenne(TSS 7 derniers jours) / écart-type(TSS 7 jours)
Strain = somme(TSS 7 jours) × monotonie

Lire les TSS depuis la même source que le PMC.
Afficher les valeurs réelles au lieu de "—".

---

## 7. Poids — lecture seule depuis le profil
Si le poids est utile quelque part sur la page (ex: calcul TSS 
par kg, affichage dans le résumé), le LIRE depuis la table où il 
est déjà stocké (profil ou nutrition).
Ne pas créer d'input de saisie sur cette page.

---

## Résumé technique
Trouver les tables existantes avec :
grep -r "strava" --include=".ts" --include=".tsx" -l grep -r "activities" --include=".ts" --include=".tsx" -l grep -r "weight|poids" --include=".ts" --include=".tsx" -l grep -r "tss|TSS" --include=".ts" --include=".tsx" -l

Créer un hook partagé si nécessaire :
`hooks/useTrainingLoad.ts` → expose CTL, ATL, TSB, ACWR, 
monotonie, strain, volume hebdomadaire.
Utilisable par Training ET Récupération.
