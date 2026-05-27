# PROMPT_AUTH_COMPLETE — Système Auth Complet

## Objectif
Compléter le système d'authentification avec : gestion d'erreurs explicites, validation inscription (CGU + force mot de passe), vérification email, complétion profil (3 étapes), social login Apple/Google.

## Flux
SplashScreen → session valide → profil complété → GlobalOnboarding → App
SplashScreen → pas de session → AuthPage (Connexion/Inscription)
Inscription → EmailVerification → lien cliqué → ProfileCompletion → GlobalOnboarding → App
Mot de passe oublié → email → ResetPassword page

## Fichiers créés
- src/lib/auth/errors.ts — AUTH_ERRORS map + getAuthError()
- src/components/auth/ErrorMessage.tsx — bandeau d'erreur animé (shake)
- src/components/auth/PasswordStrengthBar.tsx — indicateur 4 barres
- src/components/auth/EmailVerification.tsx — écran post-inscription avec renvoi + countdown 60s
- src/components/auth/ProfileCompletion.tsx — 3 étapes (prénom, sport, objectif)
- src/app/auth/profile/page.tsx — page dédiée ProfileCompletion
- src/app/legal/cgu/page.tsx — placeholder CGU
- src/app/legal/privacy/page.tsx — placeholder politique de confidentialité
- src/supabase/migrations/add_profiles.sql — table profiles avec RLS

## Fichiers modifiés
- src/app/auth/page.tsx — ErrorMessage, EmailVerification view, CGU checkbox, password strength, social login Apple/Google
- src/app/auth/reset-password/page.tsx — PasswordStrengthBar, ErrorMessage, getAuthError
- src/app/auth/callback/route.ts — redirect par défaut vers / (au lieu de /profile)
- src/app/page.tsx — check profile_completed dans flux post-session
