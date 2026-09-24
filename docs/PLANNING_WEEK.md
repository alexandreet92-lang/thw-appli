# Planning Week — agenda façon Google Calendar

Nouvelle page `/planning-week` : un agenda général (perso + sport) inspiré de
Google Agenda, personnalisé pour l'app. Distinct de « Planning sports »
(séances détaillées) et « Objectifs » (courses/compétitions).

## Ce qui existe

- **Vues** : Jour, Semaine (grille horaire), Mois, Agenda (liste). Navigation
  précédent/suivant/aujourd'hui + sélecteur de vue.
- **Grille horaire** : événements positionnés à l'heure, bande « toute la
  journée », ligne « maintenant », **glisser-déposer** pour déplacer une séance
  ou un événement perso (snap 15 min, changement de jour + heure).
- **Sources agrégées** (modèle unifié `CalEvent`) :
  - séances `planned_sessions` (couleur auto = couche Entraînement, modifiable) ;
  - courses `planned_races` + compétitions `race_events` (lecture seule, titre/type) ;
  - objectifs/événements `calendar_events` existants (lecture seule) ;
  - événements perso horodatés `agenda_events` (créés ici).
- **Création / édition** (feuille bas→haut mobile) : « Événement » (titre, agenda,
  date, heures, toute-la-journée, rappel, répétition, description) ou « Séance »
  light (titre, sport, durée, RPE, description) → crée une vraie `planned_session`.
  Bouton « Détailler la séance (blocs) sur Planning sports ».
- **Détail au survol** : description, blocs d'intensité, RPE, durée.
- **Couches colorées** (`agenda_calendars`) : Entraînement, Courses, Objectifs,
  Perso (+ Google) — cases pour afficher/masquer, couleurs.
- **Rappels** façon Google : par événement/séance, **défaut 30 min avant**
  (`-1` = aucun). Cron `/api/agenda/reminders` toutes les 5 min → notif in-app +
  push. Si Google connecté avec « laisser Google gérer les rappels », pas de
  doublon.
- **Récurrence** : `FREQ=DAILY|WEEKLY|MONTHLY` (+ `BYDAY`), occurrences affichées.
- **Sync Google Agenda (2 sens)** : import des événements Google → couche
  « Google » ; export des événements perso créés dans l'app. OAuth par
  utilisateur. Cron `/api/agenda/google/sync` toutes les 15 min + sync à la
  connexion.

## Base de données

Migration : `supabase/migrations/20260921_planning_week_calendar.sql` (appliquée).
- `agenda_calendars` — couches colorées (RLS propriétaire).
- `agenda_events` — événements perso horodatés (RLS propriétaire).
- `google_calendar_connections` — tokens OAuth **server-only** (aucune lecture
  client ; tout passe par les routes serveur avec le service role).
- `planned_sessions` étendue : `starts_at`, `ends_at`, `reminder_min`, `color`,
  `google_event_id`.

## Variables d'environnement

- `CRON_SECRET` — protège les crons (déjà présent).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth Google (sinon la connexion
  Google est indisponible, le reste marche).
- `GOOGLE_REDIRECT_URI` — doit correspondre EXACTEMENT à l'URI enregistrée dans
  la console Google ; sinon `<origine>/api/agenda/google/callback`.
- `GOOGLE_STATE_SECRET` — facultatif (défaut : `CRON_SECRET`).

## Crons ajoutés (vercel.json)

```
{ "path": "/api/agenda/reminders",   "schedule": "*/5 * * * *"  }
{ "path": "/api/agenda/google/sync", "schedule": "*/15 * * * *" }
```

## Configurer Google (à faire pour activer la sync)

1. Google Cloud Console → nouveau projet → activer **Google Calendar API**.
2. Écran de consentement OAuth (externe) + scopes `calendar.events` et
   `userinfo.email`.
3. Identifiants → ID client OAuth « Application Web » ; URI de redirection
   autorisée : `https://<ton-domaine>/api/agenda/google/callback`.
4. Poser `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (+ `GOOGLE_REDIRECT_URI`)
   sur Vercel.

## Honnêteté sur les tests

- ✅ Compile, build complet OK, migration appliquée, types propres.
- ⚠️ **Non testé bout-en-bout** : la sync Google nécessite des identifiants
  OAuth Google réels + un compte de test ; le drag & drop, les rappels et la
  récurrence n'ont pas pu être vérifiés dans un vrai navigateur ici. À valider
  en préproduction. La sync 2 sens est volontairement simple (fenêtre glissante
  ±30/120 j, dédup par `google_event_id`, pas encore de `syncToken` incrémental
  ni de résolution de conflits fine).
