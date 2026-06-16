# B3 — PROFILAGE DE L'ATHLÈTE

> **Statut : DOCUMENT CANONIQUE (couche socle).** Définit comment l'IA **construit et maintient le profil** d'un athlète : déduire forces/faiblesses depuis les ancres (B4), l'historique et les tests → en tirer des **priorités d'entraînement** qui alimentent le **choix de méthode (B1 §3)**.
> Consomme : B4 (ancres & ratios §5), B5 (charge supportée, tendances), calendrier (objectifs), historique d'activités. Fournit : un **profil structuré** + des **priorités classées**.

---

## 0. PRINCIPE

Le profil n'est pas une étiquette figée : c'est un **modèle vivant**, mis à jour à chaque donnée. Il sert à **personnaliser** (la même méthode ne convient pas à tous) et à **prioriser** (sur quel levier l'athlète gagne le plus).

> `SI une décision (méthode, séance, charge) est prise sans consulter le profil → ALORS elle est générique, donc probablement sous-optimale. Toujours profiler d'abord.`

---

## 1. LES DIMENSIONS DU PROFIL

| Dimension | Contenu | Sources |
|---|---|---|
| **Physiologique** | VO2/VMA/PMA, seuil, profil diesel↔puncheur, économie, endurance/durabilité | B4 (ancres + ratios) |
| **Structurelle** | Antécédents de blessure, zones fragiles, asymétries, morphotype | Historique, déclaratif (B2) |
| **Technique** | Aisance par sport (nage surtout, descente trail, transitions tri) | Vidéo/données, déclaratif |
| **Charge / récup** | Volume soutenable, vitesse de récup, tolérance à l'intensité | B5 (CTL, réponse à la charge) |
| **Logistique** | Temps réel dispo, accès matériel/piscine, contraintes de vie | Déclaratif (B1 §2) |
| **Psychologique** | Motivation, rapport à l'intensité, adhésion, gestion du stress | Observation, déclaratif |
| **Âge d'entraînement** | Années de pratique structurée (≠ âge civil) | Historique |
| **Objectif** | Épreuve(s) cible, échéance, niveau d'enjeu | Calendrier |

---

## 2. PROFILAGE PHYSIOLOGIQUE (déduction depuis B4)

### 2.1 Diesel ↔ Puncheur (axe central)
À partir des ratios de B4 §5 :

| Indicateur (B4) | Diesel / endurant | Puncheur / explosif |
|---|---|---|
| FTP / PMA (vélo) | > 0,78 | < 0,72 |
| vLT2 / VMA (course) | > 0,89 | < 0,86 |
| W′ (vélo) | bas (< 18 kJ) | élevé (> 22 kJ) |
| Exposant de Riegel (B4 §6.3) | bas (~1,04) tient le long | haut (~1,08) se dégrade |
| Ressenti | « je tiens longtemps, je manque de punch » | « j'explose vite mais ça ne dure pas » |

> `SI profil diesel → ALORS le levier de progression principal = VO2max/PMA et capacité anaérobie (souvent négligés) ; le seuil est déjà un point fort.`
> `SI profil puncheur → ALORS le levier = seuil + volume aérobie (endurance) ; la PMA est déjà bonne.`
> **Logique :** on développe en priorité le **maillon faible** s'il est limitant pour l'objectif — MAIS on protège/exploite le point fort (§4 arbitrage).

### 2.2 Durabilité (fatigue-résistance)
Capacité à maintenir puissance/allure en **fin** d'effort long (≠ valeurs à froid).
- Détection : comparer FTP/seuil testé frais vs puissance/allure soutenable après 2-3 h (découplage, B4 §7.2).
> `SI fort découplage sur les sorties longues → ALORS faible durabilité : prioriser le volume Z2 et les efforts qualité en fin de sortie longue (« fatigue resistance »), crucial pour 70.3/IM/marathon/ultra.`

### 2.3 Économie / efficience
Deux athlètes de même VMA n'ont pas la même perf → l'économie (coût énergétique à allure donnée) départage.
- Indices indirects : performance en course vs VMA prédite ; FC à allure donnée dans le temps.
> `SI perf en course < ce que la VMA prédit → ALORS suspecter un déficit d'économie : travail technique de course, force, foulée, et spécificité d'allure (doc A « Allure spécifique »).`

---

## 3. PROFILAGE PAR SPORT (spécificités)

| Sport | Marqueurs de force/faiblesse à lire |
|---|---|
| **Course/route** | VMA, vLT2/VMA, économie, durabilité, tolérance à l'impact (SN, B5) |
| **Trail** | Puissance en côte (W/kg), technique/aisance en **descente** (frein excentrique = SN++), endurance longue, gestion dénivelé |
| **Cyclisme** | FTP W/kg, FTP/PMA, W′, durabilité, position (aéro vs route) |
| **Natation** | **Technique avant tout** (efficience > moteur), CSS, aisance respiratoire bilatérale, eau libre vs bassin |
| **Triathlon** | Maillon faible des 3 sports + qualité des **transitions** + capacité à courir sous fatigue (brick) |
| **Hyrox** | Course sous fatigue + force-endurance des stations + transitions ; profil hybride par définition |
| **Muscu** | Force max vs endurance de force, déséquilibres bilatéraux, chaînes faibles |

> `SI triathlète → ALORS identifier le sport le plus pénalisant pour le chrono cible (souvent la nage en relatif, ou la course en fin d'IM) et y allouer la priorité, sans laisser s'effondrer les deux autres.`
> `SI traileur avec bonne montée mais mauvaise descente → ALORS travailler spécifiquement l'excentrique/descente (technique + tolérance SN), souvent le plus gros gisement de temps.`

---

## 4. DES FORCES/FAIBLESSES AUX PRIORITÉS (arbitrage)

> Le profilage ne sert à rien sans **hiérarchisation**. On classe les leviers par **rendement attendu × pertinence pour l'objectif × coût/risque**.

### 4.1 Règle de priorisation
```
Pour chaque levier candidat (ex. « développer VO2 », « volume Z2 », « technique nage ») :
  Pertinence_objectif (0-3) : combien ce levier compte pour la course cible ?
  Marge_de_progression (0-3) : à quel point l'athlète est loin de son potentiel sur ce levier ?
  Coût/Risque (0-3, inversé)  : blessure, temps, fatigue induite.
  Score = Pertinence + Marge − Coût
→ Travailler en priorité les 1-2 plus hauts scores ; maintenir le reste.
```

### 4.2 Arbitrage maillon faible vs point fort
- **Avant la phase spécifique :** combler le maillon faible limitant (plus grand gisement).
- **En phase spécifique / proche course :** affûter le point fort qui fait la perf, ne plus chercher à corriger un déficit non critique.
> `SI < 6-8 semaines de la course ET le maillon faible n'est pas le facteur limitant de l'épreuve → ALORS arrêter de le travailler et maximiser la spécificité ; corriger les défauts hors-saison.`

### 4.3 Faiblesses non physiologiques prioritaires
> `SI faiblesse technique (nage) OU structurelle (zone fragile, B2) → ALORS elle prime souvent sur le développement « moteur » : inutile d'ajouter de la puissance qu'on ne sait pas transmettre ou qui blesse.`

---

## 5. ÂGE D'ENTRAÎNEMENT & NIVEAU (calibrer l'ambition)

| Niveau | Caractéristiques | Implications |
|---|---|---|
| **Débutant** (< 1-2 ans structurés) | Gros gains faciles, faible tolérance à l'intensité, technique fragile, risque de surcharge | Base aérobie + technique ; **peu** d'intensité, introduite tard ; progression prudente du SN (B5) |
| **Intermédiaire** | Gains via structuration, tolère plus d'intensité | Méthodes mixtes/pyramidales, périodisation claire |
| **Avancé** | Marges fines, besoin de stimuli ciblés | Blocs, spécificité, gestion fine de la charge (B5), polarisation/norvégien si volume dispo |
| **Master (> ~45 ans)** | Récup plus lente, risque tendineux ↑, FCmax ↓ | 2:1 (B5), volume d'intensité contenu, prévention renforcée (B8), force conservée |

> `SI débutant → ALORS NE PAS appliquer une méthode d'avancé (polarisé à gros volume, double seuil norvégien) : le moteur et les tissus ne suivent pas. Construire d'abord.`
> `SI master → ALORS conserver de la force/explosivité (s'érode avec l'âge) MAIS espacer davantage les séances à fort SN.`

---

## 6. MISE À JOUR DU PROFIL (dynamique)

- Le profil se révise à chaque **test** (B4 §7), à chaque **bloc** terminé, et sur **tendance** (pas sur une séance isolée — B1 §5.3).
> `SI un ratio (ex. FTP/PMA) évolue significativement après un bloc → ALORS reclasser le profil (le diesel devient moins diesel après un bloc PMA réussi) et réviser les priorités.`
> `SI répétition de douleurs sur une même zone → ALORS marquer une fragilité structurelle persistante dans le profil (influence durable la charge SN, B2/B5).`

---

## 7. SCHÉMA DE PROFIL (sortie structurée pour l'IA)
```
Profil athlète {
  objectif: { épreuve, sport, distance, date, enjeu },
  niveau: débutant | intermédiaire | avancé | master,
  âge_entraînement_ans,
  physio: {
    par_sport: { VMA/FTP/CSS…, vLT2/VMA, FTP/PMA, W′, durabilité, économie },
    profil_dominant: diesel | équilibré | puncheur
  },
  structurel: { zones_fragiles[], antécédents[], asymétries[] },   // ← B2
  technique: { par_sport: niveau + points faibles },
  charge: { volume_soutenable, tolérance_intensité, vitesse_récup },// ← B5
  logistique: { temps_hebdo, matériel, contraintes },
  psycho: { motivation, rapport_intensité, adhésion },
  priorités_classées: [ { levier, score, justification } ]          // ← §4
}
```

---

## 8. INTERFACE (ce que B3 fournit / consomme)

**Consomme :** B4 (ancres, ratios §5), B5 (charge/récup), B2 (fragilités), calendrier (objectif), historique.
**Fournit :** le **profil structuré (§7)** et les **priorités classées (§4)** → entrée directe de l'**arbre de choix de méthode B1 §3**, de la **personnalisation des séances** (docs A & B7), et du **plafonnement de charge** (B5).
> Les docs A (méthodes) supposent qu'un profil et des priorités existent ; ils adaptent leur contenu au profil (ex. « pour un diesel, renforcer les blocs VO2 de cette méthode »).
