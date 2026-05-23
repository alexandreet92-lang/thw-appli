# PROMPT_PERFORMANCE_ANALYSE.md
# Analyse complète — Page Performance
# Statut : EN ATTENTE DE VALIDATION — aucun fichier modifié

---

## ÉTAPE 1 — Ce que j'ai compris des demandes du PDF

---

### 1. Onglet PROFIL

#### 1.1 Deux types de profil : Global et Spécifique

**Ce qui existe aujourd'hui :** Un seul profil "Global" (FTP, poids, âge, LTHR, hrMax, hrRest, allure seuil, VMA, CSS, VO2max) avec un formulaire d'édition unique.

**Ce qui est demandé :** Scinder le profil en deux sections distinctes dans l'UI :

- **Global** (ce qui existe déjà) : les paramètres physiologiques transversaux.
- **Spécifique** : une section par sport avec des champs propres à chaque discipline :

  | Sport | Champs à ajouter |
  |-------|-----------------|
  | Running | FC EF, FC SL1, FC SL2, allure EF fourchette (basse/haute), allure SL1, allure SL2, allure VMA |
  | Cyclisme | FC EF, FC SL1, FC SL2, watts EF fourchette, watts SL1, watts SL2, watts PMA, max power, FTP |
  | Natation | CSS, 400m chrono de référence |
  | Hyrox | Max reps Wall Ball, allure run compromised, max distance Farmer Carry (avec poids par catégorie : Open F 16kg / Open H & Pro F 24kg / Pro H 32kg), time 100m BBJ, time 200m Lunges (Open F 10kg / Open H & Pro F 20kg / Pro H 30kg), time 100m Sled Push (charges officielles), time 100m Sled Pull (charges officielles), time 2000m SkiErg, time 2000m Row |

Ces paramètres "Spécifiques" sont des **records de référence personnels** (benchmarks de forme), distincts des records de compétition de l'onglet Datas.

---

### 2. Onglet DATAS — Bulle Records

#### 2.1 Ligne du graphique interactive (suivi souris)
Le graphique de la courbe de puissance cyclisme doit répondre au mouvement de la souris : une ligne verticale (crosshair) suit le curseur et affiche les valeurs correspondantes. Ce comportement est déjà partiellement présent mais doit être complété.

#### 2.2 Nouveau graphique Cyclisme : Best Performance Climb
Ajouter un graphique montrant les **meilleures performances sur les côtes et cols** (escalade de puissance). C'est une visualisation type "meilleur effort sur segment montant" — les données viennent probablement des streams Strava/activités.

#### 2.3 Records Run/Natation/Aviron : affichage par année
Actuellement les records s'affichent comme des valeurs fixes. La demande est de **grouper par année** et afficher le meilleur temps de chaque année par distance — permettant de voir la progression pluriannuelle. Même logique pour Natation et Aviron.

#### 2.4 Triathlon : refonte complète de la comparaison
- Comparer les temps par distance sur **une même année**
- Comparer les **meilleurs temps entre les années**
- Voir le chrono **global ET les 3 disciplines séparément** (swim, bike, run) + transitions
- Calculer la performance "normalisée" en tenant compte du **parcours et de la température** (pas uniquement le chrono brut)
- Afficher les **watts moyens/pondérés** et l'**allure run**

#### 2.5 Hyrox : refonte de l'affichage des courses
- Trier toutes les courses par format/catégorie, dans l'ordre chronologique
- Afficher le **meilleur temps par année** (avec indicateur visuel)
- Afficher les **8 stations + run compromised** pour chaque course
- Pour le **run compromised** : voir le détail de chacun des 8 runs (Run 1 à Run 8 individuellement)

---

### 3. Onglet DATAS — Year Datas

#### 3.1 Esthétisme du graphique volume par sport
Le graphique de volume (probablement le donut/bar chart de volume par sport) doit être redesigné — les couleurs, proportions ou layout sont jugés insuffisants.

#### 3.2 Réorganiser et réduire les boutons
Il y a trop de boutons dans Year Datas. Supprimer les boutons superflus, regrouper ou simplifier l'interface.

