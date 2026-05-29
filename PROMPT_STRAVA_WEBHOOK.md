# PROMPT_STRAVA_WEBHOOK — Sync automatique via webhook Strava

## Objectif
Quand un utilisateur enregistre une activité sur Strava (Garmin, app, etc.),
elle apparaît automatiquement dans THW Coaching sans action manuelle.

## Architecture

Les tokens OAuth sont stockés dans la table `oauth_tokens`
(colonnes : `user_id`, `provider`, `provider_user_id`, `access_token`,
`refresh_token`, `expires_at`). Le refresh est géré par `getValidToken()`
de `src/lib/oauth/tokens.ts`.

## Fichiers créés

### `src/app/api/strava/webhook/route.ts`
- **GET** : vérification de l'abonnement Strava (`hub.mode=subscribe`)
- **POST** : réception des événements — filtre `object_type=activity` +
  `aspect_type=create`, cherche le user via `oauth_tokens.provider_user_id`,
  récupère activité + streams, upsert dans `activities`

### `src/app/api/strava/webhook-subscribe/route.ts`
- **GET** : appel admin unique pour créer l'abonnement Strava push

## Variable d'environnement ajoutée
- `STRAVA_WEBHOOK_VERIFY_TOKEN=thw_webhook_secret_2024`
  (dans `.env.local` et à ajouter dans le dashboard Vercel)

## Mapping des champs
Même logique que `src/lib/sync/strava.ts` (`toRow` + `mapStravaSportType`).
Conflict key : `user_id,provider,provider_id`.

## Activation (une seule fois après déploiement)
Visiter : `https://thw-appli.vercel.app/api/strava/webhook-subscribe`

## Streams mappés
`time`, `distance`, `altitude`, `heartrate`, `velocity_smooth → velocity`,
`watts`, `cadence`, `temp`
