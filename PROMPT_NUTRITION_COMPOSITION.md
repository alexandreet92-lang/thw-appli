# Refonte — onglet « Composition » de Nutrition

## Cadre
Application du langage de design (docs/DESIGN_SYSTEM.md) à l'onglet « Composition »
(tab === 'body') de src/app/nutrition/page.tsx + le composant WeightChart. On ne
touche à aucun autre onglet ni aucune autre page. Fond de page var(--bg) ; seul gris
autorisé = var(--bg-card2).

## Phase 0 — Inspection LECTURE SEULE (constats réels)
- **Mesures de poids** : table `body_measurements` via `useNutrition.weightLogs`.
  **Saisie manuelle uniquement** (`saveWeightLog`, `source:'manual'`). Withings écrit
  dans `health_data` (PAS de pont). → **branché (manuel)** ; historique avec dates
  exploitable (`measured_at`).
- **Masse grasse (%) / masse musculaire (kg)** : colonnes `fat_mass_percent` /
  `muscle_mass_kg`. → **branché (manuel)**.
- **Taille (FFMI/IMC)** : `profile.height_cm`. → **branché si renseignée**, sinon
  `null` → FFMI et IMC **non calculables**. Les deux métriques sont **désactivées**
  (boutons `disabled`, atténués, tooltip « Renseigne ta taille dans le profil »).
- **Objectif de poids** : **localStorage** `thw_goal_weight` (PAS en base, PAS relié
  aux données du plan). Le lien « Relié à ton plan nutritionnel → » est **navigationnel**
  (bascule vers l'onglet Mon plan), pas un lien de données. → **placeholder localStorage**,
  documenté.
- **Statut « balance connectée »** : dérivé de `weightLogs.some(source==='connected_scale')`,
  jamais vrai aujourd'hui (rien ne remplit cette source). → bannière neutre + lien
  « Connecter une balance → » vers `/connections` (future page Connexion ; **aucune
  implémentation Bluetooth ici**).
- **Couleurs en dur / monospace** : `#06B6D4` (toggles, courbe, cellules), `#22c55e`
  (ligne objectif + pastille), `#94a3b8` (points bruts), `rgba(6,182,212,…)` (fonds
  actifs), fonts `Syne`/`DM Mono`. → remplacés par `var(--primary)`, `var(--text-mid)`,
  `var(--text-dim)`, tokens de police.

## Phase 1 — Refonte (réalisée)
Extrait dans `src/app/nutrition/components/composition/` (chaque fichier < 200 l.) :
- **compositionData.ts** : helpers purs (metricValue, points, smooth, windowStats,
  annualSummaries) — aucune couleur.
- **WeightGraph.tsx** : courbe lissée `--primary` sur points bruts `--text-mid` ;
  ligne d'objectif **neutre** pointillé `--text-dim` ; **période = zoom** (largeur de
  fenêtre visible), historique complet scrollable (scroll natif mobile + chevrons
  desktop sur `--bg-card2`, ouverture à droite, scroll via refs sans setState/frame) ;
  **3 états** (0 / 1 / ≥2 mesures) ; **points cliquables** → tooltip ancré via
  `createPortal(document.body)`, n'affiche que les champs réellement renseignés.
- **AnnualSheet.tsx** : feuille coulissante `createPortal(document.body)` + backdrop,
  max/min/amplitude/variation/nb mesures + mini-aperçu SVG, **calculés depuis les
  vraies mesures de l'année** ; fermeture bouton / backdrop / glissement bas ;
  animation respectant prefers-reduced-motion.
- **MeasureForm.tsx** : formulaire (seuls inputs à bordure) + bouton « Enregistrer »
  compact ; objectif relié au plan + « Définir » compact.
- **CompositionTab.tsx** : en-tête Fraunces ; bannière balance ; période en boutons
  texte (zoom) ; métriques en boutons texte — **FFMI promu**, **IMC relégué dernier +
  atténué** ; **rangée de stats nues** (Actuel/Variation/Min/Max, variation **neutre**,
  jamais rouge/vert ; absente → « — ») ; graphe ; boutons « Résumés annuels » par année
  présente dans les données.

page.tsx : bloc body remplacé par `<CompositionTab/>` ; états/handlers/helpers morts
(WeightChart, weightMetricValue, computeBodyStats, METRIC_UNIT, NutritionEmpty + state)
retirés. Modal détail jour et autres onglets inchangés.

### Décision documentée : « période = zoom » vs stats
Le graphe affiche **tout l'historique** (zoom = largeur visible, défilement interne).
Les stats résument la **fenêtre des N derniers jours** (Actuel = dernière mesure
globale ; Min/Max/Variation sur la fenêtre). Ainsi la période ne **tronque jamais** la
donnée du graphe — elle change le zoom et le cadre de résumé.

## Phase 2 — Garde-fou
ENFORCED_PATHS couvre les 5 fichiers `composition/`. `WeightLog`/`Button` restent
importés dans page.tsx (usages résiduels possibles) ; page.tsx non enforced.

## Contraintes respectées
TypeScript strict (aucun any), zéro mock (taille absente / objectif / readiness =
états réels), SVG brut, portals sur document.body, tokens uniquement, ≤200 lignes/fichier,
npm run build vert, aucun emoji, commit local, pas de push. Cadrage santé neutre.
