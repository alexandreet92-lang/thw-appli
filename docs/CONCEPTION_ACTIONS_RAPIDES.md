# DOCUMENT DE CONCEPTION — 11 ACTIONS RAPIDES COACH IA
### THW Coaching · Product Design Senior · Mai 2026

---

## CONTEXTE PRODUIT

THW Coaching est une app de coaching sportif IA premium. Différenciateur unique : toutes les données de l'athlète (entraînement, nutrition, sommeil, récupération, compétitions, planning, blessures, tests, zones) sont interconnectées et exploitées par une IA qui croise tout.

Stack : Next.js 15, Supabase (PostgreSQL), Anthropic SDK (Claude), Vercel.

**Tables Supabase disponibles :**
- `activities` — sport_type, started_at, distance_m, moving_time_s, avg_hr, max_hr, avg_watts, avg_pace_s_km, tss, intensity_factor, aerobic_decoupling, is_race, streams (JSONB), laps
- `planned_sessions` — week_start, day_index, sport, title, duration_min, tss, intensite, heure, notes, rpe, blocs, type_seance, status
- `planned_races` — name, sport, date, level, goal_time
- `week_tasks` — title, time, duration_min, description, priority, is_main, completed
- `metrics_daily` — date, hrv, resting_hr, sleep_duration, sleep_quality, readiness, tss_actual, atl, ctl, tsb, fatigue, energy, stress, motivation, pain
- `test_results` — test_definition_id, date, valeurs, notes
- `test_definitions` — nom, sport, fields
- `training_zones` — sport, z1-z5 labels/values, ftp_watts, lthr, threshold_pace_s_km, vma_ms, is_current, created_at
- `athlete_performance_profile` — ftp, weight_kg, age, lthr, hrMax, hrRest, thresholdPace, vma, css, vo2max
- `nutrition_plans` — type, plan_data, actif
- `nutrition_daily_logs` — date, kcal_consommees, proteines, glucides, lipides
- `ai_rules` — category, rule_text, active
- `user_profiles` — first_name, sports, main_goal, age, weight_kg, height_cm
- `athlete_sports` — sport, since_date
- `injuries` — ⚠ NON ENCORE PERSISTÉE (mock data seulement — table à créer)

**Flows existants dans AIPanel.tsx :**
- `WeakpointsFlow` — gate → sports → generating → result (JSON structuré)
- `NutritionFlow` — gate → questionnaire → generating → result → saved
- `RechargeFlow` — simple 2 questions → prompt texte (à refondre)
- `AnalyzeTestFlow` — sport → liste tests → analyse conversationnelle (à améliorer)
- `TrainingPlanFlow` — questionnaire complet → plan multi-semaines → save to DB
- `SessionBuilderFlow` — sport → type → génération → édition → save
- `RuleHelperFlow` — texte libre → reformulation IA → save ai_rules

**Actions enrichies existantes (chargent les données avant le prompt) :**
- `enrichedAnalyserSemaine` — activités semaine + planned + metrics
- `enrichedAnalyserRecuperation` — 14j métriques + activités + next 48h
- `enrichedConseilsSommeil` — 30j métriques + activités + profil
- `enrichedComprendreApp` — profil nom/sports/goal

---

## OBSERVATIONS PRÉLIMINAIRES

**1. Table `injuries` non persistée** — mock data seulement. Aucune des 11 actions ne peut exploiter les blessures. Schema à créer en priorité.

**2. `training_zones.is_current`** — le schéma garde un historique. Exploitable pour détecter la dérive des zones dans le temps.

**3. `AnalyzeTestFlow` appelle managed agents Anthropic** — le seul flow à utiliser cette API. Les autres appellent directement Claude. À harmoniser.

**Différence Actions 2 et 10 :**
- Action 2 "Analyser un entraînement" = vision comparative (1 ou 2 activités + historique sport + compliance plan)
- Action 10 "Analyser une activité" = microscopie d'une séance (streams + drift + laps + séance planifiée vs réalisée)

---

## ACTION 1 — COMPRENDRE L'APPLICATION

### A. Vision produit
Un assistant contextuel qui connaît chaque bouton de l'app ET le profil spécifique de l'utilisateur. Il ne donne pas un manuel — il donne un guide personnalisé : "Pour toi, coureur de trail en préparation d'ultra, voici les 3 fonctionnalités qui vont changer ton entraînement la semaine prochaine." Il détecte proactivement les fonctionnalités sous-utilisées et propose un chemin de setup optimisé.

### B. Gate
**Données bloquantes :** Aucune — doit toujours fonctionner.

**Données enrichissantes (chargées silencieusement) :**

| Donnée | Table | Utilisation |
|---|---|---|
| Prénom, sports, objectif | `user_profiles` | Personnaliser le guide |
| Zones configurées ? | `training_zones` (is_current, count) | Détecter gap setup |
| Tests réalisés ? | `test_results` (count) | Détecter gap tests |
| Plan nutritionnel actif ? | `nutrition_plans` (actif=true, exists) | Détecter gap nutrition |
| Courses planifiées ? | `planned_races` (count) | Détecter gap courses |
| Activités récentes ? | `activities` (count, last 30 days) | Niveau utilisation Strava |
| Suivi récupération actif ? | `metrics_daily` (count, last 14 days) | Utilisation module recovery |
| Règles IA configurées ? | `ai_rules` (active=true, count) | Personnalisation IA |

Pas d'écran gate — passage direct au flow.

### C. Flow
**Étape unique : Multi-select des sections + génération**

Grille de cards cliquables :
```
[ Planning ]    [ Activités ]    [ Performance ]
[ Nutrition ]   [ Récupération ] [ Zones ]
[ Connexions ]  [ Coach IA ]     [ Profil ]
[ Briefing ]    [ Blessures ]
```

Sous chaque card : badge contextuel calculé automatiquement :
- Planning : "3 séances cette semaine"
- Performance : "Aucun test réalisé" (orange)
- Zones : "Non configurées" (rouge)

Bouton "Détecter ce que je n'utilise pas encore" → auto-sélectionne les sections avec données manquantes.
Bouton "Tout sélectionner" → guide complet.

### D. Données chargées
```typescript
const [profile, zonesCount, testsCount, planNutrition, races, activitiesCount, metricsCount, rulesCount] = await Promise.all([
  sb.from('user_profiles').select('first_name,sports,main_goal,age').eq('user_id', uid).maybeSingle(),
  sb.from('training_zones').select('id').eq('user_id', uid).eq('is_current', true),
  sb.from('test_results').select('id').eq('user_id', uid),
  sb.from('nutrition_plans').select('id').eq('user_id', uid).eq('actif', true).maybeSingle(),
  sb.from('planned_races').select('id,name,sport,date').eq('user_id', uid).gte('date', today),
  sb.from('activities').select('id').eq('user_id', uid).gte('started_at', since30d),
  sb.from('metrics_daily').select('id').eq('user_id', uid).gte('date', since14d),
  sb.from('ai_rules').select('id').eq('user_id', uid).eq('active', true),
])
```

**App Health Score calculé client-side :**
```
score = 0
score += zonesCount.length > 0 ? 15 : 0        // zones configurées
score += testsCount.length > 0 ? 15 : 0         // au moins 1 test réalisé
score += planNutrition ? 15 : 0                 // plan nutritionnel actif
score += races.length > 0 ? 15 : 0              // courses planifiées
score += activitiesCount.length > 5 ? 20 : 0   // Strava actif
score += metricsCount.length > 5 ? 10 : 0      // suivi récupération
score += rulesCount.length > 0 ? 10 : 0        // règles IA
```

### E. Croisement de données
1. Sports pratiqués × fonctionnalités utilisées → gaps de configuration critiques pour CE profil
2. Courses planifiées × plan nutritionnel → "Tu as une course dans 6 semaines mais pas de plan nutritionnel"
3. Activités Strava × tests réalisés → "47 activités mais 0 test VMA → conseils génériques au lieu de personnalisés"
4. App Health Score × sections sélectionnées → ordonner le guide par priorité pour cet athlète

