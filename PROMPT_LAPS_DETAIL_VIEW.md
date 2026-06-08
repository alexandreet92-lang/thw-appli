# PROMPT_LAPS_DETAIL_VIEW — Vue laps slide-in + bottom sheet détails

## Fichiers
- **NOUVEAU** : `src/components/activity/LapsDetailView.tsx` (~750 lignes, self-contained)
- `src/app/activities/page.tsx` — import + state + 2 boutons `Voir tous les tours` + montage du composant

## Niveau 1 — `LapsDetailView` (slide droite→gauche)

### Ouverture
- `position: fixed; inset: 0; z-index: 1000`
- Animation `lapsViewIn 0.3s cubic-bezier(0.4,0,0.2,1)` : `translateX(100%) → 0`
- Fermeture symétrique `lapsViewOut` + unmount 320 ms après
- Portal vers `document.body` → s'extrait de tous les containing blocks transformés (sheet draggable, sidebar, etc.)

### Détection dark mode
`matchMedia('(prefers-color-scheme: dark)')` + check `documentElement.classList.contains('dark')` au mount. Re-update sur changement de mode. Sert à choisir entre la palette claire et la palette sombre des couleurs sémantiques.

### Header
- Bouton back rond 36 × 36 `var(--bg-card2)` avec `‹` 22 px, retourne avec animation
- Titre "Tours" 17 / 700 + sous-titre `{sportLabel} · {km} · {durée}` 11 / tabular / var(--text-dim)
- Border-bottom var(--border)

### Bandeau récap
- Background `var(--bg-card2)`, padding 16
- Flex center, gap 10, font 12
- `<strong>Tour N</strong> · {watts}W · {zonePower} · {cadenceDescriptor}`
- `cadenceDescriptor` calculé : `< 70 → En force`, `70-90 → En cadence`, `> 90 → En vélocité`
- Watts en violet `#7c3aed`, séparateurs `·` gris

### Graphique scrollable
- Y-labels sticky absolus à gauche (largeur 32, hauteur 240), 6 paliers du max arrondi à la dizaine + 20 W de marge
- Scroller `overflow-x: auto`, `WebkitOverflowScrolling: touch`, scrollbar masquée
- `BAR_WIDTH = 50px`, container `laps.length × 50`
- **Profil altitude** en arrière-plan via SVG `viewBox`/`preserveAspectRatio="none"` :
  - `fill = #e2e8f0` mode jour / `#1e293b` mode sombre
  - **Strictement contenu** grâce à `overflow: hidden` sur le conteneur des barres
- **Barres** : `<button>` absolute, bottom 0, width 46 (BAR_WIDTH-4), padding interne 1+1
  - Inactive : `#c4b5fd`/`#a78bfa` opacité 0.85/0.7 selon thème
  - Active : `#7c3aed` opacité 0.95
  - Transition `background 0.2s, opacity 0.2s`
- **Active underline** : `position: absolute`, bottom 0, width 46, height 4, radius 2, `transition: left 0.3s cubic-bezier(0.4,0,0.2,1)` → effet "snake" qui glisse d'une barre à l'autre
- **X-labels** : zone 28 px sous les barres, background `var(--bg)` (empêche débordement du fond altitude visuellement), numéros centrés. Actif : 13 / 800 / var(--text), inactif : 12 / 600 / var(--text-dim). Transition color + font-weight 0.2s.
- **Scroll auto** au changement de lap actif : `scrollTo({ left: target, behavior: 'smooth' })` + `scrollIntoView` de la ligne correspondante dans la liste

### Liste "Autres tours"
- Titre uppercase letter-spacing 0.12em fs 10 / 700 / var(--text-dim) padding 16 16 8
- Chaque ligne : `<button>` grid `28px 1fr 1fr 1fr`, padding 14 16, border-bottom var(--border)
- Active : bg `#ede9fe` (jour) / `rgba(124,58,237,0.15)` (nuit) + border-left 3px `#7c3aed` + radius 8
- Numéro fs 14 / 700 (actif : 800 + violet), stats fs 13 / 600 centrées
- Click → setActiveLap + auto-scroll graphique
- `flex: 1; overflowY: auto` → scroll vertical interne

### CTA Détails
- Sticky en bas (`borderTop` var(--border), background var(--bg))
- Bouton plein `#7c3aed`, color #fff, padding 14, radius 12, fs 14 / 700
- Focus → `#6d28d9`, mousedown → `transform: scale(0.98)`
- Texte : `Détails du tour {N+1} ›`

## Niveau 2 — `LapDetailsSheet` (slide bas→haut)

### Animations
- Backdrop `rgba(0,0,0,0.55)` z 1050 : `lapSheetFadeIn 0.3s` / `lapSheetFadeOut 0.28s`
- Sheet z 1100 : `lapSheetUp 0.3s cubic-bezier(0.4,0,0.2,1)` / `lapSheetDown 0.28s`
- Portal sur `document.body`
- Tap backdrop ou croix ✕ → fermeture (avec animation forwards)

### Structure
- `borderRadius: 20 20 0 0`, `maxHeight: 90vh`, `overflowY: auto`
- `maxWidth: 600px; margin: 0 auto` → centré desktop, pleine largeur mobile
- Handle 40 × 4 radius 2 `var(--text-dim)` opacity 0.4
- Header : `Tour N — Détails` 18 / 700 + sub `{km} · {durée} · Zone X` 11 / tabular + ✕ rond 28 × 28

