# Règle de navigation des pages à onglets + composant réutilisable + Performance

## Phase 0 — Inspection (constats)
- **Performance** rendait ses onglets via une **barre horizontale `.tab-btn`**
  (`src/app/performance/page.tsx`, ~L2076) : `Profil / Datas / Tests` + contenu en
  `{tab === '…' && <…/>}`, sans transition.
- **Nav GLOBALE** : `src/app/layout.tsx` enveloppe toutes les pages avec `Sidebar`
  (desktop) + `MobileTabBar` (bottom, mobile). Elle est **indépendante** des sous-onglets
  de page → la sous-nav doit s'**ajouter** sans la dupliquer.
- Un rail desktop existait déjà pour Nutrition (`NutritionRail`) mais c'est un **rail au
  survol** (56→220px), pas la sous-nav verticale fixe demandée → on crée un composant dédié.

## Règle (ajoutée à docs/DESIGN_SYSTEM.md §4.1)
Toute page à onglets passe par le composant unique **`TabbedPageLayout`** :
- **Desktop** : sous-nav verticale gauche (~200px), filet `var(--border)` ; actif =
  `var(--primary-dim)` + `var(--primary)` ; inactif `var(--text-mid)`, hover `var(--bg-hover)`.
- **Mobile** : onglets horizontaux en haut, soulignement actif 2px `var(--text)`.
- **Transition** : slide + fondu (~0,28 s, `x 10→0`, `opacity 0→1`), `prefers-reduced-motion`
  respecté (fondu seul). Distincte de la nav globale (ne la remplace/duplique pas).

## Composant réutilisable
`src/components/ui/TabbedPageLayout.tsx` (~85 l., enforced, tokens uniquement) :
- props : `title?`, `headerExtra?`, `tabs: {id,label}[]`, `active`, `onChange`, `children` ;
- rend automatiquement sidebar desktop / onglets mobile + transition (framer-motion +
  `useReducedMotion`) ; responsive, clair/sombre. Générique sur l'id d'onglet (TS strict).

## Application à Performance
`page.tsx` : la barre `.tab-btn` + l'en-tête + les 3 conditionnels de contenu sont
remplacés par `<TabbedPageLayout title="Performance" tabs={[Profil,Datas,Tests]} …>`
(bouton d'aide en `headerExtra`, tokenisé). Padding de page mis en tokens
(`px var(--space-5)/md:var(--space-8)`). La nav globale (`layout.tsx`) n'est pas touchée.

## Checklist d'acceptation
- [x] Règle écrite dans `docs/DESIGN_SYSTEM.md` (§4.1).
- [x] Composant réutilisable unique créé (`TabbedPageLayout`), pas dupliqué.
- [x] Performance desktop = sous-nav verticale à gauche (Profil/Datas/Tests).
- [x] Performance mobile = onglets horizontaux en haut.
- [x] Transition animée (slide + fondu) au changement, coupée si `prefers-reduced-motion`.
- [x] Nav globale intacte (`layout.tsx`/`Sidebar`/`MobileTabBar` non modifiés ; sous-nav additive).

## Suite (hors périmètre de cette tâche, à migrer plus tard)
Faire passer les autres pages à onglets (Blessures Aperçu/Historique/Analyse, Nutrition,
Calendar…) par `TabbedPageLayout` pour l'uniformité.

## Contraintes respectées
TS strict (aucun any), tokens uniquement (composant enforced), ≤200 l., `npm run build`
vert, aucun emoji, commit local, pas de push. `strava.ts` intact, aucune migration.
