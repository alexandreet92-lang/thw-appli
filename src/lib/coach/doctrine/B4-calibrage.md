# B4 — CALIBRAGE DES INTENSITÉS

> **Statut : DOCUMENT CANONIQUE (couche socle).**
> Ce document est la **source unique de vérité** pour : les ancres physiologiques (FTP, PMA, VMA, vLT2, CSS, LTHR, 1RM, split aviron), les **zones d'intensité**, les **formules de conversion** ancre → watts/allures/FC/charges, et les **règles de correction** (chaleur, altitude, capteurs…).
> Les documents A (méthodes) et les autres transverses (B5 charge, B6 compétitions, B7 séances…) **référencent** ce document : ils ne redéfinissent jamais une zone ou une ancre. En cas de contradiction entre un autre document et B4, **B4 prime**.
> Convention de lecture pour l'IA : chaque bloc `SI … → ALORS …` est une règle de décision exécutable. L'IA doit pouvoir **citer la règle** quand elle justifie une prescription.

---

## 0. PRINCIPES DE CALIBRAGE (méta-règles)

### 0.1 Hiérarchie de confiance des ancres
Quand plusieurs sources existent pour une même ancre, l'IA choisit dans cet ordre :

1. **Test de terrain récent et propre** (< 6 semaines, athlète frais le jour J).
2. **Donnée terrain extraite des activités** (meilleur effort 20 min, course récente…).
3. **Estimation indirecte** (ramp test, formule de prédiction, ratio inter-ancres).
4. **Population/formule par défaut** (âge, FCmax théorique) — dernier recours.
5. **RPE seul** — toujours disponible, jamais à mépriser, sert de garde-fou.

> `SI une ancre n'a aucune source de niveau 1-3 → ALORS prescrire en RPE + FC prudente, marquer l'ancre « provisoire », planifier un test sous 14 jours.`

### 0.2 Triple pilotage : Externe / Interne / Perçu
Toute intensité se lit sur **trois canaux** ; ils se contrôlent mutuellement.

| Canal | Cyclisme | Course | Natation | Aviron | Nature | Latence | Fiabilité |
|---|---|---|---|---|---|---|---|
| **Externe (charge mécanique)** | Watts | Allure | Allure /100m | Split /500m | Ce que tu produis | Immédiate | Haute si capteur OK |
| **Interne (coût physiologique)** | FC | FC | FC (peu fiable en nage) | FC | Ce que ça coûte | 30-120 s de retard | Moyenne (contaminable) |
| **Perçu (RPE)** | RPE 1-10 | RPE | RPE | RPE | Intégration globale | Immédiate | Subjective mais robuste |

**Règle de divergence (capitale) :**
> `SI Externe et Interne divergent fortement (ex. watts normaux mais FC anormalement haute) → ALORS suspecter une contamination (chaleur, fatigue, maladie, déshydratation, excitants) → piloter sur l'EXTERNE + plafonner par le PERÇU, ne pas chercher à « rattraper » la FC.`
> `SI pas de capteur externe (course sans GPS fiable, nage) → ALORS piloter FC + RPE, le RPE étant prioritaire en cas de doute.`
> `SI Perçu >> attendu pour la zone visée (ex. Z2 ressentie en Z4) → ALORS réduire l'intensité du jour, ne pas forcer : c'est un signal de fatigue, pas un manque de volonté.`

### 0.3 Spécificité : une ancre n'est pas transférable
La FTP vélo ne donne PAS la VMA. La VMA course ne donne PAS le CSS. La FC seuil **diffère entre sports** (typiquement FC seuil vélo ≈ FC seuil course **− 5 à −10 bpm** chez le même athlète, car masse musculaire mobilisée et retour veineux différents).
> `SI on possède la FC seuil en course mais pas en vélo → ALORS estimer LTHR_vélo ≈ LTHR_course − 7 bpm (par défaut), puis corriger dès qu'on a des données vélo réelles.`

### 0.4 Fraîcheur : une ancre vieillit
Une ancre est une **photo datée**. Elle dérive avec l'entraînement (↑) et le désentraînement/maladie (↓). Voir §7 pour la cadence et la détection automatique de dérive.

---

## 1. ANCRES DE RÉFÉRENCE (définitions + plages physiologiques)

### 1.1 Cyclisme

