# Compétences — Page interface (étape 3/5)

## Objectif
Page `/competences` : desktop 3 colonnes (sports / bibliothèque / créer), mobile sidebar coulissante + cartes. Interface uniquement (modal et IA = prompts 4/5).

## Prérequis
Tables + 70 compétences en base (prompts 1-2).

## Conventions réutilisées
- `createClient` de `@/lib/supabase/client`
- CSS vars du thème (`--bg`, `--bg-card`, `--text`, `--text-mid`, `--text-dim`, `--border`, `--bg-hover`, `--border-mid`)
- Pages `'use client'` + `export const dynamic = 'force-dynamic'`
- Plan : table `user_subscriptions.tier` = premium|pro|expert → mappé limit 3/7/20 (défaut premium). Le type `PlanType` (free/premium/pro/elite) reste pour compat ; mapping local dans le hook.

## Fichiers créés
- `src/app/competences/page.tsx` — orchestration (filtres, toggle, responsive)
- `src/app/competences/constants.tsx` — types filtres + labels + icônes lucide par sport/catégorie
- `src/app/competences/hooks/useCompetences.ts` — fetch competences + merge user_competences → `CompetenceWithUserState[]`
- `src/app/competences/hooks/useUserCompetences.ts` — `toggleCompetence`, `checkLimit`, `detectConflicts`, plan/limite
- `src/app/competences/components/SportSidebar.tsx` — colonne gauche (sports + catégories)
- `src/app/competences/components/CompetencesLibrary.tsx` — colonne centre (tabs + liste)
- `src/app/competences/components/CompetenceCard.tsx` — carte (nom, bullets, tags sport, toggle, conflit, "Voir le prompt")
- `src/app/competences/components/CreateCompetencePanel.tsx` — colonne droite placeholder (chat d'accueil + input non fonctionnel)
- `src/app/competences/components/MobileSidebar.tsx` — drawer coulissant (swipe tactile manuel, seuil 50px)

## Toggle
Désactivation libre. Activation : vérifie la limite du plan + les conflits (compétences en conflit déjà actives) ; bloque avec message si dépassé. Mise à jour optimiste + UPSERT `user_competences`.

## Intégration
Lien "Compétences" (icône Brain) ajouté dans la sidebar IA à côté de "Réglages IA" → `/competences`.

## Hors périmètre
Modal de détail (4), conversation IA de création (4), intégration menu "+" coach (5).
