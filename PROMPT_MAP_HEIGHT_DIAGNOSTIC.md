# PROMPT_MAP_HEIGHT_DIAGNOSTIC — Espace noir entre la map et le sheet en position collapsed

**Mode :** lecture seule. Aucune modification de code.

---

## Q1 — Structure JSX actuelle

**Fichier :** `src/app/activities/page.tsx` (l. 5409-5495)

```tsx
<>
  <div data-fullscreen-activity="" style={{ position: 'relative', minHeight: '100vh' }}>

    {/* ── CARTE HERO — sticky, reste collée au top pendant le scroll ── */}
    <div
      ref={mobileMapRef}
      className="thw-activity-map-sticky"
      style={{
        position: 'sticky',
        top:      0,
        width:    '100%',
        height:   '60vh',
        zIndex:   1,
        overflow: 'hidden',
      }}
    >
      {polylinePoints && polylinePoints.length >= 2 ? (
        <ActivityMapCard
          activity={a as unknown as Record<string, unknown>}
          mobileHero={true}
          hoverGps={hoverGps}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${col}33 0%, ${col}11 100%)`, … }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: col, opacity: 0.25 }} />
        </div>
      )}
      <button onClick={onClose} className="thw-activity-back-btn" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 20px)', left: 12, … }}>
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>
    </div>

    {/* ── SHEET draggable — transform géré via ref pour 60fps (pas via state React) ── */}
    <div
      ref={sheetRef}
      data-bottom-sheet=""
      className="thw-activity-sheet"
      style={{
        position:      'relative',
        zIndex:        2,
        marginTop:     '-20px',
        background:    'var(--bg)',
        borderRadius:  '20px 20px 0 0',
        boxShadow:     '0 -4px 24px rgba(0, 0, 0, 0.08)',
        minHeight:     '50vh',
        paddingBottom: 120,
        /* transform appliqué via sheetRef.style dans les useEffects + handlers */
      }}
    >
      <div className="thw-activity-sheet-handle" onTouchStart={…} onTouchMove={…} onTouchEnd={…}>
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--info-border)' }} />
      </div>
      {/* … titre, sport·date, stats, records, etc. … */}
    </div>
  </div>
