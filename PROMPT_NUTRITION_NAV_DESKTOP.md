# PROMPT_NUTRITION_NAV_DESKTOP

Corriger le layout desktop de Nutrition : rail latéral gauche (comme Planning) +
contenu pleine largeur ; mobile inchangé.

## PHASE 1 — INSPECTION

### Nav latérale Planning (à réutiliser)
- Composant : **`src/components/navigation/SectionLayout.tsx`** (utilisé par
  Planning, Profil, Calendar). Desktop = `<aside>` **sticky** à gauche, **56 px
  replié → 220 px au survol** (`onMouseEnter/Leave` → `railOpen`), icône Lucide +
  libellé + sous-titre + barre d'indicateur active cyan ; `<main flex:1>` prend
  toute la largeur restante. Mobile = onglets en haut + slide.
- ⚠️ `SectionLayout` **possède son propre état interne** (`activeId`, pas de mode
  contrôlé) et lit `urlParam` **au montage seulement**.

### Nutrition — onglets & largeur
- Onglets du haut : composant `NutritionTabs` (soulignés), rendu dans le wrapper
  `px-4 md:px-8` (l.~1340). État `tab` / `changeTab` dans la page.
- Largeur limitée par le conteneur racine `className="max-w-screen-2xl mx-auto"`
  (l.~1268) → colonne centrée étroite sur desktop.
- `isDesktop` déjà disponible (breakpoint `innerWidth >= 768`).
- Le contenu « today » et « plan » est **scindé en blocs non contigus** et la
  page utilise un **`tab` contrôlé** (ex. lien « Relié à Mon plan » → `setTab('plan')`).

## PHASE 2 — MODIFICATIONS

### Choix d'intégration
`SectionLayout` n'étant **pas contrôlable** (état interne) alors que Nutrition
exige un `tab` contrôlé (liens croisés) et a un contenu scindé, swapper le
composant tel quel imposerait une restructuration lourde et risquée (régression
sur 4 onglets). J'ai donc **reproduit À L'IDENTIQUE le rail de `SectionLayout`**
dans un composant dédié `NutritionRail` (mêmes styles, mêmes 56→220 px au survol,
mêmes icônes Lucide + indicateur) **piloté par l'état `tab` existant**. Le
pattern et le rendu sont identiques à Planning ; seul l'état reste contrôlé côté
Nutrition. (Aucun nouveau pattern inventé ; le rail réplique le composant.)

### Changements
- **Desktop** (`isDesktop`) :
  - Conteneur racine **sans `max-w-screen-2xl mx-auto`** → **pleine largeur**.
  - Wrapper flex `[NutritionRail | contenu flex:1]`.
  - **`NutritionTabs` masqués** (`{!isDesktop && …}`).
- **Mobile** : conteneur `max-w-screen-2xl mx-auto` conservé, **`NutritionTabs`
  en haut inchangés**, pas de rail.
- Nouveau fichier : `src/app/nutrition/components/NutritionRail.tsx`.

## RÉSULTAT
- Desktop : plus d'onglets en haut ; rail gauche identique à Planning (survol) ;
  contenu pleine largeur. Les 4 sections accessibles via le rail, sans
  régression (contenu/état/modales inchangés).
- Mobile : onglets en haut intacts.
- `npm run build` passe (aucun `any`).

## CONTRAINTES RESPECTÉES
- Aucun emoji · icônes Lucide (traits) · TS strict sans `any` · variables CSS ·
  aucune migration · `npm run build` passe.
