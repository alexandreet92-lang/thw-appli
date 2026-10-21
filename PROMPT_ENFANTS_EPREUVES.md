Écrire dans PROMPT_ENFANTS_EPREUVES.md à la racine, puis implémenter.

# Enfants et loi, page publique du Test de forme, pages par épreuve, titres en français

## 1. Accord parental sous 15 ans (RGPD art. 8, loi Informatique et Libertés art. 45)
- Serveur : `POST /api/cadences/campaign` refuse (400, code `parental_consent`) si âge < 15 sans `parentalConsent: true`; horodate `parental_consent_at` (clé ajoutée seulement sous 15 ans).
- Migration `supabase/migrations/20261022_cadences_parental_consent.sql` (colonne nullable, idempotente) : à appliquer AVANT le déploiement du code.
- Écrans : case obligatoire dans le profil du Test de forme et dans l'assistant Decaform dès que l'âge saisi est < 15.
- Textes : CGU (§3 Compte) et politique de confidentialité (§2) complétées ; tout traduit EN/ES/IT/DE.

## 2. Mention « barème provisoire »
Résultat du Test de forme : « Barème provisoire de ta catégorie d'âge, en cours de calibrage » (estimation et score officiel). Traduit.

## 3. Page publique du Test de forme
Lisible sans compte ; le bouton devient « Se connecter pour passer le test ». Un compte reste obligatoire pour passer n'importe quel test.

## 4. Pages par épreuve
- `GET /api/cadences/epreuves` + `src/lib/cadences/epreuves.ts` (une page par slug, batterie la plus complète).
- `public/site/components/cadences/CadencesEpreuve.jsx` ; fichiers `epreuve-<slug>.html` générés par `npm run seo:build` (protocole, matériel, échauffement, barème, liens vers les autres épreuves du groupe).
- `tests.html` : section « Toutes les épreuves » avec un lien vers chaque page.
- Sitemap : toutes les pages d'épreuves.

## 5. Titres et descriptions en français
Source française + clés FR dans `i18n-dict-17.js` (EN/ES/IT/DE). `support.html` passé en français.

## Règles
Aucun emoji, pas de `any`, branche main, pas de push sans go (go donné pour ce lot : migration d'abord, puis push avec [deploy]).
