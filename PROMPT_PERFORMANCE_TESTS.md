# Refonte visuelle — page Performance, onglet Tests

## Cadre
Langage de design (DESIGN_SYSTEM.md, « pages denses ») appliqué à l'onglet Tests :
sous-onglets sport + Historique, liste de tests, détail d'un test. Patron unique de
carte et de détail. Profil / Datas non touchés. **Clause stop&document** : la refonte
du détail (feuille) + historique est documentée comme suite.

## Phase 0 — Inspection LECTURE SEULE (constats)

### Structure (dans `src/app/performance/page.tsx`)
- `TestsTab` (2257) : onglets sport (`TEST_SPORT_TABS`, 859 — running/cycling/swim/
  rowing/hyrox) + bouton **Historique** ; libellé de section ; grille de cartes.
- `TestCard` (2091, extrait ce passage) ; `TestProtocolPanel` (1611, ~480 l. = détail,
  **modale plein écran** aujourd'hui) ; `HistoriqueTestsPanel` (2146).
- Types : `TestDef` (838 : id/name/desc/duration/difficulty `Modéré|Intense|Maximal`),
  `TestProtocol` (objectif, avertissement, conditions[], echauffement[], etapes[],
  interpretation[], erreurs?, frequence?…), `FieldDef` (saisie de résultat),
  `GlobalTestResult` (2138 : id/date/valeurs/documents?/nom/sport).
- `DIFFICULTY_COLOR` (855) : Modéré `#22c55e`, Intense `#f59e0b`, Maximal `#ef4444`.

### Données
- **Catalogue de tests** (`TESTS`, protocoles, niveaux de référence) : **données
  statiques en code** (pas Supabase) — c'est du contenu éditorial, pas du mock runtime.
- **Résultats / Historique** : `HistoriqueTestsPanel` charge les **résultats réels**
  depuis Supabase (`GlobalTestResult` : date, valeurs, documents, sport). Branché.
- Détail d'un test : objectif / attention / conditions / échauffement / protocole
  (étapes) / interprétation / erreurs / fréquence + **saisie de résultat** (`FieldDef`)
  + **niveaux de référence** avec **toggle M/F**.

### Couleurs en dur / monospace
`DIFFICULTY_COLOR`, `TEST_SPORT_TABS` (couleurs sport), blocs teintés du détail
(objectif/attention/…), `Syne`/`DM Mono`. Nombreux hex dans TestsTab/TestProtocolPanel.

## Phase 1 — Réalisé (carte de test, patron unique)
Extrait `src/app/performance/components/tests/TestCard.tsx` (< 200 l., **enforced**) :
- carte propre sur **`--bg-card2`**, **aucune bordure colorée**, **ombre douce au survol**
  (`.card-interactive`) ;
- nom en `var(--font-display)` ; **tag d'intensité** = point + label (fonctionnel,
  support minimal : Modéré/Intense/Maximal → `--charge-low/mid/hard`) ;
- description (clamp 2), durée en chiffres neutres tabulaires, lien « Voir le protocole »
  en `var(--primary)`.
Dans `TestsTab`, l'ancienne `TestCard` (fond `--bg-card` + bordure colorée au survol +
tag en pastille pleine + DM Mono + accent sport) est remplacée par `<TestCard/>`
(prop `accentColor` retirée). Build vert, enforce 0 couleur (18 fichiers).

## Décision — plan incrémental proposé (suite)
2. ⏳ **Détail d'un test → feuille coulissante** (createPortal sur document.body, plus
   de modale plein écran) ; sections propres **séparées par l'espace** (fini les blocs
   teintés) ; point de couleur seulement sémantique (Attention ambre, Erreurs rouge) ;
   étapes = liste numérotée (numéro en `--primary`) ; **« Saisir mes résultats »** =
   champs soignés + bouton primary ; **niveaux de référence** = tableau propre + point
   par palier (Alien→Débutant) ; **toggle M/F** conservé. Patron unique pour tous les
   tests/sports.
3. ⏳ Onglets sport en pilules + libellé « {Sport} · N tests » neutralisés (TestsTab).
4. ⏳ **Historique** restylé : lignes propres (date/type/résultat/niveau), chiffres
   neutres, couleur de niveau/intensité en point ; un test rouvre son détail en feuille.

## Contraintes respectées
TS strict (aucun any), zéro mock runtime (catalogue = contenu statique ; résultats =
Supabase), tokens uniquement dans le fichier extrait, ≤200 l., `npm run build` vert,
aucun emoji, commit local, pas de push. `strava.ts` intact, aucune migration.
