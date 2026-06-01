# PROMPT_TRAINING_PAGE — Sidebar Supabase + UI fixes page Activités

## FIX 1 — Sidebar Supabase (toujours visible, icons + hover expand)
- Remplacer l'aside transform-based par une sidebar fixed 52px
- `sidebarOpen` → `sidebarExpanded` (hover state, timeout 150ms onLeave)
- Hover → width: 220px, labels visibles (overflow visible)
- Items : BarChart2 / Search / TrendingUp + label + sous-label
- Supprimer backdrop overlay et pull-tab
- Icône dans wrapper 36×36px, borderRadius 8px
- Actif : borderLeft cyan, bg rgba(6,182,212,0.08), icône+label cyan

## FIX 2 — Liste pleine hauteur
- Wrapper page : minHeight 100vh → flex column + overflow hidden
- Main content : flex: 1, overflow-y: auto, minHeight: 0

## FIX 3 — App dropdown avec vrais logos
- Logo `/logos/apps/strava.png` (28×28, borderRadius 6px, fond blanc)
- Logo `/logos/apps/polar.png` (idem)
- Garmin : cercle coloré #007CC3 + initiales "GC" (pas de logo)
- Header "Connexions" dans le dropdown
- Action button "Connecter"/"✓ Connecté" aligné à droite

## FIX 4 — Bouton aide BookOpen
- Importer BookOpen depuis lucide-react
- Remplacer bouton `?` par BookOpen 15px
- Background var(--bg-card2), border var(--border), pas de couleur cyan

## Fichier modifié
- src/app/activities/page.tsx
