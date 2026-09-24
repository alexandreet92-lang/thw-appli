# Digest proactif au coach (Brique 2)

Envoie au coach une **synthèse courte et actionnable** de ses athlètes, sans
qu'il ait à ouvrir l'app : « X athlètes à surveiller cette semaine » avec les
cas prioritaires (blessés, inactifs, fatigue élevée) et les courses proches.

## Fonctionnement

- Réutilise la brique roster (version serveur `src/lib/coach/rosterServer.ts`,
  même logique que la page Athlètes) pour calculer l'état de chaque athlète.
- `src/lib/coach/digest.ts` construit un message compact et l'envoie via le canal
  de notif existant (`notifyUser` → cloche in-app + push), clé `coach_in.digest`.
- Cron `/api/coach/digest` (tous les matins) :
  - **lundi** → digest **hebdo** (toujours, si le coach a des athlètes ; « au
    vert » si aucun souci) — envoyé une seule fois par semaine ;
  - **autres jours** → digest **quotidien** seulement si `COACH_DIGEST_DAILY=1`
    ET s'il y a des priorités (pas de spam).
- La notif pointe vers `/coach/athletes` (roster trié par priorité, chaque
  athlète cliquable).

## Configuration

- `CRON_SECRET` — protège la route (déjà utilisé par les autres crons).
- `COACH_DIGEST_DAILY` — `1` pour activer le digest quotidien en plus de l'hebdo.
- Le coach peut désactiver le digest : Réglages → Notifications → « Coach — tes
  athlètes » → « Digest de suivi » (clé `coach_in.digest`, activée par défaut).

## Cron (vercel.json)

```
{ "path": "/api/coach/digest", "schedule": "0 7 * * *" }
```

## Comment tester

```
curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/coach/digest
```
Réponse : `{ ok: true, mode: "weekly"|"daily", coaches, sent }` (ou
`{ ok:true, skipped }` un jour non-lundi avec le quotidien désactivé). Vérifier
que le coach reçoit la notif (cloche + push) pointant vers /coach/athletes.

> Un vrai envoi dépend de la présence d'athlètes avec des signaux (blessure /
> inactivité / fatigue) et des préférences de notification du coach.
