# Templates d'email Supabase Auth

Les templates ne vivent pas dans le code : ils sont stockés **dans le dashboard
Supabase**. Ces fichiers en sont la source de vérité versionnée — on les modifie
ici, puis on les recopie dans le dashboard.

**Où les coller** : Supabase → *Authentication* → *Emails* → *Templates* → onglet
correspondant → coller le contenu du fichier dans « Message body », puis
renseigner le sujet ci-dessous → **Save**.

| Onglet dashboard | Fichier | Sujet à saisir |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `Confirme ton inscription — Hybrid` |
| Reset password | `reset-password.html` | `Réinitialise ton mot de passe — Hybrid` |
| Magic Link | `magic-link.html` | `Ton lien de connexion — Hybrid` |
| Change Email Address | `change-email.html` | `Confirme ta nouvelle adresse — Hybrid` |

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
| `recovery` | `/auth/reset-password?token_hash=…&type=recovery` | **La page elle-même**, côté client — un seul saut, aucun rebond |
| `magiclink` | `/auth/callback?token_hash=…&type=magiclink&next=%2F` | Route serveur |
| `email_change` | `/auth/callback?token_hash=…&type=email_change&next=%2Fprofile` | Route serveur |

Le reset pointe **directement** sur `/auth/reset-password` : c'est la page dédiée
à la création du nouveau mot de passe. Elle vérifie le jeton, affiche le
formulaire, et une fois le mot de passe enregistré l'utilisateur est **connecté**
(la vérification du jeton ouvre la session) et entre dans l'app.

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
