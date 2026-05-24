# PROMPT CYCLING FULLSCREEN

## Problème

L'écran compteur vélo (`CyclingScreen.tsx`) utilisait `<div className="fixed inset-0 z-[1200]">`, ce qui devrait recouvrir tout — sauf si la MobileTabBar a un z-index plus élevé ou si le layout Next.js applique un `transform`/`will-change` créant un nouveau stacking context qui piège le `fixed`.

## Fix

Le composant est rendu via `createPortal(<div…>, document.body)` pour s'extraire du layout Next.js. Le portal monte le contenu directement enfant de `<body>` — aucun stacking context parent ne peut le contraindre.

## Changements

- `src/components/record/CyclingScreen.tsx` :
  - Ajout `import { createPortal } from 'react-dom'`
  - Ajout `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])` pour éviter le mismatch SSR
  - Si `!mounted` → `return null`
  - Le `return` JSX est wrappé : `createPortal(<div … />, document.body)`
  - Wrapper passe à `zIndex: 9999`, `width: 100vw`, `height: 100vh`, `backgroundColor: #0A0A0A`

## Aucun autre fichier touché

- `CyclingControls.tsx` / `CyclingDataPage.tsx` / `LapsList.tsx` / hooks / page record : intacts.

## Règles

- Merge direct sur main
- `npm run build` doit passer
