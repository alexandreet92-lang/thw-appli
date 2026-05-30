# PROMPT_SIDEBAR_HOVER — Hover sidebar desktop + suppression Athlètes

## FIX 1 — Ouvrir la sidebar au survol du hamburger (desktop only)

Sur desktop (≥ 768px), survoler le bouton hamburger ouvre la sidebar.
La sidebar reste ouverte quand la souris est dessus.
Elle se ferme 250ms après que la souris quitte la sidebar.
Le clic continue à fonctionner comme avant (toggle).

### Handlers à ajouter

```ts
const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
```

Bouton hamburger :
```tsx
onMouseEnter={() => {
  if (window.innerWidth < 768) return
  if (closeTimer.current) clearTimeout(closeTimer.current)
  setSidebarOpen(true)
}}
```

Conteneur sidebar :
```tsx
onMouseEnter={() => {
  if (closeTimer.current) clearTimeout(closeTimer.current)
}}
onMouseLeave={() => {
  closeTimer.current = setTimeout(() => setSidebarOpen(false), 250)
}}
```

## FIX 2 — Supprimer l'item Athlètes de la navigation

Retirer l'entrée "Athlètes" (ou "Athletes") du tableau NAV dans la sidebar.
Ne pas supprimer la page `/athletes` elle-même.

## Fichiers modifiés
- `src/components/shared/Sidebar.tsx`
