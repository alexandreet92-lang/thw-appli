# PROMPT_MAP_FIX_DIAGNOSTIC — Diagnostic carte non collée au top

**Mode :** lecture seule, aucune modification de code.

---

## TL;DR — Cause identifiée

La carte `position: fixed; top: 0` ne se colle pas au viewport parce qu'elle a **deux containing blocks créés par `transform` dans ses ancêtres** :

1. **`<div className="fade-up">`** (CSS `animation: fadeUp 0.35s ease-out forwards`) — la keyframe applique `transform: translateY(0)` avec `fill-mode: forwards` → l'élément retient un `transform` après animation
2. **`<ScrollReveal>`** = `motion.div` framer-motion avec `variants={{visible:{opacity:1, y:0}}}` — la valeur `y` est animée et reste appliquée comme `transform: translateY(0)` en steady state

CSS spec : **tout `transform` ≠ `none` (même identité) crée un containing block pour les descendants `position: fixed`**. Du coup, `top: 0` de la carte se résout au top de `<div.fade-up>` (le containing block le plus proche), **pas du viewport**. Le décalage = la padding du second `<main>` inner (point Q3 ci-dessous) + tout ce qui se trouve au-dessus du containing block.

Identique au bug SelectionSheet déjà rencontré (PROMPT_ACTIVITY_CSSFIX) — résolu là-bas via `createPortal(document.body)`.

---

## Q1 — Wrapper fiche activité

**Fichier :** `src/app/activities/page.tsx`
**Lignes :** 5161-5163

```tsx
<>
  <div data-fullscreen-activity="" style={{ position: 'relative', minHeight: '100vh' }}>
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '52vh',
      width: '100%',
      zIndex: 10,
    }}>
      {/* ActivityMapCard mobileHero */}
      <button>{/* back */}</button>
    </div>
    <div data-bottom-sheet="" style={{ marginTop: '52vh', ... animation: 'slideUpSheet 0.45s ... both' }}>
      {/* sheet content */}
    </div>
  </div>
</>
```

**Padding/margin du wrapper :** aucun (`position:relative`, `minHeight:100vh`).
**Map :** enfant direct du wrapper, `position:fixed; top:0`. Pas de padding/margin propre.

---

## Q2 — Layout global

**Fichier :** `src/app/layout.tsx`

Mobile branch (l. 58-78) :
```tsx
<div className="flex flex-col md:hidden" style={{ height: '100vh', overflow: 'hidden' }}>
  <Sidebar />
  <main style={{
    width: '100%',
    height: 'calc(100vh - var(--header-height))',
    marginTop: 'var(--header-height)',              // 56px
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'relative',
    zIndex: 10,
    background: 'var(--bg)',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
  }}>
    <PageTransition>{children}</PageTransition>
  </main>
</div>
```

- **Header global :** oui — `<Sidebar>` rend `[data-app-header]` `position:fixed; top:0; height:56` qui pousse `<main>` de 56 px (`marginTop: var(--header-height)`).
- **Safe-area-top :** non sur `<body>` / `<main>` (uniquement bottom dans paddingBottom). `viewportFit: 'cover'` et `appleWebApp.statusBarStyle: 'black-translucent'` sont activés → la status bar iOS overlaie sans pousser le layout.
- **CSS reset existant** (`src/app/globals.css` l. 692-696) :
  ```css
  @media (max-width: 767px) {
    body:has([data-fullscreen-activity]) main {
      margin-top: 0 !important;
      padding:    0 !important;
      height:     100vh !important;
    }
  }
  ```
  Doit annuler la `marginTop: 56px` et le `paddingBottom`. **Ça marche pour l'outer `<main>`**, mais voir Q3.

---

## Q3 — Page Training

**Fichier :** `src/app/activities/page.tsx`
**Fonction :** `TrainingPageInner`