</>
```

Refs présents :
- `mobileMapRef` → wrapper `.thw-activity-map-sticky`
- `sheetRef`     → sheet `.thw-activity-sheet`

---

## Q2 — CSS du conteneur map `.thw-activity-map-sticky`

### Styles **inline** (sur le JSX, l. 5416-5423)
```ts
position: 'sticky',
top:      0,
width:    '100%',
height:   '60vh',     // ← FIXE
zIndex:   1,
overflow: 'hidden',
```

### CSS dans `globals.css` (l. 755-758)
Aucune règle ne cible directement `.thw-activity-map-sticky` lui-même. Seul un sélecteur descendant existe :
```css
.thw-activity-map-sticky .leaflet-container {
  will-change: transform;
  transform-origin: center center;
}
```

**Conclusion** : la hauteur du wrapper est `60vh` **statique**, **inline**, et n'a aucun lien dynamique avec quoi que ce soit dans le runtime React. Aucune transition CSS sur `height` (donc même si on changeait `height` en JS, ce serait instantané sans animation, sauf à ajouter une `transition: height …`).

---

## Q3 — CSS du conteneur `.leaflet-container`

### CSS dans `globals.css` (l. 755-758)
```css
.thw-activity-map-sticky .leaflet-container {
  will-change: transform;
  transform-origin: center center;
}
```

### Styles appliqués par `ActivityMapCard` (mode `mobileHero=true`, `src/components/activity/ActivityMapCard.tsx:97-105`)
Le wrapper qui héberge `<ActivityMapInner>` reçoit :
```ts
cardStyle = {
  position:     'relative',
  width:        '100%',
  height:       '100%',     // ← fill le parent (mobileMapRef wrapper = 60vh)
  borderRadius: 0,
  overflow:     'hidden',
  isolation:    'isolate',  // contient les z-indexes Leaflet (ajouté commit d9c1d61)
}
```

### Styles internes Leaflet
Le `.leaflet-container` est rendu par `react-leaflet` / Leaflet. Il prend par défaut `width: 100%; height: 100%` du parent → donc **hérite indirectement de la hauteur 60vh du wrapper sticky**.

### Style inline JS dynamique (handlers du drag)
Dans les handlers `onSheetTouchMove` / `onSheetTouchEnd` / les useEffects `[winH]` et `[sheetPos]`, on applique sur `.leaflet-container` :
```ts
leaflet.style.transformOrigin = 'center center'
leaflet.style.transition      = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'  // (ou 'none' pendant le drag)
leaflet.style.transform       = `scale(${computeMapScale(offset)})`
```

→ **Le transform `scale()` zoome VISUELLEMENT le contenu de la map** (les tiles paraissent agrandies vers le centre) **mais ne change pas la hauteur du wrapper ni du `.leaflet-container`**. Aucun `style.height = …` n'est appliqué.

---

## Q4 — Lien entre position du sheet et hauteur de la map

**Aucun.**

Recherche exhaustive dans `src/app/activities/page.tsx` :
- ❌ Aucun `useEffect` qui ajuste `mobileMapRef.current.style.height`
- ❌ Aucun calcul du type `mapHeight = window.innerHeight - sheetVisibleHeight`
- ❌ Aucun binding entre `currentOffsetRef` et un quelconque `height` du conteneur map
- ❌ Aucune valeur dérivée de `sheetPos` ou de l'offset ne touche au layout vertical de la map

Le seul lien existant entre le drag et la map est le **scale du `.leaflet-container`** (transform 1.0 → 1.15 selon la position du sheet, calculé par `computeMapScale(offset)`). Le scale ne change PAS la dimension du containing block — c'est une transformation visuelle qui agit après le layout.

**Donc le wrapper map a une hauteur fixe de 60 vh, il n'y a aucun lien avec la position du sheet.**

---

## Q5 — Comportement visuel actuel

### Layout (positions dans le flow normal)
- **Wrapper sticky map** : `top: 0`, `height: 60vh` → occupe les 60 premiers vh du wrapper `data-fullscreen-activity` (sticky reste visible en haut tant que le wrapper est dans le viewport)
- **Sheet** : `position: relative`, `margin-top: -20px` → commence à `60vh - 20px` dans le flow (donc visuellement collé au bas de la map, overlap 20px)
- **Transform translateY du sheet** : ajoute un décalage visuel à la position layout du sheet

### Trois positions

| Position | translateY appliqué | Position visuelle du **TOP** du sheet | Bas visible de la map | Espace entre la map et le sheet |
|---|---|---|---|---|
| `expanded`  | -42vh | ≈ `60vh − 20px − 42vh` ≈ **18vh** | 60vh (sticky) | sheet **par-dessus** la map (overlap +42vh) |
| `default`   | 0     | ≈ `60vh − 20px` ≈ **60vh**         | 60vh (sticky) | 0 (overlap visuel 20px) |
| `collapsed` | +25vh | ≈ `60vh − 20px + 25vh` ≈ **85vh**  | 60vh (sticky) | **≈ 25 vh d'espace noir** (background `data-fullscreen-activity` qui est `var(--bg)` → noir en dark mode) ← **bug rapporté** |

### Scale change la hauteur du wrapper ?
**Non.** Le `transform: scale(X)` appliqué au `.leaflet-container` zoome visuellement mais ne change ni la hauteur du `.leaflet-container` (héritée à `100%` du parent = 60vh) ni la hauteur du wrapper (60vh statique). Le scale agit **après** le layout, c'est une transformation de paint/composite uniquement.

### Confirmation : map reste à 60vh dans les 3 positions
| Position | Hauteur du wrapper | Hauteur du `.leaflet-container` | Effet visuel |
|---|---|---|---|
| expanded | 60vh | 60vh (mais ≥ 42vh masqués par le sheet) | scale 1.15 → tiles agrandies, contenu masqué partiellement |
| default | 60vh | 60vh | scale ~1.056 → tiles légèrement zoomées |
| collapsed | 60vh | 60vh | scale 1.0 → tiles normales, **mais sheet décalé +25vh laisse un trou noir de 25vh sous la map** |

---

## Q6 — Hauteur de viewport disponible

### Variables existantes dans le code
- **`winH`** (state) :
  ```ts
  const [winH, setWinH] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  )
  ```
  Mis à jour au resize via `window.addEventListener('resize', () => setWinH(window.innerHeight))`. Utilisé dans `getOffsetForPos`, `computeMapScale`, et le clamp des handlers.

- **`window.innerHeight`** : valeur courante du viewport. Sur mobile iOS (Safari standalone PWA), inclut la zone status bar mais exclut la barre du bas Safari quand visible (selon la version d'iOS).

### Pas de calcul de la barre Safari bottom
- Aucun calcul `window.innerHeight - bottomBar` dans `activities/page.tsx`
- Aucune utilisation de `window.visualViewport.height`
- L'app n'a pas de variable dédiée pour la « hauteur visible utilisable »

### Variables CSS related
Dans `globals.css` :
- `--header-height: 56px` (en haut, masqué pour la fiche activité via `body:has([data-fullscreen-activity])`)
- `--safe-b: env(safe-area-inset-bottom, 0px)` (safe area iOS bas)
- L'outer `<main>` mobile a `paddingBottom: 'calc(80px + env(safe-area-inset-bottom))'` (mais reset à `0` quand `[data-fullscreen-activity]` est présent)

### Visualisation actuelle des hauteurs (viewport 800px exemple)
- `window.innerHeight` ≈ 800
- `60vh` = 480px (hauteur wrapper map fixe)
- `winH * 0.25` = 200px (offset `collapsed`)
- `winH * 0.42` = 336px (offset `expanded`)

En position `collapsed`, le sheet a `translateY(+200px)` (sa position visuelle est décalée de 200 px vers le bas) → **trou de 200 px** entre le bas de la map (480 px) et le top visuel du sheet (480 - 20 + 200 = 660 px) = 200 px d'espace noir.

---

## Synthèse — Cause unique

La hauteur du wrapper `.thw-activity-map-sticky` est **statique à `60vh`** (inline). Le drag du sheet applique uniquement :
1. Un `transform: translateY(...)` sur le sheet
2. Un `transform: scale(...)` sur le `.leaflet-container` (zoom visuel, pas de redim layout)

Aucun pont JS ne lie `currentOffsetRef` à la hauteur du wrapper map. Donc quand le sheet descend en `collapsed` (translateY +25 vh), le sheet est shifté visuellement vers le bas mais la map reste à 60 vh → un espace noir apparaît entre les deux.

### Pistes de fix (non implémentées, hors scope du diagnostic)

1. **Lien JS direct dans les handlers** : dans `onSheetTouchMove` et `onSheetTouchEnd` + les useEffects, ajouter
   ```ts
   if (mobileMapRef.current) {
     const minH = 0.18 * winH      // expanded
     const maxH = 0.60 * winH + 0.25 * winH  // collapsed = 60vh + 25vh = 85vh
     const default_ = 0.60 * winH
     // map height = default + offset (puisque offset négatif = expanded, positif = collapsed)
     mobileMapRef.current.style.height = `${default_ + offset}px`
   }
   ```
   Avec transition CSS appropriée pour le snap.

2. **Variante CSS-only** : remplacer `transform: scale(...)` par un vrai redimensionnement de la map via `mobileMapRef.style.height` qui suit `currentOffsetRef`. Garder le scale léger pour l'effet « zoom » Strava.

3. **Variante calc()** : exprimer la hauteur du wrapper comme `calc(60vh - var(--sheet-offset))` et mettre à jour la variable CSS `--sheet-offset` au lieu du `transform: translateY`.

**Aucune modification effectuée.**
