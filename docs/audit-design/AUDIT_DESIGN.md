# AUDIT DESIGN — État des lieux avant refonte esthétique

> **Lecture seule.** Aucun fichier de code applicatif modifié. Ce document ne
> contient que des **faits** (fichier, ligne, valeur), pas de recommandations de
> refonte. Références au format `fichier:ligne`.
>
> Périmètre principal : les 4 onglets de la page Nutrition
> (`src/app/nutrition/page.tsx` + composants). Pass transversal rapide sur
> Planning / Performance / Recovery / Record / Progression.
> Date du relevé : branche `claude/jolly-ritchie-syjvxw`.

---

# PHASE 1 — État du design system documenté

## 1.1 Contenu actuel du design system

Reproduction intégrale de `docs/DESIGN_SYSTEM.md` :

````markdown
# THW Coaching — Design System

> App de coaching sportif premium : triathlon, Hyrox, endurance.
> Stack : Next.js 15 · TypeScript strict · Tailwind CSS · Supabase.

---

## 1. Philosophie

**Densité + clarté.** L'athlète lit des chiffres sous l'effort — chaque pixel compte.
- Linear pour la précision de la grille et l'absence d'ornement inutile
- Strava pour la densité de data et l'affordance mobile
- Strong pour le dark mode et les badges sport colorés

Pas de composants décoratifs. Pas de gradient gratuitement. Pas de spinner.

---

## 2. Tokens de couleur

### 2.1 Primaires app

```css
--primary:       #00c8e0;   /* cyan THW — CTA, liens, focus */
--primary-dim:   rgba(0,200,224,0.12);
--primary-text:  #0891b2;   /* variante texte sur fond clair */
```

### 2.2 Accent Coach IA (distinct du primaire)

```css
--ai-accent:     #8b5cf6;   /* violet — exclusif UI Coach IA */
--ai-accent-dim: rgba(139,92,246,0.12);
--ai-gradient:   linear-gradient(135deg, #8b5cf6, #5b6fff);
```

> **Règle absolue :** `--ai-accent` n'est jamais utilisé hors des composants Coach IA.
> Les boutons, liens et indicateurs app utilisent `--primary`.

### 2.3 Badges sport — fixes et immuables

| Sport | Hex | Usage |
|-------|-----|-------|
| `run` | `#f97316` | Orange |
| `bike` | `#3b82f6` | Bleu |
| `swim` | `#06b6d4` | Cyan |
| `gym` | `#8b5cf6` | Violet |
| `hyrox` | `#ec4899` | Rose |
| `rowing` | `#14b8a6` | Teal |

Backgrounds de badge : couleur à 13% d'opacité (`hex` + `22` en RGBA).
Bordure de badge : couleur pleine à 100%.

```ts
// Exemple d'implémentation (planning/page.tsx pattern)
const SPORT_BORDER: Record<SportType, string> = {
  run:    '#f97316',
  bike:   '#3b82f6',
  swim:   '#06b6d4',
  gym:    '#8b5cf6',
  hyrox:  '#ec4899',
  rowing: '#14b8a6',
}
const SPORT_BG: Record<SportType, string> = {
  run:    'rgba(249,115,22,0.13)',
  bike:   'rgba(59,130,246,0.13)',
  swim:   'rgba(6,182,212,0.13)',
  gym:    'rgba(139,92,246,0.13)',
  hyrox:  'rgba(236,72,153,0.13)',
  rowing: 'rgba(20,184,166,0.13)',
}
```

> ⚠️ Note : le fichier `planning/page.tsx` utilise actuellement `run:#22c55e` (vert) et `swim:#38bdf8` (bleu clair) — à migrer vers les tokens ci-dessus lors de la prochaine refonte de la page Planning.

### 2.4 Zones d'intensité — fixes et immuables

Ces couleurs apparaissent sur les charts SVG, les blocs de séance et les indicateurs de charge.

| Zone | Nom | Hex | Sémantique |
|------|-----|-----|------------|
| Z1 | Récupération | `#9ca3af` | Gris neutre |
| Z2 | Endurance | `#22c55e` | Vert — aérobie facile |
| Z3 | Tempo | `#eab308` | Jaune — seuil aérobie |
| Z4 | Seuil | `#f97316` | Orange — seuil lactique |
| Z5 | VO2max | `#ef4444` | Rouge — intense |

```ts
const ZONE_COLORS = ['#9ca3af','#22c55e','#eab308','#f97316','#ef4444'] // index = zone-1
```

---

## 3. Typographie

### 3.1 Familles

| Rôle | Famille | Usage |
|------|---------|-------|
| Titres / branding | `Syne` | H1–H3, labels nav, noms de feature |
| Corps / UI | `DM Sans` | Labels, descriptions, boutons, toasts |
| **Métriques** | `DM Mono` | **TSS, watts, pace, FC, distance, temps** |

