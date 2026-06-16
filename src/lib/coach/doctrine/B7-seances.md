# B7 — STYLES DE SÉANCES PAR SPORT

> **Statut : DOCUMENT CANONIQUE (couche socle — bibliothèque de séances).** Catalogue des **types de séances** par sport, chacune calibrée aux **zones B4**, avec structure, durée, récupération, **intention**, et **profil de charge SM/SN (B5)**. Les docs A (méthodes) **assemblent** ces séances ; ils ne les redéfinissent pas.
> Consomme : B4 (zones), B5 (SM/SN), B2 (statut blessure → blocage de certaines séances), B3 (profil → personnalisation). Fournit : briques de séances → docs A & B1.
> **Convention d'écriture des séances :** `N × durée @ zone (récup)`. Toujours préfixer d'un échauffement progressif (10-20 min) et suffixer d'un retour au calme (5-15 min). Toute séance porte un tag **[SM/SN]** indicatif (faible/moyen/élevé) pour le calcul de charge.

---

## 0. TAXONOMIE UNIVERSELLE (vaut pour tous les sports)
| Famille | Zone B4 dominante | Objectif | SM | SN |
|---|---|---|---|---|
| Récupération | Z1 | Circulation, déblocage | faible | faible |
| Endurance fondamentale | Z2 | Base aérobie, durabilité, lipides | moyen | faible |
| Tempo | Z3 | Endurance spécifique, efficacité | moyen+ | moyen |
| Sweet Spot | Z3+ | Gain de seuil à coût modéré | élevé | moyen |
| Seuil | Z4 | Repousser le MLSS | élevé | moyen+ |
| VO2max / PMA / VMA | Z5 | Plafond aérobie | élevé | élevé |
| Anaérobie / capacité | Z6 | Tolérance lactate | moyen | élevé |
| Neuromusculaire / sprint | Z7 | Force-vitesse, recrutement | faible | très élevé |
| Spécifique course | allure cible (B6) | Automatiser l'allure d'objectif | variable | variable |
| Technique | toutes | Efficience / économie | faible-moyen | variable |

> `SI statut B2 orange/rouge sur une zone → ALORS retirer du menu les séances à SN élevé sollicitant cette zone (VO2, sprints, côtes, descentes, charges lourdes).`

---

## 1. COURSE À PIED

- **Récup / footing :** 20-40 min Z1-bas Z2. [SM faible / SN faible]
- **Endurance fondamentale (EF) :** 45-90 min Z2, allure conversationnelle. [SM moyen / SN faible-moyen]
- **Sortie longue (SL) :** 90 min-2h30 Z2 (±blocs allure spécifique en fin). Travaille la **durabilité**. [SM élevé / SN moyen-élevé selon durée/surface]
- **Tempo continu :** 20-40 min Z3. [SM moyen+ / SN moyen]
- **Seuil — intervalles :** 3-5 × 8-10 min Z4 (r= 2-3 min Z1) ; ou 2 × 20 min Z4. [SM élevé / SN moyen+]
- **Seuil « cruise » :** 5-8 × 1000 m @ ~vLT2 (r= 60-90 s). [SM élevé / SN moyen+]
- **VMA longue :** 5-6 × 3 min @ 100-105 % VMA (r= 3 min) ; 6-8 × 1000 m @ 100 % VMA. [SM élevé / SN élevé]
- **VMA courte / intermittent :** 2-3 séries × 8-10 × (30 s @ VIFT / 30 s trot) ; 15/15. Calibrer sur **VIFT** (B4 §2.3). [SM élevé / SN élevé]
- **Côtes courtes (force-vitesse) :** 8-12 × 30-45 s en montée 6-10 %, retour en marche/trot. [SM moyen / SN élevé]
- **Côtes longues (puissance aérobie) :** 5-8 × 2-3 min en montée @ Z4-Z5. [SM élevé / SN élevé]
- **Fartlek :** alternance libre d'allures sur terrain varié (ludique, transition). [variable]
- **Allure spécifique :** blocs à allure 10 km / semi / marathon selon objectif (B6), ex. marathon : 2-3 × 20-30 min @ allure marathon dans une SL. [SM élevé / SN moyen-élevé]
- **Lignes droites / éducatifs :** 6-8 × 80-100 m en accélération souple + gammes (montées de genoux, talons-fesses, foulées bondissantes). Technique/économie. [SN moyen]