#### 3.3 Format des heures : HhMM (4h53 et non 4h9)
Partout où une durée s'affiche (volume hebdo, mensuel, annuel), formater en `4h53` et non `4h9`. Le zéro est absent des dizaines, pas des unités : `4h09` serait acceptable mais la convention voulue est sans le zéro.

---

### 4. Onglet TESTS — Modifications générales

#### 4.1 Supprimer les boutons "Analyser" et "Ouvrir"
Les deux boutons actuels sur chaque carte test doivent être supprimés.

#### 4.2 Toute la carte est cliquable
Ouvrir le protocole en cliquant **n'importe où sur la carte**, pas seulement sur un bouton.

#### 4.3 Ajouter des fichiers/documents à chaque test
Pour chaque test, permettre d'**uploader des fichiers** (PDF de résultats, captures d'écran, notes de labo, etc.) en tout format.

#### 4.4 Bouton "Enregistrer" après saisie de données
Une fois les champs remplis (ou un document ajouté), afficher un bouton **"Enregistrer ce test"** qui sauvegarde en DB.

#### 4.5 Historique par test
Lorsqu'un test a été enregistré au moins une fois, afficher **tout l'historique des entrées précédentes** dans la fiche de ce test (liste des dates + résultats passés).

#### 4.6 Nouvelle bulle "Historique Tests"
Créer une **bulle globale** (probablement un panneau/modal) qui centralise tous les tests enregistrés toutes disciplines confondues, triés par date.

---

### 5. Bulle Cyclisme — Tests Endurance : 3 nouveaux tests