> **Règle monospace :** toute valeur numérique de performance est rendue en `DM Mono`.
> Ne jamais afficher `"42:30/km"` ou `"285w"` en DM Sans.

### 3.2 Échelle

| Token | taille | Poids | Usage |
|-------|--------|-------|-------|
| `text-display` | 26–32px | 700 | Titres de page |
| `text-section` | 18–20px | 700 | Titres de section |
| `text-body` | 13–14px | 400 | Corps de texte |
| `text-label` | 11–12px | 500–600 | Labels, badges |
| `text-micro` | 9–10px | 500–700 | Métadonnées, abbrev. |

---

## 4. Espacement & grille

- Grille de base : **4px** (multiples de 4 pour padding, gap, margin)
- Card padding : `16px` desktop / `12px` mobile
- Gap entre éléments de liste : `4–8px`
- Radius standard : `8px` (micro), `12px` (card), `16px` (modal/panel)

---

## 5. Touch targets & accessibilité

- **Minimum 44 × 44 px** sur tous les éléments interactifs (boutons, toggles, liens)
- Les icônes seules (< 44px) ont une zone de hit invisible via `padding` ou `::after`
- Contraste minimum WCAG AA sur fond clair et fond sombre
- Focus visible sur tous les éléments keyboard-navigables

---

## 6. États de chargement

| ❌ Interdit | ✅ Requis |
|------------|----------|
| Spinner / loader animé | Skeleton screen |
| `Loading...` texte nu | Placeholder shimmer aux dimensions du contenu |
| Flash de layout au chargement | Dimensions réservées dès le premier render |

Les skeleton screens reprennent exactement la forme du composant cible (même hauteur, même nombre de lignes).

---

## 7. Composants récurrents

### Card de séance (planning)

```
┌─────────────────────────────────┐
│ [BADGE] Titre séance            │  ← DM Sans 9px bold
│ 09:00 · 1h30                    │  ← DM Mono 8px, opacity 0.7
│ ████░░░░ (blocs zone)           │  ← SVG, 6px hauteur
└─────────────────────────────────┘
Border-left: 2px solid SPORT_BORDER[sport]
Background: SPORT_BG[sport]
```

### Badge sport

```
[RUN]  ← 7–8px, bold, background dim, texte couleur sport
```

### Métrique KPI

```
285              ← DM Mono, 24–32px, bold
watts            ← DM Sans, 10px, text-dim, uppercase
```

### Indicateur de zone (chart SVG)

```
─────  ← stroke couleur ZONE_COLORS[zone-1], strokeWidth 1.5
```

---

## 8. Thème light / dark

Les composants n'utilisent **jamais** de valeurs de couleur hardcodées inline pour le fond, le texte ou les bordures structurelles. Ils passent par les variables CSS :

```css
/* Fond */
--bg:        /* blanc L / gris très foncé D */
--bg-card:   /* blanc cassé L / gris foncé D */
--bg-card2:  /* gris très clair L / gris moyen D */

/* Texte */
--text:      /* quasi-noir L / blanc D */
--text-mid:  /* gris moyen L/D */
--text-dim:  /* gris clair L / gris D */

/* Structure */
--border:    /* gris clair L / gris foncé D */
--shadow-card: /* ombre légère L / nulle D */
```

Les couleurs **sport**, **zones** et **IA** sont identiques en light et dark (elles sont suffisamment saturées).

---

## 9. Règles absolues (ne jamais violer)

1. **Zéro librairie de chart** — recharts, chart.js, d3 non installables. SVG raw uniquement.
2. **Zéro `any` TypeScript** — strict mode, toujours.
3. **Zéro mock data en production** — Supabase ou rien.
4. Les couleurs de **zone** et de **sport** ne changent jamais, même pour un one-off.
5. Les métriques numériques sont **toujours** en `DM Mono`.
6. Les skeleton screens **remplacent** les spinners, sans exception.
7. Touch targets : **≥ 44px** sur mobile.
8. L'accent IA (`#8b5cf6`) n'apparaît **jamais** hors des composants Coach IA.
````

> **Fait notable** : le prompt d'audit énonce une « convention Inter + tabular-nums »
> pour les nombres. Le design system documenté (§3.1, §9.5) impose au contraire
> **DM Mono** pour toute valeur numérique. Le code suit massivement **DM Mono**
> (cf. Phase 2). La police **Inter** n'apparaît dans le code que dans le bloc
> `.cmp-section-content` (page Compétences), `globals.css:163`. Il y a donc une
> divergence entre la prémisse du prompt et la convention réellement documentée.

## 1.2 Variables CSS globales réellement définies

Source unique : `src/app/globals.css`. Aucune variable de couleur n'est définie via
Tailwind config (`tailwind.config` non présent comme source de tokens) ; tout est
dans `:root` / `.light` / `.dark`.

### Couleurs — tokens fixes (identiques light/dark), `globals.css:29-55`