- **FTP (Functional Threshold Power)** — puissance soutenable ~45-60 min en quasi-état stable, proxy du **seuil lactique 2 / MLSS**. Unité : watts, et surtout **W/kg** (FTP/poids) pour comparer. Repères W/kg : débutant ~2,0-2,8 ; intermédiaire 2,8-3,5 ; bon amateur 3,5-4,2 ; élite régional 4,2-5,0 ; pro >5,5.
- **PMA / MAP (Puissance Maximale Aérobie)** — puissance à VO2max, tenable ~4-7 min. Sert aux blocs VO2.
- **CP & W′ (modèle puissance critique)** — **CP** ≈ asymptote de puissance soutenable (proche FTP, souvent 2-5 % au-dessus selon protocole) ; **W′** (« W prime », en **kJ**) = réservoir d'énergie au-dessus de CP (capacité anaérobie). W′ typique 15-25 kJ.
- **Pmax sprint (5 s)** — puissance neuromusculaire pure.

**Relations de cohérence (sanity-check, voir §5) :**
- FTP ≈ **0,72-0,78 × PMA**. Ratio bas (~0,70) = profil **explosif/puncheur** (grosse PMA, seuil relatif modeste). Ratio haut (~0,80) = profil **rouleur/diesel** (seuil élevé, peu de jus au-dessus).

### 1.2 Course à pied

- **VMA (Vitesse Maximale Aérobie)** ≈ **vVO2max** — vitesse minimale sollicitant VO2max, tenable ~4-6 min. Unité : **km/h**. Repères : débutant 12-14 ; intermédiaire 15-17 ; bon amateur 18-20 ; élite régional 20-22 ; haut niveau >22.
- **vLT2 / vitesse au seuil (seuil anaérobie/MLSS course)** — allure tenable ~40-60 min. **vLT2 ≈ 0,85-0,90 × VMA** (fraction d'autant plus haute que l'athlète est entraîné et « diesel »).
- **VC (Vitesse Critique)** — équivalent course de CP ; estimable depuis 2-3 efforts max (ex. 3 min & 12 min). Proche de vLT2.
- **Allure spécifique course** — l'allure cible de l'objectif (5 km, 10 km, semi, marathon). Dérivable de la VMA et de modèles temps-distance (Riegel, §6.3).
- **Économie de course** — non mesurée directement ici, mais explique pourquoi deux athlètes de même VMA n'ont pas la même perf : à intégrer en B3 (profilage).

### 1.3 Natation

- **CSS (Critical Swim Speed)** — vitesse critique en nage, proxy du seuil. Obtenue par 2 contre-la-montre (voir §2.5). Unité de travail : **allure aux 100 m** (min:sec/100 m).
- **Vitesse VO2 nage** ≈ allure tenable ~400 m.
- **Vitesse max (25-50 m)** — sprint.
> Particularité : en natation, la **FC est peu exploitable** (capteur poignet mouillé peu fiable, position horizontale, apnée partielle). On pilote **allure (pace clock) + RPE + fréquence de coups de bras**, pas la FC.

### 1.4 Fréquence cardiaque (transverse, mais coût/sport différent)

- **FCmax** — à **mesurer** (effort maximal réel), jamais à supposer. Formules par défaut seulement si aucune donnée :
  - **Tanaka (préférée)** : FCmax ≈ **208 − 0,7 × âge**.
  - « 220 − âge » : sous-estime systématiquement chez les +40 ans, à **éviter** sauf absence totale d'alternative.
- **FCrepos** — au réveil, allongé. Sert au calcul Karvonen et au suivi de forme.
- **LTHR (FC au seuil)** — FC moyenne soutenue à l'intensité seuil (≈ FC moy des 20 dernières min d'un CLM de 30 min, §2.4). **C'est l'ancre FC de référence**, plus stable et plus utile que FCmax.
- **FCR (FC de réserve)** = FCmax − FCrepos (pour Karvonen).

### 1.5 Aviron (ergomètre Concept2)

