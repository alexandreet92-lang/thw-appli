# PROMPT_ONBOARDING — Écran d'accueil (premier lancement)

## Objectif
Présenter l'app aux nouveaux utilisateurs et recueillir des données de profil de base.

## Logique
- Vérifie localStorage `onboarding_completed` au mount
- Si absent → affiche l'onboarding par-dessus tout (zIndex 99999)
- Au clic "Commencer l'aventure" → sauvegarde profil Supabase + marque completed

## Slides (5) + Setup
1. **Welcome** — logo animé + tagline
2. **Record** — mockup téléphone avec données live simulées + sports en cascade
3. **Training** — calendrier hebdo SVG animé
4. **Performance** — courbe SVG avec dashoffset animation
5. **AI** — chat mockup avec messages qui apparaissent

Puis : **SetupScreen** — FTP, FC max, sport principal → athlete_profiles Supabase

## Navigation
- Dots indicateurs (pill pour slide active)
- Swipe gauche/droite
- Boutons Retour / Suivant / Passer

## Fichiers
- `src/components/onboarding/OnboardingScreen.tsx`
- `src/components/onboarding/OnboardingSlide.tsx`
- `src/components/onboarding/slides/WelcomeSlide.tsx`
- `src/components/onboarding/slides/RecordSlide.tsx`
- `src/components/onboarding/slides/TrainingSlide.tsx`
- `src/components/onboarding/slides/PerformanceSlide.tsx`
- `src/components/onboarding/slides/AISlide.tsx`
- `src/components/onboarding/SetupScreen.tsx`
- `src/components/shared/OnboardingWrapper.tsx` (client, intégré dans layout)