| Variable | Valeur | Note vs DESIGN_SYSTEM.md |
|---|---|---|
| `--sport-run` | `#f97316` | conforme |
| `--sport-bike` | `#3b82f6` | conforme |
| `--sport-swim` | `#06b6d4` | conforme |
| `--sport-gym` | `#8b5cf6` | conforme |
| `--sport-hyrox` | `#ec4899` | conforme |
| `--sport-rowing` | `#14b8a6` | conforme |
| `--zone-1` | `#9ca3af` | conforme |
| `--zone-2` | `#22c55e` | conforme |
| `--zone-3` | `#eab308` | conforme |
| `--zone-4` | `#f97316` | conforme |
| `--zone-5` | `#ef4444` | conforme |
| `--primary` | `#06B6D4` | **diverge** du DS (`#00c8e0`) |
| `--primary-dim` | `rgba(6,182,212,0.12)` | diverge (DS = `rgba(0,200,224,0.12)`) |
| `--ai-accent` | `#9D7DFF` | **diverge** du DS (`#8b5cf6`) |
| `--ai-accent-dim` | `rgba(157,125,255,0.12)` | diverge |
| `--header-height` | `56px` | — |
| `--safe-b` | `env(safe-area-inset-bottom,0px)` | — |

> Le DS documente aussi `--primary-text` et `--ai-gradient` : **non définis** dans
> `globals.css`. Inversement `globals.css` ne définit **pas** `--ai-accent` à la
> valeur du DS.

### Couleurs — tokens thémés `:root/.light` (`globals.css:58-80`) vs `.dark` (`globals.css:82-102`)

| Variable | Light | Dark |
|---|---|---|
| `--bg` | `#ffffff` | `#080A0F` |
| `--bg-alt` | `#e4eaf2` | `#0B0E15` |
| `--bg-card` | `#ffffff` | `#0F1117` |
| `--bg-card2` | `#f8fafc` | `#0D1219` |
| `--bg-hover` | `#eef5fa` | `rgba(255,255,255,0.05)` |
| `--border` | `rgba(0,0,0,0.07)` | `#1E2533` |
| `--border-mid` | `rgba(0,0,0,0.12)` | `#263042` |
| `--text` | `#0d1117` | `#EEF2F7` |
| `--text-mid` | `rgba(13,17,23,0.60)` | `rgba(238,242,247,0.65)` |
| `--text-dim` | `rgba(13,17,23,0.38)` | `rgba(238,242,247,0.38)` |
| `--nav-bg` | `#ffffff` | `#080A0F` |
| `--nav-border` | `rgba(0,0,0,0.07)` | `#1E2533` |
| `--input-bg` | `#f0f6f9` | `#0B0E15` |
| `--toggle-off` | `#D1D5DB` | `var(--border-mid)` |
| `--gty-bg` | `#111111` | `#111111` |
| `--gty-text` | `#ffffff` | `#ffffff` |
| `--gty-border` | `rgba(0,0,0,0.2)` | `rgba(255,255,255,0.15)` |

### Couleurs — second bloc de tokens « boîtes de contenu » (`globals.css:615-659`)

Défini une 2ᵉ fois dans `:root` puis surchargé dans `.dark` **et** dans
`@media (prefers-color-scheme: dark)`.

| Variable | Light | Dark |
|---|---|---|
| `--info-bg` | `#F8FAFC` | `#020617` |
| `--info-border` | `#E2E8F0` | `#1e293b` |
| `--zone-good-bg` | `#F0FDF4` | `rgba(20,83,45,0.35)` |
| `--zone-good-border` | `#BBF7D0` | `#166534` |
| `--zone-med-bg` | `#FEFCE8` | `rgba(120,53,15,0.35)` |
| `--zone-med-border` | `#FDE68A` | `#92400E` |
| `--zone-bad-bg` | `#FEF2F2` | `rgba(127,29,29,0.35)` |
| `--zone-bad-border` | `#FECACA` | `#991B1B` |
| `--text-title` | `#0F172A` | `#F8FAFC` |
| `--text-body` | `#475569` | `#CBD5E1` |
| `--text-muted` | `#64748B` | `#94A3B8` |
| `--text-label` | `#94A3B8` | `#64748B` |
| `--text-value` | `#1E293B` | `#F1F5F9` |

> **Fait** : ce 2ᵉ jeu de tokens « zone-good / zone-med / zone-bad » (vert/jaune/
> rouge thémés) **existe** mais **n'est pas utilisé** par les 4 pages Nutrition,
> qui re-déclarent leurs propres rgba verts/jaunes/rouges en dur (cf. Phase 2).

### Ombres

| Variable | Light (`globals.css:71-72`) | Dark (`globals.css:95-96`) |
|---|---|---|
| `--shadow` | `0 4px 24px rgba(0,100,150,0.10), 0 1px 4px rgba(0,0,0,0.06)` | `0 4px 24px rgba(0,0,0,0.6)` |
| `--shadow-card` | `0 2px 12px rgba(0,80,160,0.07), 0 1px 3px rgba(0,0,0,0.05)` | `0 1px 8px rgba(0,0,0,0.4)` |

