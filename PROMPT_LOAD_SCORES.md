# Système de charge — deux scores (SM métabolique / SN neuromusculaire)

Branche : `claude/nutrition-mobile-layout-sitzpl`. `src/lib/sync/strava.ts` **non touché**.
⚠️ CLAUDE.md : « CTL/ATL/TSB : pas encore commencé — **architecture à valider avant tout
code** ». Ce document valide l'architecture AVANT d'écrire le moteur de calcul.

---

## Objectif (rappel)
Remplacer le **TSS unique** par **deux scores déterministes 0–100** (aucun LLM) :
- **SM** = score métabolique (cardio/glycolytique)
- **SN** = score neuromusculaire (mécanique/explosif)
Dans le **résumé d'activité**, afficher « SM · SN » à la place du TSS.

---

## ÉTAPE 0 — Recon (vérifié EN BASE, projet `thw-v2`)

### Où vit le TSS aujourd'hui
- Colonne `activities.tss` (numeric). Affiché dans `src/components/activity/ActivityCard.tsx:191`
  (`<Stat label="TSS" value={fmtTss(data.tss)} />`) — **c'est « le résumé des activités »**.
- TSS aussi utilisé ailleurs (≈40 fichiers) : page Activités calcule **CTL/ATL** à partir du
  tss (`activities/page.tsx:309-311`), Planning (volume/TSS), Recovery (TrainingLoad), Dashboard…
- `activities` a bien `streams` (jsonb) + `raw_data` (jsonb) + `laps` (jsonb).
  Colonnes réelles : `sport_type`, `moving_time_s`/`elapsed_time_s`, `distance_m`,
  `elevation_gain_m`, `avg_speed_ms`, `avg_watts`, etc. (le « Modèle de données clé » de
  CLAUDE.md est **périmé** : pas de `sport/duration/distance/load`).

### Profil athlète — ce qui existe vraiment (≠ noms du spec)
Pas sur `profiles` (démographie seule). Réparti sur **4 tables** avec unités incohérentes :
| Spec demandé | Existe ? | Où / sous quelle forme |
|---|---|---|
| `vma_running` (km/h) | ✅ | `athlete_performance_profile.vma_km_h` (aussi `vma_ms`) ; `athlete_zones.vma` |
| `threshold_running` (km/h) | ⚠️ converti | stocké en **allure** `threshold_pace_s_km` (s/km) → à convertir en km/h |
| `ftp_cycling` (W) | ✅ | `athlete_performance_profile.ftp_watts` ; `athlete_zones.ftp` |
| `p5s_cycling` (W, 5 s) | ❌ **absent** | aucune colonne nulle part |
| `css_swimming` (m/s) | ⚠️ converti | stocké en **allure** `css_s_100m` (s/100m) → à convertir en m/s |
| `one_rm_estimates` (JSON/exo) | ❌ **absent** | aucune colonne 1RM/seuil nulle part |

> Bonus dette technique : 4 tables de benchmarks redondantes (`athlete_performance_profile`,
> `training_zones`, `athlete_zones`, `user_performance`) avec 3 conventions d'unité pour la
> VMA. À normaliser avant de bâtir des analytics dessus (signalé, hors périmètre).

---

## Spec FOURNI (intégral, non tronqué de ma part)

### SM — Running & Trail (SEUL bloc reçu)
```ts
// Segment continu
load += duration_min * (speed / threshold_speed) ** 2
// Répétition
const lactateFactor = effort_s < 15 ? 0.3 : effort_s < 45 ? 0.6 : effort_s < 120 ? 1.2 : 1.5
load += (effort_s / 60) * lactateFactor * (speed / threshold_speed)
// Récup inter-blocs > 3' → reset lactate (pas de cumul entre blocs)
// Trail : correction pente
const slopeFactor = slope > 0 ? 1 + slope * 0.08 : 1 + Math.abs(slope) * 0.04
load *= slopeFactor
metabolicScore = Math.min(100, (load / 60) * 100)
```

---

## 🚧 BLOCAGES — le spec est TRONQUÉ + données manquantes (rien inventé)

