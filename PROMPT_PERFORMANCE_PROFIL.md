# Refonte visuelle — page Performance, onglet Profil

## Cadre
Langage de design (DESIGN_SYSTEM.md, « pages denses ») appliqué à l'onglet Profil de
Performance. Onglets Datas / Tests non touchés. Sections lourdes extraites < 200 l. ;
**si un refactor devient risqué, s'arrêter et documenter** (clause appliquée).

## Phase 0 — Inspection LECTURE SEULE (constats)

### Structure
`src/app/performance/page.tsx` (2 519 l.) = orchestrateur `PerformancePage` (2357) +
`ProfilTab` (341, ~1 250 l.) + `TestsTab` + helpers (`Card`, `PremiumStatCard` 233,
`SemiGauge` 267, `MiniRadar` 311, `NInput`/`TInput`). Hors périmètre : `DatasTab.tsx`
(5 821 l.), `RadarChart.tsx` (1 518), `PerformanceTestLevels.tsx` (680),
`ClimbsSection`/`RacesSection`.

### Navigation — déjà au format standard
Performance s'affiche dans le **layout global** (`src/app/layout.tsx` → `Sidebar`
desktop + `MobileTabBar` mobile, communs à toutes les pages). `grep Sidebar|MobileTabBar`
dans `src/app/performance` = **aucun résultat** : pas de nav parallèle. Les sous-onglets
**Profil / Datas / Tests** (page.tsx:2449-2475) utilisent la classe partagée `.tab-btn`
(déjà tokenisée, `--primary` actif). → **Phase 1 déjà satisfaite** : la page a bien la
sidebar desktop + les onglets ; rien à restructurer. (Reste cosmétique : en-tête en
`Syne` + bouton « ? » cyan en dur.)

### Données (state `profile` / `INIT_PROFILE`, chargé/sauvé Supabase ; branché)
- **8 métriques globales** : `ftp` (W), `thresholdPace` (/km), `vma` (km/h), `css`
  (/100m), `hrMax`, `hrRest`, `lthr` (bpm), `vo2max` (ml/kg/min). Édition via NInput/TInput
  + `handleSaveGlobal`. **Branché.**
- **Benchmarks par sport** : `benchmarks` (page.tsx:688) par `SportSpecId`
  (running/cycling/swim/hyrox) ; zones FC (calcul), allure (running/natation),
  puissance (cyclisme, 7 zones) ; sélection de sport `specSport`. **Branché.**
- **Niveau estimé** : `SemiGauge` (jauges rondes multicolores) + `PerformanceTestLevels`.
- **Radar** « en un coup d'œil » : `MiniRadar`/`RadarChart`.

### Couleurs en dur / monospace
`PremiumStatCard` : 8 couleurs décoratives par métrique (`#3B82F6/#10B981/#8B5CF6/
#06B6D4/#EF4444/#F59E0B/#F97316/#EC4899`) + chiffre en `DM Mono` (la « pire saturation »).
Zones, gradients de titres, jauges niveau : nombreux hex. ~ centaines dans page.tsx.

## Phase 1/2 — Réalisé (slice 1 : Profil Global neutralisé)
Extrait `src/app/performance/components/profil/ProfilGlobalGrid.tsx` (< 200 l.,
**enforced**, présentationnel) :
- **8 métriques en grille nue** (plus de cartes bordées), **chiffres NEUTRES** en Inter
  tabulaire (`CountUp` animé), labels micro majuscules, unité/`sub` neutres.
- **Mobile : 2 colonnes, les 8 métriques** (rien tronqué) ; desktop : 4 colonnes.
- Sélection d'une métrique conservée (fond `--bg-card2` discret) → alimente la bulle
  d'analyse IA existante.
Dans `ProfilTab`, la grille d'affichage (8 `PremiumStatCard` colorés + DM Mono) est
remplacée par `<ProfilGlobalGrid …/>`. Le formulaire d'édition global et le reste de
`ProfilTab` sont inchangés. Build vert, enforce 0 couleur (17 fichiers).

## Décision — arrêt documenté pour le reste
`ProfilTab` fait ~1 250 lignes très imbriquées (état benchmarks, zones, jauges,
sauvegardes). Restyler intégralement + extraire en < 200 l. = refactor lourd à risque.
On s'arrête après la slice 1 (la plus visible) et on documente.

### Plan incrémental proposé
1. ✅ Profil Global (grille neutre).
2. ⏳ En-tête Profil Global : Analyser/Modifier en liens discrets, barre de titre
   dégradée → neutre (inline ProfilTab).
3. ⏳ Profil Spécifique : onglets sport (point couleur) + **sélecteur de type de zone**
   (FC/Allure/Puissance selon sport, un seul jeu visible) + **barres de zones animées**
   (couleur de zone fonctionnelle) + 3 sous-métriques neutres + radar neutre+`--primary`.
3b. ⏳ **Édition des benchmarks en bottom sheet** (createPortal sur document.body),
   champs soignés par sport, préremplis (DS §3.1) — sort le gros formulaire de l'inline.
4. ⏳ Niveau estimé : jauges rondes multicolores → **barres de niveau** (Débutant→Élite,
   piste neutre, repère `--primary` animé, qualificatif en tag).

## Contraintes respectées
TS strict (aucun any), zéro mock (données branchées), tokens uniquement dans le fichier
extrait, ≤200 l., `npm run build` vert, aucun emoji, commit local, pas de push.
`strava.ts` intact, aucune migration.
