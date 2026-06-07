# PROMPT_SELECTEUR_ARCHEOLOGIE — Système de sélection de portion d'activité

**Mode : lecture / git uniquement. Aucune modification de code.**

---

## ÉTAPE 1 — RECHERCHE DANS LE CODE ACTUEL

### Le système est PRÉSENT dans le fichier actuel mais ORPHELIN (dead code)

**`src/app/activities/page.tsx`** contient toujours :

| Élément | Lignes | Rôle |
|---|---|---|
| `interface SelectionSheetProps` | l. 1756-1769 | Props du panneau de sélection |
| `function SelectionSheet(props)` | l. 1771-2652 (≈ 880 lignes) | Composant slide-up complet : KPIs portion (puissance moy/max, FC moy/max, vitesse, cadence, T°, D+/D−), zones polarisées, 6 mini-courbes, bouton fermer, animations CSS, **rendu via `createPortal(sheetNode, document.body)`** (l. 1911-1913) |
| `function SyncCharts(…)` | l. 2064-2652 | Composant des courbes avec drag-to-select intégré |
| `useState<[number,number] \| null>` selection | l. 2087 | State de la plage `[i1, i2]` sélectionnée |
| `setDragStartPct` / `handleDown` / `handleUp` | l. 2088, 2180-2191 | Drag start au mousedown / touchstart |
| `handleMove` met à jour `setSelection` | l. 2129-2133 | Drag continu → update `[min(i1,i2), max(i1,i2)]` |
| `setShowSelModal(true)` au touchend | l. 2190 (seuil : sélection > 5 indices) | Ouvre le sheet uniquement si la sélection est suffisamment large |
| `<SelectionSheet sel={selection} …>` | l. 2634-2649 | Rendu conditionnel `{showSelModal && selection && <…/>}` |
| Animations CSS `selSheetUp/Down/FadeIn/FadeOut` | l. 2330-2333 | Slide-up depuis le bas + overlay backdrop-blur |

**Confirmation** : le système EST encore là, complet, fonctionnel sur le plan code.

### Pourquoi il n'apparaît plus

