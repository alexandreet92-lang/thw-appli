# PROMPT_THEME_SYSTEM — Système de variables de thème pour les boîtes de contenu

## Problème
Des boîtes de contenu (explication dérive cardiaque, durée cumulée par FC, etc.)
apparaissaient en blanc sur fond sombre parce que leurs couleurs étaient codées en dur
(#F8FAFC, #ffffff, #0F172A, etc.).

## Solution appliquée

### Étape 1 — Variables CSS dans globals.css
Ajout en fin de fichier d'un bloc de variables CSS :
- `:root` pour le mode clair
- `.dark` pour le mode sombre (classe Tailwind)
- `@media (prefers-color-scheme: dark)` pour le mode sombre système

Variables créées :
- `--info-bg` / `--info-border` : fond et bordure des boîtes d'information
- `--zone-good-bg` / `--zone-good-border` : zone verte
- `--zone-med-bg` / `--zone-med-border` : zone jaune
- `--zone-bad-bg` / `--zone-bad-border` : zone rouge
- `--text-title` / `--text-body` / `--text-muted` / `--text-label` / `--text-value`

### Étape 2 — Remplacement dans src/app/activities/page.tsx
Toutes les couleurs hardcodées des boîtes d'explication remplacées par les variables :
- `#F8FAFC` → `var(--info-bg)`
- `#E2E8F0` → `var(--info-border)`
- `#F0FDF4` / `#BBF7D0` → variables zone-good
- `#FEFCE8` / `#FDE68A` → variables zone-med
- `#FEF2F2` / `#FECACA` → variables zone-bad
- `#0F172A` → `var(--text-title)`
- `#475569` → `var(--text-body)`
- `#64748B` → `var(--text-muted)`
- `#94A3B8` (labels texte) → `var(--text-label)`

### Non modifié
- Couleurs des courbes SVG (#60A5FA, #F87171, #818CF8, #F472B6, #6EE7B7, #94A3B8 courbe altitude)
- Couleurs d'état (#10B981, #F59E0B, #EF4444, #DC2626, #D97706, #16A34A)
- Couleurs de texte dans les zones colorées (#166534, #92400E, #991B1B)
- [data-sheet-panel] déjà géré
- CSS de print dans planning/page.tsx (light intentionnel)

## Résultat
Les boîtes d'explication s'affichent correctement en fond sombre (#1E293B)
en mode dark. Les zones verte/jaune/rouge restent colorées dans des teintes sombres.
