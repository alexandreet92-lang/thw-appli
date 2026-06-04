# PROMPT_BACK_BUTTON_DIAGNOSTIC — Bouton retour invisible sur la map

**Mode :** lecture seule, aucune modification de code.

---

## TL;DR — Cause identifiée

Le bouton retour est sous les **leaflet-panes** (tilePane z:200, markerPane:600, popupPane:700) qui sont des descendants du conteneur `.leaflet-container` (rendu par `ActivityMapInner`). Comme ce conteneur **ne crée pas son propre stacking context** (position:relative SANS z-index explicite), ses z-indexes internes « fuitent » dans le stacking context parent (le div `position:relative` 50vh). Le bouton, sibling de ce conteneur avec `z-index: 10`, se retrouve **en dessous** des tuiles Leaflet (z:200) → totalement masqué.

L'icône lucide en `currentColor` est correcte. Le CSS thème est correct. Tout est OK SAUF le z-index : il faudrait monter le bouton au-dessus de la palette Leaflet (par ex. `z-index: 1100`) ou créer un stacking context propre sur le conteneur Leaflet (`position:relative; z-index:0` sur `.leaflet-container`).

---

## Q1 — CODE BOUTON

**Fichier :** `src/app/activities/page.tsx`
**Lignes :** 5194–5218

```tsx
{/* Bouton retour — cercle 40px adaptatif (blanc en clair, noir en sombre),
   ombre lisible, safe-area iOS, icône en currentColor */}
<button
  onClick={onClose}
  aria-label="Retour"
  className="thw-activity-back-btn"
  style={{
    position:       'absolute',
    top:            'calc(env(safe-area-inset-top, 0px) + 12px)',
    left:           12,
    zIndex:         10,
    width:          40,
    height:         40,
    borderRadius:   '50%',
    border:         'none',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow:      '0 2px 8px rgba(0, 0, 0, 0.25)',
    padding:        0,
  }}
>
  <ChevronLeft size={20} strokeWidth={2.5} />
</button>
```

**Classes :** `thw-activity-back-btn`
**Inline styles :** position/top/left/zIndex:10/width/height/borderRadius/border:none/cursor/flex/boxShadow/padding (PAS de `background` ni `color` en inline)

---

## Q2 — Tailwind dark mode

**Fichier :** `tailwind.config.js`
```js
module.exports = {
  darkMode: 'class',
  …
}
```

- `darkMode: 'class'` → ✅ les utilitaires `dark:*` sont valides si on les utilisait
- ❗ Ici on n'utilise PAS Tailwind `dark:` sur le bouton — on utilise une classe CSS dédiée + sélecteur `html.dark`. Donc le sujet Tailwind est neutre, l'approche CSS pure fonctionne.

---

## Q3 — Thème

**Variables CSS** (`globals.css` l. 58–101) :
- `:root, .light` définit `--bg #ffffff`, `--text #0d1117`, etc.
- `.dark` définit `--bg #080A0F`, `--text #EEF2F7`, etc.

**Mode sombre déclenché par** : classe `dark` ou `light` sur `<html>`.
- `src/app/layout.tsx:31` → `<html lang="fr" className="dark">` (init côté serveur en dark)
- `src/hooks/useTheme.ts` toggle via `document.documentElement.classList.add('dark'|'light')` à partir de localStorage `thw-theme`
- État courant utilisateur = `dark` (par défaut, sauf opt-out manuel)

**Règles back-button** (`globals.css` l. 737–745) :
```css
.thw-activity-back-btn {
  background-color: #ffffff;
  color: #0f172a;
}
html.dark .thw-activity-back-btn {
  background-color: #0f172a;
  color: #ffffff;
}
```
Spécificité de la 2e règle (0,1,1) > 1ère règle (0,1,0) → en dark, le bouton DOIT avoir bg `#0f172a` + color `#ffffff`. Lucide `<ChevronLeft>` (sans prop `color`) défaut `currentColor` → hérite la `color` blanche du parent → stroke blanc.

→ **Les règles CSS sont correctes.** Le souci n'est PAS thème/couleur.

---

## Q4 — Stacking context (le vrai bug)

**Z-index bouton :** 10 (`zIndex: 10` inline)
**Z-index conteneur map :** Le div parent (50vh) est `position:relative` SANS z-index. Le conteneur Leaflet (`.leaflet-container`) à l'intérieur d'`ActivityMapCard mobileHero` :
```ts
cardStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: 0,
  overflow: 'hidden',
}
```
→ `position:relative` sans `z-index` ⇒ **PAS de stacking context propre**.