1. **SN (neuromusculaire) : AUCUNE formule fournie.** C'est la moitié du système. Impossible
   à calculer/afficher sans elle.
2. **SM des autres sports : non fourni** — Cycling, Swimming, Gym, Hyrox (le profil cite
   `ftp_cycling`, `p5s_cycling`, `css_swimming`, `one_rm_estimates` mais sans formules).
3. **Données profil manquantes** : `p5s_cycling` (puissance 5 s) et `one_rm_estimates` (1RM
   muscu) **n'existent dans aucune table** → nécessaires au neuromusculaire/cyclisme/muscu.
   `threshold_running` et `css_swimming` existent **en allure**, pas en vitesse (conversion).
4. **Détection segments / répétitions non spécifiée** : les formules consomment `effort_s`
   par rép, durée de segment continu, `slope` — il faut découper l'activité en
   segments/reps depuis `streams`/`laps`. La logique de découpage (qu'est-ce qu'une « rép » ?
   seuil de vitesse ? `laps` Strava ?) n'est pas définie.
5. **Stockage + portée** : SM/SN par activité → idéalement colonnes `activities.sm_score`,
   `sn_score` (= **migration**, interdite sans instruction explicite). Et le TSS reste-t-il
   pour CTL/ATL (qui en dépendent) ou on remplace partout ?

---

## DÉCISIONS (validées par l'utilisateur)
1. **Spec** : l'utilisateur **colle la suite** (SN + SM cyclisme/natation/muscu/hyrox).
   → moteur de calcul en attente de ces formules. Rien d'inventé.
2. **Données manquantes** : **migration dédiée** — ajouter `p5s_watts` + `one_rm_estimates`
   (jsonb) à `athlete_performance_profile` ; conversions allure→vitesse à la lecture.
3. **Découpage** : depuis **`activities.laps`** (tours Strava) — pas d'analyse de streams.
4. **Stockage** : migration `activities.sm_score` + `sn_score` ; **le TSS RESTE** (CTL/ATL
   inchangés) ; on remplace **seulement l'affichage** de la carte par « SM · SN ».

## Plan d'implémentation (suite à décisions)
1. ✅ **Migration** `src/supabase/migrations/add_load_scores.sql` (écrite ; à APPLIQUER) :
   `activities.sm_score/sn_score smallint` + `athlete_performance_profile.p5s_watts int` +
   `one_rm_estimates jsonb`.
2. ⏳ `src/lib/load/athleteProfile.ts` — lecture + normalisation (pace s/km→km/h,
   s/100m→m/s) depuis `athlete_performance_profile`, fallback `athlete_zones`.
3. ⏳ `src/lib/load/segments.ts` — découpage depuis `activities.laps` (continu vs répétition,
   reset récup > 3'). *Règle de classification rép/continu à confirmer dans la suite du spec.*
4. ⏳ `src/lib/load/metabolicScore.ts` — SM (Running/Trail **fourni** ; autres sports en attente).
5. ⏳ `src/lib/load/neuromuscularScore.ts` — SN (**formule en attente**).
6. ⏳ Recalcul post-synchro Strava (hook séparé, `strava.ts` non touché) + recompute manuel.
7. ⏳ `ActivityCard` : `Stat TSS` → « SM · SN » (chiffres NEUTRES). TSS conservé en base.

---

## EN ATTENTE DE TOI (pour finir)
- **SN** (formule neuromusculaire) pour chaque sport.
- **SM** cyclisme / natation / muscu / hyrox.
- **Règle de classification d'un lap** : continu vs répétition (seuil ?), et ce qui compte
  comme « bloc » pour le reset récup > 3'.

## Checklist
- [x] Décisions prises (migration, laps, stockage, TSS conservé)
- [x] Migration écrite (`add_load_scores.sql`) — **à appliquer**
- [ ] SN (formule) + SM autres sports reçus
- [ ] Règle de classification lap rép/continu confirmée
- [ ] athleteProfile + segments + metabolicScore + neuromuscularScore implémentés (aucun LLM)
- [ ] ActivityCard affiche « SM · SN » (TSS conservé pour CTL/ATL)
- [ ] TS strict, aucun any, fichiers < 200 lignes, build OK
