Écrire dans PROMPT_PROSPECTION.md à la racine, puis implémenter.

# Prospection par email (admin uniquement)

Système d'envoi quotidien d'un message à des contacts qui ont donné leur accord, via Amazon SES.
Écran : `/admin/prospection` (lien « Prospection » dans la barre latérale, visible du seul compte admin).
Maquette validée : « Maquette Prospection THW » (écran Emails).

## Règles
- Envoi uniquement à des contacts importés avec une **source** et une **preuve d'accord** (obligatoires à l'import).
- Aucune adresse récupérée en masse. Pas d'envoi à froid.
- Désinscription en un clic dans chaque message (lien + en-têtes List-Unsubscribe / RFC 8058).
- Rebond définitif ou plainte : le contact n'est plus jamais écrit.
- Montée en puissance : plafond 20 / 40 / 70 / 100 / 150 / 200 par jour selon la semaine depuis la première activation ; l'objectif réglé (50 / 100 / 150 / 200) reste le maximum.
- Sobre, sans emoji, tokens du design system uniquement. Libellés FR / EN / ES / IT / DE (`src/app/admin/prospection/labels.ts`).

## Fichiers
- Migration : `supabase/migrations/20261024_prospection.sql` (tables `prospect_contacts`, `prospect_sends`, `prospect_settings`, RLS sans policy, service role uniquement). À appliquer avant le déploiement.
- Lib : `src/lib/prospection/` (config, types, ses, template, service).
- Cron : `src/app/api/prospection/cron/route.ts` (08:00 UTC, gardé par CRON_SECRET) — déclaré dans `vercel.json`.
- Admin : `src/app/api/admin/prospection/` (GET résumé, PATCH réglages, `contacts` import, `test` envoi à soi).
- Public : `src/app/api/p/c/[token]` (clic suivi puis redirection vers `/test-de-forme`), `p/u/[token]` (désinscription), `p/o/[token]` (pixel d'ouverture, indicatif).
- Webhook SNS : `src/app/api/prospection/ses-events/route.ts` (livraison, rebonds, plaintes).

## Variables d'environnement (Vercel)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (ex. `eu-west-3`)
- `AWS_SES_CONFIGURATION_SET` (optionnel, nécessaire pour les rebonds / plaintes)
- `PROSPECT_WEBHOOK_SECRET` (secret de l'URL du webhook SNS)
- `PROSPECT_SITE_URL` (défaut `https://www.the-hybridway.com`), `PROSPECT_TRACK_BASE` (défaut `https://thw-appli.vercel.app`)

## Mise en place AWS (à faire une fois)
1. Créer un compte AWS, ouvrir SES dans la région choisie.
2. Vérifier un **sous-domaine dédié** à la prospection (pas `thw-coaching.com`, utilisé par les emails de l'app) : SES fournit les enregistrements DKIM à ajouter au DNS ; ajouter SPF et DMARC.
3. Demander l'**accès production** (sortie du bac à sable) en décrivant l'usage : emails envoyés à des contacts consentants, désinscription en un clic.
4. Créer un utilisateur IAM avec le seul droit `ses:SendEmail`, récupérer ses clés.
5. Créer un « configuration set » avec une destination d'événements SNS (Delivery, Bounce, Complaint) pointant vers `https://thw-appli.vercel.app/api/prospection/ses-events?s=<PROSPECT_WEBHOOK_SECRET>`.
6. Renseigner les variables Vercel, puis dans l'écran Prospection : adresse expéditeur (sur le sous-domaine vérifié), adresse postale, « M'envoyer un test ».
