# Publication des pages « Découvrir » + « Thème »

Deux exports autonomes (`decouvrir.html` + `theme.html`) publiés à une URL
permanente et publique, polices rétablies, et liens « En savoir plus » de
l'onglet Réglages IA (page Mon profil) câblés vers les bonnes ancres.

---

## PHASE 1 — Rapport d'architecture (inspection lecture seule)

### Marketing vs app : même base ?
Repo `thw-appli` = **un seul projet Next.js 16 (App Router)**, déployé sur Vercel
depuis `main`. Aucun repo/déploiement marketing séparé, aucun `vercel.json`. Les
pages Découvrir sont donc servies **depuis cette même app**. Le mapping du domaine
`the-hybridway.com` vit dans le dashboard Vercel (hors code).

### Pages publiques et middleware
`src/middleware.ts` protège tout par défaut. Publics : `publicRoutes`
(`/login`, `/auth`, `/onboarding`, `/access-expired`, `/legal`, `/decouvrir`),
`/api/*`, et `/`. Le `matcher` exclut les assets statiques **et `decouvrir`** :
`['/((?!_next/static|_next/image|favicon.ico|branding|logos|logo.png|decouvrir).*)']`.
→ Toute URL commençant par `/decouvrir` (dont `/decouvrir/decouvrir.html` et
`/decouvrir/theme.html`) **ne passe pas par le middleware** : route publique.

### Liens « En savoir plus » (Mon profil → Réglages IA)
- `src/app/profile/page.tsx` (section Abonnement) → « En savoir plus sur les abonnements »
- `src/app/profile/page.tsx` (section Modèles)   → « En savoir plus sur les modèles »

### Format des exports (point clé)
`decouvrir.html` (2.8 Mo) et `theme.html` (1.96 Mo) ne sont **pas** des HTML
statiques simples : ce sont des exports « bundler » auto-extractibles. La vraie
page (HTML + CSS + composants React JSX) est stockée dans des `<script
type="__bundler/template">` / `__bundler/manifest` (assets base64 **gzip-
compressés**). Au chargement, un script décompresse les assets en blob URLs,
parse le template et **remplace tout `document.documentElement`** par le `<head>`
/`<body>` du template, puis exécute les scripts `text/babel` (React + Babel
standalone embarqués).

Conséquences :
1. Un `<link>` ajouté au `<head>` **externe** (wrapper bundler) serait **écrasé**.
   Il faut l'injecter dans le `<head>` **du template** (à l'intérieur du
   `<script type="__bundler/template">`).
2. Les liens inter-pages (`theme.html#...`) et les ancres (`id="tokens"`,
   `id="abonnements"`) sont dans les assets React **compressés** : non éditables
   en texte et non vérifiables ici. Ils sont **relatifs** → ils ne résolvent
   correctement que si l'URL courante est dans le dossier `/decouvrir/`.

---

## PHASE 2 — Publication

- Fichiers : `public/decouvrir/decouvrir.html` et `public/decouvrir/theme.html`
  (copies à l'identique des exports ; ancien `public/decouvrir/index.html`
  supprimé).
- URL d'entrée permanente et publique : **`/decouvrir`**, qui **redirige** vers
  `/decouvrir/decouvrir.html` (via `redirects()` dans `next.config.js`).
  Le navigateur se retrouve dans le dossier `/decouvrir/` → les liens relatifs
  `theme.html#...` résolvent en `/decouvrir/theme.html#...` et les ancres
  internes fonctionnent. (Pas de `<base href>` : il aurait cassé les ancres
  intra-page `#...`.)
- `theme.html` directement accessible à `/decouvrir/theme.html` (asset statique).
- Aucune de ces routes n'est bloquée par l'auth (exclusion `decouvrir` du
  `matcher` + `publicRoutes`).

## PHASE 3 — Polices

Les `@font-face` du template référencent des assets de police non embarqués
(`src: url("<UUID>")` manquants) → la typo ne se chargeait pas. Le CSS utilise
les familles `'Syne'`, `'DM Sans'`, `'DM Mono'` (et `var(--font-display/body/
mono)`).

Correctif : injection, dans le `<head>` du template des **deux** fichiers (ancre
unique `<html lang="fr"><head>`, 1 occurrence par fichier), du lien Google Fonts
officiel (mêmes familles que l'app) :

```
https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap
```

(plus deux `preconnect`). Les familles `Syne` / `DM Sans` / `DM Mono` se
résolvent alors via le CDN Google. Le reste de la mise en page n'est pas touché.

## PHASE 4 — Câblage des liens (Mon profil → Réglages IA)

- « En savoir plus sur les modèles » → `href="/decouvrir/theme.html#tokens"`
- « En savoir plus sur les abonnements » → `href="/decouvrir/theme.html#abonnements"`

Route interne (même app, même domaine) → navigation interne, **même onglet**
(balise `<a href>` sans `target`). Aucune cible externe → pas de
`rel="noopener noreferrer"`. **Styles inchangés.**

---

## Critères de réussite
- [x] `/decouvrir` (→ `/decouvrir/decouvrir.html`) et `/decouvrir/theme.html`
      publics, accessibles en local.
- [x] Polices rétablies via Google Fonts (familles Syne / DM Sans / DM Mono).
- [x] Les deux liens « En savoir plus » mènent à `theme.html#tokens` et
      `theme.html#abonnements`.
- [ ] `npm run build` : à exécuter depuis le terminal du projet (node/npm n'est
      pas accessible depuis l'environnement de l'agent).
- [x] Rapport d'architecture écrit dans ce fichier.

## Git
Commit en local uniquement. **Pas de push sur `main`.**