À l'intérieur, Leaflet rend des `.leaflet-pane` avec des z-indexes durs :
- `.leaflet-tile-pane` → z-index 200
- `.leaflet-overlay-pane` → 400
- `.leaflet-shadow-pane` → 500
- `.leaflet-marker-pane` → 600
- `.leaflet-popup-pane` → 700

Et on voit aussi dans `ActivityMapInner.tsx:40` un contrôle layer-switcher en `zIndex: 1000`.

**Conséquence du manque de stacking context** : tous ces z-indexes 200-1000 « fuitent » dans le stacking context parent (le div 50vh `position:relative`). Le bouton retour, sibling du conteneur Leaflet avec `z-index: 10`, est **comparé directement** à ces z-indexes 200-1000 → il se retrouve sous les tuiles.

**Overlay entre le bouton et l'utilisateur :** OUI — `.leaflet-tile-pane` (z:200) couvre intégralement le bouton (z:10). Le clic peut passer si la tile pane a `pointer-events: none` à certains endroits, ce qui expliquerait que le bouton soit « clickable mais invisible ».

---

## Q5 — DOM rendu (inférence à partir du code)

Structure DOM rendue sur la fiche mobile (Leaflet-side) :

```html
<div style="position:relative; width:100%; height:50vh; overflow:hidden">

  <!-- ActivityMapCard mobileHero -->
  <div style="position:relative; width:100%; height:100%; border-radius:0; overflow:hidden">
    <!-- ActivityMapInner -->
    <div class="leaflet-container leaflet-touch …" style="position:relative; …">
      <div class="leaflet-pane leaflet-map-pane" style="z-index: 100; transform: …">
        <div class="leaflet-pane leaflet-tile-pane" style="z-index: 200">…</div>
        <div class="leaflet-pane leaflet-overlay-pane" style="z-index: 400">…</div>
        <div class="leaflet-pane leaflet-shadow-pane" style="z-index: 500">…</div>
        <div class="leaflet-pane leaflet-marker-pane" style="z-index: 600">…</div>
        <div class="leaflet-pane leaflet-popup-pane" style="z-index: 700">…</div>
      </div>
      <!-- contrôles Leaflet z:800-900 + custom layer-switcher z:1000 -->
    </div>
  </div>

  <!-- Bouton retour -->
  <button class="thw-activity-back-btn"
          style="position:absolute; top:calc(env(…)+12px); left:12; z-index:10; …">
    <svg /* lucide ChevronLeft, stroke:currentColor */ />
  </button>
</div>
```

**Stacking effectif après cascade** :
- Le parent (50vh, position:relative, no z-index) crée un seul stacking context implicite (le body root)
- À l'intérieur, tous les enfants positionnés stack par leur z-index :
  - `.leaflet-tile-pane` (rendu z:200 par Leaflet via le `leaflet-map-pane` parent z:100, mais les panes nestés héritent et n'ont pas leur propre stacking context auto, donc effectivement z:200 cumulé)
  - Bouton z:10
- 200 > 10 → tile-pane couvre le bouton

**Test rapide possible** (à essayer après réception du diagnostic) : passer `zIndex: 1100` sur le bouton (au-dessus de tous les panes Leaflet et du layer-switcher z:1000). Ou ajouter `z-index: 0` au conteneur Leaflet pour contenir ses propres z-indexes dans un stacking context local.

---

## Synthèse pour le fix (non implémenté ici)

**Cause unique** : `z-index: 10` du bouton vs z-index Leaflet 200-1000 dans le même stacking context parent.

**Pistes (au choix)** :
1. ✅ **Simple** : monter `zIndex: 1100` sur le bouton (au-dessus du layer-switcher Leaflet z:1000 et de toutes les panes)
2. **Plus propre** : isoler le stacking context Leaflet en posant `z-index: 0` (ou `isolation: isolate`) sur `.leaflet-container` ou son wrapper ActivityMapCard → ses z-indexes internes restent contenus et `z-index: 10` du bouton domine
3. **Alternatif** : poser `isolation: isolate` sur le div parent 50vh + `z-index: auto` partout, puis monter le bouton à `z-index: 9999` à l'intérieur

Toutes ces options sont non-destructives. La 1 est la plus rapide à appliquer.

**Aucune modification effectuée.**