- **Split /500 m** — l'unité reine (min:sec/500 m). Plus le split est **bas**, plus c'est rapide.
- **2k erg** — test de référence ; le split du 2k définit les zones (analogue d'un « FTP rameur »).
- **Relation watts ↔ split** (formule Concept2) :
  - `watts = 2,80 / (split_sec_par_500 / 500)³`
  - `split_sec_par_500 = 500 × (2,80 / watts)^(1/3)`
- **CP rameur** estimable via 2k + 6 min (ou 4 min + 1 min).

### 1.6 Force / Musculation

- **1RM (répétition maximale)** — charge max sur 1 rép d'un mouvement donné (squat, développé, soulevé de terre…). Spécifique à l'exercice.
- **%1RM** — base de prescription de la charge.
- **RIR (Reps In Reserve) / RPE muscu** — réserve de répétitions (RIR 2 = « il me restait 2 reps »). Équivaut à RPE = 10 − RIR.
- **VBT (vitesse de barre)** — optionnel ; vitesse concentrique pour piloter la charge sans test 1RM.

**Estimation 1RM depuis une série sous-maximale :**
- **Epley** : `1RM = charge × (1 + reps/30)`
- **Brzycki** : `1RM = charge × 36 / (37 − reps)`
> Fiables jusqu'à ~10 reps ; au-delà, l'erreur explose.

### 1.7 RPE — Échelle de perception canonique (0-10)

| RPE | Sensation | Parler-test | Usage |
|---|---|---|---|
| 1-2 | Très facile | Conversation fluide | Récup active, échauffement |
| 3-4 | Facile / confortable | Phrases complètes | Endurance fondamentale (Z2) |
| 5-6 | Modéré, soutenu | Phrases courtes | Tempo / Sweet Spot |
| 7 | Difficile mais stable | Quelques mots | Seuil |
| 8 | Très difficile | Mots isolés | VO2 / PMA (intervalles) |
| 9 | Quasi-maximal | Aucun mot | Fin d'intervalles VO2, anaérobie |
| 10 | Maximal | Impossible | Sprint, dernière rép |

> **Parler-test** = garde-fou universel, valable même sans aucun capteur.
> `SI l'athlète peut parler en phrases pendant une sortie « facile » → ALORS la zone Z2 est correcte. SI essoufflé → ALORS il dérive en Z3, ralentir.`

---

## 2. TESTS DE TERRAIN (protocoles exacts)

> **Pré-requis communs à tout test :** athlète **frais** (24-48 h sans séance dure), échauffé (≥ 15 min progressif + 2-3 accélérations), motivé, conditions stables (pas de chaleur extrême, pas de vent fort pour le vélo/course extérieur, capteur calibré). **Un test fait fatigué sous-estime l'ancre et fausse toutes les zones par défaut.**

### 2.1 FTP vélo — 4 protocoles, par fiabilité décroissante / pénibilité décroissante

| Protocole | Déroulé | Calcul FTP | Quand l'utiliser |
|---|---|---|---|
| **Test long 45-60 min** | 1 CLM de 45-60 min à fond, régulier | FTP = puissance moyenne | Le plus juste, mais très exigeant mentalement |
| **Test 20 min** | 1 effort 20 min max régulier (après échauffement + 5 min « ouverture ») | **FTP = 0,95 × P_moy_20min** | **Référence pratique** |
| **2 × 8 min** | 2 efforts de 8 min max, 10 min récup entre | FTP = 0,90 × moyenne des deux | Alternative au 20 min |
| **Ramp test** | Paliers +20-25 W/min jusqu'à épuisement → PMA = P du dernier palier complet | **FTP ≈ 0,75 × PMA** (estimation) | Le moins pénible, le moins précis ; bon pour PMA |

> `SI test 20 min ET test ramp donnent des FTP qui divergent > 8 % → ALORS retenir le test 20 min (mesure directe du seuil) ; le ramp surestime chez les puncheurs (grosse PMA) et sous-estime chez les diesels.`

### 2.2 PMA vélo
- **Ramp test** (ci-dessus) → PMA = puissance du dernier palier d'1 min complété (+ fraction du palier partiel).
- Ou **test 5 min max** → P_moy ≈ PMA (légèrement au-dessus).

### 2.3 VMA course — 4 protocoles

| Protocole | Déroulé | Calcul VMA | Notes |
|---|---|---|---|
| **Demi-Cooper (6 min)** | Courir la plus grande distance en 6 min | VMA (km/h) = distance(m) / 100 | Simple, fiable, sur piste |
| **VAMEVAL / Léger-Boucher (paliers)** | Paliers de vitesse croissants (+0,5 km/h /min) suivis à la balise sonore | VMA = vitesse du dernier palier tenu | Référence labo/piste, besoin d'un audio + plots |
| **Test 5 min max** | 5 min à fond après échauffement | VMA ≈ vitesse moyenne | Bon compromis |
| **30-15 IFT** | Intermittent 30 s effort / 15 s récup, paliers croissants | Donne **VIFT** (VMA intermittente, > VMA continue de ~5-10 %) | À utiliser pour calibrer le **fractionné court intermittent**, pas le seuil |

> `SI on prescrit du fractionné court 30/30 ou 15/15 → ALORS calibrer sur VIFT (30-15) plutôt que VMA continue, sinon les intensités sont sous-estimées.`

### 2.4 Seuil & LTHR course
- **CLM de 30 min en solo, à fond, régulier.** LTHR = **FC moyenne des 20 dernières minutes**. vLT2 ≈ allure moyenne des 30 min (légèrement biaisée, mais exploitable).

### 2.5 CSS natation
- **T400 puis T200** (chronos sur 400 m et 200 m à fond, bien récupéré entre les deux).
- `CSS (m/s) = (400 − 200) / (T400_sec − T200_sec) = 200 / (T400 − T200)`
- `Allure CSS aux 100 m (sec) = 100 / CSS = (T400 − T200) / 2`
> **Exemple :** T400 = 6:00 (360 s), T200 = 2:50 (170 s). CSS = 200/(360−170) = 200/190 = 1,053 m/s. Allure CSS = 100/1,053 = **95 s/100 m ≈ 1:35/100 m**.

### 2.6 Aviron 2k erg
- **2000 m à fond** sur Concept2 → split moyen /500 m = ancre seuil rameur.
- Échauffement long indispensable ; pacing : ne pas partir trop vite (les 500 premiers mètres tuent le test).

### 2.7 1RM force
- **Test direct** : montée progressive jusqu'à une charge tenue 1 fois propre. **Réservé aux athlètes expérimentés, sur mouvements maîtrisés, avec parade.**
- **Estimation (recommandée par défaut)** : série de 3-8 reps à effort quasi-max (RIR 0-1) → formule Epley/Brzycki (§1.6). Plus sûr, suffisant pour prescrire.
> `SI athlète débutant en muscu OU technique non maîtrisée → ALORS NE PAS tester le 1RM direct ; estimer via 5RM-8RM et prescrire en %1RM estimé + RIR.`

---

## 3. SYSTÈME DE ZONES CANONIQUE

> **Référentiel unique à 7 zones.** Toutes les autres définitions (« Z2 », « seuil », « SST », « VO2 ») renvoient à ce tableau. Les fractions sont des **plages** : un athlète diesel vit dans le haut des plages, un puncheur dans le bas.

| Z | Nom | Système énergétique dominant | Vélo (%FTP) | Course (%VMA) | Course (%vLT2) | FC (%LTHR) | FC (%FCmax) | RPE | Durée d'effort soutenable | Objectif d'entraînement |
|---|---|---|---|---|---|---|---|---|---|---|
| **Z1** | Récupération | Aérobie lipidique | < 55 % | < 65 % | < 78 % | < 81 % | < 68 % | 1-2 | illimitée | Récup active, déblocage |
| **Z2** | Endurance fondamentale | Aérobie lipidique | 56-75 % | 65-78 % | 78-90 % | 81-89 % | 68-83 % | 3-4 | 1-6 h | Base aérobie, capillarisation, mitochondries, oxydation des graisses |
| **Z3** | Tempo | Aérobie glucidique | 76-87 % | 78-84 % | 90-96 % | 90-94 % | 83-89 % | 5 | 1-3 h | Endurance « marathon », efficacité |
| **Z3+** | Sweet Spot (SST) | Aérobie haut / sous-seuil | 88-94 % | 84-87 % | 96-100 % | 94-99 % | 89-92 % | 6 | 20-60 min (fractionné) | Gros gain de FTP/temps, fatigue modérée |
| **Z4** | Seuil | Transition aéro/anaérobie (MLSS) | 95-105 % | 87-92 % | 100-105 % | 99-105 % | 92-95 % | 7 | 10-40 min (fractionné ou continu) | Repousser le seuil, tolérance lactate |
| **Z5** | VO2max / PMA | Aérobie maximal + anaérobie | 106-120 % | 95-105 % | 106-118 % | > 105 %* | 95-100 % | 8-9 | 3-8 min (intervalles) | ↑ VO2max, ↑ PMA/VMA |
| **Z6** | Anaérobie / capacité | Glycolytique | 121-150 % | 105-120 % | — | n/a* | n/a | 9-10 | 30 s-3 min | Tolérance lactate, capacité anaérobie |
| **Z7** | Neuromusculaire | ATP-PCr (phosphagène) | > 150 % | > 120 % (sprint) | — | n/a | n/a | 10 | < 15 s | Force-vitesse, sprint, recrutement |

> \* **En Z5-Z7, la FC décroche** : elle ne reflète plus l'intensité (latence + plafond). **Ne jamais piloter le VO2/anaérobie par la FC** ; piloter par watts/allure + RPE. La FC en Z5 sert seulement à vérifier qu'on est bien proche du max.

**Correspondance natation (autour de CSS)** — la natation utilise sa propre échelle ; mapping pratique :

| Zone | Allure vs CSS (s/100 m) | Équivalent | RPE |
|---|---|---|---|
| Récup / EN1 | CSS + 8 à +12 | Z1-Z2 | 2-3 |
| Aérobie / EN2 | CSS + 4 à +7 | Z2-Z3 | 4-5 |
| Seuil / EN3 | CSS ± 2 | Z3+/Z4 | 6-7 |
| VO2 / VI | CSS − 2 à −5 | Z5 | 8-9 |
| Sprint / SP | max | Z6-Z7 | 10 |

**Correspondance aviron (autour du split 2k)** — synthèse Concept2 :

| Zone | Split vs 2k (s/500 m) | Équivalent |
|---|---|---|
| UT2 (base) | 2k + 20 à +28 | Z2 |
| UT1 | 2k + 14 à +19 | Z3 |
| AT (seuil) | 2k + 8 à +12 | Z4 |
| TR (VO2) | 2k + 4 à +6 | Z5 |
| AN | 2k ou plus rapide | Z6 |

---

## 4. FORMULES DE CONVERSION ancre → zones (par sport)

> Principe : on multiplie l'ancre par la fraction de la zone (§3). Voici les calculs prêts à coder, avec exemples chiffrés.

### 4.1 Puissance vélo (ancre = FTP)
`borne_basse_W = FTP × fraction_basse ; borne_haute_W = FTP × fraction_haute` (arrondir à l'entier).
> **Exemple FTP = 250 W :**
> - Z2 : 140-188 W · Z3+ (SST) : 220-235 W · Z4 (seuil) : 238-263 W · Z5 (VO2) : 265-300 W · Z6 : 303-375 W.

### 4.2 Allure course (deux ancres possibles — préférer vLT2 si dispo)

Conversion **vitesse ↔ allure** (à coder une fois) :
- `vitesse_kmh = VMA × fraction`
- `allure_sec_par_km = 3600 / vitesse_kmh`
- affichage `min:sec` = `floor(allure/60) : (allure mod 60)`

> **Exemple VMA = 16 km/h :**
> - Seuil à 88 % VMA → 14,08 km/h → 3600/14,08 = 256 s = **4:16/km**
> - VO2 à 100 % VMA → 16 km/h → **3:45/km**
> - Z2 à 72 % VMA → 11,52 km/h → **5:12/km**

> `SI vLT2 mesurée disponible → ALORS construire les zones autour de vLT2 (colonne %vLT2 du §3), plus précis pour le seuil/tempo. SINON → construire autour de VMA.`

### 4.3 Natation (ancre = allure CSS aux 100 m)
`allure_zone = allure_CSS + offset` (offsets du tableau natation §3).
> **Exemple CSS = 1:35/100 m :** EN2 = 1:39-1:42 ; Seuil = 1:33-1:37 ; VO2 = 1:30-1:33.

### 4.4 Fréquence cardiaque — deux méthodes
- **% LTHR (préférée)** : `FC_zone = LTHR × fraction` (colonnes %LTHR du §3). Plus physiologique car centrée sur le seuil.
- **Karvonen (% FC de réserve)** : `FC_cible = FCrepos + intensité% × (FCmax − FCrepos)`. Utile quand on n'a que FCmax + FCrepos.
> **Exemple LTHR = 165, FCmax = 188, FCrepos = 48 :**
> - Z2 (81-89 % LTHR) → 134-147 bpm.
> - Z2 par Karvonen (65-75 % FCR) → 48 + 0,65×140 = 139 → 48 + 0,75×140 = 153 → 139-153 bpm. (Léger écart : signe que LTHR est l'ancre à privilégier pour le seuil/sub-seuil.)
> `SI LTHR disponible → ALORS piloter en %LTHR. SINON → Karvonen.`

### 4.5 Aviron (ancre = split 2k)
Offsets du tableau aviron (§3) appliqués au split 2k.
> **Exemple split 2k = 1:50/500 m (110 s) :** Z2 (UT2) = 2:10-2:18 ; Z4 (AT) = 1:58-2:02.

### 4.6 Force / Musculation (ancre = 1RM) — objectifs et prescription

| Objectif | % 1RM | Reps | Séries | RIR cible | Récup inter-séries | Tempo |
|---|---|---|---|---|---|---|
| **Force max** | 85-100 % | 1-5 | 3-6 | 0-2 | 3-5 min | Contrôlé / explosif concentrique |
| **Hypertrophie** | 67-85 % | 6-12 | 3-5 | 1-3 | 1,5-3 min | 2-1-2 |
| **Force-vitesse / puissance** | 30-60 % (balistique) **ou** 80-90 % (force-vitesse) | 2-5 | 3-6 | explosif | 2-4 min | **Vitesse max concentrique** |
| **Endurance de force** | 40-65 % | 15-25 | 2-4 | 1-3 | 30-90 s | continu |

**Table reps ↔ %1RM (repère, ±2 %)** :

| Reps | %1RM | Reps | %1RM |
|---|---|---|---|
| 1 | 100 | 8 | 80 |
| 2 | 95 | 9 | 77 |
| 3 | 93 | 10 | 75 |
| 4 | 90 | 12 | 70 |
| 5 | 87 | 15 | 65 |
| 6 | 85 | 20 | 60 |
| 7 | 83 | — | — |

> `SI objectif = puissance/explosivité → ALORS la VITESSE de la barre prime sur la charge : si la vitesse concentrique chute nettement, arrêter la série (la fatigue dégrade l'objectif visé).`

---

## 5. RELATIONS ENTRE ANCRES (cohérence interne & profilage)

> Ces ratios servent à **(a)** détecter un test aberrant, **(b)** estimer une ancre manquante, **(c)** alimenter le profilage (→ doc B3).

| Relation | Valeur typique | Lecture |
|---|---|---|
| FTP / PMA (vélo) | 0,72-0,78 | < 0,72 → **puncheur/explosif** (travailler le seuil) ; > 0,78 → **diesel/rouleur** (travailler PMA & sprint) |
| vLT2 / VMA (course) | 0,85-0,90 | bas → seuil à développer ; haut → bon endurant, viser la VMA |
| CP / FTP (vélo) | 1,00-1,05 | cohérence du modèle puissance |
| W′ (vélo) | 15-25 kJ | élevé → grosse capacité anaérobie (rouleur de bosses courtes) |
| LTHR_vélo vs LTHR_course | −5 à −10 bpm | écart normal entre sports |
| FCmax (Tanaka) vs FCmax mesurée | écart possible ±10 bpm | toujours préférer la mesurée |

**Garde-fous (détection d'incohérence) :**
> `SI FTP estimée > PMA × 0,82 → ALORS l'un des deux tests est faux (FTP surestimée ou PMA sous-estimée) : refaire le ramp.`
> `SI vLT2 > 0,92 × VMA → ALORS suspecter une VMA sous-estimée (test mal exécuté) plutôt qu'un seuil exceptionnel : refaire la VMA.`
> `SI une nouvelle ancre fait un bond > 10 % en < 4 semaines sans bloc spécifique → ALORS suspecter une erreur de test (conditions, capteur) avant de re-zoner.`

---

## 6. CALIBRAGE SANS TEST / DONNÉES PARTIELLES

> Cas réel et fréquent : nouvel athlète, pas de test récent, ou refus de tester. L'IA doit **toujours pouvoir prescrire** — jamais bloquer faute d'ancre.

### 6.1 Aucune donnée du tout (nouvel inscrit)
1. FCmax par **Tanaka** (208 − 0,7 × âge), FCrepos déclarée ou 60 par défaut.
2. Zones FC provisoires par Karvonen.
3. Première semaine = **calibrage déguisé** : prescrire en RPE (Z2 = RPE 3-4), observer les couples allure/FC obtenus.
4. Programmer un test (demi-Cooper ou ramp) en semaine 2-3, une fois l'athlète un peu adapté.
> `SI nouvel athlète déconditionné/blessé récent → ALORS NE PAS tester d'emblée : 1-2 semaines de remise en route en Z1-Z2/RPE avant tout test maximal.`

### 6.2 Données d'activité disponibles mais pas de test formel
- **FTP** : prendre le **meilleur effort 20 min** propre des 6 dernières semaines × 0,95 ; ou meilleur effort 60 min × 1,0.
- **VMA** : depuis une **course récente** via Riegel (§6.3) puis convertir l'allure-objectif en VMA via la fraction connue.
- **LTHR** : FC moyenne d'un effort soutenu connu de ~30-40 min.

### 6.3 Estimer une allure-cible depuis une perf connue (modèle de Riegel)
`T2 = T1 × (D2 / D1)^1,06`
> **Exemple :** 10 km en 45:00 (2700 s). Semi (21,1 km) estimé : 2700 × (21,1/10)^1,06 = 2700 × 2,224 = 6005 s ≈ **1h40**.
> Exposant 1,06 = valeur générale ; **diesels** tiennent mieux le long (exposant plus bas ~1,04), **puncheurs** se dégradent plus vite (~1,08). Ajuster selon profil (B3).

### 6.4 Athlète « FC seulement » (pas de capteur de puissance / GPS imprécis)
- Piloter en %LTHR. Prescrire des durées en zone plutôt que des allures.
- Inconvénient connu : la FC **dérive** (cardiac drift) et **décroche** en haute intensité → coupler systématiquement au RPE.

### 6.5 Athlète « RPE seulement »
- Parfaitement viable pour Z1-Z2 et le travail facile/modéré. Pour le seuil et le VO2, le RPE seul manque de granularité → encourager au moins un capteur FC.

---

## 7. RE-CALIBRAGE & DÉTECTION DE DÉRIVE

### 7.1 Cadence de re-test (par défaut)
- **Phase de développement (build)** : toutes les **4-6 semaines** ou en fin de bloc.
- **Phase de base** : toutes les **6-8 semaines** (l'ancre seuil bouge moins vite).
- **Affûtage / pré-compétition** : **pas de test maximal** (coûte de la fraîcheur) — extrapoler depuis les données récentes.

### 7.2 Détection automatique de dérive (sans test formel)
L'IA surveille les **signaux faibles** dans les données de séances et ajuste l'ancre sans attendre un test :

| Signal observé | Interprétation | Action |
|---|---|---|
| À FC seuil donnée, watts/allure **en hausse** sur 2-3 séances | Forme ↑, ancre **sous-estimée** | `→ relever l'ancre de 2-3 % et re-zoner, ou planifier un test` |
| RPE **plus bas** que prévu pour la zone (Z4 ressentie « 5 ») | Ancre sous-estimée | `→ idem` |
| RPE **plus haut** que prévu / watts à FC donnée **en baisse** | Fatigue ou forme ↓ | `→ NE PAS baisser l'ancre tout de suite : vérifier fatigue/TSB (B5), récup, sommeil avant de re-zoner` |
| **Découplage Pw:HR** (ou allure:FC) qui s'aggrave sur sorties longues | Endurance aérobie en recul / fatigue | `→ recentrer sur la base Z2, surveiller (B8)` |

> **Découplage (decoupling)** = dérive du ratio puissance(ou allure)/FC sur la 2ᵉ moitié d'une sortie longue régulière. **< 5 %** = bonne assise aérobie ; **> 5-8 %** = base insuffisante ou journée fatiguée.

### 7.3 Désentraînement / maladie / coupure (ancres à la baisse)
Repères de **perte** (ordre de grandeur, très individuel) :
- Arrêt total : VO2max/PMA/VMA perdent ~**5-7 % sur 2-3 semaines**, puis plus lentement. Le seuil et l'économie chutent plus vite que le VO2max brut.
- Maladie avec fièvre : considérer une **baisse de seuil de 5-10 %** au retour, re-zoner prudemment.
> `SI reprise après ≥ 10 jours d'arrêt OU maladie fébrile → ALORS abaisser provisoirement les ancres de ~5-8 %, prescrire en RPE/FC, re-tester seulement après 1-2 semaines de remise en route.`

---

## 8. FACTEURS DE CONTAMINATION & CORRECTIONS (cas limites)

> Ces facteurs **faussent un ou plusieurs canaux**. L'IA doit reconnaître la situation et **choisir le bon canal de pilotage** + corriger l'intensité-cible.

### 8.1 Chaleur / humidité
- Effet : **dérive cardiaque** (FC +5 à +15 bpm à effort égal), VO2max et puissance/allure soutenable **en baisse**, perception ↑.
- `→ Piloter sur PUISSANCE/ALLURE plafonnée par le RPE ; NE PAS chercher à atteindre la FC de zone (sinon on sous-réalise l'externe). Pour les efforts longs, abaisser l'allure-cible (~2-5 % par +5-8 °C au-dessus de ~20 °C). Hydratation/sodium (→ B9).`

### 8.2 Altitude
- Effet : puissance aérobie / VO2max **−~6 % par 1000 m** au-dessus de ~1000-1500 m ; FCrepos ↑, FCmax ↓ légèrement, FC sous-maximale ↑.
- `→ Recalculer les zones de puissance/allure à la baisse selon l'altitude ; ne pas piloter la FC seuil habituelle.`

### 8.3 Excitants, stress, sommeil, déshydratation, maladie
- Caféine, stress, manque de sommeil, déshydratation, début d'infection → **FC artificiellement haute ou basse**, RPE perturbé.
- `→ Si FC incohérente avec l'externe et le perçu un jour donné, MARQUER la FC comme non fiable ce jour-là et piloter externe + RPE. Si plusieurs signaux convergent (FCrepos ↑ ≥ 7 bpm, RPE ↑, sommeil ↓) → suspecter surmenage/maladie naissante (→ B8) et réduire la charge.`

### 8.4 Home-trainer vs route (vélo)
- Watts d'un trainer non calibré peuvent différer de 5-15 % d'un capteur route. Chaleur en intérieur → FC plus haute.
- `→ Tenir des ancres SÉPARÉES « intérieur » / « extérieur » si l'écart est avéré ; rappeler le spindown/zero-offset avant les séances clés.`

### 8.5 Tapis vs extérieur (course)
- Allure tapis ≠ allure terrain (absence d'air, tapis régulier). Convention : régler **1 % d'inclinaison** pour approcher le coût extérieur sur tapis.
- `→ Calibrer un offset tapis↔extérieur par observation (FC/RPE à allure affichée) plutôt que supposer l'égalité.`

### 8.6 Natation : bassin & combinaison
- Bassin **25 m** (plus de virages/coulées) → temps plus rapides qu'en **50 m** à effort égal. **Combinaison** (eau libre) → vitesse ↑ (flottaison) → CSS effectif plus rapide.
- `→ Garder le CSS du contexte de test (bassin 25 m) comme référence d'entraînement ; pour une cible eau libre en combinaison, viser une allure plus rapide que le CSS bassin.`

### 8.7 Position vélo
- FTP en position aéro (CLM/triathlon) est généralement **inférieure** à la FTP en position route (5-10 %).
- `→ Si l'objectif est un CLM/IM en position aéro, calibrer une FTP « aéro » dédiée pour prescrire les séances spécifiques.`

### 8.8 Fiabilité capteurs
- Power meter : précision annoncée ±1-2 %, dual-side mieux que estimation jambe unique. Ceinture FC thoracique >> FC optique poignet (surtout en intervalles courts et par temps froid).
- `→ En cas de FC optique erratique (sauts, valeurs aberrantes), ignorer la FC du jour et piloter externe + RPE.`

---

## 9. UNITÉS, PRÉCISION, ARRONDIS (sortie propre pour l'IA)

| Grandeur | Unité | Précision | Exemple |
|---|---|---|---|
| Puissance | W | entier | 248 W |
| Puissance relative | W/kg | 2 décimales | 3,72 W/kg |
| Allure course | min:sec/km | seconde | 4:16/km |
| Allure natation | min:sec/100 m | seconde | 1:35/100 m |
| Split aviron | min:sec/500 m | seconde | 1:50/500 m |
| Vitesse | km/h | 1 décimale | 16,0 km/h |
| FC | bpm | entier | 147 bpm |
| RPE | échelle 0-10 | pas de 0,5 | 7,5 |
| Charge muscu | kg | au pas matériel (2,5 kg) | 82,5 kg |
| %1RM, %FTP, %VMA | % | entier | 88 % |

> **Affichage des zones :** toujours donner une **fourchette** (borne basse–haute), pas une valeur unique, + le **canal de pilotage prioritaire** du jour. Ex. : « Seuil : 238-263 W (piloter watts, RPE ~7 ; ignorer la FC si chaleur). »

---

## 10. ARBRES DE DÉCISION (synthèse exécutable)

### 10.1 Quel canal piloter aujourd'hui ?
```
Capteur externe (watts/allure/split) fiable disponible ?
├─ OUI → intensité visée en Z1-Z3 ?
│        ├─ OUI → piloter EXTERNE, FC en contrôle, RPE en garde-fou
│        └─ NON (Z4-Z7) → piloter EXTERNE + RPE ; IGNORER la FC comme cible (décrochage)
└─ NON → FC fiable (pas de contamination du jour) ?
         ├─ OUI → piloter %LTHR (ou Karvonen) + RPE
         └─ NON → piloter RPE seul (parler-test), durées plutôt qu'intensités précises
```

### 10.2 Ce test est-il valide (re-zoner ou refaire) ?
```
Athlète frais (24-48 h easy) + échauffé + conditions stables + capteur OK ?
├─ NON → test NON valide → ne pas re-zoner, reprogrammer
└─ OUI → résultat cohérent avec les ratios (§5) ?
         ├─ NON → refaire le test douteux
         └─ OUI → bond < 10 % vs ancre précédente ?
                  ├─ OUI → re-zoner
                  └─ NON → vérifier conditions/capteur, sinon refaire
```

### 10.3 Quelle ancre utiliser pour prescrire ?
```
Type de séance ?
├─ Endurance/longue        → Z2 via FTP/VMA (vélo/course), CSS+offset (nage)
├─ Tempo/Sweet Spot        → %FTP (vélo) / %vLT2 (course) / CSS (nage)
├─ Seuil                   → %FTP / %vLT2 / split 2k+offset (aviron) / CSS (nage)
├─ VO2max/PMA              → %FTP (Z5) / %VMA (~100-105 %) / VIFT si intermittent court
├─ Anaérobie/sprint        → effort max calibré au temps (pas à l'ancre) + RPE 10
└─ Force/muscu             → %1RM selon objectif (§4.6) + RIR
```

---

## 11. INTERFACE (ce que B4 fournit aux autres documents)

Sorties canoniques que les autres docs **consomment sans les redéfinir** :
- **Ancres par sport** : FTP, PMA, CP/W′, VMA, vLT2/VC, CSS, LTHR, FCmax/FCrepos, 1RM, split 2k.
- **Le tableau de zones 7-zones** (§3) et ses mappings natation/aviron.
- **Les formules de conversion** ancre → watts/allure/FC/charge (§4).
- **Les ratios de cohérence** (§5) — utilisés par **B3 (profilage)** pour classer diesel/puncheur et prioriser le travail.
- **Les règles de contamination/correction** (§8) — utilisées par **B5 (charge)**, **B8 (récup)** et les docs météo/voyage.
- **Les cadences de re-test et la détection de dérive** (§7) — utilisées par **B5** et le moteur d'adaptation dynamique.

> Tout document A/B qui a besoin d'une intensité **cite une zone de ce tableau** (ex. « 3 × 12 min Z4 ») ; il ne réécrit jamais les fractions ni les formules.
