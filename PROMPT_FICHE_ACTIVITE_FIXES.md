# PROMPT_FICHE_ACTIVITE_FIXES — 3 fixes fiche activité

## Fix 1 — Durée Z2 basée sur la puissance (et non la FC)

### Avant
`z2DurationS` était calculé sur `a.streams.heartrate` filtré par `hrZones[1]` (Z2 FC). Trompeur pour le cyclisme où la Z2 puissance est l'indicateur d'endurance pertinent.

### Après
```ts
const z2DurationS = useMemo(() => {
  const wattsStream = a.streams?.watts
  if (!wattsStream || !wattsStream.length || !bikeZones || bikeZones.length < 2) return null
  const z2 = bikeZones[1]
  const time = a.streams?.time
  let dt = 1
  if (time && time.length > 10) {
    dt = (time[10] - time[0]) / 10
    if (!dt || dt <= 0) dt = 1
  }
  const samples = wattsStream.filter(v => v != null && v >= z2.min && v < z2.max).length
  return Math.round(samples * dt)
}, [a.streams?.watts, a.streams?.time, bikeZones])
```

- Gate sur la présence du stream `watts` ET sur `bikeZones` configurées → la ligne est **masquée automatiquement** sur les activités sans puissance (running, swim, etc.) car `z2DurationS` retourne `null`
- Conversion samples → secondes via le `dt` réel du stream (pas hardcodé à 1 s)
- **Label** : `Durée Z2` → **`Durée Z2 (puissance)`** pour clarté

## Fix 2 — Refonte visuelle des graphiques Découplage P/FC et Durée cumulée FC

### Approche pragmatique
Le composant `ActivityCurves` (format Empilé) a une structure spécifique (label column gauche, 3 formats, X temporel). Le **X axis** de ces 2 charts est différent (temps pour Découplage, bpm pour Durée cumulée) → réutilisation directe d'`ActivityCurves` impossible.

**Solution** : alignement visuel (background, area chart, couleurs sémantiques, tooltip neutre multi-lignes) en conservant la mécanique cursor/crosshair existante.

### Modifications appliquées

#### Wrapper SVG
- `background: var(--bg-card2)` + `borderRadius: 10` + `overflow: hidden`

#### Couleurs sémantiques alignées sur ActivityCurves METRIC_DEFS
- Watts/Puissance : `#5b6fff` → **`#6366f1`** (indigo cohérent)
- FC : `#ef4444` → **`#f97316`** (orange cohérent METRIC_DEFS)
- Altitude : `#94a3b8` (gris bleuté)
- Température : `#10b981`

#### Decoupling chart — ajouts visuels
- **Profil altitude en arrière-plan** : `fill="#94a3b8" fillOpacity=0.18` (toujours visible, comme dans ActivityCurves)
- **Aire de remplissage** sous la courbe Puissance : `#6366f1 fillOpacity=0.18`
- Lignes 2 px solid (watts) / 2 px dashed 6,3 (FC)
- Crosshair : `stroke="var(--border-mid)"` au lieu de `T.text` dashed

#### Durée cumulée FC — gradient ajusté
- `stopColor` : `#ef4444` → **`#f97316`** (cohérence orange FC)
- Opacités : `0.2 → 0.02` → **`0.4 → 0.05`** (plus visible)
- Ligne : 2 px solid `#f97316`

#### Tooltip multi-lignes neutre (les 2 charts)
Structure alignée sur ActivityCurves `TooltipNeutral` :
- `background: var(--bg-card)` + `border: 1px solid var(--border)` + `borderRadius: 12`
- `padding: 10px 14px`, `boxShadow: 0 4px 16px rgba(0,0,0,0.10)`
- Header uppercase fs 10 / 0.08em letter-spacing / opacity 0.6 (temps écoulé ou bpm + % FCmax)
- Rows : dot 7×7 couleur sémantique + nom var(--text) opacity 0.65 + valeur 12/700 tabular en couleur sémantique
- Position : suit le curseur (mousemove ref-based), bascule à gauche si trop près du bord droit
- `fontFamily: Inter` inline en sécurité

Le tooltip suit la souris en `position: absolute` relatif au wrapper du chart (pas via createPortal). C'est suffisant car les charts ne sont **pas** dans un ancêtre transformé sur desktop (contrairement au tooltip d'`ActivityCurves` qui dans certaines pages est englobé dans un sheet transformé). Si un jour ces charts se retrouvent dans un sheet, le portal sera nécessaire — pattern documenté par les fixes précédents.

#### Légende — couleurs alignées
`#5b6fff` → `#6366f1` et `#ef4444` → `#f97316` dans les 2 dots de légende sous le decoupling chart.

## Fix 3 — Bouton "Supprimer l'activité" avec bordure outlined rouge

### Avant
- Mobile : `border: '1.5px solid #EF4444'` (déjà présente mais peu visible)
- Desktop : `border: '1px solid #EF4444'` (fine), label tronqué à "Supprimer"

### Après — style spec
```css
.thw-delete-activity-btn        { /* styles inline JSX, hover/active via CSS class */ }
.thw-delete-activity-btn:hover  { background: rgba(239, 68, 68, 0.08); }
.thw-delete-activity-btn:active { transform: scale(0.98); }
```

#### Mobile
- `border: 2px solid #ef4444`
- `padding: 16px 20px`, `borderRadius: 12`
- `fontSize: 15`, `fontWeight: 600`
- `transition: background 0.15s ease, transform 0.1s ease`

#### Desktop
Bouton compact en haut de la fiche (à côté du titre/date) :
- `border: 2px solid #ef4444`
- `padding: 6px 14px`, `borderRadius: 8`
- `fontSize: 13`, `fontWeight: 600`
- Même hover + active

### Confirmation déjà en place
`<BottomSheet>` `Supprimer l'activité` existant (l. 6613) → Annuler + Supprimer rouge plein → `handleDelete` → `supabase.from('activities').delete()` puis `onClose()`. Pattern conservé.

## Inchangé
- `ActivityCurves` (composant principal des courbes) — aucune modif
- Composants `DecouplingChart` / `HrCumulativeChart` — restylage uniquement, logique intacte
- `handleDelete` / `BottomSheet` de confirmation
- `setShowDeleteConfirm` workflow
- Section CARDIO du tableau autre que la ligne Z2

## Vérification
- ✅ `npm run build` exit 0
- ✅ Durée Z2 utilise watts + bikeZones[1], masquée si pas de stream/zones, label `Durée Z2 (puissance)`
- ✅ Decoupling chart : wrapper var(--bg-card2), aire indigo sous Puissance, profil altitude en arrière-plan, tooltip neutre multi-lignes au lieu de la version dense d'avant
- ✅ Durée cumulée par FC : wrapper var(--bg-card2), gradient orange #f97316, tooltip neutre cohérent
- ✅ Crosshair var(--border-mid) (au lieu de T.text dashed)
- ✅ Bouton Supprimer mobile : 2px solid #ef4444, padding 16/20, hover rouge translucide, active scale(0.98)
- ✅ Bouton Supprimer desktop : 2px solid #ef4444, padding 6/14, même comportement
- ✅ Mode jour + nuit (couleurs var() pour tout sauf zones sémantiques)
