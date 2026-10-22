Écrire dans PROMPT_ARTICLES.md à la racine, puis implémenter.

# PROMPT_ARTICLES — page Articles du site vitrine (public/site/)

## Livré
- Page `articles.html` (React/Babel comme le reste du site) : liste triée en 5 thèmes (État des lieux, Santé et longévité, Vieillir, Mesurer et performer, Plans d'action), recherche, filtres de thème et de statut (membre : non lus / lus / enregistrés), anneau « x / 41 lus », cartes animées (miniatures SVG), aucune image.
- Lecteur dans la même page (`articles.html?a=<slug>`, historique du navigateur géré) : barre de progression, « Marquer comme lu », « Enregistrer », « Partager » (feuille native du téléphone si disponible, sinon WhatsApp, Telegram, Facebook, X, LinkedIn, Reddit, e-mail, SMS, copie du lien), CTA vers les tests (`test-de-forme.html`, `cadences.html`, `tests.html`), et les articles du même thème en bas (non lus d'abord).
- Accès limité : un visiteur lit la problématique et les enjeux (8 à 15 % de l'article). La coupure est faite CÔTÉ SERVEUR par `/api/articles/item?slug=` : le texte réservé n'est jamais envoyé au navigateur. Carte d'accès : « Créer un compte » (`/auth?redirect=…`) / « Se connecter » (fenêtre modale sur ordinateur, page `compte.html` sur mobile). Exception : `sport-et-troubles-alimentaires` est en accès libre (information de sécurité).
- Lu / enregistré par membre : table `article_user_state` (RLS : chacun ses lignes), `PATCH /api/articles/item?slug=`. Menu du compte : « Mes articles enregistrés » (`articles.html?f=saved`).
- Menu du site, barre du haut et pied de page : lien « Articles ». Traductions EN/ES/IT/DE des libellés dans `components/site/i18n-dict-18.js`. Le texte des articles reste en français.

## Fichiers
- Contenu (généré) : `src/content/articles/*.json` + `index.ts` ← `node scripts/articles/build.mjs <dossier des articles HTML>` (CSS de chaque article isolé sous `.ax`, renvois « N°12 » transformés en liens, coupure calculée avant la 3e section).
- API : `src/app/api/articles/route.ts`, `src/app/api/articles/item?slug=/route.ts`, `src/lib/articles/access.ts`.
- Migration : `supabase/migrations/20261025_article_user_state.sql` (appliquée).
- Site : `public/site/articles.html`, `articles.css`, `components/site/Articles.jsx`, `SiteChrome.jsx` (menu, nav, pied, `LoginModal` exporté).

## Reste à faire
- Afficher 3 à 4 articles sur chaque page de test (projet d'origine) avec le protocole juste en dessous.
- Traduire le texte des articles (FR seulement aujourd'hui).
- Aperçus de partage par article (balises Open Graph) : demande un rendu serveur par article.
- Relecture par un professionnel de santé des articles P7, P8 et P9 ; vérifier le numéro d'écoute de P9 à la source.
- Contrôle visuel mobile et mode sombre des 41 articles (un seul article a été parcouru de bout en bout).
