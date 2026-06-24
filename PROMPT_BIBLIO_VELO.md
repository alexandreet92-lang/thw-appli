# Bibliothèque — SÉANCES Vélo (8 bulles d'intention)

Section Séances du sport Vélo, avec un **profil d'intensité par séance** (même langage visuel que le SessionEditor vélo). Le vélo n'a **que des séances** → accès direct, pas d'onglets.

## 0. Règle d'or — design (non négociable)

Aucun nouveau style. Design system existant : tokens, composants, patterns, Tabler icons. **Aucun hex en dur, aucun emoji, SVG brut.** Profil d'intensité = langage visuel des zones existant (barres Z1-Z7), lecture seule.

## 1. Navigation

Vélo → **8 bulles** (axe = intention ; zone/cadence/terrain/support = tags) :
`Aérobie · SL1 · SL2 · PMA · Force · Vélocité · Sprints · Mixte`. Tap → liste → détail. Pas d'onglets. Recherche + Filtrer.

## 2. Buckets

```ts
export type VeloBucket = 'aerobie' | 'sl1' | 'sl2' | 'pma' | 'force' | 'velocite' | 'sprints' | 'mixte'
```
| Bucket | Intention | Bande %FTP (SL1/SL2 provisoires) |
|---|---|---|
| aerobie | endurance | Z1-Z2 56-78% |
| sl1 | tempo/sweet spot | Z3-SS ~84-94% |
| sl2 | seuil | Z4 ~94-105% |
| pma | PMA/VO2max | Z5(-Z6) 106-130% |
| force | basse cadence | tempo-seuil, cad 45-60 |
| velocite | haute cadence | Z2-Z3, cad 100-120 |
| sprints | neuromusculaire | Z7 >150% |
| mixte | sortie longue à efforts / spécificité (règle stricte) | variable |

**Règle Mixte** : uniquement sorties longues à efforts (pré-fatigue, simulation course) + fartlek libre. Intention dominante claire → sa bulle, pas Mixte.

## 3. Modèle de données

```ts
export type Zone = 'Z1'|'Z2'|'Z3'|'Z4'|'Z5'|'Z6'|'Z7'
export type Cadence = 'basse' | 'normale' | 'haute'   // 45-60 / 85-95 / 100-120
export type Terrain = 'plat' | 'cote'
export type Support = 'route' | 'home-trainer'
export type PhaseBloc = 'echauffement' | 'corps' | 'recup' | 'retour-calme'
export type Intensite = 'faible' | 'modere' | 'eleve' | 'maximum'
export interface Bloc { phase: PhaseBloc; zone: Zone; label: string; puissance?: string; cadence?: Cadence; dureeSec: number; reps?: number; recup?: { zone: Zone; dureeSec: number; actif: boolean } }
export interface Seance { id: string; nom: string; sport: 'velo'; bucket: VeloBucket; objectif: string; dureeMinMin: number; dureeMaxMin: number; intensite: Intensite; rpe: number; pourQui: string; phase: string; support: Support[]; terrain?: Terrain; cadenceTag?: Cadence; tags: string[]; blocs: Bloc[]; conseil?: string }
```
Découpe : `src/data/seances/velo/` un fichier par bucket. < 200 lignes.

## 4. Zones / %FTP / couleurs

<55 Z1 gris · 56-75 Z2 vert · 76-90 Z3 jaune-vert · 88-94 SS Z3 jaune · 91-105 Z4 orange · 106-120 Z5 rouge · 121-150 Z6 violet · >150 Z7 bleu. Couleurs = tokens `--zone-1..7`.

## 5. Profil d'intensité (lecture seule)

Langage visuel des zones existant. Calcul depuis `blocs` : hauteur = zone (%FTP), largeur = `dureeSec` (tout est en temps, pas d'estimation d'allure). Récup actives = barres basses (Z1). **Mini** (carte) + **complet** (détail, labels Z1-Z7). Bandeau résumé : **Durée (fourchette) · Intensité (zone dominante) · RPE**. SM/SN seulement si le moteur sait estimer ; sinon omis.

## 6-7. UI & filtre

Carte : nom · mini-profil · chips (bucket, support, terrain, cadence) · fourchette durée · RPE. Détail : profil complet + résumé · objectif · structure en blocs (%FTP, zone, cadence, récup) · pour qui/quand · tags · conseil. Filtre : Zone · Cadence · Terrain · Support · Durée · Intensité/RPE · Phase. ET entre facettes, OU dedans.

## 8-9. Encodage / catalogue

Modèle de bloc (échauffement Z2 ~15-25' sauf endurance pure ; récup Z1/Z2) et catalogue **encodés à l'identique** dans `src/data/seances/velo/{aerobie,sl1,sl2,pma,force,velocite,sprints,mixte}.ts` — **aérobie 3 · sl1 4 · sl2 4 · pma 5 · force 3 · vélocité 3 · sprints 4 · mixte 3 = 29 séances**.

## 10. Contraintes & DoD

- Design system existant ; profil = langage zones existant ; aucun hex en dur ; aucun emoji ; Tabler ; SVG brut.
- Max 200 lignes/fichier. ZÉRO mock ; pas de SM/SN fabriqué.
- Chaque séance a sa vue détail + profil. Fourchette de durée obligatoire.
- Pas de migration Supabase. Ne touche jamais `src/lib/sync/strava.ts`.
- `npm run build` vert. TypeScript strict.

**DoD :** 8 bulles Vélo ; 29 séances seedées en blocs ; profil mini (carte) + complet (détail) ; bandeau résumé ; filtre zone/cadence/terrain/support/durée/phase. **SL1/SL2 = bandes provisoires.**