JSX clé (l. 7120-7378) :
```tsx
return (
  <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.fontBody }}>

    {/* ── TOP BAR — masquée quand fiche ouverte ── */}
    <div data-training-topbar="" style={{ position: 'sticky', top: 0, zIndex: 100, background: T.bg }}>
      ...
      {/* ── STRAVA TABS — masquée quand fiche ouverte ── */}
      {isMobile && (
        <div data-training-tabs="" style={{...}}>...</div>
      )}
    </div>

    <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
      {/* sidebar desktop only */}

      {/* ── CONTENT — SECOND <main> ── */}
      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '14px 12px' : '22px 28px 22px 72px' }}>
        ...
        {!loading && !error && section === 'analyse' && (
          <div className="fade-up">                      {/* ← CSS animation: fadeUp forwards → transform retenu */}
            <ScrollReveal>                                {/* ← framer-motion motion.div avec y animé → transform: translateY(0) */}
              <SectionAnalyse activities={activities} ... />
            </ScrollReveal>
          </div>
        )}
      </main>
    </div>
  </div>
)
```

**TROIS éléments problématiques :**

1. **Deuxième `<main>` interne** (l. 7358) : `padding: '14px 12px'` sur mobile.
   Le sélecteur CSS `body:has([data-fullscreen-activity]) main { padding: 0 !important }` matche **les deux** `<main>` (outer + inner). En théorie, l'inner reçoit aussi le reset. **Mais voir le point bloquant n°3.**

2. **`<div className="fade-up">`** (l. 7376) :
   ```css
   @keyframes fadeUp {
     from { opacity: 0; transform: translateY(10px); }
     to   { opacity: 1; transform: translateY(0); }
   }
   .fade-up { animation: fadeUp 0.35s ease-out forwards; }
   ```
   `forwards` = l'élément retient `transform: translateY(0)` après la fin de l'animation. **C'est un transform non-none → containing block pour les descendants fixed.**

3. **`<ScrollReveal>`** (composant `src/components/ui/ScrollReveal.tsx`) :
   ```tsx
   <motion.div
     initial="hidden"  // { opacity: 0, y: 8 }
     whileInView="visible"  // { opacity: 1, y: 0 }
     ...
   >
     {children}
   </motion.div>
   ```
   Framer-motion applique `transform: translateY(0)` en inline style après l'entrée → **second containing block** sur la chaîne.

**Comment la fiche est rendue :** state local `selected` dans `SectionAnalyse` (l. 6411). Quand non-null, early return :
```tsx
if (selected) {
  return (
    <div>
      {!isMobileSA && <button onClick={() => setSelected(null)}>← Retour</button>}
      <ActivityDetail a={selected} onClose={() => setSelected(null)} ... />
    </div>
  )
}
```
Donc le wrapper `<div data-fullscreen-activity>` se retrouve à l'intérieur de `fade-up > ScrollReveal > SectionAnalyse wrapper`.

---

## Q4 — DOM tracing complet (mobile, fiche activité ouverte)

```
<body  margin:0 overflow:hidden>
└─ <div class="flex flex-col md:hidden" height:100vh overflow:hidden>
   ├─ <Sidebar>
   │  └─ <div data-app-header position:fixed top:0 height:56>   ← display:none (body:has rule)
   └─ <main                                                       ← CSS reset margin:0, padding:0, height:100vh
        OUTER : style="marginTop:56px paddingBottom:80+safe-b"
        AFTER RESET (si :has() actif) : marginTop:0 padding:0 height:100vh>
      └─ <motion.div PageTransition height:100% display:flex flex-col>  ← pas de transform résiduel (opacity only)
         └─ <div TrainingPageInner minHeight:100vh>
            ├─ <div data-training-topbar position:sticky>          ← display:none
            └─ <div display:flex maxWidth:1400 margin:0 auto position:relative>
               └─ <main                                              ← MAIN INNER
                    INITIAL : padding:"14px 12px" (mobile)
                    AFTER CSS RESET : padding:0
                    (Mais le reset CSS n'est PAS appliqué à coup sûr si :has() partiellement supporté)>
                  └─ <div className="fade-up"                       ← ★ CONTAINING BLOCK #1 (transform: translateY(0))
                       Sur mobile et desktop, l'animation termine et le forwards laisse le transform.>
                     └─ <ScrollReveal motion.div                    ← ★ CONTAINING BLOCK #2 (transform: translateY(0))
                          framer-motion applique `transform: translateY(0)` en inline après entrée>
                        └─ <SectionAnalyse return wrapper <div>>     ← pas de transform
                           └─ <></>  fragment
                              └─ <div data-fullscreen-activity position:relative minHeight:100vh>
                                 ├─ <div                              ← ★ LA CARTE
                                 │    position:fixed
                                 │    top:0                           ← se résout au top du containing block #1 (fade-up)
                                 │    left:0 right:0 height:52vh zIndex:10>
                                 │   └─ <ActivityMapCard mobileHero>
                                 └─ <div data-bottom-sheet            ← animation slideUpSheet forwards aussi
                                      marginTop:52vh animation:slideUpSheet>
```

