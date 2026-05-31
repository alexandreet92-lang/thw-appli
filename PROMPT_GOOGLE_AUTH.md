# Fix Google OAuth — redirect_uri_mismatch

## Diagnostic

**Erreur :** `redirect_uri_mismatch` au retour de Google OAuth.

**Cause racine :** Le bouton Google OAuth n'existait pas dans `/login`. La route `/auth/callback` était déjà présente et correcte (`supabase.auth.exchangeCodeForSession`).

## Étape 1 — signInWithOAuth trouvé

Aucun appel `signInWithOAuth` n'existait dans le code. Le bouton Google manquait complètement dans `src/app/login/page.tsx`.

## Étape 2 — Implémentation du bouton Google

Ajout dans `src/app/login/page.tsx` :

```ts
const supabase = createClient()
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin + '/auth/callback',
  },
})
```

Le `redirectTo` pointe vers la route Next.js de l'app, pas vers Supabase directement.

## Étape 3 — Route /auth/callback

`src/app/auth/callback/route.ts` existait déjà et gérait correctement `exchangeCodeForSession`. Aucune modification nécessaire.

## Étape 4 — URIs à configurer dans Google Cloud Console

Dans **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs**, ajouter les deux URIs :

1. `https://sfrcnyzntgrxiwlmwifi.supabase.co/auth/v1/callback` ← déjà présente
2. `https://thw-appli.vercel.app/auth/callback` ← **à ajouter**

L'URI Supabase est utilisée en interne par le SDK. L'URI Vercel est le `redirectTo` de l'app.

## Fichiers modifiés

- `src/app/login/page.tsx` — ajout bouton "Continuer avec Google"
