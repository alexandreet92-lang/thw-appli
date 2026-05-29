# PROMPT_BOTTOMSHEET_FIX — Fond transparent BottomSheet

## Problème
`var(--background)` ne résout pas dans le contexte du panel BottomSheet
→ fond transparent, contenu illisible par-dessus la page.

## Fichier
- src/components/ui/BottomSheet.tsx

## Fix
Panel div (background: 'var(--background)') :
1. Supprimer `background: 'var(--background)'` du style inline
2. Ajouter `className="bg-white dark:bg-slate-950"` sur ce div

## Résultat attendu
- Thème clair : fond blanc opaque
- Thème sombre : fond #020617 opaque
