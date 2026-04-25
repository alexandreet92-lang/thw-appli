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