### F. Prompt système
```
Tu es l'assistant expert de l'application THW Coaching. Tu connais parfaitement chaque fonctionnalité, chaque bouton, chaque flux.

CONNAISSANCE DE L'APPLICATION :
[Base de connaissance complète de chaque page — voir section G]

PROFIL DE L'ATHLÈTE :
- Prénom : {firstName} | Sports : {sports} | Objectif : {goal}
- App Health Score : {score}/100
- Fonctionnalités configurées : {configured_list}
- Fonctionnalités manquantes : {missing_list}

SECTIONS DEMANDÉES : {selected_sections}

TON RÔLE :
1. Expliquer comment utiliser les sections sélectionnées pour {firstName} avec son profil {sports}/{goal}
2. Pour chaque fonctionnalité NON configurée : expliquer POURQUOI utile pour ce profil
3. Donner un chemin pas-à-pas ("Commence par X, puis Y")
4. Terminer avec les 3 prochaines étapes CONCRÈTES

RÈGLES :
- Toujours contextualiser pour {sports} et {goal}
- Être précis sur les chemins de navigation ("dans Zones → onglet Course → entre ton LTHR")
- Proposer proactivement des fonctionnalités connexes non demandées mais pertinentes
```

**Base de connaissance de l'app à injecter :**

- **Planning** : calendrier semaines/mois avec sessions planifiées et leurs blocs, gestion manuelle et IA (SessionBuilder), courses planifiées (planned_races), tâches semaine (week_tasks), day_intensity. Navigation : bouton + → créer session.
- **Activités** : feed Strava synchronisé automatiquement, filtres sport/période, détail activité avec streams graphiques (FC, vitesse, watts, altitude), analyse par zones. Les streams sont disponibles pour activités Strava récentes uniquement.
- **Performance** : onglet Profil (FTP, VMA, LTHR, VO2max), onglet Datas (historique métriques), onglet Tests (protocoles complets + saisie résultats). Zones dans l'onglet Zones.
- **Nutrition** : plan nutritionnel IA généré via Coach IA, 3 niveaux caloriques (jour léger/moyen/intense), 2 variantes (A/B), suivi journalier macros/calories, suivi poids, templates repas types.
- **Récupération** : métriques subjectives quotidiennes (fatigue/énergie/stress/motivation/douleur 1-10) + données objectives (HRV, FC repos, sommeil via wearable). Connexion Garmin, Whoop, Oura, Apple Health disponible.
- **Zones** : calcul zones course (LTHR → Z1-Z5 FC + allures), vélo (FTP → Z1-Z5 watts), natation (CSS → allures). Utilisées par TOUS les modules IA. À configurer en priorité.
- **Connexions** : 40+ intégrations — Strava (active), Garmin/Wahoo/Polar (disponibles), wearables récupération (Whoop/Oura), nutrition.
- **Coach IA** : chat IA 3 modèles (Hermès/rapide, Athéna/équilibré, Zeus/profond), actions rapides (11 flows), règles personnelles (Settings → Règles IA), historique conversations.
- **Profil** : infos personnelles, avatar, liste sports, connexions OAuth.
- **Briefing** : résumé quotidien (séance du jour + tâches + actualités).

### G. Format de sortie
Markdown riche. Termine TOUJOURS avec :
```
## Tes 3 prochaines étapes
1. **[Action prioritaire]** → chemin exact + pourquoi maintenant
2. **[Action secondaire]** → chemin exact + pourquoi
3. **[Action optionnelle]** → chemin exact + bénéfice
```

### H. Cas limites
- Profil vide → guide générique, recommander de compléter le profil en premier
- 0 activités → insister sur connexion Strava avant tout
- Toutes les sections sélectionnées → structurer par ordre de priorité pour ce profil
- 1 seule section → guide ultra-détaillé de cette section uniquement

### I. Innovation — "App Health Score + Roadmap personnalisée"
```
🎯 App Health Score : 42/100

✅ Strava connecté (activités)
✅ Profil complété
⚠️ Zones non configurées (-15pts) → impact : tous les conseils IA sont génériques
❌ Aucun test réalisé (-15pts) → impact : impossible d'estimer ta VMA/FTP réelle
❌ 0 jour de suivi récupération (-10pts) → impact : l'IA ne peut pas analyser ta forme
❌ Pas de courses planifiées (-15pts) → impact : pas de planification possible
```

Score comme onboarding progressif permanent — l'utilisateur voit où il en est à chaque session.

---

## ACTION 2 — ANALYSER UN ENTRAÎNEMENT (1 ou 2 activités, vision comparative)

### A. Vision produit
Pas une liste de métriques — une interprétation contextuelle qui répond à "est-ce que j'ai bien exécuté cette séance, et dans quel contexte était-elle ?" Croise la séance réalisée avec ce qui était prévu, les zones, la récupération de la veille, et l'historique du même type de séance. En mode comparaison (2 activités), le tableau côte-à-côte révèle des évolutions que l'athlète ne verrait jamais seul.

### B. Gate
**Données bloquantes :** Aucune activité → "Pas encore d'activités synchronisées. Connecte Strava dans Connexions → Strava → Synchroniser."

**Données enrichissantes (indicateurs dans la gate) :**

| Donnée | Status | Impact |
|---|---|---|
| Zones configurées pour le sport | ✓ / ⚠ | Distribution zones possible/impossible |
| Données récupération disponibles | ✓ / — | Contexte fatigue disponible/manquant |
| Séances planifiées cette semaine | ✓ / — | Comparaison plan/réalisé possible |

### C. Flow
**Étape 1 — Sélection (enrichie)**

Liste des 30 dernières activités avec :
- Sport (icône colorée), date, titre, durée, distance, TSS
- Badge "Plan prévu" si une planned_session existe le même jour (±1j)
- Badge "Récup ⚠" si HRV de la veille était hors baseline (>10% sous la moyenne 28j)

Toggle "Comparer 2 activités" → débloque une 2ème sélection (même sport uniquement).

**Étape 2 — Contexte affiché avant génération**
```
Contexte chargé pour [Nom de la séance] :
✓ Zones vélo configurées (FTP 280W)
⚠ Récupération veille : HRV 52ms (baseline 61ms, -15%)
✓ Séance planifiée correspondante trouvée : "Seuil 3×10min"
✓ 8 séances vélo similaires (1h-1h30) disponibles pour comparaison
```

### D. Données chargées
```typescript
// Activité(s) avec streams et laps
const activity = await sb.from('activities').select('*').eq('id', selectedId).single()

// Zones du sport
const zones = await sb.from('training_zones')
  .select('*').eq('user_id', uid).eq('sport', activity.sport_type).eq('is_current', true).maybeSingle()

// Récupération J-1, J-2, J-3
const recovery = await sb.from('metrics_daily')
  .select('date,hrv,resting_hr,sleep_duration,readiness,fatigue,energy')
  .eq('user_id', uid).gte('date', threeDaysBefore).lte('date', activityDate)

// Séance planifiée correspondante (même jour ±1j, même sport)
const planned = await sb.from('planned_sessions')
  .select('*').eq('user_id', uid).eq('sport', activity.sport_type)
  .gte('date', dayBefore).lte('date', dayAfter).maybeSingle()

// 10 activités similaires du même sport (même durée ±30%)
const similar = await sb.from('activities')
  .select('id,started_at,moving_time_s,avg_hr,avg_watts,avg_pace_s_km,tss,avg_cadence')
  .eq('user_id', uid).eq('sport_type', activity.sport_type)
  .gte('moving_time_s', duration * 0.7).lte('moving_time_s', duration * 1.3)
  .neq('id', selectedId).order('started_at', { ascending: false }).limit(10)

// Charge semaine en cours
const weekLoad = await sb.from('activities')
  .select('sport_type,moving_time_s,tss,started_at')
  .eq('user_id', uid).gte('started_at', weekStart).lte('started_at', weekEnd).neq('id', selectedId)
```

**Calculs client-side :**
- Baseline HRV personnelle (moyenne 28j) → comparer HRV veille
- TSS semaine cumulé avant cette séance
- FC / pace / watts actuels vs moyenne 10 séances similaires

### E. Croisement de données
1. Séance réalisée × séance planifiée → respect intensité, durée, type
2. Zones HR/watts réelles × zones configurées → distribution effective vs cible
3. HRV veille vs baseline × intensité séance → "entraîné à haute intensité avec HRV -15%"
4. Métriques actuelles × 10 séances similaires → tendance FC pour même effort
5. Mode comparaison : côte-à-côte complet + verdict quelle séance était meilleure et pourquoi