Remplacer ou compléter le test "Endurance" existant (2h) par 3 variantes :
1. **Test existant mais 4h** au lieu de 2h (même protocole)
2. **2h EF basse + 2h EF moyenne + 1h EF haute** : test de dérive cardiaque progressive (mesure FC régulière, même principe que l'actuel)
3. **3h30 à 5h30 full endurance + 20' à FTP + 10' récupération** : test long avec bloc de tempo en fin

---

### 6. Bulle Natation — Nouveau test Hypoxie

Ajouter un test natation original : **parcourir la plus grande distance en apnée (sans respirer) au crawl**. Aucune métrique cardio, juste la distance maximale.

---

### 7. Bulle Hyrox — Tests : enrichir les protocoles existants

Modifications sur les tests Hyrox :
- **PFT** : remettre les exercices dans le bon ordre (réorganiser la liste)
- **BBJ** : ajouter 2 variantes chronométrées :
  1. Time sur **200m**
  2. Time sur **400m** (endurance extrême)
- **Farmer Carry** : ajouter une variante **max distance au poids de la course** (poids officiels Hyrox)
- **Wall Ball** : ajouter 2 variantes :
  1. **Max reps** au poids de la course
  2. **10 Wall Ball + 10'' pause balle au-dessus de la tête**, répéter jusqu'à épuisement (toutes les reps comptent même en milieu de série)

---

## ÉTAPE 2 — Ce que j'observe dans le code actuel

---

### A. Bugs confirmés

**A1 — Profil hardcodé, non persistant**
`INIT_PROFILE` est un objet constant en mémoire. Toute modification du profil est perdue à la navigation ou au rechargement. Il n'y a aucun `useEffect` pour charger depuis Supabase et aucun appel `save` vers la DB. **Le profil ne persiste jamais côté serveur.**

**A2 — `handleSave` dans TestProtocolPanel ne fait rien**
```typescript
function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2500) }
```
L'état `saved` passe juste à `true` pendant 2,5s puis revient à `false`. **Aucune donnée n'est envoyée en base.** L'utilisateur croit avoir enregistré son test, mais rien n'est sauvegardé.

**A3 — `handleAnalyzeTest` appelle l'API avec `testResults: {}`**
```typescript
body: JSON.stringify({ action: 'analyzeTest', payload: { testName: test.name, testResults: {}, profile } })
```
Les résultats du test ne sont **jamais inclus** dans l'analyse IA — le payload est toujours vide.

**A4 — Courbe de puissance : crosshair absent**
`DatasTab.tsx` utilise `monotonePath` pour le rendu SVG mais il n'y a pas d'`onMouseMove` sur le SVG de la power curve. La ligne de tracking souris est manquante (demandée dans le PDF).

**A5 — Records Run/Swim/Rowing : `TimeBarChart` n'affiche que 5 années max**
```typescript
const sortedYears = Object.keys(byYear).sort(...).slice(0, 5)
```
Si l'utilisateur a plus de 5 ans de données, les plus anciens sont silencieusement supprimés.

---

### B. Incohérences techniques

**B1 — `YEAR_COLORS` défini mais jamais utilisé dans `TimeBarChart`**
`TimeBarChart` utilise `getPCColor` (couleurs de la power curve) au lieu de `YEAR_COLORS`. Incohérence visuelle entre les sports.

**B2 — Zones FC avec modèle Coggan %FCmax uniquement**
`calcHRZones` utilise uniquement le modèle `%FCmax`. Le LTHR est disponible dans le profil mais jamais utilisé pour calculer les zones cardiaques. Le modèle LTHR est plus précis pour les athlètes entraînés.

**B3 — `calcRunZones` et `calcRunZonesFromInputs` coexistent sans cohérence**
Deux fonctions différentes pour calculer les zones running, avec des logiques différentes. Aucune des deux n'est sélectionnée selon la disponibilité des données.

**B4 — `Card` importé dans `DatasTab.tsx` via une redéclaration locale**
`DatasTab.tsx` redéfinit localement une version de `Card` qui n'est pas le même composant que celui de `page.tsx`. Duplication inutile de logique UI.

**B5 — `toSec` ne gère pas les formats invalides**
```typescript
function toSec(t: string): number {
  if (!t || t === '—') return 0
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p[0]*60 + (p[1]||0)
}
```
Un format comme `"abc"` retourne `NaN` qui se propage silencieusement dans tous les calculs.

**B6 — Hyrox `runs` stocké sans Run Compromised distinct**
Le run compromised est inclus dans les 8 runs (`runs: string[]`) sans distinction. Le PDF demande de voir le détail de chacun des 8 runs pour le run compromised. La structure DB actuelle ne le différencie pas.

---

### C. Dette technique / opportunités

**C1 — Profil Spécifique = pas de table Supabase dédiée**
Les paramètres spécifiques (FC SL1/SL2, watts EF, etc.) n'ont pas de table. Il faudra créer une migration avec une table `athlete_sport_profile` (user_id, sport, params JSONB).

**C2 — Historique des tests = table manquante**
La feature "Enregistrer ce test" + "Historique Tests" nécessite une table `test_results` (user_id, test_id, sport, date, values JSONB, documents JSONB).

**C3 — Upload de fichiers = Supabase Storage**
La feature d'ajout de fichiers/documents pour les tests nécessite l'activation de Supabase Storage avec un bucket `test-documents`. Pas de code existant pour ça.

**C4 — Year Datas : les durées sont formatées avec `h` simple**
Chercher tous les endroits où les durées s'affichent pour les corriger en `HhMM`.

**C5 — TestCard est actuellement non-cliquable sur la zone principale**
Le `onClick` est uniquement sur les boutons. L'ensemble du `div` card doit devenir cliquable.

**C6 — Aucune migration SQL créée pour `hyrox_races`**
La table existe mais il n'y a pas de migration SQL trackée dans le repo pour son schéma exact. Si on ajoute un champ (ex: `run_compromised_detail`), il faut créer une migration.

---

## ÉTAPE 3 — En attente de ta validation

Je n'ai touché à aucun fichier. Confirme que tu as lu et validé cette analyse avant que je commence à coder.

Priorités suggérées (à valider avec toi) :
1. **Profil** — Global/Spécifique + persistance Supabase
2. **Tests** — Rendre les cartes cliquables, supprimer les boutons, enregistrement réel
3. **Datas Records** — Courbe années, crosshair souris
4. **Year Datas** — Format HhMM, nettoyage boutons
5. **Tests spéciaux** — Nouveaux protocoles Cyclisme/Natation/Hyrox
