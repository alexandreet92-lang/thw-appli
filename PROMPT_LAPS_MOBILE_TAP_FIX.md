# PROMPT_LAPS_MOBILE_TAP_FIX — Séparation hit target / paint des barres

## Cause confirmée (diagnostic précédent)
`<button>` HTML avec `height = (avg_watts / maxYW) × 240` → bouton plus ou moins haut selon les watts du lap. Sur mobile, le doigt vise la colonne entière (240 px) mais la hitbox ne couvre que la hauteur visuelle de la barre. Tap au-dessus → vide → rien.

## Fix appliqué
Le `<button>` couvre désormais **toute la hauteur de la colonne** (240 px). La barre visuelle est un `<span>` enfant en `bottom: 0; height: h` avec `pointerEvents: 'none'` → le tap traverse jusqu'au `<button>` parent.

### Avant (cassé sur mobile)
```tsx
<button
  onClick={() => setActiveLap(i)}
  style={{
    position: 'absolute', bottom: 0,
    left: lx + 1,
    width: Math.max(0, lw - 2),
    height: h,                                    // ← VARIABLE 2 à 240
    background: isActive ? PURPLE_ACTIVE : purplePale,
    border: 'none', borderRadius: '3px 3px 0 0',
    cursor: 'pointer', padding: 0,
    ...
  }}
/>
```

### Après (fix)
```tsx
<button
  onClick={() => {
    console.log('[LAPS] Tap sur barre index:', i)
    setActiveLap(i)
  }}
  aria-label={`Tour ${i + 1}`}
  style={{
    // Hit target : couvre TOUTE la hauteur du conteneur
    position: 'absolute', top: 0, bottom: 0,      // ← 240 px de haut
    left: lx, width: lw,
    background: 'transparent',                    // ← invisible
    border: 'none', padding: 0, margin: 0,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',       // ← pas de halo gris au tap iOS
    WebkitUserSelect: 'none',
    userSelect: 'none',
    touchAction: 'manipulation',                  // ← supprime le 300 ms double-tap delay
    zIndex: 1,
    transition: 'left 0.2s ease, width 0.2s ease',
  }}
>
  {/* Barre visuelle non interactive — pointer-events:none → tap traverse */}
  <span style={{
    position: 'absolute', bottom: 0,
    left: 1, right: 1,
    height: h,
    background: isActive ? PURPLE_ACTIVE : purplePale,
    opacity: isActive ? 0.95 : (isDark ? 0.7 : 0.85),
    borderRadius: '3px 3px 0 0',
    pointerEvents: 'none',
    display: 'block',
    transition: 'background 0.2s ease, opacity 0.2s ease, height 0.2s ease',
  }} />
</button>
```

## Points clés

### 1. Conteneur `.bars-container` a déjà `height: GRAPH_HEIGHT (= 240px)` fixe
Vérifié ligne 687 :
```tsx
<div style={{
  position: 'relative', width: totalGraphW || '100%', height: GRAPH_HEIGHT,
  overflow: 'hidden',
}}>
```
Le `<button>` avec `top: 0; bottom: 0` hérite donc bien des 240 px du parent.

### 2. `pointerEvents: 'none'` sur le `<span>` est crucial
Pour un lap au max watts (barre = 240 px), le `<span>` couvre tout le bouton. Sans `pointer-events: none`, le `<span>` capterait le tap (et n'a pas de handler) → tap perdu. Avec, le tap traverse jusqu'au `<button>` parent.

### 3. `touchAction: 'manipulation'`
Désactive le double-tap-to-zoom iOS sur le bouton → tap immédiatement reconnu (sinon iOS attend 300 ms pour vérifier si c'est un double-tap).

### 4. `WebkitTapHighlightColor: 'transparent'`
Supprime le halo gris translucide qu'iOS dessine au tap par défaut sur les éléments interactifs → l'utilisateur ne voit pas un "flash" disgracieux au tap.

### 5. `transition` sur le `<button>` réduit à `left/width`
La transition `background/opacity` est déplacée sur le `<span>` (puisque c'est lui qui change visuellement). Le `<button>` n'a plus que les transitions positionnelles (left/width au resize).

## Inchangé visuellement
- Position et largeur des barres (positions cumulatives, proportionnelles à `moving_time_s`)
- Hauteur de la barre visuelle = `(avg_watts / maxYW) × 240` (même formule)
- Couleurs `PURPLE_ACTIVE` / `purplePale` selon état actif
- Opacité 0.95 / 0.7-0.85 selon thème
- Active underline, x-labels, altitude SVG : non touchés
- Transitions au resize (left/width) préservées

## Vérification
- ✅ `npm run build` exit 0
- ✅ Hit target = 240 px × `lapWidths[i]` (min 95 mobile / 30 desktop) — tap quel que soit l'endroit dans la colonne
- ✅ Barre visuelle inchangée (même position, même hauteur, même couleur)
- ✅ `touch-action: manipulation` → tap iOS immédiat (pas de 300 ms delay)
- ✅ `-webkit-tap-highlight-color: transparent` → pas de flash gris au tap
- ✅ console.log `[LAPS] Tap sur barre index: X` à chaque tap pour debug
- ✅ Scroll horizontal du graphique préservé (les buttons ne capturent pas le scroll grâce à `touch-action: manipulation` qui ne désactive QUE le double-tap)
- ✅ Aucune régression desktop (clic souris fonctionne sur n'importe quelle zone de la colonne)