### F. Prompt système
```
Tu es un coach expert en analyse de séances d'entraînement.

ANALYSE EN 4 COUCHES OBLIGATOIRES :

COUCHE 1 — EXÉCUTION (la séance elle-même)
- Distribution des zones d'intensité effective vs zones cibles
- Métriques clés : FC moyenne/max, pace/watts, dérive cardiaque, cadence
- Qualité d'exécution : a-t-il respecté l'intensité prévue ?

COUCHE 2 — CONTEXTE RÉCUPÉRATION
- HRV et readiness de la veille vs baseline 28j
- Fatigue cumulée : TSS semaine avant cette séance
- Verdict : "séance pertinente / risquée / sous-optimale"

COUCHE 3 — PLAN VS RÉALISÉ
- Si séance planifiée disponible : comparer titre, durée, intensité prévus vs réalisés
- Si aucune séance planifiée : signaler et analyser en autonome

COUCHE 4 — COMPARAISON HISTORIQUE
- Comparer avec les {n} séances similaires du même sport
- Identifier : régression, stagnation, progression, outlier

{SI MODE COMPARAISON 2 ACTIVITÉS}
FORMAT TABLEAU OBLIGATOIRE pour les métriques comparées, puis verdict.
{FIN SI}

DONNÉES : {toutes les données chargées}

RÈGLES :
- Si zones non configurées : le signaler et analyser sans
- Si pas de données récupération : analyser couches 1, 3, 4 uniquement
- Conclure par 1 recommandation concrète pour la prochaine séance du même sport
```

### G. Format de sortie
Markdown riche. Structure :
```
## Verdict global — [Excellent / Bon / Passable / À revoir]
## Analyse de l'exécution
## Contexte récupération
## Plan vs réalisé [si disponible]
## Tendance historique
## Recommandation
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| Pas de streams | Métriques agrégées uniquement, signaler absence drift analysis |
| Pas de zones | Analyser sans zones, recommander de les créer |
| Pas de séance planifiée | Analyser sans contexte plan |
| Pas de données récupération | Analyser sans couche 2 |
| 2 sports différents en comparaison | Bloquer — même sport uniquement |

### I. Innovation — "Signature de séance" avec Efficiency Index
```
EI = pace_moyen (ou watts_moyen) / FC_moyenne

Si EI > EI_moyen_10_séances × 1.03 → performance peak
Si EI < EI_moyen_10_séances × 0.95 → séance dégradée (fatigue?)
```
*"Sur tes 8 dernières sorties vélo de 1h30, ton efficiency factor moyen est 1.42. Cette séance : 1.51 → +6.3% → une de tes meilleures séances récentes malgré les conditions."*

---

## ACTION 3 — STRATÉGIE DE COURSE

### A. Vision produit
Une stratégie construite sur la forme RÉELLE de l'athlète au moment présent. Si le TSB projeté au jour J est négatif (fatigue), les allures sont ajustées. Si l'athlète a progressé en FTP depuis son dernier marathon, sa stratégie intègre cette progression. Document de course actionnable, pas plan théorique.

### B. Gate
**Données bloquantes :** Pas de zones ET pas de tests → impossible de calculer des allures réalistes. Message : "Pour des allures personnalisées, configure tes zones ou réalise un test."

**Données enrichissantes :**
```
✓ Zones vélo (FTP 280W)
✓ Test CP20 du 15/03 : 278W
✓ Forme actuelle : TSB +4 (bonne forme)
✓ TSB projeté au jour J (21/06) : estimé +8
✓ 2 courses similaires analysables
✓ 3 courses planifiées sélectionnables
```

### C. Flow
**Étape 1 — Sélection de la course**

Option A — Parmi les planned_races (liste cliquable avec badge "Imminent" si <7 jours)
Option B — Saisie manuelle : sport, distance, dénivelé, date, objectif de temps

**Étape 2 — Questions complémentaires (max 3, seulement si données manquantes)**
- Objectif de temps → seulement si goal_time absent
- Profil du parcours → 3 boutons (plat / vallonné / montagneux) — si dénivelé non renseigné
- Ressenti de forme → slider 1-5 — toujours posé (rapide)

**Étape 3 — Affichage contexte injecté**
```
📍 Données utilisées pour ta stratégie :
Zones vélo (FTP 280W) ✓ | Test CP20 15/03 : 278W ✓
Forme actuelle : TSB +4 ✓ | TSB projeté au jour J : +8 ✓
Tes 2 courses similaires ✓
```

### D. Données chargées
```typescript
const [race, zones, tests, recentActivities, metrics, pastRaces, profile] = await Promise.all([
  sb.from('planned_races').select('*').eq('id', raceId).single(),
  sb.from('training_zones').select('*').eq('sport', raceSport).eq('is_current', true).maybeSingle(),
  sb.from('test_results').select('*, test_definitions(nom,sport)')
    .eq('user_id', uid).gte('date', since6months).order('date', { ascending: false }).limit(5),
  sb.from('activities').select('id,started_at,sport_type,moving_time_s,distance_m,avg_hr,max_hr,avg_watts,avg_pace_s_km,tss,is_race')
    .eq('user_id', uid).eq('sport_type', raceSport).gte('started_at', since3months)
    .order('started_at', { ascending: false }).limit(30),
  sb.from('metrics_daily').select('date,hrv,readiness,atl,ctl,tsb,fatigue')
    .eq('user_id', uid).gte('date', since14d).order('date', { ascending: false }),
  sb.from('activities').select('started_at,distance_m,moving_time_s,avg_hr,avg_watts,avg_pace_s_km,tss')
    .eq('user_id', uid).eq('sport_type', raceSport).eq('is_race', true)
    .order('started_at', { ascending: false }).limit(5),
  sb.from('athlete_performance_profile').select('*').eq('user_id', uid).maybeSingle(),
])
```

**Calculs client-side :**
- TSB projeté au jour J : extrapoler tendance ATL/CTL jusqu'au jour J
- Allure cible → depuis pace record ou test récent
- Watts cibles → FTP × facteur_intensité selon durée

### E. Croisement de données
1. FTP/VMA/LTHR actuels × tests récents × tendance 3 mois → capacité réelle
2. ATL/CTL actuels × date de la course → projection TSB au jour J
3. Dénivelé × zones puissance/allure → découpage par section
4. Courses passées similaires × objectif actuel → réalisme de l'objectif
5. Ressenti subjectif × métriques objectives → corréler, alerter si clash

### F. Prompt système
```
Tu es un expert en stratégie de course et performance sportive.

COURSE CIBLE : {race_details}
DONNÉES : {zones} | {tests_recents} | {forme_actuelle} | {courses_passees} | {profil}

RÈGLES OBLIGATOIRES :
1. Toutes les allures/watts DOIVENT être dérivés des données réelles. Jamais de valeurs génériques.
2. La section "Forme au jour J" DOIT croiser ATL/CTL actuels avec la date de course.
3. Les sections parcours DOIVENT être adaptées au dénivelé déclaré.
4. Le Plan B DOIT être concret et détaillé, pas vague.

