# Notifications — préférences complètes (UI + persistance, V1)

UI seulement : aucune notification n'est envoyée (push/email viendront avec
l'app native). Les préférences sont stockées. **Clés stables — ne pas renommer
sans migration.**

## Backend
- Table `user_notification_preferences (user_id, global_enabled, preferences JSONB, updated_at)`
  + RLS (gérée par le propriétaire) + trigger de création à l'inscription. (Migration appliquée.)
- `GET /api/notifications/preferences` → `{ global_enabled, preferences }`
  (défauts si pas de ligne).
- `PATCH` → body `{ global_enabled?, preferences? }` : merge des préférences,
  upsert (gère les users existants sans ligne). `createClient` (auth) +
  `createServiceClient` (écriture).

## Comportement UI
- Fetch au mount, fusion sur les défauts.
- Toggle item : mise à jour **optimiste** + PATCH d'1 clé ; rollback si erreur.
- Toggle **global** : stocké dans `global_enabled` ; OFF → grise + désactive
  tous les autres (`opacity .5` + `pointer-events:none`).

## Catalogue (9 catégories, 42 toggles) — clés `categorie.nom`
**entrainement** : rappel_seance, programme_matin, seance_a_venir, nouveau_plan,
rappel_enregistrement, test_suggere
**recuperation** : rappel_hrv, suivi_sommeil, alerte_fatigue, recup_recommandee,
conseils_post_seance
**nutrition** : rappel_repas, hydratation, timing_nutritionnel, recharge_glucidique,
plan_nutrition
**performance** : resume_hebdo, resume_mensuel, progression, evolution_charge, zones_maj
**coach** : suggestions, briefing, analyse_terminee, competences
**tokens** : quota_80, quota_95, quota_epuise, pack_credite, plan_expiration, paiement_echoue
**connexions** : activite_synchro, donnee_importee, reconnexion, echec_sync
**competitions** : j7, j3, j1, strategie_dispo
**systeme** : nouvelle_version, nouvelle_feature, maintenance, astuce

## Features de l'app → notifs identifiées
Séances/plans (planning, sessionbuilder, training_plan), briefing matinal,
récupération/HRV/sommeil/TSB, nutrition (plans, repas, recharge), perf
(résumés, CTL/ATL/TSB, zones), coach IA (suggestions, analyses, compétences),
tokens/abonnement (quotas, packs, Stripe), connexions (Strava/Wahoo/Polar/
Withings, sync), compétitions (calendar, stratégie de course), système.

## Futur
Au lancement natif : FCM (Android) + APNs (iOS) ; avant envoi, vérifier
`global_enabled` && `preferences[key]`.

npm run build : 0 erreur.
