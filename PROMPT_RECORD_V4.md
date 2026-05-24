# PROMPT RECORD V4

## Audit

| Concern | Cause |
|---|---|
| Bouton retour absent | Aucun bouton de back sur la carte |
| Espace blanc sous le panel | `height: calc(100dvh - var(--tabbar-h, 60px))` réservait 60px pour la tabbar — qui est cachée sur /record (V3) → gap visible |
| SportSelector forcé dark | `background: '#1A1A1A'` hardcodé + tous les textes en blanc |

## Fixes

### Correction 1 — Bouton retour
Dans `src/app/record/page.tsx` : nouveau bouton cercle `position: absolute, top: 16, left: 16, zIndex: 1000` au-dessus de la carte. Chevron blanc dans cercle `rgba(0,0,0,0.6)` + backdrop-blur. Cliquable → `router.push('/')` (route home — `/dashboard` n'existe pas).

### Correction 2 — Panel collé au bas
- Wrapper height : `calc(100dvh - var(--tabbar-h, 60px))` → `100dvh` (tabbar cachée sur /record donc plus de réservation)
- Panel : `position: absolute` → `position: fixed, bottom: 0, left: 0, right: 0`
- `paddingBottom: env(safe-area-inset-bottom)` conservé

### Correction 3 — SportSelector theme-aware
- Fond panel : `#1A1A1A` → `var(--bg-card)` (blanc light / sombre dark)
- Texte : remplacer toutes occurrences `#fff` / `rgba(255,255,255,*)` par `var(--text)` / `var(--text-mid)` / `var(--text-dim)`
- Backdrop : déjà `rgba(0,0,0,0.50)` — OK pour les deux modes
- Drag indicator : `rgba(255,255,255,0.20)` → `var(--border-mid)`
- Search bar bg : `rgba(255,255,255,0.10)` → `rgba(127,127,127,0.10)` (visible dans les 2 modes) OU mieux : `var(--bg-card2)` 
- Search icon / placeholder : `rgba(255,255,255,0.50)` → `var(--text-dim)`
- Recents inactif : `rgba(255,255,255,0.12)` → `var(--bg-card2)`
- Recents label inactif : `rgba(255,255,255,0.70)` → `var(--text-mid)`
- Catégorie label : `rgba(255,255,255,0.40)` → `#8C8C8C` (mêmes 2 modes)
- Sport actif : checkmark `#06B6D4` inchangé

## Règles

- Merge direct sur main
- `npm run build` doit passer
- Aucun autre fichier touché