FORMAT JSON OBLIGATOIRE :
{
  "verdict_objectif": { "status": "réaliste|ambitieux|hors_portée", "confiance": 0-100, "detail": "..." },
  "forme_au_jour_j": { "tsb_actuel": X, "tsb_projete": Y, "verdict": "...", "risque": "..." },
  "strategie_sections": [
    { "km_debut": 0, "km_fin": X, "allure_cible": "4:30/km", "watts_cibles": 220, "zone": "Z3", "pourcentage_ftp": 78, "conseil_execution": "..." }
  ],
  "nutrition_course": [
    { "timing": "0-45min", "apport_glucides_g": 0, "hydratation_ml": 150, "conseil": "..." }
  ],
  "gestion_effort": { "depart": "...", "milieu": "...", "final_20pct": "..." },
  "plan_b": { "declencheur": "Si FC dépasse X à Y km...", "action": "...", "objectif_fallback": "..." },
  "points_cles": ["...", "...", "..."]
}
```

### G. Format de sortie
JSON structuré avec rendu visuel custom : tableau sections de course, chips colorés verdict, timeline nutrition, section Plan B.

### H. Cas limites
| Situation | Comportement |
|---|---|
| Pas de zones ET pas de test | Bloquant — rediriger vers setup |
| Course dans moins de 48h | Stratégie simplifiée + focus gestion jour J |
| Ultra (100km+) | Adapter : alimentation solide, marche/course, nuit |
| Sport triathlon | Split par discipline |
| TSB projeté négatif | Alerter + stratégie conservative + objectif B |
| Objectif "hors portée" | Le dire clairement + objectif réaliste + conseil |

### I. Innovation — "Simulation TSB au jour J"
*"Si tu maintiens ta charge actuelle (550 TSS/semaine), ton TSB au jour de la course sera estimé à -3 (limite fatigue). Si tu réduis de 30% dès la semaine prochaine (taper progressif), TSB = +11 au jour J. Recommandation : commencer le taper dans 3 semaines."*

---

## ACTION 4 — ANALYSER MA SEMAINE (version améliorée)

### A. Vision produit
Le code existant (enrichedAnalyserSemaine) analyse les activités de la semaine. L'amélioration majeure : ajouter le croisement Plan vs Réalisé (compliance matrix), la détection de patterns sur 4 semaines, et le "type drift" (tu planifies des séances de seuil mais tu les transformes systématiquement en sorties longues Z2).

### B. Gate
Pas de gate bloquante. Indicateurs informatifs au lancement :
```
Semaine du [date] :
→ Activités réalisées : 4 séances
→ Séances planifiées : 6 séances (dont 2 non réalisées)
→ Données récupération : 5 jours disponibles
→ Données 4 semaines précédentes : disponibles (pattern analysis actif)
```

### C. Flow
Pas de questionnaire — automatique. Option : sélecteur "Semaine en cours / Semaine précédente".

### D. Données chargées (améliorées vs code actuel)
```typescript
// Activités semaine en cours (déjà dans le code actuel)
// Séances planifiées semaine en cours (déjà dans le code actuel)
// Métriques semaine en cours (déjà dans le code actuel)

// NOUVEAU : Activités des 4 semaines précédentes (pour patterns)
const activitesPast4w = await sb.from('activities')
  .select('sport_type,date,duration,load,avg_hr,avg_watts,avg_pace_s_km,started_at')
  .eq('user_id', uid).gte('date', since4weeks).lt('date', weekStart).order('date', { ascending: true })

// NOUVEAU : Séances planifiées des 4 semaines précédentes
const plannedPast4w = await sb.from('planned_sessions')
  .select('date,sport,duration_min,intensite,type_seance,status')
  .eq('user_id', uid).gte('date', since4weeks).lt('date', weekStart).order('date', { ascending: true })

// NOUVEAU : Courses planifiées à venir (cohérence plan/objectif)
const upcomingRaces = await sb.from('planned_races')
  .select('name,sport,date,level,goal_time')
  .eq('user_id', uid).gte('date', today).order('date', { ascending: true }).limit(3)
```

**Calculs client-side (nouveaux) :**
```typescript
// Compliance matrix : planned vs réalisé cette semaine
function computeCompliance(planned, activities) {
  return planned.map(session => {
    const match = activities.find(a =>
      a.sport_type === session.sport &&
      Math.abs(new Date(a.date) - new Date(session.date)) < 86400000 * 1.5
    )
    return {
      date: session.date,
      planned: { sport: session.sport, duration: session.duration_min, intensity: session.intensite },
      realized: match ? { duration: Math.round(match.duration / 60), tss: match.load } : null,
      status: match ? (match.load >= session.duration_min * 0.8 ? 'ok' : 'partial') : 'missed'
    }
  })
}
// Pattern detection sur 4 semaines (jours sautés chroniquement, type drift, intensité réduite)
```

### E. Croisement de données
1. Planned sessions × activities réelles → matrice compliance (séances ok/partielles/sautées, % intensité respecté)
2. 4 semaines planned × réalisées → patterns chroniques (jours sautés, séances raccourcies)
3. Type séances réalisées × type planifié → "type drift" : Z2 réalisé quand Z4 prévu
4. TSS réalisé × ATL/CTL actuels → accumulation et risque de surcharge
5. Charge semaine × courses à venir → cohérence avec l'objectif principal

### F. Prompt système
```
Tu es un coach expert en analyse hebdomadaire d'entraînement. Analyse la semaine EN CROISANT ces 3 dimensions obligatoirement :

DIMENSION 1 — COMPLIANCE PLAN/RÉALISÉ : {compliance_matrix}
- Séances complétées / partielles / manquées + respect des intensités + verdict (/100)

DIMENSION 2 — PATTERNS SUR 4 SEMAINES : {patterns_4semaines}
- Comportements répétés, jours sautés chroniquement, type drift
- NOMMER le pattern explicitement : "Tu transformes systématiquement tes séances de seuil en sorties longues"

DIMENSION 3 — ÉTAT DE RÉCUPÉRATION ET PROJECTION : {metrics} + {races}
- Verdict récupération + TSS cumulé vs charge habituelle + cohérence avec courses à venir

TON : Coach direct, factuel, constructif.
STRUCTURE : ## pour chaque dimension + synthèse + 3 recommandations actionnables.
```

### G. Format de sortie
Markdown avec tableau de compliance :
```markdown
## Semaine du [date] — Bilan
### Compliance au plan : 67%
| Jour | Prévu | Réalisé | Status |
|------|-------|---------|--------|
| Lun | Récup 45min | Récup 40min | ✓ |
| Mar | Seuil 1h | — | ✗ Sauté |
...
### Pattern détecté (3/4 semaines) / État de récupération / Recommandations
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| 0 activités cette semaine | Analyser uniquement état de récup + séances prévues restantes |
| 0 séances planifiées | Analyser les activités seules sans dimension compliance |
| Moins de 2 semaines de données | Désactiver pattern detection |

### I. Innovation — "Type Drift Score"
Calculer sur 4 semaines le taux de conformité d'intensité (planned.intensite vs intensité réelle estimée depuis FC/watts vs zones). *"Type drift score : 42%. En 4 semaines, tu as remplacé 5 séances de seuil par des sorties Z2. Ton endurance fondamentale est excellente, mais tu accumules un déficit de travail de qualité qui va impacter tes performances dans 6-8 semaines."*

---

## ACTION 5 — RECHARGE GLUCIDIQUE (refonte de RechargeFlow)

### A. Vision produit
Dépasser les conseils génériques "7-10g/kg" pour un plan avec les grammes exacts, les aliments concrets, et le timing précis — calculé depuis le poids réel, l'adaptation aux glucides, le plan nutritionnel de base, et les séances de la semaine.

### B. Gate
Enrichissant (non bloquant) :
```
Données utilisées :
✓ Ton poids : 75kg | ✓ Plan nutritionnel : glucides de base 340g/j
✓ Séances cette semaine : 3 planifiées (mardi, jeudi, samedi)
⚠ Adaptation aux glucides : non renseignée (je vais te demander)
```

### C. Flow (refonte complète)
**Étape 1** : Compétition → sélection parmi planned_races OU saisie manuelle / Entraînement → type (seuil / VMA / longue / bloc)

**Étape 2** : Questions ciblées (max 2 si infos manquantes) :
- "As-tu l'habitude de consommer des glucides pendant l'effort ?" (Non / Oui parfois / Oui très adapté)
- Distance (si saisie manuelle)

**Étape 3** : Affichage des données injectées automatiquement avant génération

### D. Données chargées
```typescript
const [profile, nutritionPlan, plannedSessions, race] = await Promise.all([
  sb.from('user_profiles').select('weight_kg').eq('user_id', uid).maybeSingle(),
  sb.from('nutrition_plans').select('plan_data').eq('user_id', uid).eq('actif', true).maybeSingle(),
  sb.from('planned_sessions').select('date,sport,duration_min,intensite')
    .eq('user_id', uid).gte('date', today).lte('date', raceDate ?? next7days),
  raceId ? sb.from('planned_races').select('*').eq('id', raceId).single() : null,
])

// Calculs client-side
const poids = profile?.weight_kg ?? 70
const glucidesParKg = dureeEffortH < 1.5 ? 6 : dureeEffortH < 3 ? 8 : 10
const glucidesJour = poids * glucidesParKg
```

### E. Croisement de données
1. Poids × durée effort × intensité → calcul précis g/kg/j
2. Plan nutritionnel actif × besoins recharge → surplus à combler
3. Séances planifiées × timing recharge → adapter les jours de chargement
4. Adaptation glucides × durée → dosage pendant la course

