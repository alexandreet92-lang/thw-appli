# PROMPT_DASHBOARD_FIX — Correctifs Dashboard

> Lecture préalable : `docs/DESIGN_SYSTEM.md`. `src/lib/sync/strava.ts` non touché.
> Commit local, pas de push, pas de déploiement.

## 1. Bug routing « Dashboard → Training » — CAUSE RACINE

Diagnostic (sans corriger d'abord) :

- **Lien de nav** : `src/components/shared/Sidebar.tsx` → item `{ href: '/', label: 'Dashboard' }`,
  rendu par `<Link href="/">`. **Correct** : il pointe bien sur `/`.
- **Redirect dans la route `/`** : aucun `redirect()` / `router.replace('/activities')` dans
  `src/app/page.tsx`, ni dans le layout, ni dans `next.config.js` (vide), ni dans le
  `middleware.ts` (la racine `/` est explicitement laissée passer, ligne 27).
  Recherche globale : aucune navigation vers `/activities` hors `performance/DatasTab`
  (clic spécifique) et imports.
- **Origine historique** : AVANT la refonte, `src/app/page.tsx` rendait un `SplashScreen`
  dont `onDone` appelait `router.replace('/activities')`. **La home était donc câblée pour
  atterrir sur Training.** La refonte Dashboard a remplacé `page.tsx` → `/` rend désormais
  le Dashboard (plus de redirect).
- **Défaut résiduel = la vraie cause encore visible** : `src/app/loading.tsx` est l'UI de
  chargement App Router du **segment racine `/`**. Or ce skeleton est calqué sur la page
  **Training/Activities** : rangée de KPI, « Training load chart », liste « Recent
  activities », le tout en `maxWidth: 900` centré. Comme la nouvelle page Dashboard est un
  composant client qui fait un travail async (auth + données) avant le premier rendu,
  Next affiche ce `loading.tsx` pendant la transition → **on voit la mise en page de
  Training en allant au Dashboard** (et le 900px centré renforce l'effet « colonne
  étroite »). C'est ce qui se lit comme « le clic Dashboard atterrit sur Training ».

**Correction minimale** : remplacer `src/app/loading.tsx` par un skeleton neutre, pleine
largeur, à la forme du Dashboard (pas de KPI/training-load/activities). Aucun autre
changement de routing nécessaire (le redirect historique est déjà supprimé).

**Vérif** : depuis n'importe quelle page (Training inclus), `/` rend le Dashboard ; aucune
UI Training n'apparaît pendant le chargement.

## 2. Largeur desktop

- `src/components/dashboard/dashboard.css` : `.dash-wrap` avait `max-width: 1120px;
  margin: 0 auto` → colonne étroite centrée + marges mortes. On passe en **pleine largeur**
  (`max-width: none; margin: 0`), padding conservé (≥ `--space-8` desktop, `--space-5`
  mobile) pour ne pas coller aux bords.
- Grille desktop **fluide** : `grid-template-columns: 1.5fr 1fr`, gouttière généreuse
  (`--space-8`). Le contenu occupe tout l'espace (viewport − sidebar).
- Sidebar ancrée : `DesktopShell` la rend déjà par défaut (`open = true`, push). Le ☰ la
  replie et le `<main flex:1>` se réétale — pas de colonne centrée dans l'un ou l'autre état.
- Étanchéité mobile : la disposition mobile (1 col, paire race|last) est inchangée
  (media query `min-width: 768px` isole le desktop).

## 3. Module « Prochaines séances »

- Nouveau composant `src/components/dashboard/NextSessionsCard.tsx` : 2-3 prochaines
  séances planifiées **après aujourd'hui**.
- Source : `planned_sessions`. ⚠ pas de colonne `date` absolue → la date est
  `week_start + day_index` jours ; on récupère les semaines ≥ semaine courante, on calcule
  la date par ligne, on filtre `> aujourd'hui`, on trie, on garde 3.
- Par ligne : jour court (« mer. 12 ») + point sport 7px + titre + « durée · zone ».
  Tap carte → `/planning`.
- Vide : si rien à venir → bloc masqué.
- Placement : colonne droite, sous « Cette semaine » (équilibre la grille pleine largeur).

## Contraintes respectées
layout/header/sidebar/tab bar/shuriken réutilisés · TS strict, 0 `any` · fichiers < 200
lignes · `var()` only, 0 `#hex` · clair + sombre · chiffres neutres tabulaires · sport en
point 7px · accent cyan unique · SVG brut · `npm run build` doit passer.