> `SI profil faible économie (B3) → ALORS densifier lignes droites, gammes, côtes courtes et travail de cadence (viser ~170-185 pas/min selon morphologie).`
> `SI antécédent tibial/Achille (B2) → ALORS proscrire côtes/sprints/descentes tant que ≥ orange ; garder EF souple sur surface molle.`

---

## 2. CYCLISME

- **Récup :** 30-60 min Z1, cadence souple. [SM faible / SN faible]
- **Endurance :** 1,5-5 h Z2, cadence 85-95. Durabilité. [SM élevé / SN faible-moyen]
- **Tempo :** 2-4 × 15-20 min Z3. [SM moyen+ / SN moyen]
- **Sweet Spot (SST) :** 2-4 × 12-20 min @ 88-94 % FTP (r= 5 min). Le meilleur rapport gain/fatigue pour la FTP. [SM élevé / SN moyen]
- **Seuil :** 3 × 12-15 min @ 95-105 % FTP (r= 5 min) ; ou 2 × 20 min. [SM élevé / SN moyen+]
- **Over-unders :** 3-4 × [3 min @ 90 % / 1 min @ 105 %] enchaînés, ou 2-4 × (2' sous / 2' sur). Tolérance au lactate au seuil. [SM élevé / SN élevé]
- **VO2max / PMA :** 5-6 × 3-5 min @ 110-120 % FTP (r= égal au temps d'effort) ; 30/30 (×2-3 séries de 8-10). [SM élevé / SN élevé]
- **Anaérobie / W′ :** 6-10 × 30 s « all-out » (r= 4-5 min) ; relances. [SM moyen / SN élevé]
- **Sprint neuromusculaire :** 6-10 × 8-12 s max départ lancé (r= long). [SM faible / SN très élevé]
- **Spécifique col :** intervalles seuil/tempo **en montée réelle** à la cadence du col cible. [SM élevé / SN moyen-élevé]
- **Spécifique CLM/aéro :** blocs au seuil **en position aéro** (FTP aéro, B4 §8.7). [SM élevé / SN moyen]

> `SI peu de temps (B3 logistique) → ALORS privilégier SST et over-unders (haut rendement) plutôt que de longues sorties Z2.`
> `SI home-trainer (B4 §8.4) → ALORS vérifier calibration ; la chaleur intérieure majore le coût (ventiler).`

---

## 3. NATATION

- **Technique / éducatifs :** séries courtes axées sur un point (entrée de main, appui/catch, roulis, position haute, battement, respiration bilatérale). Ex. 16-20 × 25-50 m éducatifs (r= 10-15 s). [SM faible-moyen / SN moyen épaule]
- **Endurance aérobie (EN2) :** 1-2 × 400-800 m @ CSS + 4-7 s/100 m, allure régulière. [SM moyen / SN moyen]
- **Seuil (CSS) :** 10-20 × 100 m @ CSS (r= 10-15 s) ; 8 × 200 m @ CSS ; séries descendantes 400/300/200/100. [SM élevé / SN moyen+]
- **VO2 / VI :** 8-12 × 50 m @ CSS − 2-5 s/100 m (r= 15-20 s) ; 4-6 × 100 m vite. [SM élevé / SN élevé]
- **Sprint :** 8-12 × 25 m max (r= long). [SN très élevé]
- **Hypoxique / contrôle respiratoire :** séries à respiration espacée (ex. respirer tous les 3-5-7 cycles), travail d'apnée légère et d'efficience respiratoire. [SM moyen]
- **Spécifique eau libre / triathlon :** sighting (relever la tête), départs groupés, nage en combinaison, drafting. [variable]

> ⚠️ **SÉCURITÉ HYPOXIE :** `SI travail à respiration réduite/apnée → ALORS JAMAIS jusqu'au malaise ; risque de syncope hypoxique en eau (« shallow water blackout »), potentiellement mortelle. Toujours surveillé, jamais en apnée maximale répétée. En cas de vertige/picotements → stopper immédiatement.`
> `SI statut épaule B2 ≥ orange → ALORS retirer plaquettes/pull-buoy avec gros volume et le sprint ; recentrer sur la technique indolore.`
> `SI nageur faible (B3) → ALORS la technique prime massivement sur le volume/intensité : 60-70 % du temps sur l'efficience avant de chercher le moteur.`

---

## 4. MUSCULATION / FORCE

- **Force max :** 3-5 × 3-5 reps @ 85-95 % 1RM, récup 3-5 min. Mouvements polyarticulaires (squat, soulevé, développé, tractions). [SN très élevé / SM faible]
- **Hypertrophie :** 3-4 × 8-12 @ 70-80 %, récup 1,5-3 min, RIR 1-3. [SN élevé / SM moyen]
- **Force-endurance :** 2-4 × 15-25 @ 40-65 %, récup 30-90 s. [SN moyen / SM moyen+]
- **Explosivité / puissance :** pliométrie (sauts, bondissements), variantes balistiques, ou charges 30-60 % à **vitesse maximale** (3-5 × 2-3, récup complète) ; arrêter la série si la vitesse chute. [SN très élevé / SM faible]
- **Prévention ciblée (par zone, lien B2/B8) :**
  - Achille/mollet : montées de mollet **excentriques** lentes (jambe tendue + fléchie), progressives.
  - Ischio : Nordic hamstring (excentrique), pont fessier, soulevé jambes tendues léger.
  - Genou : renforcement quadriceps/fessiers, travail unipodal, contrôle du valgus.
  - Hanche/dos : gainage profond (planches, anti-rotation), fessiers, mobilité hanches.
  - Épaule (nage) : coiffe des rotateurs, stabilisateurs scapulaires, rotations externes.
  - Pied : renforcement intrinsèque, équilibre proprioceptif.

> **Doctrine force pour l'endurant :** la force max/explosive **améliore l'économie** et protège des blessures sans masse parasite. `SI athlète endurance → ALORS prioriser force max (peu de reps, lourd, récup longue) et explosivité plutôt que l'hypertrophie ; placer la muscu à distance des séances clés d'endurance (SN cumulé, B5).`
> `SI master (B3) → ALORS CONSERVER la force/explosivité (s'érode avec l'âge) mais récupérer plus longtemps entre séances lourdes.`

---

## 5. HYROX / HYBRIDE

- **Compromised running :** alterner 1 km course @ allure cible + 1 station (ski, traîneau, wall balls…) → entraîner la course **après** l'effort de force. [SM élevé / SN élevé]
- **Force-endurance stations :** circuits des mouvements spécifiques (wall balls, traîneau, farmer carry, burpees, fentes lestées) en format temps/reps. [SN élevé / SM élevé]
- **Erg + run :** ski erg / rameur + course enchaînés. [SM élevé / SN moyen]
- **Seuil course pur :** maintenir le moteur de course (B7 §1). [SM élevé]

> `SI prépa Hyrox → ALORS la priorité est l'enchaînement station→course et la force-ENDURANCE (pas la force max isolée). Travailler les transitions et le pacing.`

---

## 6. AVIRON (erg)

- **Endurance UT2 :** 40-70 min @ split 2k + 20-28 s/500 m, cadence basse (18-22 spm). [SM élevé / SN moyen]
- **Seuil AT :** 3-4 × 8-12 min @ 2k + 8-12 s (r= 3-4 min). [SM élevé / SN élevé]
- **VO2 TR :** 6-8 × 500 m ou 4-6 × 3-4 min @ 2k + 4-6 s. [SM élevé / SN élevé]
- **Spécifique 2k :** rappels à l'allure 2k, départ + sprint final. [SM élevé / SN très élevé]

> Technique : la puissance vient des jambes→tronc→bras (séquence) ; cadence et longueur de coup priment sur la force brute.

---

## 7. ASSEMBLAGE D'UNE SÉANCE (règles)
1. **Une intention dominante par séance** (ne pas mélanger VO2 + seuil + sprint au hasard).
2. **Échauffement proportionnel à l'intensité** : plus la séance est intense, plus l'échauffement est long et progressif (+ accélérations avant VO2/sprint).
3. **Récupérations calibrées** : VO2 → récup ≈ temps d'effort ; seuil → récup courte (1/4-1/3) ; anaérobie/sprint → récup longue (qualité).
4. **Placement dans la semaine** selon SM/SN (B5) : ne pas empiler deux séances à SN élevé sans récup tissulaire.
5. **Qualité > quantité** : `SI l'allure/puissance cible n'est plus tenue (chute > 5 %) ou la technique se dégrade → ALORS arrêter les répétitions : poursuivre dégrade l'objectif et augmente le risque.`

---

## 8. INTERFACE (ce que B7 fournit / consomme)
**Consomme :** B4 (zones de calibrage), B5 (SM/SN, placement), B2 (blocages), B3 (personnalisation).
**Fournit :** la **bibliothèque de séances taguées SM/SN** → les docs A (méthodes) y piochent et les ordonnent ; B1 y puise pour prescrire au jour le jour.
> Les docs A référencent les séances par leur nom ici (« séance Seuil-intervalles », « SST », « VMA courte/VIFT ») sans réécrire les structures.
