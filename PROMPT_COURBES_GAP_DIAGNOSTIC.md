# PROMPT_COURBES_GAP_DIAGNOSTIC — Vide entre toggle et wrapper de courbes

**Mode : lecture seule. Aucune modification de code.**

---

## Q1 — STRUCTURE JSX

**Fichier :** `src/app/activities/page.tsx`

### Call site (l. ~5401+ branche mobile + ~6650+ branche desktop)
```tsx
{a.streams && (
  <Section title="Courbes">
    <ActivityCurves activity={a} />
  </Section>
)}
```

### Composant `ActivityCurves` — branche `format === 'stacked'` (l. 3062-3194)
```tsx
if (format === 'stacked') {
  return (
    <div>
      {FormatToggle}
      {TooltipNeutral}

      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerLeaveOrUp}
        onPointerLeave={onPointerLeaveOrUp}
        onPointerCancel={onPointerLeaveOrUp}
        style={{
          display:      'flex',
          position:     'relative',
          background:   'var(--bg-card2)',
          borderRadius: 10,
          overflow:     'hidden',
          touchAction:  'none',
          cursor:       'crosshair',
        }}
      >
        {/* …colonne labels + colonne charts… */}
      </div>

      {/* Labels axe X commun en bas */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '6px 2px 0 62px', fontSize: 9, color: 'var(--text-dim)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {xLabels.map((l, i) => <span key={i}>{l.label}</span>)}
      </div>
    </div>
  )
}
```

### `FormatToggle` (l. 2911-2957)
```tsx
const FormatToggle = (
  <div style={{
    display:      'inline-flex',
    gap:          2,
    padding:      3,
    borderRadius: 8,
    border:       '1px solid var(--border)',
    background:   'var(--bg-card2)',
    marginBottom: 12,                          // ← 12 px
  }}>
    {/* …3 boutons stacked/overlaid/mono… */}
  </div>
)
```

### `TooltipNeutral` (l. 2959-3001)
```tsx
const TooltipNeutral = (
  <div
    ref={tooltipRef}
    style={{
      opacity:       0,                        // ← invisible, MAIS dans le flow
      transition:    'opacity 0.12s',
      background:    'var(--bg-card)',
      border:        '1px solid var(--border)',
      borderRadius:  12,
      padding:       '10px 14px',              // ← 10 + 10 = 20 px vertical
      marginBottom:  10,                       // ← + 10 px sous la bulle
      boxShadow:     '0 4px 16px rgba(0,0,0,0.10)',
      pointerEvents: 'none',
    }}
  >
    <div ref={tooltipHeaderRef} style={{
      fontSize: 10, opacity: 0.6,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 5, color: 'var(--text)',
    }}>—</div>
    {tooltipNeutralKeys.map(key => {                 // ← 6 rows si 6 métriques
      const def = METRIC_DEFS.find(d => d.key === key)!
      return (
        <div key={key} style={{
          display: 'flex', alignItems: 'center',
          gap: 8, padding: '2px 0',                  // ← 4 px de padding/row
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
          <span style={{ flex: 1, opacity: 0.65, color: 'var(--text)', fontSize: 11 }}>{def.label}</span>
          <span
            ref={el => { tooltipValRefs.current.set(key, el) }}
            style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: def.color, fontSize: 12 }}
          >—</span>
        </div>
      )
    })}
  </div>
)
```

`tooltipNeutralKeys` (l. ~2957) :
```ts
const tooltipNeutralKeys = format === 'overlaid'
  ? presentKeys.filter(k => activeMetrics.has(k))
  : presentKeys                                       // ← TOUTES en stacked
```

---

## Q2 — CSS / Tailwind appliqué

Aucun Tailwind ici. Tout est en `style={}` inline.

| Élément | Style inline pertinent | Hauteur estimée |
|---|---|---|
| **FormatToggle** | `padding: 3`, contenu fs 11 + icône 13 + padding bouton `7px 10px`, `marginBottom: 12` | ~ 36 px + 12 = **~ 48 px** |
| **TooltipNeutral wrapper** | `padding: '10px 14px'`, `marginBottom: 10`, `border: 1px`, `borderRadius: 12` | bordure + padding vertical 22 px |
| TooltipNeutral header (toujours rendu) | `fontSize: 10`, line-height par défaut ~ 1.5 = 15 px, `marginBottom: 5` | **~ 20 px** |
| TooltipNeutral row (× 6 en stacked) | `padding: '2px 0'` (4 px) + contenu max fs 12 line-height 1.5 = 18 px | **~ 22 px / row → 132 px** |
| TooltipNeutral total | 22 + 20 + 132 = **~ 174 px** + `marginBottom: 10` = **~ 184 px** | |
| **Wrapper courbes (containerRef)** | `display: flex`, `borderRadius: 10`, `overflow: hidden`, contenu `6 × 70 px = 420 px` | **420 px** |

> Sur certains user-agents mobiles (iOS Safari), le line-height par défaut peut grimper à 1.6–1.7 pour des fontSize ≤ 12 px, ce qui poussse chaque row à ~ 24 px et porte le tooltip à ~ 200–220 px.

---

## Q3 — Le tooltip est-il toujours dans le DOM ?

**Réponse : A — Toujours rendu dans le DOM, caché via `opacity: 0`. Il OCCUPE son espace dans le flow normal.**

