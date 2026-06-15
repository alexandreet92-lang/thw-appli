# B5 — PÉRIODISATION & GESTION DE CHARGE

> **Statut : DOCUMENT CANONIQUE (couche socle).** Source unique de vérité pour : la **mesure de charge** (système SM/SN), les indicateurs de **forme** (CTL/ATL/TSB par axe), la **monotonie/contrainte**, les **règles de progression**, le **deload** et l'**affûtage**.
> Consomme les **zones de B4 §3** comme entrée de calcul de charge. Fournit la forme/charge à **B1** (décisions) et à tous les docs A (méthodes) et B8 (récup).
>
> **SM/SN — formules de l'implémentation Hybrid.** Ce document remplace la métrique TSS par le système maison **SM (Score Métabolique)** + **SN (Score Neuromusculaire)** à deux axes, CTL/ATL/TSB **séparés par axe** (EWMA). Les **formules §1.2** sont celles actées pour l'app (SM = TRIMP modifié Banister/Morton ou modèle puissance ; SN = charge mécanique/excentrique/tonnage). Les **coefficients k** (k_zone, k_relief, seuils chaleur/dénivelé) sont des **réglages ajustables** : Claude Code doit confirmer qu'ils correspondent au code en production et les tuner sur données réelles. Les principes de gestion (§3-§10) sont indépendants de la formule exacte.

---

## 0. POURQUOI DEUX AXES (SM / SN) PLUTÔT QU'UN SEUL SCORE

Un score unique de charge (type TSS) confond deux stress physiologiquement distincts :
- **Stress métabolique (SM)** : coût cardio-respiratoire et énergétique → fatigue centrale/aérobie, récupère en **heures à ~2 jours**.
- **Stress neuromusculaire (SN)** : coût mécanique/contractile (intensité, explosivité, excentrique, dénivelé négatif, charges lourdes) → fatigue tissulaire/nerveuse, récupère en **2 à 4+ jours**, et c'est le principal vecteur de **blessure de surcharge** (B2).

Conséquence doctrinale : **un athlète peut être « frais » sur un axe et « cuit » sur l'autre.** Exemple : grosse sortie vélo Z2 longue = SM élevé, SN modéré → on peut enchaîner du SN (muscu/sprint) le lendemain. À l'inverse, séance de descente trail / pliométrie = SN élevé, SM modéré → surveiller le tissu avant de recharger du SN.

> `SI on ne raisonne que sur un score global → ALORS on masque ces déséquilibres et on prescrit à l'aveugle. TOUJOURS lire SM et SN séparément avant de décider de la séance du jour.`

---

## 1. MESURE DE LA CHARGE (SM / SN par séance)

