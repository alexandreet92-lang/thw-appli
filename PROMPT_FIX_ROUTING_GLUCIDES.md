# PROMPT — Fix routing "glucides" + isolation branche locale

## CONTEXTE
Suite au travail doctrine B10/B11 (commits locaux, non poussés). Deux tâches : corriger un trou de routing sur "glucides", et isoler le travail sur une branche locale sans déclencher Vercel.

## 1. FIX ROUTING "glucides" (src/lib/coach/doctrine/registry.ts)
Problème : la regex nutrition de keywordDoc ne capte pas "glucides" au pluriel. Une requête de nutrition d'entraînement (ex. "je gère mal mes glucides sur mes séances longues") risque de ne matcher aucun doc socle et de partir sans doctrine nutrition.
- Corrige la regex pour capter "glucide(s)", pluriel ET singulier.
- Ces requêtes de fueling/nutrition d'entraînement doivent router vers B9 (fuel for the work required), PAS vers B11. B11 ne se déclenche que sur un objectif de composition corporelle (perte de poids, sèche, prise de masse, recomposition, déficit).
- Montre-moi la regex avant/après et 3 exemples de requêtes de test avec le doc socle résultant, AVANT de commiter.

## 2. ISOLER SUR UNE BRANCHE LOCALE (sans push)
- Crée une branche locale dédiée (ex. doctrine/b10-b11) contenant les commits doctrine + ce fix.
- NE POUSSE RIEN. Reste 100% local.
- Avant tout push éventuel futur : confirme-moi si la config Vercel de ce repo déclenche un déploiement preview sur une branche non-main poussée. Je veux savoir si pousser une branche autre que main lance un build Vercel. Ne pousse pas tant que je n'ai pas tranché.

## RÈGLES REPO
Commits locaux uniquement, pas de push. npm run build doit passer. Strict TS, pas de any. Ne touche pas à src/lib/sync/strava.ts. Montre-moi le diff avant commit.
