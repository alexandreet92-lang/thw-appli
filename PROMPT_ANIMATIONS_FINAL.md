# PROMPT_ANIMATIONS_FINAL — Splash screen + PageLoader animés

## LOGO trouvé (ÉTAPE 0)
`/logos/logo_4bras.png` — logo shuriken 4-bras bleu visible dans la barre de navigation
(Sidebar.tsx lignes ~629 et ~651)

## ÉTAPE 1 — globals.css
Ajout à la fin :
- @keyframes spinPause (tourne, pause, retourne)
- [data-page-loader] hex opaque (clair + dark)
- [data-splash-screen] hex opaque (clair + dark)
- [data-splash-title] couleur hex (clair + dark)

## ÉTAPE 2 — components/ui/PageLoader.tsx (créé)
Logo shuriken tournant, centré sur fond opaque, zIndex 8000.

## ÉTAPE 3 — components/ui/SplashScreen.tsx (créé)
Animation 4 phases : logo→explode→title "Hybrid"→fadeout → onDone().
sessionStorage 'splash_v1' pour ne montrer qu'une fois par session.

## ÉTAPE 4 — app/ClientShell.tsx (créé)
Client wrapper pour layout.tsx (Server Component).
Gère showSplash via sessionStorage.

## ÉTAPE 5 — app/layout.tsx (modifié)
Enveloppement de {children} avec <ClientShell>.

## ÉTAPE 6 — PageLoader sur états de chargement
Remplacement des loading states par <PageLoader /> + fadeUp au contenu.

## Fichiers modifiés
- src/app/globals.css
- src/components/ui/PageLoader.tsx (nouveau)
- src/components/ui/SplashScreen.tsx (nouveau)
- src/app/ClientShell.tsx (nouveau)
- src/app/layout.tsx
- Pages avec loading states