### F. Format de sortie (JSON structuré)
```json
{
  "resume": "...",
  "objectif_glucides": { "g_par_j": X, "g_par_kg": Y, "vs_base": "+Zg/j" },
  "plan_j_minus3": { "glucides_total_g": X, "repas": [...] },
  "plan_j_minus2": { ... },
  "plan_veille": { "glucides_total_g": X, "repas": [...], "conseil_hydratation": "..." },
  "matin_course": { "timing": "H-3 à H0", "glucides_g": X, "exemples": [...] },
  "pendant_course": { "glucides_par_heure_g": X, "hydratation_ml_par_heure": X, "exemples_gels": [...] },
  "apres_course": { "dans_30min": "...", "dans_2h": "..." }
}
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| Poids non renseigné | Demander le poids (1 question supplémentaire) |
| Pas de plan nutritionnel | Calculer depuis zéro |
| Course dans moins de 24h | Pas de chargement possible, focus matin de course |
| Sport sans besoin glucidique (gym) | Refuser + expliquer (besoin pour efforts >90min) |

### I. Innovation — Calcul timing gel optimal
*"Pour un marathon de 3h45, tu commences les gels à 45min. Prends 1 gel toutes les 35min = 6 gels. À 75kg, tu dois couvrir 60g/h de glucides = 2,4 gels standards (25g) par heure."*

---

## ACTION 6 — ANALYSER MA RÉCUPÉRATION (version améliorée)

### A. Vision produit
Pas un simple verdict "reposé / fatigué". Une signature de récupération personnalisée calculée sur 28 jours : "TOI, après une séance de seuil, il te faut 36h pour retrouver ton HRV baseline. TOI, un TSS hebdo >480 déclenche systématiquement 3 jours de HRV déprimé."

### B. Gate
**Données bloquantes :** Moins de 3 jours de métriques → guide configuration + conseils génériques.

**Données enrichissantes :**
```
✓ 18 jours de métriques (HRV, sommeil, readiness)
✓ Baseline HRV personnelle calculée : 61ms (±6ms)
✓ 12 activités récentes pour croiser charge/récupération
✓ Prochaines séances : Fractionné demain 6h30 | Long run samedi
```

### C. Flow
Automatique. Option : fenêtre d'analyse (7j / 14j / 28j).

### D. Données chargées
```typescript
// 28 jours de métriques (vs 14 dans le code actuel)
const metrics28d = await sb.from('metrics_daily')
  .select('date,hrv,resting_hr,sleep_duration,sleep_quality,readiness,tss_actual,atl,ctl,tsb,fatigue,energy,stress')
  .eq('user_id', uid).gte('date', since28d).order('date', { ascending: true })

// Activités 28 jours
const activities28d = await sb.from('activities')
  .select('sport_type,date,duration,load,avg_hr,started_at,raw_data')
  .eq('user_id', uid).gte('date', since28d).order('date', { ascending: true })

// Prochaines 48h de séances planifiées
const next48h = await sb.from('planned_sessions')
  .select('date,sport,title,duration_min,intensite,tss')
  .eq('user_id', uid).gte('date', today).lte('date', in2days)
```

**Calculs client-side — Signature de récupération :**
```typescript
const hrvValues = metrics28d.filter(m => m.hrv != null).map(m => m.hrv)
const hrvBaseline = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
// Délai de récupération moyen après séance haute intensité
// Seuil TSS hebdo personnel qui déclenche la fatigue
```

### E. Croisement de données
1. HRV actuel × baseline 28j → écart % = signal de forme objectif
2. ATL/CTL/TSB actuels → forme training load
3. Type/intensité dernière séance × délai récupération habituel après ce type
4. Prochaine séance planifiée × état actuel → verdict direct
5. Patterns 28j : TSS semaine × HRV semaine suivante → seuil personnel surcharge

### F. Prompt système
```
Tu es un expert en récupération et performance sportive. Produis une analyse en 3 niveaux :

NIVEAU 1 — VERDICT DU JOUR
Statut : Vert / Orange / Rouge
Chiffre clé : HRV {hrv_actuel}ms vs baseline {hrv_baseline}ms = {delta}%

NIVEAU 2 — SIGNATURE DE RÉCUPÉRATION PERSONNELLE (28 jours)
- Délai récupération habituel après séance haute intensité (en heures)
- Seuil TSS hebdo qui déclenche fatigue chez CET athlète
- Signaux précoces de surcharge
- Jours de récupération les plus efficaces (repos complet ou sortie Z1 ?)

NIVEAU 3 — RECOMMANDATION IMMÉDIATE
Prochaine séance : {next_session}
Verdict précis : faire / adapter (comment exactement) / repousser (de combien)
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| < 3 jours métriques | Prompt générique + guide pour configurer le suivi |
| Métriques subjectives uniquement | Analyser sans objectif, baisser niveau de confiance |
| ATL/CTL non calculés | Calculer approximativement depuis activities.tss |
| Pas de séances prévues | Recommandation sans contexte "prochaine séance" |

### I. Innovation — "Ton seuil personnel de surcharge"
*"Les semaines où tu dépasses 520 TSS sont systématiquement suivies d'une dépression HRV de 3-5 jours. Ton seuil personnel : ~520 TSS/semaine. Cette semaine : 480 TSS → dans la zone sûre. La semaine prochaine, si tu fais ton fractionné du vendredi prévu, tu atteins ~570 TSS → attention."*

---

## ACTION 7 — CONSEILS SOMMEIL (version améliorée)

### A. Vision produit
Des corrélations calculées sur les données réelles de cet athlète pour identifier SES saboteurs de sommeil personnels et son heure limite d'entraînement personnalisée calculée depuis ses propres données (pas depuis des normes génériques).

### B. Gate
**Données bloquantes :** Moins de 5 nuits enregistrées → conseils génériques + guide pour connecter un wearable.

### C. Flow
Automatique. Option : période d'analyse (14j / 30j / 60j).

### D. Données chargées (améliorées)
```typescript
// 60 jours de métriques (vs 30 dans le code actuel)
const metrics60d = await sb.from('metrics_daily')
  .select('date,hrv,resting_hr,sleep_duration,sleep_quality,readiness,fatigue,energy')
  .eq('user_id', uid).gte('date', since60d).order('date', { ascending: true })

// Activités avec timestamp de fin calculable (raw_data.start_date + moving_time_s)
const activities60d = await sb.from('activities')
  .select('sport_type,date,duration,load,raw_data,moving_time_s,started_at')
  .eq('user_id', uid).gte('date', since60d).order('date', { ascending: true })

// Profil (âge, sports)
const profile = await sb.from('user_profiles')
  .select('sports,main_goal,age,weight_kg').eq('user_id', uid).maybeSingle()
```

**Calculs client-side — Corrélations :**
```typescript
// Heure de fin de chaque séance
const sessionsWithEndTime = activities60d
  .filter(a => a.raw_data?.start_date && a.moving_time_s)
  .map(a => ({
    date: a.date,
    endHour: new Date(new Date(a.raw_data.start_date).getTime() + a.moving_time_s * 1000).getHours(),
    sport: a.sport_type, tss: a.load,
  }))

// Pour chaque séance : récupérer qualité sommeil de la nuit suivante
// Calculer corrélation heure de fin × qualité sommeil
// Trouver l'heure seuil personnalisée (point d'inflexion)
```

### E. Croisement de données
1. Heure de fin de séance × qualité sommeil nuit suivante → heure limite personnalisée
2. TSS journalier × durée sommeil nuit suivante → quelle charge perturbe le sommeil
3. Type de séance (seuil/VMA vs Z2) × qualité sommeil → intensité ou durée ?
4. HRV lendemain × qualité sommeil → corrélation directe
5. Profil âge × recommandations → besoins différents par tranche d'âge

