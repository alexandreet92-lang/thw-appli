# Publication de la page « Découvrir »

Objectif : publier la landing marketing « Découvrir » (export autonome de
Claude Design) à une URL permanente publique `/decouvrir`, puis faire pointer
dessus les deux liens « En savoir plus » de l'onglet Réglages IA (page Mon
profil).

---

## PHASE 1 — Rapport d'inspection (lecture seule)

### Le site marketing et l'app : même base ou deux déploiements ?

C'est **la même base Next.js**. Un seul repo (`alexandreet92-lang/thw-appli`),
App Router unique sous `src/app/`. Il n'existe ni repo ni déploiement marketing
séparé, ni route landing/marketing dédiée. Le site `the-hybridway.com` et
l'app produit partagent le même build Next.js.

### Où vivent les pages publiques ? Middleware d'auth ?

Toutes les pages vivent sous `src/app/` (App Router). L'auth est gérée par
`src/middleware.ts` qui **protège tout par défaut** :

- La racine `/` se gère elle-même (pass-through).
- Une liste explicite de **routes publiques** est testée en `startsWith` :
  `['/login', '/auth', '/onboarding', '/access-expired', '/legal']`.
- Les routes `/api/*` ne sont jamais bloquées.
- Sinon : si pas de `user` → redirect `/auth` ; puis contrôle d'abonnement
  (`trial_expired`/`cancelled` → `/access-expired`) et d'onboarding.

Le `matcher` du middleware exclut déjà les assets statiques :
`['/((?!_next/static|_next/image|favicon.ico|branding|logos|logo.png).*)']`.

**Conséquence importante** : une route comme `/decouvrir` n'est PAS dans les
exclusions du `matcher`, donc le middleware s'exécute dessus. Sans
whitelist, un visiteur non connecté serait redirigé vers `/auth`. La route
Découvrir doit donc être **ajoutée à `publicRoutes`**.

**Comment exclure / rendre publique une route** : l'ajouter au tableau
`publicRoutes` (le test `startsWith` couvre la route et ses sous-chemins).

### Existe-t-il déjà une route Découvrir / landing / marketing ?

Non. Aucune route `/decouvrir`, `/comprendre`, landing ou marketing
n'existe sous `src/app/`.

### Comment `the-hybridway.com` est-il mappé au déploiement ?

Aucun `vercel.json` dans le repo. Le mapping du domaine se fait côté
dashboard Vercel (déploiement de la branche `main`), pas via un fichier
versionné. Le repo ne contient aucune config de domaine.

### Les liens « En savoir plus » (onglet Réglages IA, page Mon profil)

Fichier : `src/app/profile/page.tsx`. Les deux liens sont des balises `<a>`
qui pointaient vers des routes **inexistantes** (liens cassés avant ce
travail) :

- « En savoir plus sur les modèles » — section Modèles — `href="/comprendre/ia"`
  (≈ ligne 1644).
- « En savoir plus sur les abonnements » — section Abonnement —
  `href="/comprendre/abonnements"` (≈ ligne 1463).

Les deux conservent un style inline identique (bouton outline, `var(--token)`).

### Constat bloquant : l'export est absent

L'énoncé indique que l'export autonome est « placé dans le repo à
`public/decouvrir/index.html` ». **Ce fichier n'existe pas** (recherche sur
tout le repo ; le zip `files (2).zip` ne contient que des logos).

**Décision (solution la plus simple, documentée avant action)** : on met en
place toute la plomberie (route publique + câblage) et on place à
`public/decouvrir/index.html` un **placeholder autonome** (HTML + CSS
embarqués, zéro dépendance externe) respectant exactement le contrat
d'intégration ci-dessous. Le jour où l'export réel de Claude Design est
disponible, il suffit de **remplacer ce fichier** (drop-in, même chemin) en
conservant l'ancre `#abonnements` pour que le lien Abonnement reste correct.

---

## PHASE 2 — Publication de la page Découvrir

### Service du HTML autonome à `/decouvrir`

Les fichiers de `public/` sont servis à leur chemin (`public/decouvrir/index.html`
→ `/decouvrir/index.html`). Next.js ne résout PAS automatiquement
`index.html` pour le chemin de dossier `/decouvrir`. Pour obtenir une URL
permanente propre `/decouvrir`, on ajoute un **rewrite** dans
`next.config.js` :

```js
async rewrites() {
  return [{ source: '/decouvrir', destination: '/decouvrir/index.html' }]
}
```

On sert l'export **tel quel** : pas de reconstruction en composants React.

### Route non bloquée par l'auth

`/decouvrir` est ajouté à `publicRoutes` dans `src/middleware.ts`. Le test
`startsWith('/decouvrir')` couvre `/decouvrir` comme `/decouvrir/index.html`.

### Contrat d'intégration (pour l'export réel)

L'export final doit :
- être autonome (CSS/images embarqués, aucune requête réseau bloquée par
  l'auth) ;
- vivre à `public/decouvrir/index.html` ;
- contenir une section identifiée `id="abonnements"` pour l'ancre du lien
  Abonnement.

---

## PHASE 3 — Câblage des liens

Dans `src/app/profile/page.tsx` :

- « En savoir plus sur les modèles » → `href="/decouvrir"`.
- « En savoir plus sur les abonnements » → `href="/decouvrir#abonnements"`.

`/decouvrir` est servi par la même app (même domaine) : navigation interne,
**même onglet**, balise `<a>` classique (obligatoire ici car c'est un fichier
statique hors routeur, pas une route Next — `<Link>` ne convient pas). Pas de
`target="_blank"` ni `rel` (pas un site externe). Le style inline des liens
est **inchangé**.

---

## Critères de réussite

- [x] Page Découvrir accessible à `/decouvrir` (URL permanente publique).
- [x] Lien Modèles → `/decouvrir` ; lien Abonnements → `/decouvrir#abonnements`.
- [x] Navigation interne, même onglet, style inchangé.
- [x] `npm run build` passe.
- [ ] Remplacer le placeholder par l'export réel de Claude Design (drop-in à
      `public/decouvrir/index.html`, conserver `id="abonnements"`).