### Hero KPIs 2×2
Grid `1fr 1fr` avec border-right sur la première colonne et border-top sur la 2e rangée + padding-top 14 + margin-top 14 → effet visuel "+" qui sépare les 4 cellules :
- Distance (km) · Watts moy (W, violet `#7c3aed`)
- FC moy (bpm, `#f97316`) · Vit. moy (km/h, `#06b6d4`)
- Label uppercase fs 9 / 600 / 0.1em / var(--text-dim) + value fs 24 / 700 / tabular / couleur sémantique
- Stats vides → `—` en var(--text-dim) sans unité

### Détails (6 lignes)
`DetailRow` flex space-between fs 12 :
- Durée / NP / D+ / D− / Cadence moy (excluant 0 rpm) / Temp. moy
- Calculés depuis les streams sliced par `start_index`/`end_index` du lap
- NP : moyenne glissante 30 s puis moyenne quartique

### Donuts — Répartitions
Grid 2 cols (`gap: 16`) si ≥ 3 donuts, sinon `repeat(N, 1fr)`. Tranches à 0 % masquées.
- **FC zones** (Z1-Z5) : couleurs `#3b82f6 #10b981 #eab308 #f97316 #ef4444`
  - Buckets depuis `hrZones` config user si dispo, sinon fallback 60 % / 70 % / 80 % / 90 % de max(hrSlice)
- **Puissance** (Z1-Z7 Coggan) : violet gradient `#ddd6fe` → `#581c87`
  - Fallback FTP 200 W si non configuré
- **Température** : 7 tranches `#1e40af` (< 10 °C) → `#ef4444` (> 35 °C)
- **Cadence** : 7 tranches `#1e293b` (< 50 rpm) → `#f97316` (> 100 rpm), **0 rpm exclus** (roue libre)

Si toutes les tranches d'un donut sont à 0 → le donut n'est pas rendu (pas de placeholder). Si aucun donut → section masquée.

### MiniDonut
SVG 80 × 80 par défaut, R_OUT = (size/2)-4 = 36, R_IN = (size/2)-18 = 22 → ring épais 14 px. Légende dessous fs 9 / tabular avec dot 7 × 7 + label var(--text-dim) ellipsis + % var(--text) 700.

## Branchement dans `activities/page.tsx`

### State (dans ActivityDetail)
```ts
const [lapsViewOpen,    setLapsViewOpen]    = useState(false)
const [lapsViewInitial, setLapsViewInitial] = useState(0)
```

### Bouton "Voir tous les tours"
Ajouté juste après `<LapsBikeChart …/>` aux 2 call sites (mobile + desktop) :
- Width 100 % mobile, auto desktop
- Background `#7c3aed`, color #fff, radius 10, padding 12 16 / 10 16, fs 13 / 700
- `onClick`: `setLapsViewInitial(0); setLapsViewOpen(true)`

### Mount unique
À la fin de `ActivityDetail`, après le `GaugeEditModal` :
```tsx
<LapsDetailView
  open={lapsViewOpen}
  onClose={() => setLapsViewOpen(false)}
  initialActiveLap={lapsViewInitial}
  laps={a.laps ?? []}
  streams={a.streams ?? null}
  sportLabel={SPORT_LABEL[a.sport_type] ?? a.sport_type}
  totalDistanceM={a.distance_m ?? null}
  totalDurationS={a.moving_time_s ?? null}
  ftp={bikeZoneRow?.ftp_watts ?? null}
  bikeZones={bikeZones}
  hrZones={hrZones}
  maxHrEst={estimateMaxHr(profile.birth_date)}
/>
```

## Non implémenté (out of scope MVP)

- **Tap direct sur une barre du `LapsBikeChart` original** → ouvre la vue : nécessiterait de modifier `LapsBikeChart` (panneau de détail interne existant). Pour l'instant, l'entrée est le bouton "Voir tous les tours" placé juste sous le chart.
- **Swipe-down sur le handle pour fermer le bottom sheet** : pour l'instant fermeture via tap backdrop ou croix ✕.
- **Mini-pulse `scaleY(0.97)` au tap sur une barre** : remplacé par la transition `background 0.2s + opacity 0.2s` au changement d'état actif.

## Inchangé
- `LapsBikeChart` original (panneau de détail interne préservé)
- `GaugeEditModal`, `SelectionSheet`, `ActivityCurves` — tous intacts
- Données : `LapData` avec `start_index` / `end_index` (déjà présents) → slice direct des streams

## Vérification
- ✅ `npm run build` exit 0
- ✅ Bouton "Voir tous les tours" sous le LapsBikeChart (mobile + desktop)
- ✅ Slide droite-gauche 0.3s
- ✅ Header back + titre + sous-titre + bandeau récap avec cadence descriptor
- ✅ Graphique scrollable horizontal mobile, Y-labels sticky, profil altitude contenu, active underline qui glisse
- ✅ Liste lap-rows active highlight + scroll auto
- ✅ CTA Détails sticky → bottom sheet slide bas-haut
- ✅ Hero KPIs 2×2 + détails 6 lignes + 4 donuts conditionnels
- ✅ Donuts : tranches 0 % masquées, donut entier masqué si vide, section masquée si 0 donut
- ✅ Portal sur `document.body` (vue + sheet) → indépendant de tout containing block
- ✅ Mode jour + nuit (palettes adaptatives PURPLE_PALE_DAY/NGT, ALT_BG_DAY/NGT)
