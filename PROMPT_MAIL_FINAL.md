# Mail d'achat de tokens — refonte premium + personnalisation

`src/app/api/topup/request-link/route.ts`.

## Adaptations au schéma réel
- `createServerClient` n'existe pas → `await createClient()` (déjà en place).
- `profiles` est clé par **`id`** (pas `user_id`) et expose **`full_name`**
  (pas `first_name`/`last_name`) → prénom dérivé de `full_name.split(' ')[0]`,
  fallback **« athlète »**.
- `user_subscriptions` utilise **`tier`** (pas `plan`) → on prend `limits.plan`
  via `getUserTokenLimits`, et `isCreatorAccount` pour le label « Créateur ».
- Toutes les lectures perso sont en `try/catch` (best-effort) : si une donnée
  manque, le mail part quand même avec les fallbacks.

## Contenu
1. **Logo** THW (`logo-thw-light.png`, 80×80, centré, URL absolue via `LOGO_URL`).
2. **Personnalisation** : prénom (sujet + corps), plan (Essai/Premium/Pro/
   Expert/Créateur), solde dispo `monthly.limit − monthly.used + bonus` formaté FR.
3. **Design premium** (table HTML compatible Gmail/Outlook/Apple Mail, fond
   #F8FAFC, carte blanche radius 16, CTA cyan #06B6D4).
4. **Footer** : Retour à l'app · Support (mailto the-hybridway) · Mentions
   légales (`/legal`) + copyright année courante.
5. Sujet : `${firstName}, ton lien d'achat de tokens est prêt`.

## Variables
`${firstName}`, `${planLabel}`, `${formattedRemaining}`, `${topupUrl}`,
`${LOGO_URL}`, `${new Date().getFullYear()}`.

npm run build : 0 erreur.
