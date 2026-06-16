# PROMPT — Check-in fonctionnel + Readiness (hybride) & Fatigue

## Objectif
Rendre l'onglet Check-in fonctionnel + calculer Readiness (hybride) et Fatigue, puis
alimenter les séries Readiness/Fatigue du graphe Vue d'ensemble.

## PHASE 0 — diagnostic (lecture seule)
- Table de check-in existante ? (`checkin`, `check_in`, `daily_log`). Sinon on la crée.
- Hook qui expose TSB (`useTrainingLoad`, `tsb`).
- Comment `health_data` stocke les séries (`data_type`). Confirmer qu'on peut y écrire
  `readiness` et `fatigue` par date (CHECK constraint).

## PHASE 1 — table check-in (migration si absente)
Table `recovery_checkin` : user_id (fk), date (date), sleep_quality int(1-5),
fatigue int(1-5), soreness int(1-5), mood int(1-5), created_at. Unique (user_id, date)
→ upsert. Migration SQL propre (CLAUDE.md : pas de schéma sans migration).

## PHASE 2 — onglet Check-in fonctionnel
- 4 échelles → vrai formulaire contrôlé.
- "Valider le check-in" → upsert dans `recovery_checkin` pour (user, aujourd'hui).
- Si check-in existe déjà aujourd'hui → préremplir.

## PHASE 3 — fonction pure : src/lib/recovery/computeReadiness.ts
Testable, < 200 lignes, AUCUN réseau.
- Check-in subjectif = moyenne de : sleepQuality 1→0..5→100 ; fatigue inversé 5→0..1→100 ;
  soreness inversé idem ; mood 1→0..5→100.
- HRV = clamp(50 + (hrvToday/hrvBaseline - 1) * 250, 0, 100) → ACTIVE si hrvToday &
  hrvBaseline présents ET hrvNightsCount >= 4.
- TSB = clamp(55 + tsb * 1.8, 0, 100) → active si tsb != null.
- Poids : checkin 0.40 · hrv 0.35 · tsb 0.25. Renormaliser sur composantes actives.
  Aucune active → score null. Toujours retourner `components` (active:false pour écartées).
- Fatigue (/10) séparée : 1→2, 2→4, 3→6, 4→8, 5→10.

## PHASE 4 — calcul & stockage à la validation
1. Récupérer hrvToday + baseline (moyenne nuits `hrv_rmssd` dispo + count) et tsb.
2. computeReadiness → stocker `readiness` (score) dans `health_data` pour la date.
3. Stocker `fatigue` (/10) dans `health_data`. Si readiness null → ne rien stocker pour readiness.

## PHASE 5 — Vue d'ensemble
- Séries `readiness` et `fatigue` alimentées par ces lignes health_data.
- Tuile Readiness : SCORE + détail composantes ("check-in 60 · TSB 52 · HRV n/a").
  Inactives = "n/a". Pas de check-in aujourd'hui → "—" + "Complète ton check-in…".

## Contraintes
- Variables CSS projet uniquement (séries = `--rec-*`). TS strict, pas de `any`.
  computeReadiness pure isolée. Max 200 lignes/fichier.
- Dire si `npm run build` est lançable ; sinon revue manuelle + build Vercel.
- **Push pas.**
