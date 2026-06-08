# PROMPT_LAPS_MOBILE_TAP_DIAGNOSTIC — Tap mobile cassé sur les barres

**Mode : lecture uniquement.**

---

## Section A — Code actuel des barres (LapsDetailView l. 696-720)

```tsx
{laps.map((lap, i) => {
  const w = lap.avg_watts ?? 0
  const h = w > 0 ? (w / maxYW) * GRAPH_HEIGHT : 2   // ← HAUTEUR = VALEUR WATTS du lap
  const isActive = i === activeLap
  const lw = lapWidths[i] ?? 0
  const lx = lapPositions[i] ?? 0
  return (
    <button
      key={i}
      onClick={() => setActiveLap(i)}
      style={{
        position: 'absolute', bottom: 0,
        left: lx + 1,
        width: Math.max(0, lw - 2),
        height: h,                                    // ← VARIABLE : 2 à 240 px
        background: isActive ? PURPLE_ACTIVE : purplePale,
        opacity: isActive ? 0.95 : (isDark ? 0.7 : 0.85),
        border: 'none', borderRadius: '3px 3px 0 0',
        cursor: 'pointer', padding: 0,
        transition: 'background 0.2s ease, opacity 0.2s ease, left 0.2s ease, width 0.2s ease',
        zIndex: 1,
      }}
      aria-label={`Tour ${i + 1}`}
    />
  )
})}
```

### Parent immédiat (l. 687-694)
```tsx
<div style={{
  position: 'relative', width: totalGraphW || '100%', height: GRAPH_HEIGHT,
  overflow: 'hidden',
}}>
  {altPath && totalGraphW > 0 && (
    <svg viewBox={`0 0 ${totalGraphW} ${GRAPH_HEIGHT}`} preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <path d={altPath} fill={altBgColor} />
    </svg>
  )}
  {laps.map(...)}    // ← les buttons ici
</div>
```

### Grand-parent scroller (l. 673-680)
```tsx
<div ref={scrollerRef} className="laps-scroller"
  style={{
    marginLeft: Y_AXIS_W, overflowX: 'auto', overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',   // ← CRITIQUE iOS
  }}
>
```

---

## Section B — Q1 à Q5

| Q | Réponse |
|---|---|
| **Q1** : Barres dans un `<svg>` ? | **NON** — chaque barre est un `<button>` HTML positionné en absolute |
| **Q2** : `onClick` directement sur SVG (`<g>`, `<rect>`, `<path>`) ? | **NON** — sur `<button>` HTML |
| **Q3** : `<button>` HTML par-dessus le SVG qui pourrait capturer ? | **OUI** — les `<button>` SONT eux-mêmes les barres (z-index 1, au-dessus du SVG altitude) |
| **Q4** : `touch-action: manipulation` appliqué ? | **NON** — aucune occurrence de `touch-action` dans le fichier |
| **Q5** : Ancêtre avec `pointer-events: none` en cascade ? | **NON** — seuls l'`active-underline` (z 3) et les y-labels (z 3) ont `pointerEvents: 'none'` ; ils sont au-dessus mais explicitement pass-through |

---

## Section C — Éléments suspects qui pourraient intercepter

Recherche `position: absolute|fixed` dans `LapsDetailView.tsx` :

| Ligne | Élément | z-index | pointerEvents |
|---|---|---|---|
| 599 | View root (fixed, inset: 0) | 1000 | défaut |
| 660 | Y-labels container (absolute, left 12 top 16) | 3 | `'none'` ✓ |
| 691 | SVG altitude (absolute, inset 0) | défaut (0) | défaut |
| 707 | **Barres buttons** (absolute, bottom 0) | **1** | défaut |
| 724 | Active underline (absolute, bottom 0) | 3 | `'none'` ✓ |
| 749 | X-labels (absolute) | défaut | défaut |
| 387 | LapDetailsSheet backdrop (fixed) | 1050 | uniquement si `open` |
| 394 | LapDetailsSheet sheet (fixed) | 1100 | uniquement si `open` |

**Aucun élément ne devrait intercepter** dans l'état "vue ouverte, sheet fermée".

---

## Section D — Couverture de la hitbox

- **Largeur** : `lapWidths[i] - 2` px (proportionnelle à `moving_time_s`) — minimum garanti **`MIN_LAP_WIDTH_MOBILE = 95 px`** par lap sur mobile (< 768 px). ✅ Suffisant.
- **Hauteur** : **`h = (avg_watts / maxYW) × GRAPH_HEIGHT`** — donc VARIABLE de 2 px (lap sans watts) à 240 px (lap au max watts). ❌ **Insuffisant pour les laps à faible puissance** :
  - Lap 80 W sur max 320 W → hitbox 60 px de haut
  - Lap 40 W sur max 320 W → hitbox 30 px de haut
  - Lap 0 W (récup) → hitbox **2 px de haut** (impossible à tapper)
  - Lap roue libre / pause → idem

