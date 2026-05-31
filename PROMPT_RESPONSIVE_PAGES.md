# Responsive — Nutrition, Récupération, Planning (bulle semaine)

## Problème

Sur desktop (≥ 768px), les pages Nutrition, Récupération et le détail semaine du Planning
s'affichaient en colonne unique étroite, identique au rendu mobile.

## Pages corrigées

### 1. Page Nutrition — `src/app/nutrition/page.tsx`

**Avant :** Sections 3 (Plan nutritionnel) et 4 (Repas de la journée) empilées en colonne unique.

**Après :** Sections 3+4 enveloppées dans `grid grid-cols-1 xl:grid-cols-2 gap-4`.
Les sections 5 (Historique) et 6 (Poids) restent pleine largeur.

Le conteneur principal garde `max-w-screen-2xl mx-auto` et `padding: 16px 20px 0` sur desktop.

### 2. Page Récupération — `src/app/recovery/page.tsx`

**Avant :** 4 sections (Today, Sleep, Trends, DataSources) empilées en colonne unique.

**Après :**
- SectionToday : pleine largeur (span 2 colonnes)
- SectionSleep + SectionTrends : côte à côte en `grid grid-cols-1 lg:grid-cols-2 gap-4`
- SectionDataSources : pleine largeur

### 3. Planning — bulle/détail semaine — `src/app/planning/page.tsx`

Composant : `PlanHeaderAndGraphics`, état `selectedWeek` / panel `selBar`.

**Avant :** Le détail semaine s'affichait inline sous le graphique (largeur = largueur de la carte).

**Après :**
- Mobile (< 768px) : reste inline (comportement actuel)
- Desktop (≥ 768px) : rendu en `position: fixed`, centré via `translate(-50%,-50%)`,
  `minWidth: 600px`, `borderRadius: 12px`, avec overlay semi-transparent derrière.
  `isDesktop` state dans `PlanHeaderAndGraphics`.

## Fichiers modifiés

- `src/app/nutrition/page.tsx`
- `src/app/recovery/page.tsx`
- `src/app/planning/page.tsx`
