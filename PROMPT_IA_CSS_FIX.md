# PROMPT IA CSS FIX

## Étape 1 — Localisation du CSS

Aucun fichier CSS séparé pour le panneau IA. Tous les styles `.aip-*` et les variables CSS `--aiq-*` sont **inline** dans un `<style>` block JSX d'`AIPanel.tsx` (lignes 18696-18828).

Files référencant `.aip-` ou `--aiq-` :
- `src/components/ai/AIPanel.tsx` — définit tout
- `src/components/ai/AIHeader.tsx` — l.44 utilise `var(--aiq-bg)`
- `src/components/ai/QuickActionsSheet.tsx` — utilise `var(--aiq-bg)` pour le fond du bottom sheet

## Étape 2 — Règles CSS sur les items conv

Grep des règles `.aip-*` :
- `.aip-root` (root panel, `background: var(--ai-bg)`)
- `.aip-root.closed`, `.aip-root.fullscreen`
- `.aip-body`, `.aip-chat-col`, `.aip-messages` (layout flex, scrollbar)
- `.aip-textarea` (font-size mobile)
- `.aip-input-wrap:focus-within` (focus shadow)
- `.aip-hist-list`, `.aip-hist-item`, `.aip-hist-dots` — **vestiges morts** de l'ancienne sidebar (la nouvelle AISidebar n'utilise pas ces classes)
- `.aip-plus-scroll`, `.aip-model-pill` — scrollbars + pill hover

**Aucune règle `.aip-conv-item` ou équivalent.** Les items conv sont créés par AISidebar.tsx en pur Tailwind — aucun fond gris CSS-side.

## Étape 3 — Variable `--aiq-bg`

```
.aip-root          → --aiq-bg: #ffffff   (light, blanc — pas gris)
html.dark .aip-root → --aiq-bg: #141414   (dark, légèrement plus clair que --ai-bg #0A0A0A)
```

Light mode déjà blanc → pas la source du problème "fond gris items".

Cependant en dark mode, `--aiq-bg` (`#141414`) ≠ `--ai-bg` (`#0A0A0A`). Cette différence crée une inconsistance visible : le header AI apparaît légèrement plus clair que la zone messages.

**Fix appliqué** : aligner `--aiq-bg` dark sur `#0A0A0A` (= `--ai-bg`) pour cohérence.

## Étape 4 — Border NavItems

Aucun. Les NavItems Projets/Training/Networks utilisent uniquement les classes Tailwind du composant `NavItem` (font-medium, transition-colors, hover bg, active bg). Pas de `border` ni `border-b` ni `divide-y`.

## Étape 5 — AIHeader inline style

**Trouvé** dans `src/components/ai/AIHeader.tsx:44` :

```tsx
<div style={{
  height: 48, padding: '0 10px',
  display: 'flex', alignItems: 'center', gap: 4,
  flexShrink: 0, background: 'var(--aiq-bg)',
  position: 'relative',
}}>
```

**Fix appliqué** : `background: 'var(--aiq-bg)'` → `background: 'transparent'`.
Le header hérite ainsi du fond du parent `.aip-root` (`var(--ai-bg)` = white/#0A0A0A) — plus de risque d'inconsistance avec le reste du panel.

## Récap modifs

- `AIHeader.tsx:44` : `var(--aiq-bg)` → `transparent`
- `AIPanel.tsx` `--aiq-bg` dark : `#141414` → `#0A0A0A`

Aucune modification de logique, de state ou d'autres fichiers.

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