### 1.1 Principe
Pour chaque séance, on calcule **deux charges** : un **SM** (coût cardio-énergétique) et un **SN** (coût mécanique/neuromusculaire). Le SM repose sur le **TRIMP** (impulsion d'entraînement, Banister 1991 / Morton 2004) quand on n'a que la FC, ou sur un **modèle puissance** quand la puissance est disponible (vélo). Le SN capte l'**intensité haute**, l'**excentrique (descente)** et le **tonnage relatif au 1RM** (muscu). Les deux alimentent des EWMA séparées (§2).

### 1.2 Formules (implémentation Hybrid)
> Variables : `NP` = puissance normalisée, `IF` = NP/FTP, `FC_relative = (FC_moy − FC_repos)/(FC_max − FC_repos)`, `p5s` = meilleure puissance 5 s, `D+/D−` = dénivelé positif/négatif (m), `T°C` = température. Les coefficients en gras sont **ajustables** (à confirmer vs code).

**SM — Score Métabolique**

Cyclisme (puissance disponible) :
```
SM = (durée_s × NP × IF) / (FTP × 3600) × 100
     × (1 + max(0, (T°C − 22) × 0,025))     ← chaleur (> 22 °C)
     × (1 + D+_m / distance_km / 10)          ← coût métabolique de la montée
```
Course / Trail :
```
SM = durée_min × FC_relative × exp(1,92 × FC_relative)
     × (1 + max(0, (T°C − 22) × 0,025))
     × (1 + D+_m / distance_km / 8)
```
Natation, Aviron, Hyrox (sans puissance) :
```
SM = durée_min × FC_relative × exp(1,92 × FC_relative)
```
Muscu :
```
SM = FC_relative × durée_min × 0,6              ← charge cardio modérée
```
Triathlon : `SM = Σ SM_segments` (nage + vélo + course).

**SN — Score Neuromusculaire**

Cyclisme :
```
SN = (p5s / FTP) × min_au-dessus_120%FTP × k_relief
     k_relief = 1 + (D+_m + D−_m) / (distance_km × 15)
```
Course / Trail :
```
SN = durée_min × k_zone × (1 + D−_m / distance_km × 0,015)   ← descente = excentrique
     k_zone : Z1=1,0 · Z2=1,1 · Z3=1,3 · Z4=1,6 · Z5=2,0
```
Muscu :
```
SN = Σ (poids_kg × reps / 1RM_exercice) × sets × 10
```
Natation : `SN = 0` (impact quasi nul).
Hyrox : `SN = SN_run + SN_muscu_allégé`.
Aviron : SN type cyclisme sans p5s (via FC_pic).

> **Prérequis données (migration) :** la colonne `p5s_watts` et les `one_rm_estimates` doivent exister dans `athlete_performance_profile` ; le hook `useSmSn` calcule SM/SN par activité et par sport avec des fallbacks propres quand une donnée manque (cf. §1.3).

> `SI puissance absente (vélo) → ALORS basculer le SM vélo sur la formule FC (TRIMP), et le SN vélo sur un proxy FC_pic (pas de p5s).`
> `SI FC absente (capteur HS) → ALORS estimer FC_relative via RPE (table RPE→%intensité, B4 §1.7) et marquer la charge « estimée ».`
> `SI séance sans aucune donnée → ALORS SM/SN estimés via durée × RPE × type de séance ; flag « estimé ».`

### 1.3 Garde-fous de mesure
> `SI une séance produit un SM ou SN > 2× la séance habituelle la plus dure → ALORS suspecter une erreur de capteur/FTP/FC (B4 §8) avant d'en tirer une conclusion de charge.`
> `SI FC_relative > 1 ou < 0 (FC_max/FC_repos mal réglés) → ALORS données FC aberrantes : recaler FC_max/FC_repos (B4 §1.4) avant de fier le SM.`

---

## 2. INDICATEURS DE FORME (CTL / ATL / TSB, par axe)

> On maintient **deux jeux** d'indicateurs : un pour SM, un pour SN. Lissage **EWMA** (moyenne mobile exponentielle).

### 2.1 Définitions
- **CTL (Chronic — « forme »)** : moyenne EWMA de la charge sur **~42 jours** (constante longue). Représente la condition accumulée. Monte lentement, descend lentement.
- **ATL (Acute — « fatigue »)** : moyenne EWMA sur **~7 jours** (constante courte). Représente la fatigue récente. Réactif.
- **TSB (Balance — « fraîcheur »)** = `CTL_(hier) − ATL_(hier)`. Positif = frais ; négatif = fatigué.

### 2.2 Formule EWMA (par axe, à appliquer chaque jour)
```
CTL_SM(j) = CTL_SM(j−1) + (SM_j − CTL_SM(j−1)) / 42
ATL_SM(j) = ATL_SM(j−1) + (SM_j − ATL_SM(j−1)) / 7
TSB_SM    = CTL_SM − ATL_SM        ← « forme métabolique »

CTL_SN(j) = CTL_SN(j−1) + (SN_j − CTL_SN(j−1)) / 42
ATL_SN(j) = ATL_SN(j−1) + (SN_j − ATL_SN(j−1)) / 7
TSB_SN    = CTL_SN − ATL_SN        ← « forme neuro »
```
(charge_j = SM ou SN du jour ; 0 les jours off. Implémentation Hybrid : lissage en /42 et /7 — forme « moyenne mobile sur N jours », pas la variante 2/(N+1).)

### 2.3 Lecture du TSB (par axe)
| TSB | État | Usage type |
|---|---|---|
| **> +15** | Très frais / possiblement désentraîné | Pic de course (jour J) ; au-delà, on perd de la forme |
| **+5 à +15** | Frais | Compétition, séance clé de qualité |
| **−10 à +5** | Neutre / productif | Entraînement normal, « zone grise » fonctionnelle |
| **−10 à −25** | Charge fonctionnelle (overreaching productif) | Phase de build, blocs ; soutenable quelques semaines |
| **< −25 (persistant)** | Surcharge non fonctionnelle (risque) | Réduire : deload imminent |

> **Lecture croisée des deux axes (capital) :**
> - `SI TSB_SM négatif MAIS TSB_SN positif → ALORS fatigue aérobie : possible d'enchaîner du travail neuromusculaire (force, sprints courts), éviter le long métabolique.`
> - `SI TSB_SN négatif MAIS TSB_SM positif → ALORS fatigue tissulaire/nerveuse : enchaîner de l'endurance Z2 souple, ÉVITER intensité/pliométrie/descentes ; risque de blessure.`
> - `SI les DEUX TSB < −20 → ALORS deload, pas de qualité.`

---

## 3. MONOTONIE & CONTRAINTE (variabilité de la charge)

> Deux semaines de charge totale identique peuvent avoir des risques opposés selon leur **répartition**. On surveille la **monotonie** (uniformité) et la **contrainte** (strain), sur la charge **totale** (SM+SN combinés ou par axe).

### 3.1 Formules (synthèse type Foster, sur fenêtre 7 jours)
```
moyenne = moyenne quotidienne de la charge sur 7 j
écart-type = σ de la charge quotidienne sur 7 j (jours off = 0 inclus)

Monotonie = moyenne / écart-type
Contrainte (Strain) = charge_hebdo_totale × Monotonie
```

### 3.2 Seuils & règles
| Monotonie | Lecture |
|---|---|
| < 1,5 | Bonne variabilité (dur/facile bien contrasté) |
| 1,5 - 2,0 | Acceptable, surveiller |
| **> 2,0** | Risque : charge trop uniforme, récup insuffisante intercalée |

> `SI Monotonie > 2,0 → ALORS introduire de la variabilité : vrais jours faciles/off + journées clairement dures, plutôt que du « moyen » quotidien (le « gris » permanent fatigue sans développer).`
> `SI Contrainte en forte hausse semaine/semaine ET marqueurs de récup dégradés (B8) → ALORS deload anticipé.`

---

## 4. PROGRESSION DE LA CHARGE (combien augmenter)

### 4.1 Règle de rampe hebdomadaire
- Augmenter la charge hebdo (par axe) de **~5-8 %/semaine** en phase de développement. Au-delà de ~10 %, le risque de blessure/surmenage monte nettement.
- **Charge aiguë/chronique (ACWR)** : ratio charge 7 j / charge 28 j (moyenne). Zone « sûre » indicative **0,8-1,3** ; **> 1,5** = pic de risque ; **< 0,8** = sous-charge/détraining.

> `SI ACWR > 1,5 (pic de charge) → ALORS plafonner la semaine, vérifier signaux B8, repousser l'intensité non essentielle.`
> `SI ACWR < 0,8 plusieurs semaines (ex. après coupure) → ALORS remonter progressivement, NE PAS sauter directement à la charge cible (re-blessure fréquente au retour).`

### 4.2 Progression spécifique au SN (le plus risqué)
> Le SN est le vecteur dominant de blessure de surcharge. Sa progression doit être **plus lente que le SM** : viser ≤ 5 %/semaine sur l'axe SN, surtout pour les contenus à fort impact (volume de course, descentes, pliométrie, charges lourdes).
> `SI on augmente le volume de course → ALORS limiter la hausse du SN course à ~5-10 %/semaine ; introduire les surfaces dures et les descentes progressivement.`

---

## 5. STRUCTURE DE PÉRIODISATION

### 5.1 Hiérarchie temporelle
| Bloc | Durée | Rôle |
|---|---|---|
| **Macrocycle** | Saison / vers un objectif majeur | Du général au spécifique |
| **Mésocycle** | 3-6 semaines | Un focus (base, build, spécifique, affûtage) |
| **Microcycle** | ~7 jours | Alternance charge/récup |
| **Séance** | — | Unité prescriptible |

### 5.2 Schéma de charge des microcycles
- Classique **3:1** (3 semaines montantes + 1 semaine deload) ; **2:1** pour athlètes plus âgés / fragiles / forte intensité.
> `SI âge d'entraînement faible, antécédents de blessure, ou > ~45 ans → ALORS préférer 2:1 (récup plus fréquente).`

### 5.3 Modèles de périodisation (renvoi aux méthodes A)
| Modèle | Principe | Quand |
|---|---|---|
| **Linéaire** | Volume ↓ / intensité ↑ progressivement vers la course | Objectif unique lointain, débutants |
| **Par blocs** | Concentrer un stimulus (ex. bloc PMA) puis un autre | Intermédiaires/avancés, gains ciblés |
| **Ondulatoire** | Alterner les qualités au sein de la semaine | Multi-objectifs, maintien de plusieurs filières |
| **Inversé** | Intensité tôt, volume/spécifique tard | Courtes distances, certains profils |

> Le choix du modèle découle de **B1 §3** (profil × objectif × temps). Les docs A décrivent l'exécution de chaque méthode dans ces modèles.

### 5.4 Phases vers une course (macro)
```
BASE (général)      → volume aérobie, force générale, technique. CTL monte.
BUILD (spécifique)  → intensité ciblée selon méthode (seuil/VO2/spécifique). TSB toléré négatif.
PIC/AFFÛTAGE        → réduire la fatigue, garder la forme. TSB remonte vers +5/+15.
COMPÉTITION         → jour J, TSB optimal.
TRANSITION          → récup active, coupure mentale. CTL redescend volontairement.
```

---

## 6. DELOAD (semaine de récupération)

### 6.1 Déclencheurs
> `SI fin de mésocycle (3-4 sem) OU TSB (un axe) < −25 persistant OU monotonie > 2 + signaux B8 dégradés OU stagnation/régression des perfs à FC donnée → ALORS deload.`

### 6.2 Structure
- **Réduire le VOLUME de ~40-50 %**, **conserver un peu d'INTENSITÉ** (quelques rappels courts) pour ne pas « rouiller ».
- Ne pas tout couper : un deload n'est pas une semaine off (sauf surmenage avéré).
- Durée : 5-7 jours typiquement.

> `SI surmenage non fonctionnel avéré (B8) → ALORS coupure plus franche / repos, pas un simple deload.`

---

## 7. AFFÛTAGE (taper) — amener le pic le jour J

### 7.1 Principes
- **But :** faire chuter l'ATL (fatigue) tout en préservant le CTL (forme) → TSB monte vers la fenêtre cible.
- **Levier principal : couper le VOLUME** (−40 à −60 % progressivement). **Garder l'INTENSITÉ** (intervalles courts, allures de course) à volume réduit. **Maintenir la FRÉQUENCE** des séances (ne pas disparaître plusieurs jours).
- **Durée selon distance / charge accumulée :**

| Type d'épreuve | Durée d'affûtage | TSB cible jour J |
|---|---|---|
| 5-10 km / sprint tri / courses courtes | 5-8 jours | +5 à +10 |
| Semi / 70.3 | 8-12 jours | +10 à +15 |
| Marathon / Ironman / ultra | 12-21 jours | +15 à +25 |

### 7.2 Règles
> `SI affûtage trop long/agressif → ALORS perte de forme (CTL chute, TSB > +25, « jambes vides ») : raccourcir ou réinjecter de l'intensité courte.`
> `SI « jambes lourdes » en milieu d'affûtage → ALORS NE PAS paniquer ni ajouter de charge : phénomène normal, le pic arrive après. (Lien B1 §5.3 rassurer.)`
> `SI TSB_SN doit être plus frais que TSB_SM pour l'épreuve (ex. trail descendant, course à fort impact) → ALORS prioriser la baisse du SN en fin d'affûtage.`

---

## 8. INTÉGRATION MULTI-SPORT (charge combinée)

- Chez le triathlète/hybride, **SM se cumule across sports** (le cœur ne sait pas si tu nages ou pédales), mais **SN est largement spécifique** (le SN course ≠ SN vélo ≠ SN nage).
> `SI grosse semaine vélo (SM haut) → ALORS le SM limite aussi la capacité à encaisser de la course : raisonner SM global. MAIS le SN course reste « disponible » si peu sollicité → possible de placer une qualité course malgré la fatigue vélo, avec prudence.`
- **Hyrox / hybride** : séances mixtes → SM et SN tous deux élevés ; à traiter comme des séances « doubles charge » (récup proportionnelle).

---

## 9. ARBRE DE DÉCISION — « Quelle séance aujourd'hui ? »
```
Lire TSB_SM et TSB_SN + signaux B8 (sommeil, FCrepos, ressenti) + statut B2 (douleur).
├─ Douleur rouge (B2) → STOP / cross-training sans douleur / orienter.
├─ Deux TSB < −20 OU signaux B8 dégradés → DELOAD / Z1-Z2 facile.
├─ TSB_SN < −15, TSB_SM ok → endurance Z2 souple, PAS d'intensité/impact/descente.
├─ TSB_SM < −15, TSB_SN ok → possible qualité neuromusculaire courte / force ; éviter long métabolique.
├─ TSB conformes au plan → exécuter la séance prévue par la méthode (doc A).
└─ Veille de course / affûtage → activation courte, fraîcheur prioritaire.
```

---

## 10. INTERFACE (ce que B5 fournit / consomme)

**B5 consomme :** **B4 §3** (zones → calcul SM/SN), **B4 §8** (modificateurs chaleur/altitude), **B8** (marqueurs de récup), **B2** (statut blessure), calendrier (échéances).
**B5 fournit :** SM/SN par séance, CTL/ATL/TSB par axe, monotonie/contrainte, ACWR → à **B1** (décisions), aux docs **A** (qui programment dans ces phases), **B8** et **B6**.
> Tout document A exprime sa progression en termes de **phases (§5)**, de **rampe (§4)** et de **deload/affûtage (§6/§7)** définis ici ; il ne redéfinit pas les indicateurs.
> **Note Claude Code :** les **formules SM/SN (§1.2)** sont celles de l'implémentation Hybrid (TRIMP/puissance + EWMA /42-/7). Les **coefficients ajustables** (k_zone, k_relief, seuils chaleur/dénivelé, 0,6 muscu, exposant 1,92) doivent être confirmés contre le code en production (hook `useSmSn`) et tunés sur données réelles. Les `〔HYP〕` qui subsistent dans les autres docs (B7, A-*) **pointaient vers cette section** : ils sont désormais résolus — la seule incertitude restante est le tuning des coefficients, pas la structure des formules.