**Padding cumulé entre `<body>` et le containing block `fade-up` (si CSS reset des `<main>` fonctionne) :**
- outer main : 0 (reset)
- inner main : 0 (reset par la même règle)
- div max-1400 : 0
- fade-up : top de son parent (= top viewport, théoriquement)

**Si le CSS reset NE s'applique PAS à l'inner main** (`:has()` non supporté / fresh-cache non chargé) :
- inner main : `padding-top: 14px` → fade-up est à 14px du top viewport → map fixed top:0 se cale à 14px

**Espace blanc visible :** ~14 px (cohérent avec ce que rapporte l'utilisateur si l'inner main garde sa padding) OU plus si d'autres ancêtres apportent un offset.

---

## Q5 — Composant carte

**Fichier :** `src/components/activity/ActivityMapCard.tsx`
**Lignes :** 95-105 (cas `mobileHero=true`)

```tsx
if (mobileHero) {
  cardStyle = {
    position:     'relative',
    width:        '100%',
    height:       '100%',         // remplit son parent (qui fait 52vh)
    borderRadius: 0,
    overflow:     'hidden',
  }
}
```

**Wrapper interne :** aucun padding/margin. La carte fille (Leaflet) prend 100% de ce conteneur.
**Pas de transform** propre.

---

## Récap : pourquoi l'espace blanc subsiste malgré PROMPT_ACTIVITY_FULLSCREEN_MAP

Le précédent prompt a correctement :
- masqué `[data-training-topbar]` et `[data-training-tabs]`
- redessiné le bouton retour
- vérifié `[data-app-header]` et l'outer `<main>` (reset existant)

Mais il **n'a pas traité** :
1. La **seconde `<main>` interne** dans `TrainingPageInner` qui a `padding: 14px 12px` sur mobile. Bien que le sélecteur CSS générique `main` cible cette balise aussi, la règle ne s'applique que si :
   - `:has()` est supporté ET le CSS est fresh-loaded, OU
   - `body.hide-app-header` est posée (l'est, via useEffect dans ActivityDetail)
   Dans le doute, l'ajout d'un attribut dédié serait plus robuste.
2. **Les containing blocks créés par `<div className="fade-up">` et `<ScrollReveal>`** : même si toutes les paddings sont zéro, le `position: fixed; top: 0` du wrapper de la carte ne pointe **PAS** au viewport mais au top du `fade-up`. Si fade-up est à `0` du viewport (cas idéal après reset), map sera à 0 — pas de problème visible. Mais ces wrappers RENDENT la carte sensible à toute padding/margin ajoutée à un parent intermédiaire.

**Le fix robuste serait** (à confirmer dans un prompt séparé, pas implémenté ici) :
- Soit rendre le wrapper `<div data-fullscreen-activity>` via `createPortal(document.body)` pour court-circuiter tout containing block, comme on l'a fait pour `SelectionSheet` (PROMPT_ACTIVITY_CSSFIX)
- Soit supprimer `forwards` du `.fade-up` et utiliser un `key` qui force un re-mount pour éviter le transform résiduel
- Soit retirer `y` des variants de `ScrollReveal` (animer en opacity seulement)
- Soit ajouter une règle CSS explicite : `body:has([data-fullscreen-activity]) .fade-up, body:has([data-fullscreen-activity]) [data-scroll-reveal] { transform: none !important; animation: none !important; }`

**Aucune modification n'a été effectuée.**
