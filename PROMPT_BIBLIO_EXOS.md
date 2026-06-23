# Bibliothèque — Section EXERCICES (Muscu / Renfo)

## 0. Règle d'or — design (à lire en premier, non négociable)

Tu NE crées AUCUN nouveau style visuel. Le design de l'application est figé et tu le connais déjà.
- Réutilise STRICTEMENT le design system existant : tokens CSS, couleurs, typographies, espacements, rayons. **Aucun hex en dur**, jamais.
- Réutilise les composants existants (onglets, bottom sheets, cartes, chips, barres de recherche, range slider, boutons, bottom tab bar) et leurs conventions. S'ils n'existent pas, crée-les dans le style des composants déjà présents (ex. patterns de `SessionEditor`, `Recovery`, `Calendar`).
- Icônes : **Tabler uniquement**. Aucun emoji dans l'UI. Tout graphisme custom en **SVG brut**.
- Mobile-first. La bottom tab bar se masque quand un éditeur/sheet plein écran est ouvert, comme ailleurs dans l'app.
- Ce document décrit **la structure, les données, la logique et le contenu**. Il ne décrit PAS l'apparence : c'est toi qui appliques l'identité existante. La maquette HTML qu'a vue le founder est une **référence UX/structure seulement**, jamais une spec visuelle — n'en copie ni les couleurs ni le CSS.

## 1. Contexte & périmètre