### Radius

**Aucune variable CSS de radius.** Le DS documente une échelle (8 / 12 / 16) mais
elle n'est encadrée par aucun token. Tous les `borderRadius` sont des littéraux
inline (valeurs relevées en Phase 2 : 7, 8, 9, 10, 11, 12, 14, 20, 999…).

### Espacements

**Aucune variable CSS d'espacement / de grille 4px.** Padding, gap, margin sont
tous des littéraux inline. Seules largeurs de nav (`--nav-w: 220px`,
`--nav-w-mobile`, `globals.css:75-76`) et `--header-height` existent.

### Polices (déclaration)

Chargées par `@import url(...)` Google Fonts en tête de `globals.css:1` :
`Syne` (400-800), `DM Sans` (300/400/500), `DM Mono` (400/500), `Nunito` (700),
`Barlow Condensed` (600/700), `Bebas Neue`, `Roboto Mono` (700).
Famille par défaut du `body` : `'DM Sans', sans-serif` (`globals.css:228`).
Utilitaire `.stat-number` → `Barlow Condensed` + `tabular-nums` (`globals.css:233-238`).

## 1.3 Polices chargées et usage réel

- **Chargement** : via `@import` CSS Google Fonts (`globals.css:1`).
  **Pas de `next/font`** (aucun `next/font/google` ou `/local` dans le repo) →
  pas d'auto-hosting ni de `font-display` optimisé par Next.
- **Syne** — titres / branding : `<h1>` page, `sectionTitle`
  (`page.tsx:519-527`), badges de type de jour, labels de section. Conforme DS §3.1.
- **DM Sans** — corps / UI / boutons / labels : famille par défaut `body`
  (`globals.css:228`) et `fontFamily:'DM Sans,sans-serif'` partout.
- **DM Mono** — nombres / métriques : kcal, macros, poids, dates de chart, codes-
  barres (24 occurrences rien que dans `page.tsx`). Conforme DS §3.1 / §9.5.
- **Barlow Condensed** — déclarée (`.stat-number`, `globals.css:233`) mais
  **0 usage** dans Nutrition, Planning, Performance, Recovery, Record,
  Progression (grep `stat-number` = 0).
- **Nunito, Bebas Neue, Roboto Mono** — chargées dans l'`@import` mais **aucun
  usage repéré** dans les pages auditées (polices fantômes).
- **Inter** — non chargée par l'`@import`, mais référencée comme famille dans
  `.cmp-section-content` (`globals.css:163`, page Compétences). Police citée par
  la prémisse du prompt mais marginale dans le code.

---

# PHASE 2 — Audit des 4 onglets Nutrition

Les 4 onglets sont rendus par **un seul fichier** `src/app/nutrition/page.tsx`
(2435 lignes), via `tab ∈ {today, plan, tracking, body}`. Constantes de style
partagées : `cardStyle` (`page.tsx:511-517` : `borderRadius:20`,
`border:'1px solid var(--border)'`, `padding:'28px 24px'`) et `sectionTitle`
(`page.tsx:519-527` : Syne 700, 18px).

> **Constante transverse aux 4 onglets** — `DAY_COLORS` (`page.tsx:49-53`) définit
> en dur les fonds/bordures/textes Low/Mid/Hard :
> - low : `bg rgba(34,197,94,0.10)` / `border #22c55e` / `text #22c55e`
> - mid : `bg rgba(234,179,8,0.10)` / `border #eab308` / `text #eab308`
> - hard: `bg rgba(239,68,68,0.10)` / `border #ef4444` / `text #ef4444`

## Onglet 1 — « Aujourd'hui » (`tab === 'today'`)
Rendu : `page.tsx:1357-1569` (Bilan, Hydratation, Séance) + `page.tsx:1782-1823`
(Repas + suggestion IA). Composants : `MacroDonut`, `DayFoodJournal`.

### 2.1 Couleurs en dur
- `#06B6D4` (cyan primaire écrit en dur, alors que `--primary` existe) :
  `1318, 1326, 1398, 1443, 1459, 1477-1478, 1495, 1502, 1541, 1548` (et la
  variante `rgba(6,182,212,…)` : `1318, 1324, 1477, 1541`).
- `#22c55e` (vert) : MacroDonut Protéines `1408` ; pastille balance `1848`
  (section body, voir onglet 4).
- `#eab308` (jaune) : MacroDonut Glucides `1418`.
- `#f97316` (orange) : MacroDonut Lipides `1428`.
- `#8b5cf6` + `rgba(139,92,246,…)` (violet IA, **hors composant Coach IA**) :
  bouton « Suggérer mon prochain repas » et carte résultat `1802-1803, 1813, 1816`.