Code de gestion :
```tsx
return (
  <div>
    {FormatToggle}
    {TooltipNeutral}                            // ← Rendu inconditionnel
    <div ref={containerRef} … >
```

`TooltipNeutral` est un `const` JSX **toujours évalué** quand `format === 'stacked'`. Il est rendu en `position: static` (pas de `position: absolute` ni `fixed`), donc il participe au **flux normal** et **réserve sa hauteur intégrale**.

Le `opacity: 0` masque visuellement mais **ne retire pas du flow**. Pour retirer du flow il faudrait `display: none`, `position: absolute`, `visibility: hidden` + `height: 0`, ou un mount conditionnel (`{visible && <…/>}`).

---

## Q4 — Hauteur du tooltip

`TooltipNeutral` n'a **aucun `height` ni `minHeight` explicite**. Sa hauteur est dictée par son contenu :

- Padding vertical : 10 + 10 = **20 px**
- Header (fs 10 + marginBottom 5) : **~ 20 px**
- 6 rows (pad 2 0 + fs 12 line-height 1.5) : **~ 22 px × 6 = 132 px**
- Bordure 2 × 1 px : **2 px**
- **Total intrinsèque : ~ 174 px**
- + `marginBottom: 10` : **~ 184 px** au total dans le flow

Sur une activité vélo avec toutes les métriques présentes (altitude, hr, watts, speed, cadence, temp), c'est bien 6 rows.

Si moins de métriques présentes (`presentKeys.length < 6`), le tooltip est proportionnellement plus court : ~ 64 px (avec 0 row, juste header) jusqu'à ~ 184 px (6 rows).

---

## Q5 — Espace réservé entre toggle et wrapper

Liste exhaustive des éléments dans la zone entre le bas du `FormatToggle` et le top du `containerRef` :

1. **Espace de `FormatToggle.marginBottom`** : 12 px (sous le toggle)
2. **`TooltipNeutral`** : ~ 174 px de contenu + bordures
3. **Espace de `TooltipNeutral.marginBottom`** : 10 px (sous le tooltip)

Total : **~ 196 px** d'espace « invisible » entre les deux éléments visibles (toggle et courbes).

Aucun autre élément intermédiaire, aucun placeholder, pas de div à hauteur fixe additionnelle.

---

## Q6 — Identification du vide

D'après le screenshot (toggle bas à ~ 370 px / Altitude top à ~ 870 px → vide de ~ 500 px) :

### Cause principale (~ 200 px) — **`TooltipNeutral` rendu en flow avec `opacity: 0`**
Bulle multi-lignes inconditionnellement présente, sans `position: absolute`, sans mount conditionnel. Hauteur intrinsèque ~ 174 px + `marginBottom: 10` = ~ 184 px.

### Causes secondaires possibles (~ 300 px restants)

Le tooltip à lui seul n'explique pas l'intégralité des 500 px. Pistes pour les ~ 300 px manquants à vérifier :

1. **`<Section>` wrapper** (composant parent qui enveloppe ActivityCurves). À regarder :
   - `padding-top` interne de `Section`
   - `marginBottom` du titre "Courbes"
   - éventuelles règles CSS globales sur `.section` ou similaires
2. **Line-height mobile** : sur iOS Safari, line-height par défaut sur petits fs peut atteindre 1.7-1.8 → tooltip ~ 210-220 px au lieu de 174.
3. **Box-shadow rendu** : `0 4px 16px` étend visuellement la zone du tooltip mais ne devrait pas affecter le layout. À écarter.
4. **`ActivityCurves` parent `<div>`** : pas de padding/margin appliqués au `<div>` racine de `ActivityCurves` (vérifié l. 3063-3064). Donc pas de contribution ici.
5. **Marge ou padding du sheet draggable** : la fiche est dans un sheet avec son propre `paddingBottom: 120`. À vérifier s'il y a un `paddingTop` sur le contenu du sheet qui s'applique entre les sections.
6. **CSS global ciblant `[data-fullscreen-activity] section` ou similaire** dans `globals.css` — règle qui ajouterait du `gap` ou `padding-top` aux enfants de la fiche.

### Vérification recommandée pour le diagnostic complet
Inspecter dans les DevTools le calc layout réel :
```
FormatToggle.getBoundingClientRect().bottom
TooltipNeutral.getBoundingClientRect().{top, height, bottom}
containerRef.getBoundingClientRect().top
```
La différence `containerRef.top − FormatToggle.bottom` donnera précisément la somme du `marginBottom` du toggle + hauteur du tooltip + son `marginBottom`. Si cette différence vaut ~ 200 px, alors le tooltip est la cause **partielle** (≈ 40 %) et il faut chercher les ~ 300 px ailleurs (probablement dans `Section` ou un wrapper externe).

### Synthèse du suspect principal
**Le `TooltipNeutral` rendu inconditionnellement en flow avec `opacity: 0`** est le coupable identifié de façon certaine pour ~ 184 px. Pour les ~ 300 px restants, l'origine probable est en dehors d'`ActivityCurves` (composant `Section`, structure du sheet, ou règle CSS globale ciblant la fiche d'activité). Une mesure DevTools réelle est nécessaire pour fermer le diagnostic à 100 %.

**Aucune modification effectuée.**
