# PROMPT_PERFORMANCE_LAYOUT — Fix grilles responsive (mobile + desktop)

## Problème
- **Mobile** : grille `repeat(2,1fr)` fait déborder les cartes de droite (FTP, VMA, etc.)
- **Desktop** : classes Tailwind `md:grid-cols-4` écrasées par les inline styles → grilles restent en 2 colonnes

## Cause
Les inline styles CSS `gridTemplateColumns: 'repeat(2,1fr)'` ont la priorité sur les classes
Tailwind (`md:grid-cols-4`, `md:grid-cols-3`). Le hook `useWindowWidth` n'était pas importé dans la page Performance.

## Fix — `src/app/performance/page.tsx`

### Ajouter le hook `useWindowWidth` inline (avant les composants)
```ts
function useWindowWidth(): number {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}
```

### ProfilTab — responsive `isMobile = useWindowWidth() < 768`
| Ligne | Ancienne grille | Mobile | Desktop |
|-------|----------------|--------|---------|
| ~561  | `repeat(2,1fr)` + md:grid-cols-3 | `1fr` | `repeat(2,1fr)` |
| ~574  | `repeat(2,1fr)` + md:grid-cols-4 | `1fr` | `repeat(4,1fr)` |
| ~701  | `auto 1fr` + sm:grid-cols-1 | `1fr` | `auto 1fr` |
| ~733  | `repeat(3,1fr)` | `1fr` | `repeat(3,1fr)` |
| ~750  | `repeat(2,1fr)` + md:grid-cols-3 | `1fr` | `repeat(2,1fr)` |
| ~783  | `repeat(3,1fr)` | `1fr` | `repeat(3,1fr)` |

### TestsTab — test cards grid
| Ligne | Ancienne grille | Mobile | Desktop |
|-------|----------------|--------|---------|
| ~2320 | `repeat(1,1fr)` + md:grid-cols-2 | `1fr` | `repeat(2,1fr)` |

### PerformancePage — padding responsive
```tsx
padding: isMobile ? '16px 12px' : '24px 28px'
```

## Fix — `src/app/performance/DatasTab.tsx`
| Ligne | Ancienne grille | Fix |
|-------|----------------|-----|
| ~3626 | `1fr` + md:grid-cols-2 | Ajouter `useWindowWidth`, remplacer par inline responsive |

## Fichiers modifiés
- `src/app/performance/page.tsx`
- `src/app/performance/DatasTab.tsx`
