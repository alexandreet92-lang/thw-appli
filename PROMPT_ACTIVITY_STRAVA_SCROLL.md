# PROMPT_ACTIVITY_STRAVA_SCROLL — Layout Strava (sticky + scroll zoom)

## Avertissement respecté
Implémenté en **2 commits séparés** pour rollback indépendant si quelque chose casse :
- Commit A `15e2882` — DOM + CSS (sticky map + sheet overlap)
- Commit B `<this>` — useEffect zoom au scroll (RAF, scroll container dynamique)

Si A est OK mais B casse, `git revert <hash B>` rétablit A sans toucher au reste.

## Étape 1+2 (commit A — déjà pushée)

### Changements DOM/CSS
- `<div data-fullscreen-activity style={{position:'relative', minHeight:'100vh'}}>` — autorise le scroll au-delà de la carte
- Map div :
  ```css
  position: sticky;
  top:      0;
  width:    100%;
  height:   60vh;
  z-index:  1;
  overflow: hidden;
  ```
  La carte « colle » au top du scroll container (outer `<main>`) tant que le wrapper englobant reste à l'écran.
- Sheet `data-bottom-sheet` :
  ```css
  position:      relative;
  z-index:       2;
  margin-top:    -20px;          /* overlap visuel */
  background:    var(--bg);
  border-radius: 20px 20px 0 0;
  box-shadow:    0 -4px 24px rgba(0,0,0,0.08);
  min-height:    50vh;
  padding-bottom:120px;
  ```
- `isolation: isolate` déjà posé sur `ActivityMapCard` mobileHero (commit `d9c1d61`) → contient les z-indexes Leaflet → bouton retour (z:10 dans la map) reste au-dessus.

### Ce qui reste strictement intact
- Tout le contenu sheet : titre, sport·date, stats, records, AI bubble, sections détaillées, courbes, laps, sharedModals
- Bouton retour `thw-activity-back-btn` adaptatif light/dark
- Tag `data-training-topbar` / `data-training-tabs` + masquage tab bar mobile via CSS
- Branche desktop : zéro changement

## Étape 3 (commit B)

### Approche : RAF + scroll container dynamique
`<body>` est `overflow:hidden` (cf. `src/app/layout.tsx`), donc `window.scrollY` reste à 0. Le vrai scroll container est l'outer `<main>` (mobile branch de `layout.tsx`).

Pour éviter d'hard-coder ça, le useEffect cherche le **1er ancêtre scrollable** (`overflowY: auto | scroll`) en remontant le DOM depuis `mobileMapRef`, fallback `window`. Ça reste robuste si l'architecture change.

### Sécurité défensive
- `typeof window === 'undefined'` → SSR-safe
- `window.innerWidth >= 768` → desktop early-return (zéro listener attaché)
- `mapEl` null check (ref pas encore monté)
- `findScrollContainer` borné par parent traversal
- `requestAnimationFrame` throttle
- `passive: true` listener (ne bloque pas le scroll natif)
- Cleanup obligatoire (remove + cancel RAF)
- `leaflet` null check dans le handler (Leaflet est en next/dynamic + ssr:false → `.leaflet-container` apparaît async)

### Implémentation
```ts
const mobileMapRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (typeof window === 'undefined') return
  if (window.innerWidth >= 768) return
  const mapEl = mobileMapRef.current
  if (!mapEl) return

  function findScrollContainer(el: HTMLElement): HTMLElement | Window {
    let cur: HTMLElement | null = el.parentElement
    while (cur) {
      const cs = getComputedStyle(cur)
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') return cur
      cur = cur.parentElement
    }
    return window
  }
  const container = findScrollContainer(mapEl)

  let raf = 0
  const onScroll = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const y = container === window
        ? window.scrollY
        : (container as HTMLElement).scrollTop
      const progress = Math.min(Math.max(0, y) / 600, 1)
      const scale = 1 + progress * 0.15
      const leaflet = mapEl.querySelector('.leaflet-container') as HTMLElement | null
      if (leaflet) {
        leaflet.style.transformOrigin = 'center center'
        leaflet.style.transition      = 'transform 0.1s linear'
        leaflet.style.transform       = `scale(${scale})`
      }
    })
  }

  const target = container as EventTarget
  target.addEventListener('scroll', onScroll, { passive: true })
  return () => {
    target.removeEventListener('scroll', onScroll)
    cancelAnimationFrame(raf)
  }
}, [])
```

`transform: scale(N)` appliqué au `.leaflet-container` directement. La transition CSS 0.1s + le throttle RAF rendent le zoom fluide.

## Pourquoi cette approche est sûre cette fois
- **Pas de portal** (le précédent crash venait de createPortal qui sortait du scroll container `<main>`)
- **Pas de `position: fixed`** sur la carte (bug containing block via fade-up/ScrollReveal)
- **`position: sticky`** est insensible aux containing blocks transformés en ancêtres (CSS spec)
- **Scroll listener sur le bon container** (trouvé dynamiquement, pas hardcoded sur window)
- Toutes les sources d'erreur précédentes (null ref, listener jamais cleanup, sale animation forwards) **explicitement bloquées par les early-returns**

## Vérification
- `npm run build` : ✅ 0 erreur sur les 2 commits
- Mobile attendu (à valider en réel) :
  - Ouverture fiche : map 60vh en haut, sheet avec handle + titre + sport·date d'emblée
  - Scroll bas : map sticky reste au top, sheet remonte par-dessus, leaflet zoom 1 → 1.15
  - Scroll haut : sheet redescend, leaflet dézoome
  - Bouton retour cercle adaptatif visible en haut à gauche
  - Pas d'écran blanc
- Desktop : strictement intact (early-return useEffect + branche desktop séparée)
