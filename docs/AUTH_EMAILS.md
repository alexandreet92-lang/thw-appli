# Emails d'authentification — configuration & dépannage

Projet Supabase : `sfrcnyzntgrxlwlmwifi` (thw-v2) · Prod web : `https://thw-appli.vercel.app`
App native : bundle Capacitor local, scheme `com.thehybridway.app://`

Ce document couvre les 4 emails envoyés par Supabase Auth :
**Confirm signup**, **Reset password**, **Magic Link**, **Change email**.

---

## 1. Pourquoi les emails ne partaient pas / ne marchaient pas

Deux problèmes indépendants se cumulaient.

### A. L'email n'arrive qu'aux membres de l'org — SMTP par défaut de Supabase

**Constat au 01/09** : les emails d'auth arrivent bien — mais sur
`alexandre.et92+…@gmail.com`, c'est-à-dire l'adresse du propriétaire du projet.
C'est exactement ce que le SMTP par défaut autorise, et rien de plus : il n'y a
donc **aucune preuve que le canal fonctionne pour un utilisateur externe**, et
toute raison de croire l'inverse.

Le SMTP intégré de Supabase est un service de **dépannage**, pas de production :

- quota de l'ordre de **2 à 4 emails par heure, tous types confondus** ;
- **réservé aux adresses des membres de l'organisation Supabase** — un email
  envoyé à un utilisateur externe est purement et simplement **jeté** ;
- pas de domaine d'expédition authentifié → ce qui sort finit en spam.

C'est la cause n°1 du symptôme « l'app dit que l'email est envoyé, rien n'arrive »
chez les utilisateurs qui ne sont pas membres du projet.
**Correctif : configurer un SMTP custom** (§3). Le projet utilise déjà **Resend**
avec le domaine vérifié `thw-coaching.com` (voir la fonction Edge
`send-trial-expired-email`) — il suffit de réutiliser le même compte.

### B. Le lien ne mène pas au bon endroit — templates par défaut + allowlist

Supabase valide le `redirectTo` envoyé par le client contre
**Authentication → URL Configuration → Redirect URLs**. Si l'URL n'y figure pas,
GoTrue **ne renvoie aucune erreur** : il remplace silencieusement la destination
par la « Site URL ». L'utilisateur clique et atterrit sur l'accueil au lieu de
l'écran « nouveau mot de passe ».

S'ajoutait à ça le fait que les **templates étaient ceux par défaut de Supabase**
(anglais, `{{ .ConfirmationURL }}`) : c'est cette variable qui porte le
`redirect_to` soumis à validation. Les templates de `supabase/email-templates/`
écrivent désormais la destination en dur (§4), ce qui neutralise le problème.

Côté code, le `redirectTo` était construit sur
`${window.location.origin}/auth/callback?next=/auth/reset-password`,
ce qui échouait dans trois cas :

| Contexte | `window.location.origin` | Dans l'allowlist ? |
|---|---|---|
| Web prod | `https://thw-appli.vercel.app` | oui — mais le `?next=…` casse le motif si l'entrée n'a pas de `**` |
| Preview Vercel | `https://thw-appli-<hash>.vercel.app` | **non** (URL différente à chaque déploiement) |
| App iOS (Capacitor) | `capacitor://localhost` | **non**, et l'app n'a pas de serveur pour servir `/auth/callback` |

**Correctif code** (déjà en place) : `src/lib/auth/redirect.ts` ancre tous les
liens d'email sur une base publique stable, jamais sur `window.location.origin`.

---

## 2. Authentication → URL Configuration

### Site URL

```
https://thw-appli.vercel.app
```

C'est la destination de repli quand un `redirectTo` est refusé, et la valeur de
`{{ .SiteURL }}` dans les templates. Elle doit pointer sur la **prod web**,
jamais sur `localhost`.

### Redirect URLs (allowlist)

Les motifs acceptent le glob `*` (un segment) et `**` (plusieurs). **Le `?next=…`
fait partie de l'URL comparée** : sans `**` final, l'entrée ne matche pas.

```
https://thw-appli.vercel.app/auth/callback**
https://thw-appli.vercel.app/auth/reset-password**
https://thw-appli.vercel.app/**
com.thehybridway.app://auth-callback**
http://localhost:3000/auth/callback**
http://localhost:3000/auth/reset-password**
```

- La ligne `com.thehybridway.app://` n'est nécessaire que si un jour on passe le
  deep link directement à Supabase. Aujourd'hui l'app native passe par
  `…/auth/callback?native=1`, qui **rebondit** vers le scheme — c'est plus
  robuste (pas de scheme custom à faire avaler à GoTrue).
- Les URLs de **preview Vercel** ne sont volontairement PAS listées : les liens
  d'email pointent toujours sur la prod grâce à `NEXT_PUBLIC_SITE_URL`.

---

## 3. Authentication → SMTP (Resend)

