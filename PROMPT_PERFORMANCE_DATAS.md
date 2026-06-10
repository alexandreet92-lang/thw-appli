# Refonte visuelle — page Performance, onglet Datas (Records + Year Datas)

## Cadre
Langage de design (DESIGN_SYSTEM.md, « pages denses ») appliqué à l'onglet Datas.
« Zones » supprimé : Datas = **Records** + **Year Datas**. Profil / Tests non touchés.
**Clause stop&document appliquée** : `DatasTab.tsx` fait 5 821 lignes ; la refonte
complète Records/Year Datas est un chantier multi-slices.

## Phase 0 — Inspection LECTURE SEULE (constats)

### Structure (`src/app/performance/DatasTab.tsx`, 5 821 l.)
- `DatasTab` (export, 5789) : sous-onglets `zones | records | yeardata`.
- `ZonesSubTab` (1928, ~1 040 l.), `RecordsSubTab` (2971, ~1 040 l.),
  `YearDatasSubTab` (4010, ~1 780 l.).
- Composants Records : `TimeBarChart` (388), `HyroxTotalChart` (489),
  `HyroxSection` (695), `RecordRow` (1182), `RecordDrawer` (1241),
  `TriathlonDrawer` (1631), `PowerCurveLogSVG` (2710), `ZBars` (1080), helpers
  `calcBikeZones/calcRunZones/calcSwimZones/calcRowZones/calcHRZones` (154-211).

### Suppression de « Zones » — confirmée possible
`'zones'` n'est câblé que dans l'orchestrateur `DatasTab` (type/SUB_TABS/render) et la
définition `ZonesSubTab`. Les données de zones (`useTrainingZones` → table
`training_zones`) restent éditées dans **Profil Spécifique** : supprimer l'onglet Datas
« Zones » ne supprime aucune donnée (c'était un éditeur dupliqué).

### Records par sport (RecordsSubTab) — toutes données réelles (Supabase)
Sports : Vélo, Course, Natation, Aviron, Triathlon, Hyrox, Muscu. Présence (constat) :
radars de profil (Vélo/Hyrox), barres/lignes de records par année/distance,
`RecordDrawer`/`TriathlonDrawer` (édition inline ou drawer), bouton Ajouter/Modifier.
Barème par sport : partiel (ex. `HYROX_LEVEL_COLORS` Débutant→Élite, 565) — l'échelle
Alien→Débutant complète reste à confirmer composant par composant.

### Hyrox — formule du temps total (diagnostic demandé)
Le formulaire Hyrox (`HyroxSection`, 695) stocke un **temps final saisi à la main**
(`fFinal`) + champs séparés `roxzone` / `penalties` ; `totalRunSec` = somme des 8 runs
est calculée pour info. **Aucun recalcul automatique du total aujourd'hui** → pas de
double comptage actuel. La maquette demande un total **recalculé** (runs + stations +
pénalité + roxzone) : à l'implémentation, **ne pas ajouter le roxzone par-dessus** s'il
est déjà compris dans les splits de stations/run (sinon double comptage). À cadrer.

### Year Datas (YearDatasSubTab) — données réelles (agrégation activités)
- Mode **Auto / Manuel** (`ModeToggle`, 1897). Le mode **Manuel** ouvre une **saisie
  inline** par métrique (`METRIC_CONFIG`, 3945-3966 : km/heures/denivele/nb_sorties/
  tss/volume_tonnes selon sport). → à passer en feuille coulissante.
- 4 cartes : **Distance / Heures / D+ / Sorties** (`METRIC_CONFIG`). Volume par sport,
  comparaison par année, volume global. Filtres/toggles présents.

### Couleurs en dur / monospace
`DatasTab.tsx` : ~centaines de hex + `DM Mono`/`Syne` ; barre de sous-onglets, jauges,
graphes, drawers, cartes year — tous colorés/mono.

## Phase 1 — Réalisé (suppression Zones + barre tokenisée)
- `DatasTab` : sous-onglet **« Zones » retiré** (type `'records' | 'yeardata'`, défaut
  `records`, `SUB_TABS` à 2 entrées, branche de rendu supprimée). Barre de sous-onglets
  re-stylée avec la **classe partagée `.tab-btn`** (tokenisée, `--primary` actif) au lieu
  des couleurs en dur + Syne.
- `ZonesSubTab` laissé **non référencé** (dead code) : le supprimer (~1 040 l.) +
  ses helpers de zones partagés serait un diff à risque → garbage-collect ultérieur.
  Build vert (avertissement lint « unused » non bloquant).

Aucun nouveau fichier enforced ce passage (changement structurel). La refonte
Records/Year Datas (qui produira des composants extraits + enforced) est documentée.

## Décision — plan incrémental proposé (chaque slice = fichier enforced + commit)
1. ✅ Suppression « Zones » + barre tokenisée.
2. ⏳ Year Datas : 4 cartes neutres (extraites) + volume par sport calmé + barres de
   comparaison/global neutres + saisie Manuel → feuille coulissante.
3. ⏳ Records Course/Natation/Aviron : barres de records par année (toggle distance) +
   lignes ; Modifier → feuille (date + temps).
4. ⏳ Records Vélo : radar + jauges de puissance horizontales + power curve + scatters
   calmés ; Modifier → feuille.
5. ⏳ Records Triathlon : barres distance/année + 3 segments ; feuille (splits, total
   recalculé).
6. ⏳ Records Hyrox : radar + moyennes annuelles + barres par course + barre par station
   + run compromised ; feuille Ajouter (runs→total, stations, pénalité, roxzone, **total
   recalculé sans double comptage**).
7. ⏳ Records Muscu : bloc par exercice (jauge + valeur par type) ; feuille adaptée au
   type ; « + Exercice ».

## Contraintes respectées
TS strict (aucun any), zéro mock, aucune migration, `strava.ts` intact, ≤200 l. pour
les futurs fichiers extraits, `npm run build` vert, aucun emoji, commit local, pas de push.
