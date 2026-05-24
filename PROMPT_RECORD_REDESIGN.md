# PROMPT RECORD REDESIGN

## Audit Planning + Performance

Constats sur les pages de référence :

- **Wrapper page** : `<div className="max-w-screen-2xl mx-auto" style={{ padding:'24px 28px' }}>` (perf), variantes équivalentes côté planning.
- **Cards** : `background: var(--bg-card)`, `borderRadius: 14-18`, `border: 1px solid var(--border-mid)` ou `var(--border)`, optionnellement `boxShadow: var(--shadow-card)`.
- **Inputs** : `background: var(--input-bg)`, `border: 1px solid var(--border)`, `borderRadius: 9`.
- **Typographie** :
  - Titres : `fontFamily: 'Syne, sans-serif'`, fontWeight 700, fontSize 18-22.
  - Corps : `fontFamily: 'DM Sans, sans-serif'` (inherited via body).
- **Boutons primaires** : `linear-gradient(135deg, ${col}, ${col}bb)`, Syne, weight 700, fontSize 13, borderRadius 11.
- **Sport tints** : palette `SPORT_BG` + `SPORT_COLOR` (cyan/orange/blue/red/purple/teal) — utiliser pour les hovers/badges.

## Changements vs implementation initiale

Les fichiers Record utilisent Tailwind arbitrary (`bg-[var(--bg)]`) ce qui *fonctionne* mais détonne du style inline des autres pages. Refonte :

### `src/app/record/page.tsx`
- Wrapper redesign : `var(--bg)` (héritage natif body), padding 24/28 desktop, max-w-screen-2xl
- Carte plein écran reste 60% top (cohérent UX mobile)
- Panel bas : `var(--bg-card)` + `border-top: 1px solid var(--border)` + `borderRadius: '24px 24px 0 0'`
- Titre "Enregistrer" : Syne 22 fontWeight 700
- Bouton primaire "Démarrer" : gradient cyan→blue, Syne 14 fontWeight 700, borderRadius 14, height 52
- Bouton secondaire "Créer un parcours" : `var(--bg-card2)` + `1px solid var(--border-mid)`, Syne, même geometry

### `src/components/record/SportSelector.tsx`
- Bottom sheet : `var(--bg-card)` (au lieu de var(--bg)) + `border-top: 1px solid var(--border-mid)` + `borderRadius: '24px 24px 0 0'`
- Titre "Choisir un sport" : Syne 18 fontWeight 700
- 6 items sport : `var(--bg-card2)` + `1px solid var(--border)` + `borderRadius: 14` + hover sport-tinted (utilise `SPORT_BG` / `SPORT_COLOR` du projet)
- Icône 28px conservée, label DM Sans 13 fontWeight 600

### `src/components/record/Toast.tsx`
- Couleurs : `var(--text)` sur fond `var(--bg-card)` + `1px solid var(--border-mid)` + `var(--shadow-card)`
- Plus de "bg-black/85" (incohérent avec light/dark de l'app)

## Pas touché

- `MapBackground.tsx` — déjà OK (dynamic import + Leaflet CSS importé dans globals.css)
- `CyclingScreen.tsx` / `CyclingControls.tsx` / `CyclingDataPage.tsx` — écran compteur volontairement sombre (#0A0A0A), c'est un écran live sport qui doit rester sombre pour lisibilité. Comportement intentionnel, indépendant du thème app.
- Hooks `useGPSTracking`, `useStopwatch` — logique pure
- Migration SQL

## Règles

- Merge direct sur main
- `npm run build` doit passer
- Aucune modif d'autres pages
