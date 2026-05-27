# PROMPT_GLOBAL_ONBOARDING

## Logique d'affichage

`onboarding_global_done` localStorage : affiché une seule fois.
Si `onboarding_completed` (legacy) est déjà à 'true' → skip automatique (anciens users).
Après dismissal → set les deux clés à 'true'.

## 7 slides avec thèmes de couleur

1. **Bienvenue** — violet, OrbitingParticles autour du logo
2. **3 modèles IA** — cyan, cards Hermès / Athéna / Zeus
3. **Assistants spécialisés** — vert, THW Coach + 4 agents page
4. **Actions rapides** — orange, 6 actions en grille 2×3
5. **15 sports** — bleu, carousel horizontal automatique
6. **Abonnements** — rose, 3 plans Premium/Pro/Expert
7. **Prêt** — violet (boucle), logo + bouton "Commencer l'aventure"

## Modèles IA (sources : profile/page.tsx, AIPanel.tsx)

- Hermès : #d4a017, logo_3bras.png, "Rapide et direct", haiku, 1 point
- Athéna : #5b6fff, logo_4bras.png, "Analyse approfondie", sonnet, 2 points
- Zeus   : #8b5cf6, logo_6bras.png, "Vision stratégique", sonnet max, 3 points

## Agents (sources : agentConfig.ts)
THW Coach + Planning, Récupération, Nutrition, Séances visibles
4 slots "Bientôt" pour les autres

## Abonnements (source : settings/subscription/page.tsx)
Premium 14€ : 30 msg/mois, Hermès, 2 plans, 6 mois historique
Pro 26€     : 100 msg/mois, Athéna, 6 plans, 24 mois historique
Expert 49€  : 300 msg/mois, Zeus, 20 plans, illimité

## Fichiers
- src/components/onboarding/GlobalOnboarding.tsx
- src/components/onboarding/GlobalOnboardingWrapper.tsx (remplace OnboardingWrapper)
- src/components/onboarding/global/slides/*.tsx (7 slides)
- layout.tsx : remplacer OnboardingWrapper par GlobalOnboardingWrapper
