# Publication de la page « Découvrir »

Landing marketing exportée depuis Claude Design (HTML autonome, CSS/JS/images
embarqués) publiée à une URL permanente et publique, avec câblage des liens
« En savoir plus » de l'onglet Réglages IA (page Mon profil).

---

## PHASE 1 — Rapport d'architecture (inspection lecture seule)

### 1. Site marketing vs app produit : même base ?
Le repo `thw-appli` est **un seul projet Next.js 16 (App Router)**, déployé sur
Vercel depuis la branche `main`. Aucun repo ni déploiement marketing séparé
n'apparaît dans le code ; aucun `vercel.json` n'est présent.

Conséquence : la page Découvrir est servie **depuis cette même app**. Le mapping
du domaine `the-hybridway.com` vers le déploiement n'est pas dans le code (il vit
dans le dashboard Vercel) — il n'est donc pas modifiable ni vérifiable ici. La
page sera accessible sur le(s) domaine(s) qui servent déjà cette app.

### 2. Pages publiques et middleware d'auth
`src/middleware.ts` protège **toutes** les routes par défaut :
- Toujours publiques : `publicRoutes = ['/login', '/auth', '/onboarding', '/access-expired', '/legal']`, plus `/api/*` et la racine `/`.
- Le `matcher` n'exclut que des assets statiques : `_next/static`, `_next/image`, `favicon.ico`, `branding`, `logos`, `logo.png`.

Une requête `/decouvrir` correspond au `matcher`, **passe donc par le
middleware** et, si l'utilisateur n'est pas authentifié, est redirigée vers
`/auth`. Pour exposer une route publique il faut soit l'ajouter à
`publicRoutes`, soit l'exclure du `matcher`. On fait **les deux** (ceinture +
bretelles) — voir Phase 2.

### 3. Route Découvrir / landing existante ?
Aucune. Pas de dossier `src/app/comprendre`, pas de route landing/marketing.

### 4. Liens « En savoir plus » (Mon profil → onglet Réglages IA)
- `src/app/profile/page.tsx` (section Abonnement) : `href="/comprendre/abonnements"` → « En savoir plus sur les abonnements »
- `src/app/profile/page.tsx` (section Modèles)   : `href="/comprendre/ia"` → « En savoir plus sur les modèles »

Les deux routes `/comprendre/*` **n'existent pas** : les liens étaient morts.
On les repointe vers `/decouvrir`.

### 5. Ancres disponibles dans le HTML Découvrir
Le HTML exporté ne contient que deux `id` : `#grille` et `#header-responsive`.
**Aucune section dédiée « abonnements » ou « modèles ».** Les deux liens pointent
donc vers `/decouvrir` (haut de page), faute d'ancre pertinente. (La page est
servie telle quelle, non reconstruite — on n'ajoute pas d'ancre.)

### 6. Build et garde-fous couleurs
`npm run build` exécute `scripts/check-colors.mjs --enforce`, qui ne scanne que
`SCAN_DIRS = ['src/app', 'src/components']`. Le HTML exporté placé dans
`public/` (avec hex en dur) n'est **pas** scanné — aucun conflit. Le code ajouté
(middleware, next.config, liens) n'introduit ni hex en dur ni `any`.

---

## PHASE 2 — Publication de la page (chemin pragmatique)

On sert l'export **tel quel**, sans le reconstruire en composants.

- Fichier : `public/decouvrir/index.html` (copie à l'identique de l'export).
- URL propre `/decouvrir` via un `rewrite` dans `next.config.js` :
  `{ source: '/decouvrir', destination: '/decouvrir/index.html' }`.
  (Next.js ne fait pas de résolution d'index de répertoire pour `public/` ; le
  rewrite garantit l'URL propre. `/decouvrir/index.html` reste aussi accessible.)
- Route rendue publique :
  - ajout de `'/decouvrir'` à `publicRoutes` dans `src/middleware.ts` ;
  - ajout de `decouvrir` à la negative lookahead du `matcher` (le middleware ne
    s'exécute alors même plus sur cette route → asset statique servi directement).

## PHASE 3 — Câblage des liens

Dans `src/app/profile/page.tsx`, onglet Réglages IA :
- « En savoir plus sur les modèles » → `href="/decouvrir"`
- « En savoir plus sur les abonnements » → `href="/decouvrir"`

Route interne (même app, même domaine) → navigation interne, **même onglet**
(balise `<a href>` sans `target`). Aucune cible externe → pas de
`rel="noopener noreferrer"` nécessaire. **Styles inchangés.**

---

## Critères de réussite
- [x] Page Découvrir accessible à une URL permanente publique en local : `/decouvrir`.
- [x] Les deux liens « En savoir plus » mènent à `/decouvrir`, même onglet.
- [x] `npm run build` passe.
- [x] Rapport d'architecture (Phase 1) écrit dans ce fichier.

## Git
Commit en local uniquement. **Pas de push sur `main`** : la page ne sera en
ligne qu'après push / déploiement Vercel.
