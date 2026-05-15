# PROMPT_TRIAL_MAIL_SYSTEM.md

## Contexte
Repo `alexandreet92-lang/thw-appli`, branche `main`.
Système complet d'essai 14 jours + emails automatiques via Resend.

---

## ÉTAPE 1 — Migration Supabase : colonnes trial

```sql
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL;
```

Contraintes mises à jour :
- `tier` : ajout de `'trial'`
- `status` : ajout de `'trial_active'`, `'trial_expired'`

---

## ÉTAPE 2 — Trigger : initialiser le trial à l'inscription

Modifier `handle_new_user()` (déjà existant — insère dans `profiles`) pour aussi créer une ligne dans `user_subscriptions` :

```sql
INSERT INTO public.user_subscriptions (user_id, tier, status, trial_started_at, trial_ends_at)
VALUES (NEW.id, 'trial', 'trial_active', NOW(), NOW() + INTERVAL '14 days')
ON CONFLICT (user_id) DO NOTHING;
```

Trigger existant `on_auth_user_created` sur `auth.users` AFTER INSERT conservé tel quel.

---

## ÉTAPE 3 — Cron pg_cron : vérification quotidienne à 8h UTC

Job `check-trial-expiry` :
- Expire les users `trial_active` dont `trial_ends_at < NOW()`
- Appelle l'Edge Function `send-trial-expired-email` pour chacun

---

## ÉTAPE 4 — Edge Function : `send-trial-expired-email`

- Reçoit `{ user_id }` en POST
- Récupère email depuis `auth.users`, prénom depuis `profiles.full_name`
- Envoie via Resend (from: `THW Coaching <noreply@thw-coaching.com>`)
- Template HTML dark avec CTA → `STRIPE_PAYMENT_LINK`

Variables d'environnement :
- `RESEND_API_KEY`
- `STRIPE_PAYMENT_LINK`

---

## ÉTAPE 5 — Edge Function : `stripe-webhook`

Événements gérés :
- `checkout.session.completed` / `customer.subscription.updated` → `status='active'`, met à jour tier + dates
- `customer.subscription.deleted` → `status='cancelled'`

Envoie un email de confirmation d'activation via Resend.

Variables d'environnement :
- `RESEND_API_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## ÉTAPE 6 — Middleware Next.js

- `trial_expired` ou `cancelled` → redirect `/access-expired`
- `active` ou `trial_active` → laisse passer

## ÉTAPE 7 — Page `/access-expired`

Message neutre, bouton "Visiter notre site" → `NEXT_PUBLIC_MARKETING_SITE_URL`.

---

## Variables d'environnement

| Var | Scope |
|-----|-------|
| `RESEND_API_KEY` | Edge Functions + Vercel |
| `STRIPE_WEBHOOK_SECRET` | Edge Function stripe-webhook |
| `STRIPE_PAYMENT_LINK` | Edge Function send-trial-expired-email |
| `NEXT_PUBLIC_MARKETING_SITE_URL` | Vercel (Next.js) |
