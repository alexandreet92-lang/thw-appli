# PROMPT — Implémenter B10 & B11 (contenu + routing)

## CONTEXTE
La doctrine vit dans src/lib/coach/doctrine/, routée par src/lib/coach/doctrine/registry.ts (keyword + méthode, pas d'embeddings). B10/B11 existent en squelettes DRAFT inertes (commit local 95cef68). On remplace leur contenu et on corrige le routing. On ne branche AUCUNE feature.

## 1. REMPLACER LE CONTENU
Remplace intégralement le contenu de :
- src/lib/coach/doctrine/B10-individualisation.md  ← par le fichier B10.md fourni
- src/lib/coach/doctrine/B11-nutrition-objectifs.md ← par le fichier B11.md fourni
Ces versions sont calibrées pour tenir sous le cap socle de 5000 caractères (B10 ~4660, B11 ~4250). Ne pas les rallonger.

## 2. CONSTITUTION → COACH_PRINCIPLES
Insère le contenu de COACH_PRINCIPLES_insert.md (hiérarchie de décision + asymétrie) dans le bloc COACH_PRINCIPLES de registry.ts, qui est TOUJOURS injecté. Objectif : la hiérarchie doit être présente à chaque tour, pas seulement quand B10 gagne le routing.

## 3. ROUTING keywordDoc (registry.ts) — audit + correction
a) Montre-moi d'abord l'ordre actuel des regex touchant nutrition/poids AVANT de modifier.
b) Garantis qu'une requête de perte de poids / sèche / déficit / "maigrir" route vers B11 (qui contient le gate de dépistage), et PAS vers B9. Si B9 matche avant B11 sur ces termes, corrige l'ordre.
c) Ajoute les règles keyword pour B10 (individualisation, adapter mon plan, niveau, débutant/confirmé, progression, récupération inadaptée) et B11 (perte de poids, sèche, prise de masse, déficit, recomposition).

## 4. AUTORISER 2 DOCS SOCLE / TOUR
Dans buildDoctrineForChat, autorise jusqu'à 2 docs socle par tour (ex. B10 + B11 pour "adapte mon plan pour perdre du poids"). Garde le bloc doctrine total sous 14000 caractères. Si dépassement, tronque le doc méthode en dernier — JAMAIS un doc socle.

## 5. NE PAS FAIRE
- Ne branche PAS buildDoctrineForPlan (le générateur de plan reste sans doctrine, décision assumée).
- Ne câble AUCUNE fonctionnalité "déficit / perte de poids". La section 3 de B11 reste inerte tant qu'un gate de sécurité côté code n'existe pas (dépendance séparée, hors de ce prompt).

## RÈGLES REPO
Commits locaux uniquement, pas de push sans mon accord. npm run build doit passer. Strict TS, pas de any. Ne touche pas à src/lib/sync/strava.ts. Montre-moi le diff avant commit.
