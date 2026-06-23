# Bibliothèque — SÉANCES Running (5k · 10k · Semi · Marathon · Neuromusculaire)

Section Séances du sport Running, avec un **profil d'intensité par séance**. Running n'a **que des séances** → accès direct, pas d'onglets.

## 0. Règle d'or — design (non négociable)

Aucun nouveau style. Design system existant : tokens, composants, patterns, Tabler icons. **Aucun hex en dur, aucun emoji, SVG brut pour tout graphe.** Profil d'intensité = même langage visuel que le SessionEditor (barres par zone Z1-Z7), affiché **en lecture seule**. La Bibliothèque ne fait qu'afficher.

## 1. Navigation

Running → écran à **5 bulles** (axe primaire = distance, filière = tag) :
`5 km · 10 km · Semi · Marathon · Neuromusculaire`. Tap bulle → liste → tap séance → détail (profil + gabarit). Recherche + Filtrer présents. Pas d'onglets.

## 2. Modèle de données

```ts
export type RunBucket = '5k' | '10k' | 'semi' | 'marathon' | 'neuro'
export type Filiere = 'aerobie' | 'seuil' | 'vma' | 'specifique' | 'neuromusculaire' | 'mixte' | 'test'
export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6' | 'Z7'
export type PhaseBloc = 'echauffement' | 'corps' | 'recup' | 'retour-calme'
export type Intensite = 'faible' | 'modere' | 'eleve' | 'maximum'
export interface Bloc {
  phase: PhaseBloc; zone: Zone; label: string; allure?: string
  distanceM?: number; dureeSec?: number; reps?: number
  recup?: { zone: Zone; dureeSec?: number; distanceM?: number; actif: boolean; label?: string }
}
export interface Seance {
  id: string; nom: string; sport: 'running'; bucket: RunBucket; filiere: Filiere
  distanceCible?: RunBucket[]; objectif: string; dureeEstimeeMin: number
  intensite: Intensite; rpe: number; pourQui: string; phase: string
  tags: string[]; blocs: Bloc[]; conseil?: string
}
```

Découpe : `src/data/seances/running/` un fichier par bucket, agrégés par index. < 200 lignes/fichier.

## 3. Zones / allures / couleurs (table de conversion)

| Allure | Zone |
|---|---|
| récup / trot / float lent · EF | Z1 / Z2 |
| `@42` · `@SL1` · steady | Z3 |
| `@seuil` · `@21` | Z4 |
| `@10k` | Z4→Z5 |
| `@5k` | Z5 |
| `@3000` · `@VMA` | Z5 |
| `@1500` · sprints · strides `@95-max` | Z6 / Z7 |

Couleurs = tokens de zone existants (`--zone-1..7`). Z6/Z7 ajoutés aux tokens sanctionnés (violet / bleu).

## 4. Profil d'intensité (lecture seule)

- Même langage visuel que le SessionEditor (SVG brut, barres par zone). Lecture seule, pas de drag.
- Calcul depuis `blocs` : hauteur = zone, largeur = durée. Durée d'un bloc distance = `distanceM ÷ allure de référence de la zone` (constante schématique). Récup actives = barres basses (Z1/Z2) entre les blocs durs. `reps` déplie le bloc.
- **Mini** (carte, barres seules) + **Complète** (détail, labels Z1-Z7).
- Bandeau résumé du détail : **Durée estimée · Intensité (zone dominante) · RPE**. SM/SN : seulement si le moteur sait estimer depuis les blocs ; sinon omis (pas de mock).

## 5. UI séance

- **Carte** : nom · mini-profil · chips (filière, distance cible, phase) · durée · RPE.
- **Détail** : profil complet + bandeau résumé · objectif · structure en blocs · pour qui/quand · tags · conseil. (CTA « charger dans l'éditeur » = réutilisation du mécanisme existant, à brancher quand l'adaptateur Seance→template sera prêt.)
- Chaque séance = une vue détail.

## 6. Filtre

Bucket = bulle (browse). Facettes : Filière · Distance cible · Durée · Intensité/RPE · Phase. ET entre facettes, OU dans une facette. Filière regroupable toutes distances (ex. « toutes mes VMA »).

## 7-8. Encodage / catalogue

Modèle de bloc (échauffement Z2 ≈15-25', corps blocs zone/allure/distance|durée/reps/récup, retour calme Z2 ≈10') et catalogue complet **encodés à l'identique** dans les fichiers seed :
`src/data/seances/running/{5k,10k,semi,marathon,neuro}.ts` — **5k:10 · 10k:14 · semi:15 · marathon:13 · neuro:16 = 68 séances**. Reps en fourchette → borne médiane.

## 9. Contraintes & DoD

- Design system existant ; profil = langage visuel zones existant ; aucun hex en dur ; aucun emoji ; Tabler ; SVG brut.
- Max 200 lignes/fichier → un fichier par bucket.
- ZÉRO mock : contenu §8 réel ; pas de SM/SN fabriqué.
- Chaque séance a sa vue détail avec profil. Filière regroupable toutes distances.
- Pas de migration Supabase. Ne touche jamais `src/lib/sync/strava.ts`.
- `npm run build` vert. TypeScript strict.

**DoD :** 5 bulles Running ; 68 séances seedées en blocs ; profil mini (carte) + complet (détail) ; bandeau résumé ; filtre filière/distance/durée/phase.
