# PROMPT — Muscu / Hyrox Bug

## BUG
Ouvrir Muscu puis Hyrox (ou inversement) : le second se ferme instantanément.
Une fois bugué, le premier bug aussi.

## CAUSE RÉELLE
Deux problèmes cumulés :

1. `closing=true` persiste dans WorkoutLauncher quand `open` devient false.
   Le composant reste dans l'arbre React (`sport==='strength'||'hyrox'` est toujours vrai)
   donc son state survit. Quand `open` redevient true, `closing=true` est déjà là →
   animation sheet-close immédiate.

2. Le `setTimeout(onClose, 230)` de la fermeture précédente tire encore après
   que le nouveau launcher est ouvert → appelle `setLauncherOpen(false)` et ferme
   le second launcher.

## SOLUTION

### WorkoutLauncher.tsx
- Stocker le timeout dans un `useRef<ReturnType<typeof setTimeout> | null>`
- Cleanup useEffect : annuler le timer au démontage

### page.tsx
- Remplacer `launcherOpen: boolean` par `activeLauncherSport: 'gym'|'hyrox'|null`
- Ajouter `openLauncher(sport)` : si sport différent du courant → null puis nouveau sport après 280ms
- WorkoutLauncher rendu conditionnellement sur `activeLauncherSport` avec `key={activeLauncherSport}`
  → React démonte entièrement l'ancien composant, nouveau montage propre, plus de state résiduel
- `onClose={() => setActiveLauncherSport(null)}` : unmount direct (WorkoutLauncher gère l'animation 230ms en interne)

## Fichiers modifiés
- PROMPT_MUSCU_HYROX_BUG.md
- src/components/record/WorkoutLauncher.tsx
- src/app/record/page.tsx
