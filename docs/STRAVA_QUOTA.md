# Strava API — Augmentation de quota & conformité

Application THW Coaching — **Client ID `217478`** (niveau standard).

## Où en est le quota

| Palier | Athlètes connectés | Comment l'obtenir |
|--------|--------------------|-------------------|
| Défaut | 1 | À la création de l'app |
| Self-serve | **10** | Bouton « Mettre à niveau » sur `strava.com/settings/api` — **déjà fait** |
| Étendu | 100 → 1 000 → +| **Demande par email** à Strava (pas de bouton) |

Limites de requêtes au palier 10 (actuel) : lecture 200/15 min & 2 000/jour ; global 400/15 min & 4 000/jour.

## Comment demander l'augmentation (au-delà de 10)

Il n'y a **aucun bouton** pour ça. On envoie un email au support développeur Strava.

- **À :** `developers@strava.com`
- **Depuis :** l'adresse liée au compte Strava (`alexandre.et92@gmail.com`)
- **Objet :** `API rate limit & connected athlete increase request — Client ID 217478`
- **Si pas de réponse sous ~1 semaine :** relancer via le formulaire de contact sur `developers.strava.com`.

### Email à envoyer (copier-coller, remplir les [crochets])

```
Subject: API rate limit & connected athlete increase request — Client ID 217478

Hello Strava Developer Team,

I'm the developer of a Strava API application and I'd like to request an
increase to my connected athlete limit and rate limits.

Application details
- Application name: THW Coaching (Hybrid)
- Client ID: 217478
- Website: https://thw-appli.vercel.app
- Current tier: Standard
- Current limits: 10 connected athletes / read 200 per 15 min, 2,000 per day /
  overall 400 per 15 min, 4,000 per day
- Scopes used: read, activity:read_all, activity:write, profile:read_all

What the app does
THW Coaching is a hybrid training platform (endurance + strength) that helps
athletes and coaches analyze their workouts. With the athlete's explicit
consent, we import their Strava activities to display performance insights,
compute training load metrics (CTL/ATL/TSB), and support coach–athlete
follow-up. Each athlete individually authorizes access through the standard
Strava OAuth flow.

Why I need an increase
We are onboarding real athletes and expect to grow quickly. The current
10-athlete limit is already a blocker for our rollout. We anticipate several
hundred connected athletes within the coming months, scaling toward several
thousand.

Requested limits
- Connected athletes: [ex: 1,000 to start, scaling higher as we grow]
- Read/overall rate limits: increased accordingly to support multi-athlete syncing

We comply with the Strava API Agreement and Brand Guidelines: "Connect with
Strava" button, "Powered by Strava" attribution on all screens showing Strava
data, "View on Strava" links back to source activities, and correct handling
and deletion of athlete data.

Please let me know if you need any additional information.

Thank you,
Alexandre Ettori-Douard
[email de contact] — [téléphone optionnel]
```

## Conformité aux Brand Guidelines (motif de refus n°1)

Strava vérifie que l'app respecte sa marque avant d'accorder un gros quota.
État dans le code (voir `docs/STRAVA_BRANDING.md` pour le détail) :

- [x] Bouton officiel « Connect with Strava »
- [x] Badge « Powered by Strava » sur les surfaces affichant des données Strava
- [x] Lien « View on Strava » vers l'activité source
- [ ] Remplacer les logos reconstruits par les lockups officiels du Strava Brand
      Center (étape manuelle, optionnelle mais recommandée avant la revue)

## Délai

Compter quelques jours à quelques semaines de traitement. **Faire la demande
bien avant** tout lancement à grande échelle.
