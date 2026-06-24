# Refonte design — Bibliothèque (Session page)

## Objectif
Refondre **le design uniquement** des deux écrans de la Bibliothèque : (1) grille des sports, (2) détail d'un sport (catégories + onglets Exercices/Séances). Aucune logique, aucune donnée, aucun comptage modifié.

## Étape 0 — Repérage (fait)
Convention repo : **styles inline + tokens CSS** (pas de Tailwind), serif = `var(--font-display)` (Fraunces), Tabler icons, `SlideView` pour le drill-down animé.
- Grille sports + shell détail (header/onglets) : `src/components/session/biblio/BibliothequeTab.tsx`.
- Liste de catégories (bulles) : `ExercicesMuscu.tsx` (groupes Muscu), `running/SeancesRunning.tsx`, `velo/SeancesVelo.tsx`, `endurance/SeancesEndurance.tsx` (buckets).
- Comptages (réels, à ne pas hardcoder) : `FAMILLES_MUSCU` (data/exercices) ; `SEANCES_RUNNING|VELO|AVIRON|NATATION|TRAIL` (data/seances/*).
- Sous-titres existants réutilisables : `VELO_BUCKET_SUB`, `AVIRON/NATATION/TRAIL_BUCKET_SUB`. À ajouter : sous-titres Muscu (groupes) + Running (buckets).
- Tokens couleur : `src/app/globals.css` (sanctionné, exempt du check couleurs) → on y ajoute les teintes Bibliothèque manquantes.

## A. Thème par sport — `sportTheme.ts` (source unique)
`src/components/session/biblio/sportTheme.ts` mappe chaque sport → { label, tagline, icône Tabler, `accent` (token), `soft` (token), `status: 'live'|'soon'` }. **Aucun hex dans les composants** : les teintes sont des tokens `--lib-<sport>` / `--lib-<sport>-soft` ajoutés dans `globals.css`.
Couleurs : Muscu orange · Running emerald · Trail teal · Vélo bleu · Natation cyan · Aviron violet · Hyrox rouge (soon) · Triathlon ambre (soon).

## B. Grille des sports (`SportGrid.tsx` + `SportCard.tsx`)
- Grille responsive `repeat(auto-fill, minmax(160px,1fr))` (2→4 colonnes), gouttières généreuses.
- Eyebrow « Bibliothèque » + titre serif + sous-texte conservés.
- Carte `live` : chip icône (fond `soft` + icône `accent`, ~48px), titre serif, tagline, lien « Explorer › » (chevron qui se décale au survol), élévation + bordure au survol.
- Carte `soon` : grisée, badge « Bientôt », **non cliquable / non focusable** (`aria-disabled`, `tabIndex=-1`).

## C. Détail d'un sport (`SportDetail.tsx`)
- Header : retour « ‹ Sports » + pastille couleur sport + titre serif.
- Onglets Exercices/Séances : soulignement actif **dans la couleur du sport** ; défaut Muscu→Exercices, autres→Séances.
- Liste de catégories dans un panneau centré `maxWidth ~760px`. Lignes = `CategoryRow`.
- États (recherche/filtre) inchangés (logique conservée).

## D. `CategoryRow.tsx`
Ligne : chip icône (couleur sport) · **nom** (serif) · **sous-titre** (si présent) · pastille de comptage à droite (fond `soft`) **issue des données** · chevron · hover/focus visibles · séparateurs fins. `subtitle` optionnel → rien si absent.

Sous-titres ajoutés (via dictionnaires/seed, pas en JSX) :
- Muscu : Push « Pectoraux, épaules, triceps » · Pull « Dos, biceps, trapèzes » · Legs « Quadriceps, ischios, fessiers, mollets » · Haltéro/Mixte « Arraché, épaulé-jeté, polyarticulaires » · Core « Sangle abdominale, lombaires, stabilité ».
- Running : 5 km « VO2max, vitesse spécifique, tolérance lactique » · 10 km « Seuil, VO2max long, endurance d'allure » · Semi « Seuil, allure spécifique, endurance » · Marathon « Allure spécifique, sortie longue » · Neuromusculaire « Sprints, côtes, strides, vitesse pure ».
- Vélo/Aviron/Natation/Trail : réutilisent leurs `*_BUCKET_SUB` existants.

## Contraintes & DoD
TS strict · Tabler · **aucun hex dans les composants** (tokens) · pas d'emoji · max 200 lignes/fichier · zéro mock (comptages réels) · pas de migration · ne pas toucher `strava.ts`.
- `tsc`/lint/build verts ; responsive ; focus clavier ; `prefers-reduced-motion`.
- Couleurs pilotées par `sportTheme.ts` + tokens ; cartes `soon` non interactives ; comptages inchangés.