- `#64748b` / `#ef4444` via `macroStatus()` (`page.tsx:104-106`) injectés dans les
  badges de statut des donuts.
- `rgba(34,197,94,0.10)`, `rgba(234,179,8,0.10)`, `rgba(239,68,68,0.10)` via
  `DAY_COLORS` (badge type de jour `1380-1382`).

### 2.2 Surfaces colorées
- **Badge type de jour** (Low/Mid/Hard) en haut de « Bilan du jour »
  (`1377-1389`) : fond + bordure pleine colorée (vert/jaune/rouge selon le jour).
- **4 badges de statut** sous les donuts (`à compléter` / `dans la cible` /
  `dépassé`), fond `${color}1a` + texte coloré (`MacroDonut.tsx:195-215`).
- **Bouton « Ajouter un repas »** : fond `rgba(6,182,212,0.08)` + bordure
  `rgba(6,182,212,0.3)` (`1471-1486`).
- **Bouton + carte « Suggérer mon prochain repas »** : fond/bordure violets
  `rgba(139,92,246,…)` (`1796-1820`).
- **Badge « Code scanné »** : fond/bordure cyan `rgba(6,182,212,…)` (`1323-1338`).
- Badge sport mini (séance) : carré `rgba(6,182,212,0.12)` (`1537-1551`).

### 2.3 Typographie
- **Monospace (DM Mono) sur des nombres** : delta kcal, « il te reste »
  (`1443, 1446, 1459, 1462`), litres d'hydratation (`1495`), code-barres (`1327`),
  macros de la suggestion (`1816`). Conforme au DS (DM Mono), **non conforme** à la
  prémisse « Inter + tabular-nums » du prompt.
- **Tailles de police distinctes** (px) relevées sur l'onglet :
  `{8, 9, 10, 11, 12, 13, 14, 16, 18, 24}` → **~10 valeurs**, plus la taille
  dynamique du chiffre central des donuts (proportionnelle à `size=96`).

### 2.4 Bordures
Éléments à `border` visible : carte Bilan, carte Hydratation, carte Séance, carte
Repas (4 cartes `1px solid var(--border)` via `cardStyle`) + bandeau « il te reste »
(`1439/1455`) + 3 boutons hydratation (`1507, 1512`) + bouton ajouter (`1477`) +
ligne séance (`1534`) + badge type de jour + badge scanné. **Estimation : ~12-15
bordures** sur la vue. Candidats à séparer par fond/espacement plutôt que bordure :
le bandeau « il te reste » et la ligne « séance du jour » (déjà sur `--bg-card2`,
la bordure est redondante avec le contraste de fond).

### 2.5 Composants
- **Partagés** : `Button` (`@/components/ui/Button`), `MacroDonut`
  (`@/components/ui/MacroDonut`), `DayFoodJournal`.
- **Stylés inline / dupliqués localement** : les 3 cartes (`cardStyle`), les
  boutons hydratation, le bouton « ajouter un repas », le bouton/carte suggestion
  IA, le badge type de jour, le badge « code scanné » — tous en `style={{…}}`
  inline, pas de composant `Card`/`Badge`/`Pill` réutilisé.

### 2.6 Badges & répétitions
- **Badge de statut ×4** : `à compléter` (ou `dans la cible`/`dépassé`) répété sous
  chacun des 4 donuts (`page.tsx:1400-1431` → `MacroDonut.tsx:195-215`). Quand
  aucune macro n'atteint la cible → **4 badges « à compléter » identiques**.
- **MacroDonut ×4** (Calories/Protéines/Glucides/Lipides) : même composant, 4
  couleurs en dur passées en prop (`#06B6D4/#22c55e/#eab308/#f97316`).

## Onglet 2 — « Mon plan » (`tab === 'plan'`)
Rendu : `page.tsx:1574-1777`. Composants : `PlanShoppingList`, `AIPanel`,
modal détail jour (`page.tsx:2056+`).

### 2.1 Couleurs en dur
- `#06B6D4` / `rgba(6,182,212,…)` : sélecteur variante A/B (`1654-1655`), points
  séance du calendrier (`1713`), gradients de bouton.
- `rgba(91,111,255,…)` (bleu/indigo `#5b6fff`) : bordures/fonds des CTA IA
  (`1588-1589, 1731-1732`), bordure carte template en édition.
- Gradients `linear-gradient(135deg,#06B6D4,#5b6fff)` et
  `linear-gradient(135deg,rgba(6,182,212,0.12),rgba(91,111,255,0.18))` (`1588, 1732`).
- `DAY_COLORS` (vert/jaune/rouge) : cartes résumé Low/Mid/Hard (`1626, 1629`) et
  cases du calendrier 14 jours (`1675, 1690-1691, 1701`).

