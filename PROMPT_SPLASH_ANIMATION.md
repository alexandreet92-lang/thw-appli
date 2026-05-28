# PROMPT_SPLASH_ANIMATION — Splash Screen "Logo → Hybrid"

## PRINCIPE

Le logo NE coexiste JAMAIS avec le texte "Hybrid".
Il se transforme EN "Hybrid".

4 phases enchaînées :

Phase 1 (0 → 0.8s)   : Logo apparaît en tournant
Phase 2 (0.8 → 1.4s) : Logo accélère et implante vers un point central
Phase 3 (1.4 → 2.2s) : "Hybrid" éclate depuis ce point lettre par lettre
Phase 4 (2.2 → 3.0s) : Texte stabilisé, léger glow, transition vers l'app

## FICHIERS MODIFIÉS

- `src/components/shared/SplashScreen.tsx` — composant complet (créé)
- `src/app/globals.css` — keyframes CSS ajoutées
- `src/app/layout.tsx` — import + `<SplashScreen />` ajouté

## COMPORTEMENT

- Affiché une seule fois par session (sessionStorage)
- Fade-out (400ms) avant d'afficher l'app
- onComplete géré en interne

## KEYFRAMES

| Nom               | Rôle                                    |
|-------------------|-----------------------------------------|
| logo-arrive       | Phase 1 : scale 0→1 + rotate -270→0    |
| logo-accelerate   | Phase 2 : rotate 0→360                 |
| logo-implode      | Phase 3 : scale 1→0 + blur + brightness|
| letter-explode    | Phase 4 : chaque lettre scale 0→1      |
| letter-glow       | Phase 5 : drop-shadow pulsé infini     |
| fade-in           | Tagline apparaît                        |
