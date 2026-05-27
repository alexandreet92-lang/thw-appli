# PROMPT_ONBOARDING_PAGE_FIX

## FIX 1 — OnboardingOverlay : scrollable + swipe horizontal

`src/onboarding/system/OnboardingOverlay.tsx`

- Rendre le contenu scrollable sur mobile si le texte dépasse : `overflowY:'auto'`, `WebkitOverflowScrolling:'touch'` sur la zone content
- Ajouter swipe horizontal entre slides : refs `touchStartX` / `touchStartY`, handlers `handleTouchStart` / `handleTouchEnd`. Si deltaX > 50px et |deltaX| > |deltaY| → slide suivant/précédent

## FIX 2 — Bouton `?` dans le header de chaque page

### PageHelp.tsx → mode contrôlé

`src/onboarding/system/PageHelp.tsx`

Supprimer le bouton fixe interne. PageHelp devient un composant contrôlé :
```tsx
interface Props { config: PageOnboardingConfig; show: boolean; onDismiss: () => void }
export function PageHelp({ config, show, onDismiss }: Props) {
  if (!show) return null
  return <OnboardingOverlay config={config} onDismiss={onDismiss} />
}
```

### 8 pages : planning, calendar, session, activities, recovery, nutrition, performance, connections

Chaque page doit :
1. Importer `usePageOnboarding`
2. Appeler `const { show, dismiss, reopen } = usePageOnboarding(CONFIG.pageId, CONFIG.version)`
3. Passer `show={show} onDismiss={dismiss}` à `<PageHelp>`
4. Ajouter le bouton `?` dans le header :

```tsx
<button
  onClick={reopen}
  style={{
    width: 28, height: 28, borderRadius: '50%',
    background: 'rgba(6,182,212,0.1)',
    border: '1px solid rgba(6,182,212,0.25)',
    color: '#06B6D4',
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0
  }}
>
  ?
</button>
```