### 2.2 Surfaces colorées
- **3 cartes Low / Mid / Hard** (`1618-1641`) : fond `DAY_COLORS[t].bg` + bordure
  pleine `DAY_COLORS[t].border` — l'exemple attendu par le prompt. Vert / jaune /
  rouge.
- **Calendrier 14 jours** (`1665-1720`) : la case « aujourd'hui » prend
  `colors.bg` + bordure 2px colorée ; les autres `--bg-card2` + bordure neutre.
- **CTA « Créer mon plan avec l'IA »** et **« Modifier avec l'IA »** : fond dégradé
  cyan→indigo + bordure `rgba(91,111,255,0.35)` (`1580-1607, 1726-1738`).
- Boutons variante A/B actifs : fond `rgba(6,182,212,0.14)` (`1654`).

### 2.3 Typographie
- **Monospace (DM Mono) sur nombres** : kcal des cartes Low/Mid/Hard (`1632`),
  unité « kcal » (`1635`), ligne macros P·G·L (`1636`), kcal des cases calendrier
  (`1706`). Conforme DS.
- **Tailles distinctes** (px) : `{8, 9, 10, 11, 12, 13, 15, 18}` → **8 valeurs**.
  Présence de très petites tailles (`8`, `9`) sur les cartes Low/Mid/Hard et le
  calendrier.

### 2.4 Bordures
Carte conteneur (`cardStyle`) + 3 cartes Low/Mid/Hard + 14 cases calendrier
(chacune bordée) + 2 boutons A/B + 4 boutons d'action (Modifier IA, Courses,
Régénérer, Supprimer dont 1 sans bordure). **Estimation : ~24 bordures** (dont 14
pour le seul calendrier). Le calendrier mélange bordures neutres et colorées.

### 2.5 Composants
- **Partagés** : `PlanShoppingList`, `AIPanel`.
- **Inline / locaux** : cartes Low/Mid/Hard, cases calendrier, pilules A/B, tous
  les boutons d'action — stylés inline, dupliqués (4 boutons d'action ≈ même
  pattern copié-collé avec variations de `flex`).

### 2.6 Badges & répétitions
- **Carte objectif ×3** (Low/Mid/Hard) : structure identique répétée via `.map`.
- **Case calendrier ×14** : même bloc répété.
- **Badge type de jour** (LOW/MID/HARD en Syne) répété dans chaque case.

## Onglet 3 — « Suivi » (`tab === 'tracking'`)
Rendu : `page.tsx:1828-1837` → `SuiviSection`
(`src/app/nutrition/components/suivi/SuiviSection.tsx`) + `SuiviCharts.tsx` +
`suiviData.ts`.

### 2.1 Couleurs en dur
- `#06B6D4` / `rgba(6,182,212,0.12)` : pilules de période 7/14/30 j actives
  (`SuiviSection.tsx:90-91`).
- `#22c55e` / `#eab308` / `#ef4444` : barre « régularité de logging » selon seuil
  (`SuiviSection.tsx:126`).
- Dans `SuiviCharts.tsx` : `TYPE_COLOR = {low:#22c55e, mid:#eab308, hard:#ef4444}`
  (`:9`) ; bande cible protéines `#22c55e` (`:52-54, 57`) ; courbe `#06B6D4`
  (`:55-56`) ; barres hydratation `#0ea5e9` (`:74`, **bleu hors palette** — ni
  `--primary` `#06B6D4`, ni `--sport-swim` `#06b6d4`).

### 2.2 Surfaces colorées
- **Pilules période** actives : fond `rgba(6,182,212,0.12)` (`SuiviSection.tsx:90`).
- **4 tuiles de bilan** (`Tile`, `SuiviSection.tsx:44-52`) : fond `--bg-card2` +
  bordure neutre (pas de couleur sémantique).
- **Barre régularité** : remplissage vert/jaune/rouge selon `loggedPct`
  (`SuiviSection.tsx:125-127`).
- **Bande verte « cible protéines »** dans le chart (`SuiviCharts.tsx:52`).
- 2 modules en état **« Unavailable »** (texte gris, pas de surface colorée) —
  charge d'entraînement (`:106-108`) et readiness (`:118-120`).

### 2.3 Typographie
- **Monospace (DM Mono)** : valeurs des tuiles (`fontSize:21` `Tile`,
  `SuiviSection.tsx:48-49`) + label cible chart (`SuiviCharts.tsx:57`). Conforme DS.
- **Tailles distinctes** (px) : `{8 (chart), 10, 11, 12, 13, 21}` → **6 valeurs**.
  C'est l'onglet le plus homogène ; le `21` des tuiles est la plus grande valeur de
  métrique de la page.

### 2.4 Bordures
Carte conteneur (`cardStyle`) + 4 tuiles bordées + 6 cartes `Card`
(`SuiviSection.tsx:24-32`, chacune `1px solid var(--border)`) + 3 pilules période.
**Estimation : ~14 bordures.** Les `Card` internes ré-ajoutent une bordure à
l'intérieur de la carte `cardStyle` déjà bordée → **double encadrement** (carte
dans carte).