Dashboard → **Project Settings → Authentication → SMTP Settings** → *Enable custom SMTP*.

| Champ | Valeur |
|---|---|
| Sender email | `noreply@thw-coaching.com` |
| Sender name | `Hybrid` |
| Host | `smtp.resend.com` |
| Port | `465` (TLS implicite) — `587` en STARTTLS si 465 est filtré |
| Username | `resend` |
| Password | **la clé API Resend** (`re_…`) — celle déjà utilisée par la fonction Edge `send-trial-expired-email` |

> **Ne jamais committer cette clé.** Elle vit uniquement dans le dashboard
> Supabase et dans les secrets de la fonction Edge (`RESEND_API_KEY`).

Prérequis côté Resend : le domaine `thw-coaching.com` doit être **vérifié**
(SPF + DKIM + DMARC au vert dans Resend → Domains). Sans DKIM, Gmail met en spam.

### Rate limits

Dashboard → **Authentication → Rate Limits** :

| Limite | Valeur par défaut | Recommandé |
|---|---|---|
| Rate limit for sending emails | **2 / heure** (SMTP par défaut) | **30 / heure** minimum une fois le SMTP custom actif |
| Rate limit for token refresh | 150 / 5 min | inchangé |
| Rate limit for OTP / verification | 30 / 5 min | inchangé |

Tant que le SMTP custom n'est pas activé, Supabase **force** la limite basse :
c'est normal que le champ soit bridé, il se débloque après activation du SMTP.

Indépendamment, GoTrue impose un **délai minimum de 60 s entre deux emails pour
la même adresse** (`For security purposes, you can only request this after 60
seconds`). Le message est traduit dans `src/lib/auth/errors.ts`.

---

## 4. Authentication → Email Templates

**Les 4 templates sont versionnés dans `supabase/email-templates/`** — voir le
README de ce dossier pour les sujets à saisir et la procédure de copie.

Ils remplacent les templates par défaut de Supabase (anglais,
`{{ .ConfirmationURL }}`) par des templates français aux couleurs de Hybrid, qui
construisent le lien **eux-mêmes** avec `{{ .TokenHash }}`.

Deux raisons à ce choix :

1. **`{{ .ConfirmationURL }}` dépend de l'allowlist.** Il pointe sur
   `/auth/v1/verify?…&redirect_to=…`, et `redirect_to` est validé contre les
   « Redirect URLs ». Refusé → remplacé silencieusement par la Site URL. C'est
   exactement pourquoi le lien « Reset Password » ramenait sur l'accueil au lieu
   de l'écran de création de mot de passe. Un lien écrit en dur dans le template
   ne subit aucune réécriture.
2. **`token_hash` marche depuis n'importe quel appareil.** Le flux PKCE exige le
   navigateur d'origine (le `code_verifier` y est stocké) : demander un reset sur
   son ordinateur puis ouvrir le mail sur son téléphone cassait le flux.

### Destination de chaque lien

| Type | Destination | Qui consomme le jeton |
|---|---|---|
| `signup` | `/auth/callback?token_hash=…&type=signup&next=%2F` | Route serveur → session en cookies, puis accueil |
| `recovery` | `/auth/callback?token_hash=…&type=recovery&next=%2Fauth%2Freset-password` | Route serveur → session en cookies, puis **page dédiée** de création du mot de passe |
| `magiclink` | `/auth/callback?token_hash=…&type=magiclink&next=%2F` | Route serveur |
| `email_change` | `/auth/callback?token_hash=…&type=email_change&next=%2Fprofile` | Route serveur |

Le reset atterrit sur la page dédiée `/auth/reset-password` en passant par
`/auth/callback`. Ce passage est délibéré : la route sait consommer un
`token_hash` **depuis la version déjà en production**, donc les templates sont
utilisables sans attendre un déploiement. La page sait de son côté consommer un
`token_hash` reçu en direct — les deux formes de lien marchent.
La page vérifie le jeton, retire celui-ci de la barre d'adresse, affiche le
formulaire, puis — le mot de passe enregistré — l'utilisateur est **connecté**
(la vérification du jeton a ouvert la session) et entre dans l'app.

Point de vigilance : `next` doit être **URL-encodé** (`%2Fprofile`), sinon le `/`
est lu comme la fin du paramètre.

---

## 5. Ce que fait le code

