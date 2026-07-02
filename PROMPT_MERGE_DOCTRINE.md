# PROMPT — Fix regex "poids" + merge/push doctrine

## 1. FIX REGEX "poids" (registry.ts)
Le mot "poids" seul dans la regex nutrition est trop large : il capte des questions de force ("quel poids au développé couché").
- Ne route vers la nutrition que sur des expressions de composition : "perte de poids", "prendre du poids", "prise de poids" — pas "poids" isolé.
- Montre-moi : "quel poids au développé couché" et "je veux perdre du poids" → quel doc socle sort ? Le 1er ne doit PAS sortir un doc nutrition.

## 2. MERGE + PUSH (seulement après que je valide le point 1)
- Merge doctrine/b10-b11 dans main.
- npm run build doit passer.
- Pousse main. Confirme-moi que le déploiement Vercel prod est parti.

## RÈGLES REPO
Strict TS, pas de any. Ne touche pas à src/lib/sync/strava.ts. Montre le diff avant merge.