### 2.5 Composants
- **Locaux à SuiviSection** : `Card`, `Tile`, `Unavailable` (définis dans le
  fichier, `:24-52`) — **ne réutilisent pas** le `cardStyle`/`sectionTitle` de la
  page, ni un composant `Card` partagé global. Donc 3ᵉ définition locale de « carte ».
- Charts SVG raw maison (`AdherenceByTypeChart`, `ProteinGkgChart`,
  `HydrationChart`) conformes à la règle « zéro lib de chart ».

### 2.6 Badges & répétitions
- **Tile ×4** (Jours loggés / Adhérence / Kcal moy. / Protéines) : même composant
  répété.
- **Card ×6** dans la grille 2 colonnes : structure répétée, dont 2 affichent le
  même bloc « Unavailable ».

## Onglet 4 — « Composition » (`tab === 'body'`)
Rendu : `page.tsx:1840-2046`. Composant : `WeightChart` (défini dans `page.tsx`).

### 2.1 Couleurs en dur
- `#06B6D4` : pilules période 30j/3m/1an (`1863-1864`), toggles de métrique
  (`1887-1888`), cellule « Actuel » / « Écart objectif » (`1912, 1917`), lien
  « Connecter → » (`1854`), lien « Relié à Mon plan → » (`2012`), courbe lissée du
  chart (`WeightChart`, `page.tsx:495`).
- `#22c55e` : pastille « balance connectée » (`1848`), ligne cible « cible » du
  chart (`481-482`).
- `#94a3b8` : points de mesure bruts du chart (`page.tsx:492`).
- `rgba(6,182,212,0.12)` : fonds actifs des pilules/toggles (`1863, 1887`).

### 2.2 Surfaces colorées
- **Bannière source de mesures** : fond `--bg-card2` + pastille verte `#22c55e` si
  balance connectée (`1846-1850`), sinon bannière neutre (`1851-1856`).
- **Pilules période** (30j/3m/1an) actives : `rgba(6,182,212,0.12)` (`1859-1868`).
- **Toggles métrique** ×5 (Poids/Masse grasse/Masse musculaire/FFMI/IMC) actifs :
  `rgba(6,182,212,0.12)` (`1873-1895`).
- **Carte stats** (Actuel/Min/Max/Variation/Tendance/Écart) : fond `--bg-card2` +
  bordure neutre (`1911`).
- Le reste (formulaire de saisie, objectif) sur fonds neutres `--input-bg` /
  `--bg-card2`.

### 2.3 Typographie
- **Monospace (DM Mono)** : cellules stats (`1907`), inputs numériques poids/MG/MM
  (`1957, 1973, 1989`), labels d'axe + cible du chart (`471, 482, 499`). Conforme DS.
- **Tailles distinctes** (px) : `{8 (chart), 9, 10, 11, 12, 14, 18}` →
  **7 valeurs**.

### 2.4 Bordures
Carte conteneur (`cardStyle`) + bannière source + 3 pilules période + 5 toggles
métrique + carte stats + 4 inputs de mesure + 1 input objectif + séparateur
`borderTop` objectif (`2004`). **Estimation : ~16 bordures**, dominées par les
8 pilules/toggles côte à côte.

### 2.5 Composants
- **Partagés** : `Button` (variant secondary, `1994, 2033`), `WeightChart` (local
  au fichier `page.tsx:419-506`).
- **Inline / locaux** : pilules, toggles, carte stats (closure `cell()`,
  `1904-1909`), formulaire, bannières — tous inline.

### 2.6 Badges & répétitions
- **Toggle métrique ×5** : même bouton répété via `.map` (`1874-1895`).
- **Pilule période ×3** (`1860-1867`).
- **Cellule stat ×6** via la closure `cell()` (`1912-1917`).
- **Input numérique ×4** (date/poids/MG/MM) : même style inline répété (`1934-1991`).

---

# PHASE 3 — Audit transversal rapide

Méthode : grep des polices de nombres (`DM Mono` / `Barlow Condensed` / `stat-number`),
des hex en dur et des fonds rgba colorés (vert/rouge/jaune/cyan) par dossier de page.

## 3.1 Pages principales

### Planning (`src/app/planning/` — 2 fichiers `.tsx`)
- **Police des nombres** : `DM Mono` (191 occurrences), `Syne` titres (57). Pas de
  `stat-number`/Barlow. → cohérent avec Nutrition.
- **Surfaces colorées** : oui, massives — ~640 hex en dur, ~66 fonds rgba colorés.
  Le DS note lui-même (§2.3) que Planning utilise encore `run:#22c55e` (vert) et
  `swim:#38bdf8` hors tokens sport.
- **Cohérence cartes** : cartes stylées inline, même logique que Nutrition (pas de
  composant Card partagé).

