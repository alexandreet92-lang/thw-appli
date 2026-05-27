# PROMPT_SPLASH_AUTH

## Logique de navigation au lancement

`app/page.tsx` — splash + redirect :
1. Splash 2.5s toujours affiché
2. Vérifier session Supabase
   - Session valide + < 30 jours → `/activities`
   - Session valide + > 30 jours → signOut + `/auth?expired=1`
   - Pas de session → `/auth`

Après connexion réussie (dans `/auth`) :
- Stocker `last_auth_date` en localStorage
- Middleware DB gère la redirection vers `/onboarding` si premier accès

localStorage :
- `last_auth_date` — timestamp de la dernière auth
- `onboarding_global_done` — 'true' si onboarding vu

## Composants

### SplashScreen.tsx (`src/components/auth/SplashScreen.tsx`)
- Fond conic-gradient animé hue-rotate 30deg en 8s
- Phase 1 (0→0.8s) : logo-spin-in
- Phase 2 (0.8→1.6s) : logo-rise + name-appear
- Phase 3 (1.6→2.3s) : tagline fade-in
- Phase 4 (2.3→2.5s) : fade-out → onDone()

### AuthInput.tsx (`src/components/auth/AuthInput.tsx`)
- label, type, placeholder, value, onChange, showToggle
- Toggle password visibility
- Focus border cyan

## Pages

### `app/page.tsx`
Remplace le dashboard mock. Affiche SplashScreen, puis checkAndRedirect().

### `app/auth/page.tsx`
- Fond sombre statique
- Logo + "Hybrid" en haut
- Onglets Connexion / Créer un compte
- Vue forgot password séparée (setView)
- Erreur session expirée si ?expired=1

### `app/auth/reset-password/page.tsx`
- Page atteinte après clic lien email
- Formulaire nouveau mot de passe + confirmation
- supabase.auth.updateUser({ password })

## Middleware

- Ajouter `/auth` aux routes publiques
- `'/'` bypass auth (la page gère elle-même)
- Redirect `!user` → `/auth` (au lieu de `/login`)
