# Bibliothèque — Catalogue complet : Push · Pull · Haltéro-Mixte · Core

Re-seed des exercices de **4 groupes** au modèle familles/variantes (mode C), avec suppression du contenu existant de ces groupes. **Le groupe Legs n'est PAS concerné : ne le touche pas, conserve-le tel quel.**

## 0. Règle d'or — design (non négociable)

Aucun nouveau style. Design system existant uniquement : tokens, composants, patterns, Tabler icons. **Aucun hex en dur, aucun emoji, SVG brut.** Ce document décrit structure/données/logique/contenu, jamais l'apparence. La maquette HTML est une référence UX, pas visuelle.

## 1. Suppression de l'existant

Supprime tout le contenu d'exercices déjà seedé pour **Push, Pull, Haltéro-Mixte et Core** (modèle plat du premier lot), afin d'éviter tout doublon. **Ne supprime pas Legs.** Après suppression, ces 4 groupes ne contiennent que les catalogues familles/variantes.

## 2. Modèle de données (familles + variantes, mode C)

Conserve les unions existantes (`Groupe`, `Mode`, `Equipement`, `FlagExo`, `Muscle`, `ExerciceMode`, `FicheExercice`, `PRESCRIPTIONS`, `LABELS`). Modèle :

```ts
export interface Variante {
  id: string; nom: string; difficulteTechnique: number;
  muscles?: Muscle[]; modes?: ExerciceMode[]; equipement?: Equipement[]; flags?: FlagExo[];
  note?: string; deriveRecommande?: string;
}
export interface FamilleExercice {
  id: string; nom: string; sport: 'muscu'; groupe: Groupe;
  muscles: Muscle[]; modes: ExerciceMode[]; equipement: Equipement[]; flags: FlagExo[];
  difficulteTechnique: number;
  fiche?: FicheExercice;        // sur le mouvement-clé ; absente = brique
  accessoire?: boolean;         // transfert faible, à doser
  deriveRecommande?: string;    // id d'un dérivé plus sûr proposé par défaut
  variantes: Variante[];
}
```

**Héritage** : une variante sans `muscles`/`modes`/`equipement`/`flags` hérite de la famille. Ne duplique que ce qui change le stimulus.

**Découpe** : un fichier par groupe sous `src/data/exercices/` (`push.ts`, `pull.ts`, `haltero.ts`, `core.ts`), agrégés par `index.ts`. Si un fichier dépasse 200 lignes, scinde encore.

## 3. Règles transverses

- **Flag `a-encadrer` = AVERTISSEMENT, pas un blocage.** Message standard : « Mouvement technique. Maîtrise d'abord le geste à charge très légère (barre à vide) avant toute montée en charge. »
- **`deriveRecommande`** : pour un mouvement complet risqué, la fiche affiche « Dérivé plus sûr conseillé : [nom] ». Proposition, jamais imposition.
- **`accessoire: true`** : isolation à transfert faible. Filtre : option « Masquer les accessoires ». Affichés mais secondaires.
- **Tempo/charge = mode**, pas variante. **Pas de machine** (Smith, poulie, pec deck, press guidé).

## 4-7. Catalogues (contenu réel)

Catalogues implémentés **à l'identique** dans le code seed :
- PUSH (12 familles) → `src/data/exercices/push.ts`
- PULL (8 familles) → `src/data/exercices/pull.ts`
- HALTÉRO-MIXTE (6 familles) → `src/data/exercices/haltero.ts`
- CORE / GAINAGE (7 familles) → `src/data/exercices/core.ts`

Total : **33 familles**. Legs (flat, lot 1) conservé tel quel dans `legs.ts` et adapté en famille (0 variante) à l'agrégation.

## 8. UI / comportement

- Cartes = familles (nom, chip groupe, chips modes [primaire mis en avant] + muscles du mouvement-clé, difficulté, flags, indicateur « N variantes »).
- Détail famille : fiche **ou** encart brique ; bloc Modes & prescription ; section Variantes (chips + `note` + avertissement `a-encadrer` + lien `deriveRecommande`). Pas de page séparée par variante.
- Filtre à facettes : une famille matche si **mouvement-clé OU une variante** satisfait les facettes ; ET entre facettes, OU dans une facette ; option « Masquer les accessoires ».
- Cas de contrôle : `mode=explosivite` → Push press, Med ball, Pompes claquées, dérivés olympiques, complexes. `équipement=poids-de-corps` → Pompes, Dips, tractions, inverted row, planches.

## 9. Contraintes & DoD

- Design system existant uniquement ; aucun hex en dur ; aucun emoji ; Tabler ; SVG brut.
- Max 200 lignes/fichier → découpe par groupe (et au-delà si nécessaire).
- ZÉRO mock : contenu §4-7 réel ; ne complète pas les briques ; n'invente rien hors liste.
- `a-encadrer` = avertissement (pas blocage). `deriveRecommande` = proposition (pas imposition).
- Pas de changement de schéma Supabase (module seed → aucune migration).
- Ne touche jamais `src/lib/sync/strava.ts`. **Ne touche pas le groupe Legs.**
- `npm run build` vert. TypeScript strict. Commits locaux uniquement.

**DoD :** existant Push/Pull/Haltéro/Core supprimé ; 4 catalogues seedés (33 familles) ; Legs intact ; `a-encadrer`=avertissement ; détail famille complet ; filtre family-or-variant + masquer accessoires + cas de contrôle validés ; build vert ; commit local.