| Fichier | Rôle |
|---|---|
| `src/lib/auth/redirect.ts` | Base publique stable pour tous les liens d'email. `NEXT_PUBLIC_SITE_URL` > `NEXT_PUBLIC_API_BASE` > `window.location.origin`. Ajoute `native=1` dans le build Capacitor. |
| `src/app/auth/page.tsx` | `resetPasswordForEmail` / `signUp` utilisent `authCallbackUrl()`. Affiche l'erreur portée par `?error=` au retour d'un lien cassé. |
| `src/app/auth/callback/route.ts` | Consomme `token_hash` (tous appareils) **ou** `code` (PKCE). Renvoie la vraie raison de l'échec dans `?error=`. `next` restreint aux chemins internes. |
| `src/app/auth/reset-password/page.tsx` | **Page dédiée à la création du mot de passe**, cible directe du lien de reset. Vérifie le jeton (`?token_hash=`) avant d'afficher le formulaire, le retire de l'URL, lit le fragment `#error_code=` (invisible côté serveur), propose « demander un nouveau lien », et connecte l'utilisateur une fois le mot de passe enregistré. |
| `src/app/ClientShell.tsx` | Deep link natif : gère `code`, `token_hash`, `error`, et route vers `next` (donc vers l'écran de reset) au lieu de toujours retomber sur l'accueil. |
| `src/lib/auth/errors.ts` | Traduit les erreurs d'envoi (`Error sending recovery email`), de quota (`over_email_send_rate_limit`) et de lien (`otp_expired`, `pkce_exchange_failed`). |

### Variable d'environnement à ajouter

Sur Vercel (Production **et** Preview) et dans `.env.local` :

```
NEXT_PUBLIC_SITE_URL=https://thw-appli.vercel.app
```

Sans elle, les liens envoyés depuis un déploiement de preview pointeraient sur
l'URL de preview — absente de l'allowlist Supabase.

---

## 6. Tester le flux de bout en bout

### Reset password (web)

1. `https://thw-appli.vercel.app/auth` → « Mot de passe oublié ? » → email → **Envoyer le lien**.
2. Vérifier dans **Resend → Emails** que le message est bien parti (statut `delivered`).
   S'il n'apparaît pas : le SMTP custom n'est pas actif, ou la clé est mauvaise.
3. Ouvrir l'email, cliquer le lien. Attendu : atterrissage sur
   `/auth/reset-password` avec le formulaire « Nouveau mot de passe ».
   Si on atterrit sur l'accueil → l'URL n'est pas dans l'allowlist (§2).
4. Saisir un mot de passe ≥ 6 caractères → « Mot de passe modifié » puis accueil.
5. Se déconnecter, se reconnecter avec le nouveau mot de passe.

### Cas d'erreur à vérifier

| Test | Attendu |
|---|---|
| Recliquer le même lien une 2ᵉ fois | Écran « Lien invalide ou expiré » + bouton « Demander un nouveau lien » |
| Ouvrir un lien vieux de > 1 h | Idem |
| Demander 2 resets en < 60 s | « Trop de demandes rapprochées. Patiente une minute. » |
| Ouvrir le lien sur un AUTRE appareil | Fonctionne (templates `{{ .TokenHash }}`). Avec les anciens templates `{{ .ConfirmationURL }}` : message expliquant qu'il faut l'appareil d'origine. |

### Confirm signup

1. Créer un compte avec une adresse jetable.
2. L'écran « Vérifie ta boîte mail » propose « Renvoyer l'email » — une erreur
   d'envoi y est maintenant **affichée** (avant, l'écran mentait en affichant
   « ✓ Email renvoyé »).
3. Cliquer le lien → arrivée connecté sur l'accueil.

### App native (iOS)

Même parcours depuis l'app. Le lien ouvre Safari sur
`https://thw-appli.vercel.app/auth/callback?…&native=1`, qui rebondit sur
`com.thehybridway.app://auth-callback` → l'app reprend la main et affiche
l'écran « Nouveau mot de passe ».
Si Safari reste bloqué sur la page de rebond, vérifier que le scheme
`com.thehybridway.app` est bien déclaré dans `ios/App/App/Info.plist`
(`CFBundleURLSchemes`).

---

## 7. Diagnostic rapide

| Symptôme | Cause la plus probable |
|---|---|
| Aucun email nulle part, l'app dit « envoyé » | SMTP par défaut : destinataire non-membre de l'org → email jeté (§3) |
| Email reçu uniquement sur l'adresse du fondateur | Idem — confirme que le SMTP custom n'est pas actif |
| Email en spam | Domaine non vérifié côté Resend (SPF/DKIM) |
| « Trop d'emails demandés » | Rate limit à 2/h tant que le SMTP custom est inactif (§3) |
| Le lien mène à l'accueil, pas au reset | `redirectTo` refusé → repli sur la Site URL (§2) |
| « Lien invalide ou expiré » dès le 1ᵉʳ clic | Lien pré-cliqué par un antivirus/scanner de mail — passer au template `{{ .TokenHash }}` n'y change rien, le jeton est consommé. Solution : allonger la durée de vie ou utiliser un code OTP à 6 chiffres. |
| Marche sur desktop, pas sur mobile | Flux PKCE + email ouvert sur un autre appareil → passer au template `{{ .TokenHash }}` (§4) |

Les logs sont dans **Supabase → Logs → Auth Logs** (rétention 24 h en plan
gratuit) : chercher `path: /recover`, `/signup`, `/resend` et le champ `error`.