### Performance / Stats-Training (`src/app/performance/` — 7 fichiers)
- **Police des nombres** : `DM Mono` (153), `Syne` (88). Cohérent.
- **Surfaces colorées** : oui — ~459 hex en dur, ~100 fonds rgba colorés (le plus
  coloré des dossiers échantillonnés).
- **Cohérence cartes** : inline, propre à la page ; pas de `cardStyle` partagé avec
  Nutrition.

### Recovery (`src/app/recovery/` — 27 fichiers)
- **Police des nombres** : `DM Mono` (14 fichiers concernés), `Syne` (54). Cohérent
  mais usage mono plus dilué.
- **Surfaces colorées** : oui — ~302 hex en dur, ~39 fonds rgba colorés.
- **Cohérence cartes** : multiples composants locaux, style propre ; pas de carte
  partagée.

### Record / Recording (`src/app/record/` — 1 fichier)
- **Police des nombres** : **aucune** ref `DM Mono`/`Barlow`. Les nombres ne suivent
  pas la convention métrique (DM Sans par défaut, `record/…:274`). **Divergence.**
- **Surfaces colorées** : quasi nulles (4 hex, 1 rgba) ; gradient cyan→bleu
  `#06B6D4→#2563EB` (`record/…:296`).
- **Cohérence cartes** : style propre, minimal.

### Progression (`src/app/progression/` — 4 fichiers, page bonus)
- **Police des nombres** : ni `DM Mono` ni Barlow ; `Syne` (2). Les nombres ne sont
  pas en police métrique. **Divergence** (à confirmer composant par composant).
- **Surfaces colorées** : faibles (18 hex, 4 rgba).
- **Cohérence cartes** : style propre.

## 3.2 Conclusion — nature du problème

**Réponse : (c) les deux — un design system à la fois incomplet ET ignoré/contredit
par le code.** Justification, une phrase par page :

- **Design system incomplet** : il documente des tokens couleur/typo mais **ne
  définit aucun token de radius ni d'espacement** (`globals.css` n'a ni `--radius-*`
  ni `--space-*`), et ses propres valeurs `--primary`/`--ai-accent` **divergent** de
  celles écrites dans `globals.css` (`#00c8e0` vs `#06B6D4`, `#8b5cf6` vs `#9D7DFF`).
- **Nutrition (4 onglets)** : le DS est **ignoré** sur la couleur — `--primary`
  existe mais `#06B6D4` est réécrit en dur ~30×, l'accent IA violet `#8b5cf6` est
  utilisé hors composant Coach IA (règle absolue §9.8 violée), et les surfaces
  Low/Mid/Hard redéclarent des rgba au lieu des tokens `--zone-*-bg` existants.
- **Planning** : le DS est **ignoré** sur les couleurs sport (vert/bleu clair hors
  tokens), comme le DS l'admet lui-même (§2.3).
- **Performance** : DS **respecté sur la typo** (DM Mono) mais **ignoré sur la
  couleur** (100 fonds rgba colorés inline, aucun token).
- **Recovery** : même schéma — typo conforme, couleurs en dur, cartes locales non
  partagées (DS **partiellement appliqué**).
- **Record / Progression** : le DS est **ignoré sur la typo des nombres** (pas de
  DM Mono), contredisant directement la règle absolue §9.5.
- **Composants** : aucune des pages ne partage de composant `Card`/`Badge`/`Pill` ;
  chaque vue **re-définit localement** sa carte (Nutrition a déjà 3 définitions de
  carte distinctes : `cardStyle`, `Card` de SuiviSection, `Tile`), ce qui est le
  symptôme d'un DS non outillé (incomplet) **et** non suivi (ignoré).

---

### Annexe — inventaire chiffré (faits bruts)

| Page / dossier | hex en dur | fonds rgba colorés | nombres en DM Mono | nombres en Barlow/stat-number |
|---|---:|---:|---:|---:|
| nutrition (page.tsx) | 91 | — | 24 refs | 0 |
| planning | 640 | 66 | 191 | 0 |
| performance | 459 | 100 | 153 | 0 |
| recovery | 302 | 39 | (14 fichiers) | 0 |
| record | 4 | 1 | 0 | 0 |
| progression | 18 | 4 | 0 | 0 |

| Onglet Nutrition | tailles de police distinctes | bordures (est.) | badges/blocs répétés |
|---|---|---:|---|
| Aujourd'hui | {8,9,10,11,12,13,14,16,18,24} (~10) | ~12-15 | statut ×4, donut ×4 |
| Mon plan | {8,9,10,11,12,13,15,18} (8) | ~24 | carte L/M/H ×3, case calendrier ×14 |
| Suivi | {8,10,11,12,13,21} (6) | ~14 | Tile ×4, Card ×6 |
| Composition | {8,9,10,11,12,14,18} (7) | ~16 | toggle ×5, cellule stat ×6, input ×4 |
