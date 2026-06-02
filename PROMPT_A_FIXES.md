# PROMPT_A_FIXES — Page activité : thème boîtes + espacements + alignement

## FIX 1 — Boîtes d'explication thème définitif
- Chercher "dérive cardiaque", "durée cumulée", blocs d'explication
- Remplacer toutes couleurs hardcodées par CSS variables
- background → var(--bg-card2) / var(--bg-alt) / var(--bg-card)
- color → var(--text) / var(--text-body)
- borderColor → var(--border)
- Supprimer tout style inline ou Tailwind forçant fond sombre

## FIX 2 — Espacement entre graphiques
- marginBottom: 32px minimum entre sections
- paddingTop: 24px début de section
- Titres de section : marginBottom: 16px
- Graphiques individuels : marginBottom: 20px entre courbes

## FIX 3 — Alignement des courbes
- Même margin-left pour axes Y
- Labels Y : min-width: 48px
- Zones de tracé commencent et finissent au même pixel

## Fichiers
- `src/app/activities/page.tsx`