Le `<button>` n'occupe que l'intérieur visible de la barre. Le reste du conteneur (240 px de hauteur) au-dessus de la barre est de l'espace altitude SVG **sans handler**. Si le doigt atterrit là → tap dans le vide.

---

## Section E — Hypothèse de cause (UNE seule)

### **H3 — Hitbox trop petite verticalement**

Le `<button>` est `position: absolute; bottom: 0; height: h` où **h = `(avg_watts / maxYW) × 240`**. C'est la hauteur VISUELLE de la barre.

Conséquence pratique sur mobile :
- L'utilisateur regarde la colonne `n°4` et voit visuellement une barre de 80 px en bas du graphique.
- L'utilisateur pose le pouce SUR la barre → fonctionne (hitbox = bouton).
- Mais souvent le pouce atterrit **AU-DESSUS** de la barre, **dans la zone altitude SVG** (les 160 px restants jusqu'au haut du graphique). À cet endroit il n'y a **AUCUN handler** : ni le `<button>` (positionné en bas, hauteur insuffisante), ni le `<svg>` altitude (pas de onClick), ni un wrapper.
- Résultat : « tap dans le vide » → rien ne se passe.

Pourquoi ça marche sur desktop : avec une souris, le curseur est précis au pixel près. Le clic atterrit exactement sur la barre. La souris ne « rate » pas.

Sur mobile, le doigt est imprécis (>15 px), et naturellement l'utilisateur vise « la colonne » (240 px) plutôt que « la barre exacte » (variable, parfois 30 px).

**Pourquoi pas H1 (SVG iOS) ?** Les barres ne sont pas en SVG (ce sont des `<button>` HTML). H1 écartée.

**Pourquoi pas H2 (intercepteur) ?** L'active-underline et les y-labels ont `pointerEvents: 'none'` explicite. Aucun autre élément en position fixed/absolute n'est au-dessus de la zone barres en z-index. H2 écartée.

**Pourquoi pas H4 (pointer-events: none cascading) ?** Aucune occurrence sur un ancêtre des buttons. H4 écartée.

**Pourquoi pas H5 (touch-action) ?** Plausible secondaire, mais sur Safari iOS le `<button>` HTML reçoit normalement onClick au touch même sans `touch-action` explicite. Si la cause était purement H5, le tap pile au centre de la barre échouerait aussi — alors qu'il fonctionne (l'utilisateur dit que c'est le tap sur LES BARRES qui échoue, donc il a déjà testé). Donc le doigt rate la barre, pas que la barre rejette le tap. H5 écartée comme cause principale.

---

## Section F — Proposition de fix

### Architecture cible

Séparer le **hit target** (zone tappable) de la **barre visuelle** (paint) :

```tsx
{laps.map((lap, i) => {
  const w = lap.avg_watts ?? 0
  const h = w > 0 ? (w / maxYW) * GRAPH_HEIGHT : 2
  const isActive = i === activeLap
  const lw = lapWidths[i] ?? 0
  const lx = lapPositions[i] ?? 0
  return (
    <button
      key={i}
      onClick={() => setActiveLap(i)}
      aria-label={`Tour ${i + 1}`}
      style={{
        position: 'absolute', top: 0, bottom: 0,   // ← TOUTE LA HAUTEUR du conteneur (240 px)
        left: lx,
        width: lw,
        background: 'transparent',                 // ← invisible
        border: 'none', padding: 0,
        cursor: 'pointer',
        zIndex: 1,
        touchAction: 'manipulation',               // ← bonus : optimisation iOS
      }}
    >
      {/* La barre visuelle est un enfant non-interactif */}
      <span style={{
        position: 'absolute', bottom: 0,
        left: 1, right: 1,
        height: h,
        background: isActive ? PURPLE_ACTIVE : purplePale,
        opacity: isActive ? 0.95 : (isDark ? 0.7 : 0.85),
        borderRadius: '3px 3px 0 0',
        transition: 'background 0.2s ease, opacity 0.2s ease, height 0.2s ease',
        pointerEvents: 'none',                     // ← laisse passer vers le <button>
        display: 'block',
      }} />
    </button>
  )
})}
```

### Pourquoi ça règle le problème

1. **Hit target = 240 px de haut × largeur du lap** — quel que soit l'endroit de la colonne où le doigt atterrit, le tap est capturé.
2. La **barre visuelle** est un `<span>` avec `pointerEvents: 'none'` → ne perturbe rien.
3. `touch-action: manipulation` (bonus) désactive le double-tap zoom et accélère la reconnaissance du tap sur iOS.
4. Aucun changement de comportement desktop (le clic souris fonctionne sur n'importe quelle zone de la colonne).
5. **Compatible** avec le layout actuel : positions cumulatives, transitions, dark mode — rien à changer en dehors de cette section.

### Effort
~15 lignes modifiées dans `LapsDetailView.tsx` (seul le bloc `{laps.map(...)}` interne au container des barres). Pas d'impact sur la liste lap-rows, l'altitude SVG, l'active underline, les x-labels.

**Aucune modification effectuée.**