On remplit la Bibliothèque de la page Session (aujourd'hui « Bibliothèque en préparation »).
La Bibliothèque sépare strictement **Exercices** (mouvement unique) et **Séances** (entraînement structuré).

**Périmètre de CE prompt :**
- Construire la coquille de navigation de la Bibliothèque (entrée par sport).
- Implémenter **entièrement** la section **Exercices de Muscu / Renfo** (filtre + liste + fiche), seedée avec le contenu fourni en §8.
- Tout le reste (Séances de tous les sports, Exercices Hyrox) = **hors périmètre** → états « en préparation » propres (voir §7). Ne les implémente pas, mais prévois la structure pour les accueillir.

## 2. Architecture de navigation (hiérarchie + règle par sport)

Drill-down, transitions cohérentes avec l'app :

```
Bibliothèque
└─ Écran SPORTS : 7 tuiles (Muscu, Running, Vélo, Natation, Hyrox, Aviron, Triathlon)
   ├─ tap Muscu  → onglets [Exercices | Séances] → Exercices = écran GROUPES
   ├─ tap Hyrox  → onglets [Exercices | Séances] → Exercices = état « en préparation »
   └─ tap autres → directement Séances (état « en préparation »), AUCUN onglet
```

**Règle dure :** seuls **Muscu** et **Hyrox** possèdent des Exercices, donc seuls eux affichent les onglets `Exercices | Séances`. Les 5 autres sports n'ont que des séances → pas d'onglets, accès direct.

```ts
const SPORTS_AVEC_EXERCICES = ['muscu', 'hyrox'] as const;
```

Dans CE prompt : l'onglet **Séances** est toujours un placeholder « en préparation » (construit plus tard). Seul **Exercices de Muscu** a du contenu réel.

Écran GROUPES (Muscu, onglet Exercices) : 5 groupes en accès, **sans liste d'exercices affichée en dessous**. Une barre de recherche + une entrée « Filtrer ». Taper un groupe → écran LISTE filtré sur ce groupe. Bouton retour partout.

## 3. Modèle de données (TypeScript strict)

Vocabulaires **fermés** (unions), pas de tags libres.

```ts
export type Groupe = 'push' | 'pull' | 'legs' | 'haltero' | 'core';

export type Mode = 'strength' | 'explosivite' | 'strength-endurance';

export type Equipement =
  | 'barre' | 'halteres' | 'kettlebell' | 'poids-de-corps' | 'elastique';

export type FlagExo = 'unilateral' | 'a-encadrer' | 'combo';

// Muscles = vocabulaire fermé (filet de découverte transversal)
export type Muscle =
  // bas
  | 'quadriceps' | 'ischios' | 'fessiers' | 'adducteurs' | 'mollets' | 'tibial-anterieur'
  // push
  | 'pectoraux' | 'deltoide-anterieur' | 'deltoide-lateral' | 'triceps'
  // pull
  | 'grand-dorsal' | 'trapeze-inf-moy' | 'rhomboides' | 'deltoide-posterieur' | 'biceps' | 'grip'
  // tronc
  | 'erecteurs' | 'transverse' | 'obliques';

export interface ExerciceMode {
  mode: Mode;
  primaire: boolean; // exactement 1 primaire par exercice
}

export interface FicheExercice {
  utilite: string;        // pourquoi/à qui le programmer
  execution: string[];    // 3-5 points clés
  erreurs: string[];      // erreurs fréquentes
}

export interface Exercice {
  id: string;                 // slug stable
  nom: string;
  sport: 'muscu';             // extensible plus tard (hyrox…)
  groupe: Groupe;             // DOMICILE UNIQUE
  muscles: Muscle[];          // multi — filet transversal
  modes: ExerciceMode[];      // multi, 1 primaire
  equipement: Equipement[];
  flags: FlagExo[];
  difficulteTechnique: number; // 1..10
  fiche?: FicheExercice;       // absente = « brique sèche » (cf §5)
}
```

Prescriptions par mode = constante globale (couche que le coach IA lira) :

```ts
export const PRESCRIPTIONS: Record<Mode, { charge: string; tempo: string; volume: string }> = {
  'strength':            { charge: '≥85% 1RM', tempo: 'contrôlé',                volume: '3–5 reps' },
  'explosivite':         { charge: '30–50%',    tempo: 'descente lente / explosion', volume: '3–5 reps' },
  'strength-endurance':  { charge: '50–60%',    tempo: 'continu',                volume: '12–20 reps' },
};
```

Labels d'affichage (FR) pour chaque valeur de vocabulaire : à mapper via un dictionnaire `LABELS` (slug → libellé affiché), pour que l'UI montre « Tibial antérieur », « Strength-endurance », « Poids de corps », etc. Ne jamais afficher les slugs bruts.

**Calculé, jamais stocké :** haut/bas du corps se déduit du groupe (`push|pull|core` ≈ haut, `legs` ≈ bas). Ne pas le stocker en champ.

## 4. Stockage

Pas de table Supabase, **pas de migration** pour ce lot. Les exercices vivent dans un **module seed typé** côté repo (contenu réel, pas du mock).
- Découpe le seed **par groupe** pour respecter la limite de 200 lignes/fichier : `src/data/exercices/legs.ts`, `push.ts`, `pull.ts`, `haltero.ts`, `core.ts`, agrégés par `src/data/exercices/index.ts`.
- Types dans `src/data/exercices/types.ts`. Dictionnaires (`LABELS`, `PRESCRIPTIONS`, `MUSCLES_PAR_REGION`) dans un fichier dédié.
- (Migration vers une table Supabase éditable = chantier post-launch, hors périmètre.)

## 5. Les deux couches + flag « à encadrer »

- **Brique sèche** (`fiche` absente) : exercice classique connu de tous (back squat, développé couché, tractions, pendlay row). Affiché dans la liste, sélectionnable, MAIS sa page détail n'a **pas** d'utilité/exécution/erreurs — juste un encart expliquant qu'il existe comme brique pour la construction de séances. Ne génère aucun blabla pour ces exercices.
- **Fiche complète** (`fiche` présente) : exercice non-évident à haut rendement → utilité + exécution + erreurs.
- **Flag `a-encadrer`** : exercice à risque/prérequis (Nordic curl, ATG split squat, hang power clean). Sémantique pour le futur coach IA (ne pas prescrire en autonomie à un débutant → proposer une régression). Dans CE lot : afficher un badge « À encadrer » sur la carte et la fiche. Pas de logique IA à coder maintenant.
- **Modes & prescription** : la fiche détail affiche les modes de l'exercice, le **primaire** mis en avant, chacun avec charge/tempo/volume issus de `PRESCRIPTIONS`. C'est la couche destinée au coach IA.

## 6. Filtre à facettes (logique ET / OU)

Deux portes : (a) browse par groupe (tuile → liste du groupe) ; (b) **Filtrer** = facettes transversales à travers les groupes.

Facettes (toutes multi-select sauf le range) :
- **Qualité / mode** : strength · explosivite · strength-endurance
- **Muscle** : groupé par région (Bas / Push / Pull / Tronc)
- **Équipement**
- **Difficulté technique** : range max (1..10 ; 10 = toutes)
- **Filtres** : `unilateral` · `a-encadrer` · `avec-fiche`

Règle : **ET entre facettes, OU à l'intérieur d'une facette.**
- Ex. « (Push OU Pull) ET explosivite » = haut du corps explosif.
- Ex. « muscle=quadriceps ET mode=explosivite » → doit faire ressortir le **Thruster** même s'il est rangé en `haltero` : c'est le filet muscle qui rattrape les combos. Vérifie ce cas.

Le filtre est **par sport** (ici, vocabulaire Muscu). Les autres sports auront d'autres facettes plus tard — structure le filtre pour être paramétrable par sport, pas codé en dur global.

Comportements : compteur de filtres actifs sur l'entrée « Filtrer » ; bouton d'application « Voir N exercices » qui se met à jour en direct ; « effacer filtres » dans la liste ; recherche texte sur le nom combinable avec les facettes.

## 7. États vides / placeholders

- Onglet **Séances** (tous sports) : composant « en préparation » réutilisable, propre, dans le style de l'app. Hors périmètre fonctionnel.
- **Exercices Hyrox** : onglet présent, contenu « en préparation ».
- **Sports sans exercices** (Running, Vélo, Natation, Aviron, Triathlon) : tap → directement Séances « en préparation », pas d'onglets.
- **Liste filtrée vide** : message d'invitation à élargir les filtres (voix de l'interface, pas d'excuse).
- Les tuiles sport doivent prévoir un **slot image de fond** (rempli plus tard ; pour l'instant, traitement neutre cohérent avec l'app — surtout pas de hex en dur). Sports non encore remplis = état « à venir » visuellement atténué.

## 8. Données seed — Muscu / Renfo (contenu réel, à intégrer tel quel)

Découpe ces exercices dans les fichiers par groupe (§4). `primaire: true` sur un seul mode par exercice. Briques sèches = sans `fiche`.

(Contenu seed complet repris à l'identique dans `src/data/exercices/*.ts`.)

## 9. Contraintes & garde-fous (rappel — à respecter à chaque commit)

- **Aucun design imposé** : design system existant uniquement (cf §0). Pas de hex en dur.
- Max **200 lignes par fichier** → découpe (data par groupe, composants séparés, hook de filtre isolé).
- **ZÉRO mock** : le contenu §8 est réel ; n'invente pas d'autres exercices, ne complète pas les briques avec du blabla.
- **Chaque entité a sa page/vue détail** (la fiche ou l'encart brique).
- **Pas de changement de schéma** Supabase (module seed, donc aucune migration).
- Ne touche **jamais** `src/lib/sync/strava.ts`.
- **`npm run build` doit passer** avant chaque commit. TypeScript strict respecté.
- Icônes **Tabler**, **aucun emoji** en UI, SVG brut pour tout graphisme.
- **Commits locaux uniquement.** Ne push pas sur main, ne déclenche aucun déploiement Vercel sans décision explicite du founder.

## 10. Definition of Done

1. Écran Sports (7 tuiles, slot image prévu, états « à venir » pour les non remplis).
2. Routage par sport correct : onglets `Exercices | Séances` pour Muscu et Hyrox uniquement ; accès direct Séances (placeholder) pour les 5 autres.
3. Muscu › Exercices : écran Groupes (5 bulles, sans liste dessous) + recherche + Filtrer.
4. Liste filtrable : browse par groupe ET filtre à facettes transversal, logique ET/OU correcte. Cas de contrôle validé : `quadriceps + explosivite` fait apparaître le Thruster (rangé en `haltero`).
5. Fiche détail : modes + prescription (primaire mis en avant), utilité/exécution/erreurs pour les fiches ; encart « brique sèche » pour les classiques ; badge « À encadrer » présent.
6. Tous les placeholders « en préparation » propres.
7. Push sur Vercel
