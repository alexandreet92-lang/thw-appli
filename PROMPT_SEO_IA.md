Écrire dans PROMPT_SEO_IA.md à la racine, puis implémenter.

# Référencement Google + IA du site (the-hybridway.com)

## Problème
Les pages de `public/site/` sont des coquilles vides : tout le texte est construit par React/Babel dans le navigateur.
Google exécute le JS (lentement), les robots IA (GPTBot, ClaudeBot, PerplexityBot…) ne l'exécutent pas : ils voient une page blanche.
Pas de robots.txt, pas de sitemap, pas de canonical, pas de JSON-LD, pages privées indexables.

## Livrables
1. `scripts/seo/build.mjs` (idempotent, `npm run seo:build`) :
   - sert `public/site/` (+ `public/` en repli) en local, ouvre chaque page publique avec Chromium (playwright-core), attend le rendu de `#root`,
     et écrit le HTML rendu dans `<div id="root">` entre `<!--SSR-START-->` et `<!--SSR-END-->`. React remplace ce contenu au chargement.
   - injecte dans `<head>` entre `<!--SEO-START-->` et `<!--SEO-END-->` : canonical (https://www.the-hybridway.com/...), meta robots noindex pour les pages privées, JSON-LD.
   - génère `public/site/sitemap.xml`, `public/site/robots.txt`, `public/site/llms.txt`.
2. `public/robots.txt` (app) : Disallow tout ; `next.config.js` : règles `beforeFiles` pour que le domaine du site serve `/robots.txt`, `/sitemap.xml`, `/llms.txt` depuis `/site/`.
3. Pages privées en noindex : compte, statistiques, historique, login, tests-perso, questionnaire, coach-ia, recharge-tokens, exporter-mes-donnees, index-hero (canonical vers /).
4. Titres et descriptions manquants complétés (app.html).

## Règles
- Aucune donnée inventée dans le JSON-LD (pas de prix, pas de note, pas de réseau social non présent dans le site).
- Le snapshot est pris sans session : aucune donnée personnelle.
- Ne pas toucher à src/lib/sync/strava.ts ni au schéma Supabase. Pas de `any`. Aucun emoji.
- Branche main uniquement. Pas de push sans go explicite.
- Après chaque changement de page publique : relancer `npm run seo:build`.