Le composant `SyncCharts` (qui contenait l'implémentation drag-to-select) **n'est plus appelé** dans le rendu. Cherchons les call sites :

```
grep "<SyncCharts" src/app/activities/page.tsx
→ Aucun match
```

Seule la déclaration de `SyncCharts` à la l. 2064 subsiste. La 2e occurrence (l. 2655 et au-delà) appartient à la fonction parente `function ActivityDetail`, qui appelle désormais **`ActivityCurves`** à la place :

```tsx
{a.streams && (
  <Section title="Courbes">
    <ActivityCurves activity={a} />
  </Section>
)}
```

`ActivityCurves` (créé dans le PR récent) NE contient PAS :
- de `setSelection` / `dragStartPct`
- d'instanciation de `SelectionSheet`
- de handler `handleDown` / `handleUp`

→ **Le système de sélection a été perdu lors du swap `SyncCharts → ActivityCurves`** (commit `faee52e`, voir ci-dessous).

### Autre fichier — `src/app/activities/page.backup.tsx`

Un backup historique avec une version antérieure du système :
- `function SelectionPanel(...)` (l. 751)
- `onSelectStart` / `onSelectMove` / `onSelectEnd` (l. 493-499, 605-611)
- `dragStart` / `setSelection` / `setShowSelPanel` (l. 999-1063)

C'était la 1re version. Devenue obsolète après refonte (renommée `SelectionSheet` puis intégrée à `SyncCharts`).

### Conclusion étape 1
✅ **Système présent dans le code actuel mais inactif** : `SelectionSheet` (~ 880 lignes) et tout le state drag-to-select dans `SyncCharts` sont compilés mais jamais montés à l'écran car `SyncCharts` n'est plus appelé.

---

## ÉTAPE 2 — COMMITS SUSPECTS

| Hash | Message | Pertinence |
|---|---|---|
| **`faee52e`** | feat(activities): refonte section Courbes — ActivityCurves (Empilé/Superposé) | 🔴 **CAUSE RACINE** — c'est ce commit qui a swappé `SyncCharts → ActivityCurves` et orphelin'd `SelectionSheet` |
| `3196dc0` | fix(activities): SelectionSheet via portal + crosshair hors zone de tracé | 🟢 Confirme l'existence — fix du containing block (portail vers document.body) |
| `d2a20f4` | feat(activities): laps typo Barlow + temp, crosshair clip zone, **panneau selection slide-up** | 🟢 Implémentation initiale du panneau slide-up (probable création de `SelectionSheet`) |
| `c5b83dc` | feat(activities): Courbes 3-format toggle + interactive crosshair/tooltip | 🟡 Étend `ActivityCurves` (introduit pointer events + tooltip refs) — pas de réintégration de la sélection |
| `e5c6253` | feat(activities): tooltip Courbes desktop suit la souris en position fixed | 🟡 Tooltip uniquement, pas de sélection |
| `11300f6` | fix(activities): portal tooltip Courbes desktop vers document.body | 🟡 Tooltip portal — pas de sélection |
| `fec2728` | restore(activities): checkout d7c8dae sur page.tsx + globals.css — fiche mobile fonctionnelle | 🟢 Possible étape qui a touché le système (à creuser uniquement si besoin) |
| `b895aa7` | feat(analyse): redesign courbes SyncCharts + nouvelles données ActivityDetail | 🟢 Création initiale de `SyncCharts` |
| `f2131d1` | feat(charts-v2): carte mobile, hover précis, découplage enrichi, MMP log10 | 🟡 Refactor d'un parent du système |

Tous ces commits sont sur `main`.

---

## ÉTAPE 3 — BRANCHES

Branches récentes (origin) :
- `origin/main` — 2026-06-06 (contient le système orphelin)
- `origin/claude/dreamy-volhard-991fa5` — 2026-06-06 (worktree courant, idem)
- `origin/claude/nutrition-page-design-u3UtM` — 2026-06-06 (sujet : nutrition, hors scope)
- `origin/claude/busy-merkle-26ed0d` — 2026-05-23
- `origin/claude/recursing-dirac-94ea37` — 2026-05-10
- `origin/claude/hardcore-hertz-74d2f6` — 2026-05-01

**Aucune branche ne porte un nom évocateur** (selector / brush / range / portion / segment). Pas de PR jamais mergée qui contiendrait une version alternative.

---

## ÉTAPE 4 — FICHIERS SUPPRIMÉS

Aucun fichier supprimé dont le nom contient des mots-clés liés à la sélection (`select`, `brush`, `portion`, `segment`, `range`) dans tout l'historique. Le système n'a jamais été extrait dans un fichier dédié — il a toujours vécu inline dans `src/app/activities/page.tsx`. Donc rien à restaurer en `git restore`.

---

## ÉTAPE 5 — HISTORIQUE DE `src/app/activities/page.tsx`

15 derniers commits sur le fichier :

| Hash | Message |
|---|---|
| 11300f6 | fix(activities): portal tooltip Courbes desktop vers document.body |
| e5c6253 | feat(activities): tooltip Courbes desktop suit la souris en position fixed |
| c5b83dc | feat(activities): Courbes 3-format toggle + interactive crosshair/tooltip |
| **faee52e** | **feat(activities): refonte section Courbes — ActivityCurves (Empilé/Superposé)** ← swap |
| 9e62b2f | feat(activities): refonte Courbe de puissance — log scale + trophées + tooltip |
| e5b12d4 | fix(activities mobile): bon graphique Intervalles — LapsBikeChart au lieu de LapsChart |
| 15ebd84 | perf(activities mobile): drag du sheet en DOM direct (0 re-render React) |
| 3d2fb26 | fix(activities mobile): zoom map en temps réel pendant le drag du sheet |
| dfa6744 | feat(activities mobile): Intervalles — graphique en barres (vélo) au lieu du tableau |
| 98a1175 | feat(activities mobile): MMP edge-to-edge + axes lisibles |
| 2fb5e7e | fix(activities mobile): back btn descendu sous la dynamic island/notch iOS |
| 19bf05f | feat(activities mobile) step C: sheet draggable avec snap 3 positions |
| 0868f41 | feat(activities mobile) step 3: scroll-zoom léger sur la carte sticky |
| 15e2882 | feat(activities mobile) step 1+2: map sticky + sheet overlap (DOM+CSS) |
| 8c713ca | feat(activities mobile): back btn thème adaptatif + tab bar basse masquée |

**Commits mentionnant explicitement la sélection** :
- `3196dc0` — fix SelectionSheet via portal
- `d2a20f4` — panneau selection slide-up

---

## VERDICT FINAL

### [A] Le système existait, est ENCORE présent dans le code, mais a été DÉCONNECTÉ

**Commit qui a déconnecté :** **`faee52e`** — feat(activities): refonte section Courbes — ActivityCurves (Empilé/Superposé)

**Mécanisme du dé-câblage** : ce commit a remplacé les 2 call sites de `<SyncCharts a={a} … />` (mobile + desktop) par `<ActivityCurves activity={a} />`. Le composant `SyncCharts` (qui contenait l'implémentation du drag-to-select + l'invocation de `SelectionSheet`) est resté défini mais n'a plus jamais été monté. Tout le système — `SelectionSheet` (~ 880 lignes), state `selection`, handlers `handleDown/handleUp`, animations CSS `selSheetUp/Down` — est devenu **dead code**.

### Pièces actuellement orphelines

```
src/app/activities/page.tsx
├── interface SelectionSheetProps          l. 1756-1769
├── function SelectionSheet(props)         l. 1771-2058  (~ 290 lignes pures)
│   ├── portal vers document.body          l. 1911-1913 (déjà sécurisé)
│   ├── overlay backdrop-blur              l. 1915-1926
│   ├── slide-up panel + KPIs              l. 1927-…
│   └── 6 mini-courbes + zones puissance + zones FC
├── function SyncCharts(…)                 l. 2064 (jamais appelée)
│   ├── state selection / dragStartPct     l. 2087-2090
│   ├── handleDown / handleMove / handleUp l. 2115-2191
│   ├── computeBestWindows                 l. 1735-1753
│   └── <SelectionSheet … />               l. 2634-2649
└── animations CSS                         l. 2330-2333
```

### Options de restauration

**Option 1 — Réintégrer dans `ActivityCurves`** (recommandé)
Porter le pattern drag-to-select dans `ActivityCurves` : ajouter `selection` state, étendre `onPointerDown` pour démarrer un drag, `onPointerMove` pour étendre la sélection, `onPointerUp` pour `setShowSelModal(true)` si > seuil, et instancier `<SelectionSheet …>` à la fin du composant. Réutiliser `SelectionSheet` tel quel (le composant est déjà robuste, portalisé).

**Option 2 — Remettre `SyncCharts` à la place de `ActivityCurves`**
Annuler le swap `faee52e` sur les 2 call sites. **Non recommandé** — `ActivityCurves` apporte les 3 formats (Empilé/Superposé/Mono), lissage 30 s, tooltip refs-based, et est plus maintenable. Backtrack-er signifierait reperdre tout cela.

**Option 3 — Re-spec from scratch dans `ActivityCurves`**
Reconcevoir la sélection avec un nouveau pattern (par exemple : double-tap pour marquer début, second tap pour fin) si le drag-to-select pose problème côté UX.

### Recommandation
**Option 1** : conserver `ActivityCurves` (qui est la nouvelle base), réintégrer le drag-to-select et l'appel à `<SelectionSheet …>`. Tout le code de `SelectionSheet` est utilisable tel quel — seul le câblage côté `ActivityCurves` (state + handlers + rendu) reste à écrire. Estimation : ~ 50-80 lignes de glue code dans `ActivityCurves`.

**Aucune modification effectuée.**
