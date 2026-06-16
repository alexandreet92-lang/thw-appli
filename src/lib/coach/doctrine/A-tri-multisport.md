# A — TRIATHLON · PÉRIODISATION MULTI-SPORT

> **Statut : DOCUMENT MÉTHODE (architecture multi-sport).** Choix/priorisation = **B1 §3** + **B3** (maillon faible) ; exigences par format = **B6 §4** ; charge **SM cumulée / SN spécifique** = **B5 §8** ; séances = **B7** ; intensités intra-sport = docs **A-velo-\*** et **A-run-\*** ; nage = **B7 §3** ; nutrition = **B9**.
> **Mapping charge :** le **SM se cumule entre les 3 sports** (un seul cœur), le **SN est largement spécifique** (B5 §8) → c'est la clé de toute l'architecture. 〔HYP B5 §1.2〕.

---

## 1. PRINCIPE
Le défi du triathlon n'est pas de s'entraîner dans 3 sports, c'est de **répartir un budget commun de fatigue (SM) et de temps** entre nage, vélo, course (+ force), tout en **développant le maillon faible** sans laisser s'effondrer les deux autres. Deux leviers structurent tout :
1. **Le SM est partagé** → on ne peut pas faire une grosse séance dure dans chaque sport le même jour ; on **répartit l'intensité** dans la semaine, un sport « porteur » de la qualité à la fois.
2. **Le SN est spécifique** → la course (impact) est la plus traumatique, le vélo la moins (bon réceptacle de volume/qualité), la nage sollicite surtout l'épaule. On peut **charger du vélo sans hypothéquer la course** (B5 §8).

---

## 2. PRIORISATION (B1 §3, B3)
> `SI temps limité → ALORS allouer en priorité au maillon faible ET au sport au plus fort rendement-temps. La nage = beaucoup de FRÉQUENCE (technique) ; le vélo = le plus gros volume aérobie (faible SN) ; la course = la plus chère en SN, à doser.`
> `SI un sport est nettement limitant pour le chrono cible (B3 §3) → ALORS sur-fréquence sur ce sport, maintien (1-2 séances) sur les autres.`
> **Règle nage :** la nage progresse par la **fréquence et la technique**, pas le volume brut. Mieux vaut 3-4 nages courtes/sem qu'une seule longue.

---

## 3. ARCHITECTURE HEBDOMADAIRE (répartir l'intensité)
- **Une qualité « porteuse » à la fois :** ne pas empiler vélo dur + course dure le même jour (SM saturé). Alterner les jours de qualité par sport.
- **Vélo = réceptacle de volume et de qualité aérobie** (SN faible) : sweet spot/seuil/VO2 vélo coûtent peu en SN → on peut en mettre.
- **Course = dosée** (SN élevé) : moins de séances, qualité ciblée, surveiller l'impact (B2).
- **Nage = fréquente, technique d'abord** : répartie sur la semaine.
- **Force/muscu** (B7 §4) : 1-2×/sem, à distance des séances clés (SN cumulé).
- **Jours faciles communs** : footing/vélo Z2 + nage technique.

---

## 4. INTERFÉRENCE & ENCHAÎNEMENTS
- **Interférence concurrente :** trop de force lourde + endurance, ou vélo VO2 juste avant course qualité → dégrade les deux. Espacer les stimuli antagonistes.
- **Ordre dans une journée double :** placer en premier la séance dont la **qualité** prime ce jour-là ; le sport « secondaire » suit en Z2.
- **Brick** (A-tri-brick) : intégré en phase spécifique, pas en permanence.
> `SI vélo VO2 prévu ET course qualité le lendemain → ALORS soit alléger l'un, soit intercaler du facile : deux gros stimulus SM/SN rapprochés = aucun réussi.`

---

## 5. PÉRIODISATION SAISON (B5)
- **Base :** volume aérobie dans les 3 sports + technique nage + force générale. Vélo porte le gros volume.
- **Build :** intensité spécifique au format (B6 §4) — pour les distances longues, beaucoup de tempo/seuil vélo + allure course ; pour les courtes, seuil/VO2 dans les 3.
- **Spécifique :** bricks, allure de course (A-run-allure-specifique), répétition du plan nutrition (B9) et du pacing.
- **Affûtage :** B5 §7, dimensionné au format (B6 §4) ; maintenir la fréquence des 3 sports (ne pas « disparaître » de la nage).

---

## 6. RÈGLES & CAS LIMITES
> `SI fatigue globale (TSB_SM négatif, B5) → ALORS c'est tout le système qui est chargé, pas un sport : alléger la qualité partout, pas seulement dans un sport.`
> `SI douleur de course (B2) → ALORS reporter le volume aérobie sur vélo/nage (SM maintenu, SN course déchargé, B2 §3) — avantage majeur du multi-sport.`
> `SI nage stagnante malgré le volume → ALORS problème technique, pas moteur (B3 §3) : recentrer sur la technique.`
- **Erreur classique :** vouloir progresser dans les 3 sports à fond simultanément → surmenage. On **priorise** et on **maintient**.

---

## 7. EXEMPLE DE SEMAINE (70.3, build, ~10-12 h)
| Jour | Matin | Soir |
|---|---|---|
| Lun | Nage technique | Repos / force |
| Mar | **Vélo seuil** (3×12 min) | Nage seuil (CSS) |
| Mer | **Course seuil** (4×8 min vLT2) | — |
| Jeu | Vélo Z2 + force | Nage technique |
| Ven | Repos / nage facile | — |
| Sam | **Vélo long Z2-tempo** | (option **brick** course 20-30 min @ allure course) |
| Dim | **Course longue Z2** (+ blocs allure) | — |

→ Qualité répartie (vélo mardi, course mercredi) ; nage fréquente ; brick en fin de semaine.

---

## 8. INTERFACE
**Consomme :** B1 §3 + B3 (priorisation), B6 §4 (format), B5 §8 (SM/SN multi-sport), B7, A-velo-\*, A-run-\*, B9, B2, B8.
**Note Claude Code :** moteur de planification = **un calcul de SM cumulé inter-sports** + **SN par sport séparé** (B5 §8). C'est la pièce technique centrale du multi-sport. 〔HYP formules SM/SN〕.
