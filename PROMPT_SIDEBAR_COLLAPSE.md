# PROMPT_SIDEBAR_COLLAPSE — Sidebar rétractable (style Supabase)

## Objectif
La navigation latérale Données / Analyse / Progression doit pouvoir
se rétracter sur le côté pour laisser plus d'espace aux graphiques.

## Fichier modifié
`src/app/activities/page.tsx` — composant `TrainingPageInner`

## Implémentation

### État ajouté
```ts
const [sidebarOpen, setSidebarOpen] = useState(true)
```

### Persistence localStorage
- Lecture au montage (respecte `isMobile` : false par défaut sur mobile)
- Écriture à chaque changement de `sidebarOpen`
- Clé : `'sidebar_open'`

### Structure layout modifiée
Le `<aside>` desktop est enveloppé dans un div à largeur animée :
- Ouvert : `width: T.sidebarW` (220px)
- Fermé : `width: 0`, `overflow: hidden`
- Transition : 250ms ease sur width + min-width

### Bouton toggle (desktop seulement)
- `position: absolute` dans le conteneur flex (`position: relative`)
- `left: sidebarOpen ? T.sidebarW - 8 : 0` avec transition 250ms
- Icône `‹` / `›`
- Style via `var(--info-bg)` et `var(--info-border)` (thème-aware)

### Mobile
- Comportement inchangé : dropdown accordéon dans le contenu
- `sidebarOpen` forcé à false sur mobile via le premier useEffect