### F. Prompt système
```
Tu es un expert en optimisation du sommeil pour athlètes d'endurance.

DONNÉES ANALYSÉES (60 jours) : {metrics_60d_summary}

CORRÉLATIONS CALCULÉES (à interpréter et contextualiser) :
- Impact séances tardives : {evening_training_impact}
- Heure limite estimée : {cutoff_time}h (au-delà, qualité sommeil -{pct}%)
- Corrélation TSS × durée sommeil : {tss_sleep_correlation}
- Nuits courtes (<7h) : {nights_under_7} sur {total_nights}
- Corrélation HRV × qualité sommeil précédente : {hrv_sleep_corr}

RÈGLE FONDAMENTALE : Tes conseils doivent être basés sur les DONNÉES DE CET ATHLÈTE.
Si une corrélation est forte, nomme-la avec les chiffres.

STRUCTURE OBLIGATOIRE :
1. Diagnostic sommeil (statut + justification chiffrée)
2. Ses 3 saboteurs identifiés (avec preuves données)
3. Son heure limite d'entraînement personnelle (avec calcul transparent)
4. 5 recommandations PERSONNALISÉES et actionnables
5. Sa priorité #1 : le changement avec le plus fort impact
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| < 5 nuits | Conseils génériques + guide wearable |
| Activités sans horaire (no raw_data) | Impossible de calculer heure limite → analyser sans |
| 0 séances en soirée | "Ce n'est pas un facteur pour toi" + focus autres corrélations |

### I. Innovation — Heure limite d'entraînement personnelle
*"Sur tes 18 séances du soir des 60 derniers jours : séances terminées avant 19h → qualité sommeil 78/100. Entre 19h et 20h → 71/100. Après 20h → 61/100. Ton heure limite personnelle est 19h30. Au-delà, ton sommeil perd en moyenne 15 points de qualité."*

---

## ACTION 8 — ANALYSER MA PROGRESSION

### A. Vision produit
Détecter la vraie progression — même invisible. L'athlète ne voit que ses PRs. L'IA voit que sa FC à même allure a baissé de 8bpm, que son TSS moyen pour même durée a augmenté de 12%, que son ratio Z4/Z5 a doublé. La progression physiologique précède toujours la progression chronométrique.

### B. Gate
**Données bloquantes :** Moins de 20 activités totales → "Pas assez de données pour une tendance significative."

### C. Flow
**Étape 1** : Période (3 mois / 6 mois / 12 mois)
**Étape 2** : Sports (multi-select, prépopulé depuis profil)
**Étape 3** : Génération directe

### D. Données chargées
```typescript
const [activities, tests, zonesHistory, profile] = await Promise.all([
  sb.from('activities')
    .select('id,sport_type,started_at,distance_m,moving_time_s,avg_hr,max_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling,avg_cadence,is_race')
    .eq('user_id', uid).in('sport_type', selectedSports)
    .gte('started_at', startDate).order('started_at', { ascending: true }),
  sb.from('test_results').select('*, test_definitions(nom,sport)')
    .eq('user_id', uid).gte('date', startDate).order('date', { ascending: true }),
  sb.from('training_zones').select('*,created_at').eq('user_id', uid).in('sport', selectedSports)
    .order('created_at', { ascending: true }), // historique toutes zones
  sb.from('athlete_performance_profile').select('*').eq('user_id', uid).maybeSingle(),
])
```

**Calculs client-side :**
```typescript
// Diviser la période en 2 moitiés (début vs fin)
// Comparer FC moyenne sur séances de même durée ±20%
// Comparer pace/watts moyen à même FC
// Calculer TSS/h moyen par mois (density d'entraînement)
// Détecter stagnations (aucune progression sur 6+ semaines)
// Détecter régressions (métriques qui dégradent)
```

### E. Croisement de données
1. Activités début × fin de période → FC à même effort : efficacité aérobie
2. Tests début × fin → progression marqueurs physiologiques
3. Volume mensuel moyen × progression → corrélation charge/résultats
4. Zones historiques × performances → mise à jour zones cohérente avec progression ?
5. Courses passées × objectifs futurs → réalisme

### F. Format de sortie (JSON structuré)
```json
{
  "periode": "...",
  "sports_analyses": [{
    "sport": "running",
    "score_progression": 0-100,
    "progressions_visibles": [{ "metrique": "...", "debut": "...", "fin": "...", "delta_pct": 12 }],
    "progressions_invisibles": [{ "metrique": "...", "detail": "...", "significance": "élevée|modérée|faible" }],
    "stagnations": [{ "domaine": "...", "depuis": "...", "hypothese": "..." }],
    "tendance": "en_progression|stable|en_regression"
  }],
  "insight_principal": "La progression la plus importante que l'athlète n'a probablement pas remarquée",
  "recommandations": [{ "priorite": 1, "action": "...", "impact_estime": "..." }]
}
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| < 20 activités | Bloquer + alternative : analyser 2 activités spécifiques |
| 1 seul sport | Analyser profondément ce sport uniquement |
| Pas de tests | Analyser activités uniquement, signaler l'absence de marqueurs objectifs |
| Gap activités (blessure) | Inclure le gap dans l'analyse comme "période d'interruption" |

### I. Innovation — "Progression invisible" comme insight principal
*"Tu n'as pas battu de record sur 10km, mais ta FC moyenne sur les sorties à 4:30/km est passée de 167bpm à 158bpm en 6 mois. C'est une amélioration de l'efficiency de 8.5%. Si cette tendance continue 3 mois de plus, tu courras à 4:15/km à la même FC → un 10km en 42min30 sans augmenter l'effort perçu."*

---

## ACTION 9 — ANALYSER UN TEST (refonte de AnalyzeTestFlow)

### A. Vision produit
Le flow actuel liste les tests et les envoie au managed agent — résultat conversationnel sans structure. La refonte apporte : (1) le contexte de forme au moment du test ("était-il frais ou fatigué ?"), (2) la courbe de progression sur tous les tests du même type, (3) la comparaison avec les zones actuellement configurées pour détecter si elles sont obsolètes.

### B. Gate
**Données bloquantes :** Aucun test pour le sport sélectionné → guide pour faire un premier test + lien vers Performance → Tests.

