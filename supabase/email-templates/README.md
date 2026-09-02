# Templates d'email Supabase Auth

Les templates ne vivent pas dans le code : ils sont stockés **dans le dashboard
Supabase**. Ces fichiers en sont la source de vérité versionnée — on les modifie
ici, puis on les recopie dans le dashboard.

**Où les coller** : Supabase → *Authentication* → *Emails* → *Templates* → onglet
correspondant → coller le contenu du fichier dans « Message body », puis
renseigner le sujet ci-dessous → **Save**.

| Onglet dashboard | Fichier | Sujet |
|---|---|---|
| Confirm sign up | `confirm-signup.html` | voir `SUJETS.md` |
| Reset password | `reset-password.html` | voir `SUJETS.md` |
| Magic link or OTP | `magic-link.html` | voir `SUJETS.md` |
| Change email address | `change-email.html` | voir `SUJETS.md` |

---

## Langue de l'email (fr / en / es)

Les templates sont **trilingues** : chaque texte est enveloppé dans un
conditionnel Go qui lit la langue du compte, avec repli français.

```
{{ $lang := printf "%v" .Data.lang }}
{{ if eq $lang "en" }}New password{{ else if eq $lang "es" }}Nueva contraseña{{ else }}Nouveau mot de passe{{ end }}
```

Deux points à connaître :

1. **`{{ .Data }}` (= `user_metadata`) est la SEULE source de langue lisible
   depuis un template.** La table `profiles`, où l'app stocke `language`, est
   inaccessible ici. Le code recopie donc la langue dans `user_metadata.lang` :
   - `src/app/auth/page.tsx` — à l'inscription (`options.data.lang`) ;
   - `src/lib/i18n/index.tsx` — à chaque changement de langue (`updateUser`),
     et en remise à niveau au chargement pour les comptes antérieurs.
2. **`printf "%v"` n'est pas décoratif.** Comparer directement `.Data.lang`
   (absent sur les vieux comptes) à une chaîne fait échouer le template Go, donc
   l'envoi de l'email. Passer par `printf` donne `"<nil>"` et le repli français
   s'applique proprement. Ne pas retirer ce `printf`.

Le fichier `SUJETS.md` contient les sujets trilingues correspondants — le champ
« Subject » du dashboard accepte les mêmes conditionnels.

---

## Pourquoi ces liens et pas `{{ .ConfirmationURL }}`

Les templates par défaut de Supabase utilisent `{{ .ConfirmationURL }}`. Cette
variable construit un lien vers `/auth/v1/verify?…&redirect_to=<redirectTo>`, où
`redirect_to` est **validé contre l'allowlist** « Redirect URLs ». Si l'URL n'y
figure pas, GoTrue **ne renvoie aucune erreur** : il remplace silencieusement la
destination par la Site URL. Résultat concret : le lien « Reset Password »
ramenait sur l'accueil au lieu de l'écran de création de mot de passe.

Ces templates utilisent `{{ .TokenHash }}` et construisent le lien **eux-mêmes**
sur `{{ .SiteURL }}`. Deux gains :

1. **Plus aucune dépendance à l'allowlist** — la destination est écrite en dur
   dans le template, GoTrue n'a rien à valider ni à réécrire.
2. **Le lien marche depuis n'importe quel appareil.** Le flux PKCE
   (`{{ .ConfirmationURL }}`) exige que le lien soit ouvert dans le navigateur
   qui l'a demandé, parce que le `code_verifier` y est stocké — demander un reset
   sur son ordinateur puis ouvrir le mail sur son téléphone cassait le flux.
   `token_hash` se vérifie sans verifier.

### Destination de chaque lien

| Type | Destination | Qui consomme le jeton |
|---|---|---|
| `signup` | `/auth/callback?token_hash=…&type=signup&next=%2F` | Route serveur → pose la session en cookies, puis redirige sur l'accueil |
| `recovery` | `/auth/callback?token_hash=…&type=recovery&next=%2Fauth%2Freset-password` | Route serveur → session en cookies, puis **page dédiée** de création du mot de passe |
| `magiclink` | `/auth/callback?token_hash=…&type=magiclink&next=%2F` | Route serveur |
| `email_change` | `/auth/callback?token_hash=…&type=email_change&next=%2Fprofile` | Route serveur |

Le reset passe par `/auth/callback` puis atterrit sur `/auth/reset-password`, la
page dédiée à la création du nouveau mot de passe. Une fois le mot de passe
enregistré, l'utilisateur est **connecté** (la vérification du jeton a ouvert la
session) et entre dans l'app.

Ce passage par `/auth/callback` est délibéré : cette route sait consommer un
`token_hash` **depuis la version déjà en production**. Les templates sont donc
utilisables immédiatement, sans attendre un déploiement. La page
`/auth/reset-password` sait aussi consommer un `token_hash` reçu en direct — les
deux formes de lien fonctionnent, celle-ci est simplement la plus sûre à déployer.

---

## Contraintes de rédaction

- **HTML email uniquement** : tables `role="presentation"`, styles **inline**,
  aucune balise `<style>`, aucune variable CSS, aucune classe.
- **Pas de webfont obligatoire** : Fraunces et Inter sont citées en tête des
  piles `font-family`, avec repli Georgia / système. Gmail les ignore, Apple Mail
  les charge — les deux rendus restent corrects.
- **Le lien brut est toujours affiché** sous le bouton : certains clients mail
  bloquent les boutons stylés.
- Le logo est servi depuis `https://thw-appli.vercel.app/logos/logo_app.png`.
  Le `matcher` du middleware exclut `logos` — sans ça, la requête sans cookie
  d'un client mail serait redirigée sur `/auth` et l'image serait cassée.
- **Ne jamais mélanger** `{{ .ConfirmationURL }}` et `token_hash` dans un même
  lien : le jeton serait consommé deux fois.

## Tester un template

Après **Save** dans le dashboard, déclencher un vrai envoi (mot de passe oublié
depuis `/auth`), puis vérifier :

1. le sujet et le rendu (mobile + desktop) ;
2. que le lien mène bien sur `/auth/reset-password` avec le formulaire visible ;
3. qu'après validation on arrive **connecté** dans l'app ;
4. qu'un second clic sur le même lien affiche « Lien invalide ou expiré ».
