# UI/UX Pro Max — Design Intelligence THW Coaching

Skill de design appliqué au projet THW Coaching.
Toutes les règles ci-dessous sont tirées directement des specs du projet.
**Rien n'a été importé depuis une source externe.**

## Références visuelles

| Référence | Ce qu'on en prend |
|-----------|------------------|
| **Linear** | Précision, grille serrée, typographie fonctionnelle, pas d'ornement |
| **Strava** | Densité de données, affordance mobile, hiérarchie métrique |
| **Strong** | Dark mode opinionné, badges sport colorés, listes compactes |

## Règles fondamentales

1. Lire `docs/DESIGN_SYSTEM.md` avant toute modification ou création de composant.
2. Jamais de spinner — utiliser des **skeleton screens** à la place.
3. Touch targets minimum **44 × 44 px** sur tous les éléments interactifs.
4. Métriques numériques (TSS, watts, pace, FC, distance) → police **monospace**.
5. Zéro librairie de chart externe — SVG raw uniquement.
6. Les tokens de couleur (zones, sports, accents) ne sont jamais hardcodés inline — utiliser les variables CSS définies dans le design system.

## Zones d'intensité (fixes, immuables)

| Zone | Nom | Couleur |
|------|-----|---------|
| Z1 | Récupération | `#9ca3af` (gris) |
| Z2 | Endurance | `#22c55e` (vert) |
| Z3 | Tempo | `#eab308` (jaune) |
| Z4 | Seuil | `#f97316` (orange) |
| Z5 | VO2max / Sprint | `#ef4444` (rouge) |

## Badges sport (fixes, immuables)

| Sport | Couleur badge | Code |
|-------|--------------|------|
| run | Orange | `#f97316` |
| bike | Bleu | `#3b82f6` |
| swim | Cyan | `#06b6d4` |
| gym | Violet | `#8b5cf6` |
| hyrox | Rose | `#ec4899` |
| rowing | Teal | `#14b8a6` |

## Coach IA

- Accent IA : **violet** `#8b5cf6` — distinct du primaire app (`#00c8e0`)
- Jamais mélanger l'accent IA avec les couleurs sport
- Bulles, panneaux et CTAs IA utilisent toujours cet accent

## Thème

- Mode light par défaut
- Dark mode supporté via variables CSS (`--bg`, `--text`, `--border`, etc.)
- Pas de `dark:` Tailwind inline dans les composants — passer par les variables

## Checklist avant PR composant

- [ ] Touch targets ≥ 44px
- [ ] Skeleton screen si chargement async
- [ ] Métriques en monospace
- [ ] Couleurs zones/sports depuis variables, pas hardcodées
- [ ] Testé light + dark
- [ ] Pas de librairie de chart ajoutée