### C. Flow (refonte)
**Étape 1** : Sélection sport (identique à l'actuel)

**Étape 2** : Liste des tests avec contexte enrichi :
```
CP20 · 15/03/2025 · 278W
📊 Contexte au moment du test :
  TSS semaine précédente : 420 (charge normale)
  HRV ce jour : 64ms (baseline 61ms, +4.9%) ✓
  → Conditions de test : BONNES (fiabilité estimée : haute)

VMA · 10/01/2025 · 18.2 km/h
📊 Contexte au moment du test :
  TSS semaine précédente : 580 (surcharge ⚠)
  HRV ce jour : non disponible
  → Conditions de test : INCERTAINES
```

**Étape 3** : Sélection du test à analyser (ou 2 tests du même type pour progression)
**Étape 4** : Génération avec contexte complet

### D. Données chargées
```typescript
// Tous les tests du sport sélectionné
const tests = await sb.from('test_results')
  .select('id,date,valeurs,notes,test_definition_id, test_definitions(nom,sport,fields)')
  .eq('user_id', uid).order('date', { ascending: false })

// Pour chaque test : métriques du jour + TSS semaine précédente
const testContexts = await Promise.all(tests.map(test => Promise.all([
  sb.from('metrics_daily').select('date,hrv,resting_hr,readiness,fatigue')
    .eq('user_id', uid).eq('date', test.date).maybeSingle(),
  sb.from('activities').select('tss,moving_time_s').eq('user_id', uid)
    .gte('date', sevenDaysBefore(test.date)).lt('date', test.date),
])))

// Zones actuelles du sport
const currentZones = await sb.from('training_zones')
  .select('*').eq('user_id', uid).eq('sport', sport).eq('is_current', true).maybeSingle()

// Profile athlète
const profile = await sb.from('athlete_performance_profile')
  .select('ftp,lthr,vma,css,vo2max').eq('user_id', uid).maybeSingle()
```

**Calculs client-side :**
```typescript
// Test validity score
function computeTestValidity(hrv, hrvBaseline, tssWeek, avgTssWeek) {
  let score = 100
  if (hrv && hrv < hrvBaseline * 0.9) score -= 25  // HRV bas
  if (tssWeek > avgTssWeek * 1.3) score -= 20      // surcharge
  // activité intensive dans les 48h → -15
  return score
}
// FTP/VMA calculé depuis le test → comparer avec zones actuelles
```

### E. Croisement de données
1. Résultat test × HRV + TSS semaine précédente → validité + FTP/VMA réel estimé corrigé
2. Tous les tests du même type dans le temps → courbe de progression
3. Résultat test × zones actuellement configurées → "Tes zones vélo sont sur FTP 250W, le test donne 278W → obsolètes"
4. Test × activités récentes similaires → confirmation ou infirmation

### F. Prompt système
```
Tu es un expert en physiologie du sport et analyse de tests de performance.

TEST : {nom_test} · {date} · {valeurs}
CONTEXTE DE FORME : TSS semaine précédente : {tss_semaine} | HRV : {hrv} vs baseline {hrv_baseline}
Test validity score : {validity_score}/100

HISTORIQUE TESTS DU MÊME TYPE : {historique_tests}
ZONES ACTUELLES : {zones_actuelles}

ANALYSE EN 4 PARTIES OBLIGATOIRES :
1. INTERPRÉTATION DU RÉSULTAT (niveau, signification, comparaison norme)
2. FIABILITÉ DU TEST (conditions, estimation corrigée si biaisé)
3. ÉVOLUTION (courbe progression si données historiques, projection 3-6 mois)
4. IMPACT SUR LES ZONES (tes zones actuelles sont-elles valides ? recommandation mise à jour)
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| 0 tests pour ce sport | Guide pour réaliser le premier test (protocole + conseils) |
| Test sans métriques du jour | Analyser sans contexte de forme, baisser la confiance |
| 1 seul test (pas de comparaison) | Analyser ce test + suggérer de répéter dans 3 mois |
| Zones non configurées | Analyser le test + recommander fortement de créer les zones |

### I. Innovation — "Test Validity Score" + FTP corrigé
*"Ton test CP20 du 15/03 est valide à 67% : HRV dans la norme (+5%), mais tu avais 580 TSS la semaine précédente (normale : 430 TSS). La fatigue peut avoir réduit ta performance de 3-8%. Ton FTP réel est probablement 285-295W plutôt que 278W mesuré. Je recommande de refaire le test dans 3 semaines après une semaine de récupération."*

---

## ACTION 10 — ANALYSER UNE ACTIVITÉ (microscopie d'une séance)

### A. Vision produit
Différent de l'Action 2 (comparatif). Ici : une seule activité analysée à la loupe microscopique. Drift cardiaque, décomposition par laps, phases de fatigue dans les streams, efficacité mécanique, découplement aérobie. Répondre à : "Qu'est-ce qui s'est passé physiologiquement dans cette séance ?"

### B. Gate
**Données bloquantes :** Activité sans streams → analyse métriques agrégées uniquement, le signaler.

**Données enrichissantes :**
```
Pour [Nom de la séance - 21/04/2025] :
✓ Streams complets (FC, watts, cadence, altitude)
✓ 5 laps détectés
✓ Zones vélo configurées (FTP 280W)
✓ Séance planifiée correspondante trouvée
✓ Récupération la veille : HRV 58ms (baseline -5%)
```

### C. Flow
**Étape 1** : Sélection de l'activité (30 dernières, badge "Streams disponibles" ou "Données limitées")
**Étape 2** : Affichage contexte chargé (identique Action 2)
**Étape 3** : Génération

### D. Données chargées
```typescript
const activity = await sb.from('activities').select('*').eq('id', actId).single()
const streams = activity.streams ?? activity.raw_data?.streams

const [zones, recovery, planned, similar] = await Promise.all([
  sb.from('training_zones').select('*').eq('user_id', uid).eq('sport', activity.sport_type).eq('is_current', true).maybeSingle(),
  sb.from('metrics_daily').select('date,hrv,resting_hr,sleep_duration,readiness,fatigue')
    .eq('user_id', uid).gte('date', threeDaysBefore).lte('date', activityDate),
  sb.from('planned_sessions').select('*').eq('user_id', uid)
    .gte('date', dayBefore).lte('date', dayAfter).eq('sport', activity.sport_type).maybeSingle(),
  sb.from('activities').select('started_at,avg_hr,avg_watts,avg_pace_s_km,tss,intensity_factor,aerobic_decoupling')
    .eq('user_id', uid).eq('sport_type', activity.sport_type)
    .gte('moving_time_s', duration * 0.7).lte('moving_time_s', duration * 1.3)
    .neq('id', actId).order('started_at', { ascending: false }).limit(5),
])
```

**Calculs client-side depuis les streams :**
```typescript
// Drift cardiaque : FC première moitié vs deuxième moitié
function computeCardiacDrift(streams) {
  const half = Math.floor(streams.heartrate.length / 2)
  return ((avg(streams.heartrate.slice(half)) - avg(streams.heartrate.slice(0, half))) / avg(streams.heartrate.slice(0, half))) * 100
}
// Distribution de zones depuis les streams (% temps dans chaque zone)
// Aerobic decoupling = drift watts/pace vs FC
// Phases de fatigue (baisse puissance/pace soudaine)
```

### E. Croisement de données
1. Streams HR × streams watts/pace × zones → distribution de zones effective (calculée depuis données brutes, pas déclarée)
2. Drift cardiaque calculé × norme par sport/durée → "8.3% de drift → dérivé de Z2 en Z3 après 1h05"
3. Streams watts/pace × altitude → corriger l'analyse pour les sorties en côte
4. Contexte récupération veille × intensité réalisée → pertinence de l'effort
5. Laps analysis × terrain → quelle section a posé problème et pourquoi

### F. Prompt système
```
Tu es un expert en analyse physiologique de séances sportives.

ACTIVITÉ : {nom} · {date} · {sport} · {durée} · {distance} · {TSS}
MÉTRIQUES AGRÉGÉES : {avg_hr}/{max_hr}bpm · {avg_watts}W · {avg_pace} · IF: {if} · TSS: {tss}
Aerobic decoupling: {decoupling}%

ANALYSE DES STREAMS (calculée depuis les données brutes) :
Distribution de zones effective : {zone_distribution}
Drift cardiaque : {cardiac_drift}% (norme <5% pour Z2, <3% pour Z3+)
Phases de fatigue détectées : {fatigue_phases}

CONTEXTE : {recovery_context} | {planned_vs_done} | {similar_comparison}

ANALYSE EN 5 DIMENSIONS :
1. DISTRIBUTION D'INTENSITÉ (% du temps dans chaque zone)
2. GESTION DE L'EFFORT (progression/régression puissance/pace sur la séance)
3. DRIFT CARDIAQUE ET DÉCOUPLEMENT AÉROBIE (que révèle ce chiffre ?)
4. ANALYSE CONTEXTUELLE (état de forme du jour vs performance)
5. UN INSIGHT PRINCIPAL (la chose la plus importante à retenir)

Conclure par 1 recommandation directe et concrète.
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| Pas de streams | Métriques agrégées uniquement, indiquer dimensions non analysables |
| Gym / force | Adapter : pas de FC/pace relevants, focus durée, RPE, structure |
| Activité < 20min | Analyser sans dimension drift (insuffisant) |
| Pas de zones | Analyser sans référence aux zones |

### I. Innovation — "Analyse de dérive" avec explication causale
*"Drift cardiaque : 11.2% (élevé — norme : <5% en Z2). Explication probable : ton HRV était -12% sous ta baseline hier (fatigue pré-séance). Si tu refais une séance similaire avec HRV dans la norme, le drift devrait être <5%. Ton endurance aérobie n'est pas en cause — c'est le contexte qui a limité la séance."*

---

## ACTION 11 — ESTIMER MES ZONES

### A. Vision produit
Ne pas repartir d'un FTP saisi manuellement. Utiliser les données réelles des 3 derniers mois d'activités + les tests pour ESTIMER les zones, puis comparer avec les zones actuellement configurées pour détecter si elles sont obsolètes. L'insight le plus précieux : "Tu progresses mais tes zones ne le savent pas — tu t'entraînes chroniquement sous-estimé."

### B. Gate
**Données bloquantes :** Moins de 5 activités pour le sport → rediriger vers : (a) réaliser un test, (b) saisir manuellement dans Zones.

**Données enrichissantes :**
```
Estimation disponible pour :
✓ Course à pied : 28 activités (3 mois) · 1 test VMA (janvier)
✓ Vélo : 18 activités (3 mois) · 1 test CP20 (mars)
⚠ Natation : 3 activités seulement → estimation peu fiable
```

### C. Flow
**Étape 1** : Sélection du sport (parmi sports pratiqués depuis user_profiles.sports)
**Étape 2** : Affichage des données sources disponibles et des zones actuelles
**Étape 3** : Génération directe

### D. Données chargées
```typescript
const [currentZones, zonesHistory, tests, activities, profile] = await Promise.all([
  sb.from('training_zones').select('*').eq('user_id', uid).eq('sport', sport).eq('is_current', true).maybeSingle(),
  sb.from('training_zones').select('*,created_at').eq('user_id', uid).eq('sport', sport)
    .order('created_at', { ascending: false }), // historique complet
  sb.from('test_results').select('date,valeurs,notes, test_definitions(nom)')
    .eq('user_id', uid).gte('date', since6months).order('date', { ascending: false }).limit(5),
  sb.from('activities').select('started_at,moving_time_s,avg_hr,max_hr,avg_watts,max_watts,avg_pace_s_km,tss,intensity_factor,avg_cadence,rpe')
    .eq('user_id', uid).eq('sport_type', sport).gte('started_at', since3months)
    .order('started_at', { ascending: false }),
  sb.from('athlete_performance_profile').select('ftp,lthr,vma,css,vo2max,weight_kg').eq('user_id', uid).maybeSingle(),
])
```

**Algorithme d'estimation client-side :**
```typescript
// VÉLO : estimation FTP
function estimateFTP(activities) {
  // Top 5% des séances de 20-60min par avg_watts × 0.95
  const key20to60 = activities.filter(a => a.moving_time_s >= 1200 && a.moving_time_s <= 3600)
  const sorted = key20to60.sort((a, b) => b.avg_watts - a.avg_watts)
  const top5pct = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.05)))
  return (top5pct.reduce((s, a) => s + a.avg_watts, 0) / top5pct.length) * 0.95
}

// COURSE : estimation LTHR
function estimateLTHR(activities) {
  const key = activities.filter(a => a.rpe >= 7 || a.intensity_factor >= 0.9)
  return (key.reduce((s, a) => s + a.avg_hr, 0) / key.length) * 1.02
}

// Zone drift : FC à même watts/pace a-t-elle baissé sur 3 mois ?
function detectZoneDrift(activities, currentZones) {
  const firstMonth = activities.slice(-activities.length, -Math.floor(activities.length * 2/3))
  const lastMonth = activities.slice(-Math.floor(activities.length / 3))
  // Comparer FC moyenne sur séances de même durée et watts/pace
  // Retourner delta en bpm et direction (improvement/regression)
}
```

### E. Croisement de données
1. Tests récents × activités récentes → test comme ancre, activités comme confirmation/infirmation
2. Zones estimées × zones actuellement configurées → gap et recommandation mise à jour
3. Zones historiques (évolution dans le temps) × progression activités → cohérence mises à jour
4. FC à même effort sur 3 mois → zone drift : si FC à 230W a baissé de 8bpm, zones HR obsolètes
5. Tests × délai depuis dernière mise à jour zones → depuis combien de temps les zones ne sont pas recalibrées

### F. Format de sortie (JSON structuré)
```json
{
  "sport": "cycling",
  "confiance": "élevée|modérée|faible",
  "raison_confiance": "...",
  "estimation": {
    "ftp": 285, "lthr": 162, "vma_kmh": null, "css_per100m": null,
    "zones": [
      { "id": "Z1", "label": "Récupération", "hr_max": 130, "watts_max": 157, "allure_min": null },
      { "id": "Z2", "label": "Aérobie", "hr_min": 130, "hr_max": 148, "watts_min": 157, "watts_max": 214 }
    ]
  },
  "comparaison": {
    "status": "obsolètes|à_jour|inconnues",
    "ecart_ftp_pct": 14,
    "detail": "Tes zones actuelles (FTP 250W) sont 14% sous ton estimation réelle (285W).",
    "impact": "Tu t'entraînes constamment trop 'facile' → travail en Z3 quand tu penses faire du Z4.",
    "recommandation": "Mise à jour fortement recommandée"
  },
  "zone_drift": {
    "detected": true,
    "delta_bpm": -8,
    "detail": "Ta FC pour maintenir 230W a baissé de 8bpm en 3 mois — tu as progressé mais tes zones ne le reflètent pas."
  },
  "methode_estimation": "Basée sur 18 activités vélo (3 mois) + test CP20 du 15/03/2025",
  "sources": ["18 activités vélo 3 mois", "test CP20 du 15/03/2025"]
}
```

### H. Cas limites
| Situation | Comportement |
|---|---|
| < 5 activités | Bloquer + orienter vers test ou saisie manuelle |
| Pas de zones configurées | Proposer l'estimation seulement, pas de comparaison |
| Pas de test récent | Estimation depuis activités uniquement, confiance = "modérée" |
| Sport = gym / hyrox | Adapter : pas de FTP/LTHR → estimer depuis RPE, HR max, TSS |
| Zones mises à jour < 4 semaines | "Mises à jour il y a 3 semaines — peu probable qu'elles soient déjà obsolètes." |

### I. Innovation — "Zone Drift Detection"
*"Sur les 3 derniers mois, ta FC pour maintenir 230W a baissé de 167bpm à 159bpm (−8bpm = −4.8%). Tes zones actuelles (LTHR 168bpm) sont trop basses : ce que tu crois être ta Z4 est en réalité ta Z3. Tu ne stresses pas assez les adaptations de seuil. Mise à jour estimée : LTHR 163bpm → toutes les zones décalent vers le haut de ~3%."*

---

## SYNTHÈSE — MATRICE DE PRIORITÉ D'IMPLÉMENTATION

| # | Action | Complexité | Impact User | Code existant |
|---|---|---|---|---|
| 4 | Analyser ma semaine | Moyenne | Très haut | enrichedAnalyserSemaine (améliorer) |
| 6 | Analyser ma récupération | Faible | Très haut | enrichedAnalyserRecuperation (améliorer) |
| 2 | Analyser un entraînement | Moyenne | Haut | Nouveau flow |
| 10 | Analyser une activité | Haute | Haut | Nouveau flow |
| 11 | Estimer mes zones | Haute | Haut | Nouveau flow |
| 9 | Analyser un test | Faible | Haut | AnalyzeTestFlow (refonte data) |
| 7 | Conseils sommeil | Moyenne | Moyen | enrichedConseilsSommeil (améliorer) |
| 8 | Analyser ma progression | Haute | Moyen | Nouveau flow |
| 3 | Stratégie de course | Haute | Moyen | Nouveau flow |
| 5 | Recharge glucidique | Faible | Moyen | RechargeFlow (refonte) |
| 1 | Comprendre l'application | Faible | Bas (onboarding) | enrichedComprendreApp (améliorer) |

**Séquencement recommandé :**
1. **Sprint 1** : Améliorer les 4 enriched actions existantes (4, 6, 7, 1) + refonte RechargeFlow (5)
2. **Sprint 2** : Nouveau flow Analyser une activité (10) + refonte AnalyzeTestFlow (9)
3. **Sprint 3** : Nouveau flow Analyser un entraînement (2) + Estimer mes zones (11)
4. **Sprint 4** : Analyser ma progression (8) + Stratégie de course (3)

---

## POINTS TRANSVERSAUX

### 1. Table `injuries` à créer en priorité
```sql
CREATE TABLE public.injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  zone_id text NOT NULL,
  zone_label text NOT NULL,
  type text CHECK (type IN ('douleur', 'gene', 'blessure')),
  pain_type text CHECK (pain_type IN ('musculaire', 'articulaire', 'tendineuse')),
  intensity int CHECK (intensity BETWEEN 1 AND 10),
  status text DEFAULT 'actif' CHECK (status IN ('actif', 'amelioration', 'gueri')),
  date date NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own injuries" ON public.injuries FOR ALL USING (auth.uid() = user_id);
```
Une fois créée, chaque action IA doit charger `injuries WHERE status != 'gueri'` et l'injecter dans le prompt.

### 2. Bouton "Mettre à jour mes zones" depuis l'action 11
Si faisable : naviguer vers la page Zones avec les valeurs pré-remplies depuis le résultat JSON de l'estimation.

### 3. Cache des résultats
Certaines actions (progression, zones) produisent des résultats valides 24-48h. Sauvegarder en localStorage avec timestamp pour éviter de recalculer à chaque ouverture.

### 4. Feedback utilisateur
Chaque résultat d'action doit avoir un mécanisme de feedback (👍/👎 + commentaire optionnel) pour améliorer les prompts.

### 5. Injection des blessures
Dès que la table injuries est créée, toutes les actions (sauf "Comprendre l'app") doivent charger les blessures actives et les injecter dans le prompt pour que l'IA adapte ses recommandations.

---

*Document de conception THW Coaching — 11 actions rapides Coach IA — Mai 2026*
*À utiliser comme brief de référence pour la phase d'implémentation.*
