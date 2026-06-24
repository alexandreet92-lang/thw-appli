# Bibliothèque — SÉANCES : Aviron + Natation + Trail (catalogue expliqué)

Section Séances de **trois sports** (chacun = séances seulement, accès direct aux bulles). **Trail = nouveau 8ᵉ sport** dans la grille. Chaque séance est encodée en blocs (profil d'intensité) **et** porte une explication réelle (objectif physiologique, quand l'utiliser, conseil) → champs `objectif`, `pourQui`, `conseil`.

## 0. Règle d'or — design
Design system existant : tokens, composants, Tabler icons. **Aucun hex en dur, aucun emoji, SVG brut.** Profil d'intensité = langage visuel zones existant, lecture seule.

## 1. Modèle de données (partagé — `src/data/seances/common.ts`)
```ts
export type Zone = 'Z1'|'Z2'|'Z3'|'Z4'|'Z5'|'Z6'|'Z7'
export type PhaseBloc = 'echauffement'|'corps'|'recup'|'retour-calme'
export type Intensite = 'faible'|'modere'|'eleve'|'maximum'
export interface Bloc { phase: PhaseBloc; zone: Zone; label: string; intensiteRef?: string; cadenceSpm?: string; nage?: string; gradient?: string; dureeSec?: number; distanceM?: number; reps?: number; recup?: { zone: Zone; dureeSec?: number; distanceM?: number; actif: boolean; label?: string } }
export interface Seance { id: string; nom: string; sport: 'aviron'|'natation'|'trail'; bucket: string; objectif: string; dureeMinMin: number; dureeMaxMin: number; intensite: Intensite; rpe: number; pourQui: string; phase: string; support: string[]; tags: string[]; blocs: Bloc[]; conseil?: string }
```
Découpe : `src/data/seances/{aviron|natation|trail}/` un fichier par bucket. < 200 lignes.

## 2. Profil d'intensité (lecture seule)
Hauteur = zone, largeur = durée du bloc. Bloc distance → durée estimée via ancrage du sport (split aviron, /100 natation) ; bloc temps → durée directe. **Mini** (carte) + **complet** (détail). Bandeau : Durée · Intensité (zone dominante) · RPE. SM/SN si moteur le sait, sinon omis.

## 3. UI & filtre
Carte : nom · mini-profil · chips · durée · RPE. Détail : profil + résumé · objectif · structure en blocs · pourQui/quand · tags · conseil. Filtre : bucket = bulle ; facettes (zone/support/phase/durée/intensité) ; ET entre facettes, OU dedans.

## A. AVIRON — 7 bulles (la bande EST l'intention)
`UT2 · UT1 · Seuil · VO2max · Sprints · Race pace · Technique`. Ancrage = puissance 2k. Support erg/bateau, cadence en spm. UT2→Z2 · UT1→Z3 · Seuil/AT→Z4 · VO2/TR→Z5 · Sprints/AN→Z6 · 2k→Z5-Z6 · technique→Z1.

## B. NATATION — 5 bulles filière
`Technique · Aérobie · Seuil/CSS · VO2/Sprints · Spécifique course`. Ancrage = CSS. **70.3/Ironman = tags distance, pas des bulles.** Support piscine/eau libre, tag nage. Technique→Z1 · Aérobie EN1→Z2 · Seuil/CSS→Z4 · VO2/Sprints→Z5-Z6 · spécifique→Z4-Z5.

## C. TRAIL — 8ᵉ sport, 7 bulles qualité
`Endurance/Sortie longue · Côtes-Montée · Power hiking · Descente · Seuil/Tempo · VO2-Intervalles · Spécifique/Simulation`. **Ancrage = effort/FC/RPE** (le terrain fausse l'allure) → blocs majoritairement en TEMPS. Support sentier/tapis/stairmaster. **`tapis` ajouté au support de toutes les séances montée/côtes/seuil/vo2/power-hiking ; PAS la descente (sentier uniquement).** Endurance→Z2 · power hiking→Z3 · descente→Z3-Z4 · seuil→Z4 · côtes/VO2→Z5. Hill sprints/repeats = contenu Trail (pas Running). Strides/drills/sprints sur PLAT restent dans Running.

## Catalogues
Encodés à l'identique dans `src/data/seances/{aviron,natation,trail}/*.ts`. **Aviron 17** (ut2 2·ut1 2·seuil 3·vo2 3·sprints 3·race 2·technique 2) · **Natation 14** (technique 2·aérobie 2·seuil 4·vo2 3·spécifique 3) · **Trail 18** (endurance 2·côtes 5·power-hiking 3·descente 2·seuil 2·vo2 2·spécifique 2). Total 49. Chaque séance : blocs + **objectif + conseil rédigés**.

## Contraintes & DoD
- Design existant ; profil réutilisé ; aucun hex ; Tabler ; SVG brut. Max 200 lignes/fichier.
- ZÉRO mock ; objectif+conseil rédigés sur chaque séance ; durée obligatoire ; pas de SM/SN fabriqué.
- Trail = nouvelle tuile (grille 7→8). Chaque séance a sa vue détail + profil.
- Pas de migration Supabase. Ne touche jamais `src/lib/sync/strava.ts`.
- `npm run build` vert. TypeScript strict.

**DoD :** Aviron 7 bulles/17 séances · Natation 5 bulles/14 séances (70.3+Ironman en tags) · Trail 8ᵉ sport 7 bulles/18 séances (profil effort/RPE, `tapis` sur montée/côtes/seuil/vo2/power-hiking, pas descente). Profil mini+complet ; bandeau résumé ; filtres par sport.
