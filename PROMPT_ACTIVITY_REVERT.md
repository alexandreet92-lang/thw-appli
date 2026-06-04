# PROMPT_ACTIVITY_REVERT — Revert PROMPT_ACTIVITY_STRAVA_LAYOUT

## Symptôme rapporté
Fiche d'activité mobile : flash visible 0.5 s puis écran blanc total.
Symptôme typique d'un crash JS silencieux après le premier paint.

## Cause probable (hypothèse, non vérifiée)
Le `useEffect` parallax introduit dans le commit `bb6127c` attache un
listener `scroll` à `mobileScrollRef.current` qui pointe sur un wrapper
rendu via `createPortal(document.body)`. Le wrapper est `position:fixed;
inset:0; overflow-y:auto`, et la map `position:sticky` à l'intérieur.
Plusieurs combinaisons peuvent provoquer un crash :
- Le ref est null au mount (déps `[]` mais le portal n'est pas encore
  attaché à body au tick du useEffect)
- La sticky inside fixed + scale via transform crée une boucle de
  layout qui invalide le viewport
- Ou un autre side-effect de la restructuration (suppression de la
  fixed map → sticky, suppression du `slideUpSheet`, etc.)

Plutôt que de patcher à l'aveugle, on revient à un état fonctionnel
et on retentera plus tard avec une approche incrémentale.

## Action
```bash
git log --oneline -20         # confirmé : bb6127c est le commit cassé
git revert bb6127c --no-edit  # revert propre, historique préservé
npm run build                 # vérifié OK avant push
git push origin HEAD:main
```

## Commit reverté
- `bb6127c feat(activities mobile): layout Strava — map sticky + sheet overlap + parallax zoom`
- Revert commit : `741e4c1`
- 2 fichiers changés : `PROMPT_ACTIVITY_STRAVA_LAYOUT.md` supprimé + `src/app/activities/page.tsx` ramené à la version `ecfc574`.

## État après revert
- `src/app/activities/page.tsx` revient à l'implémentation
  `ecfc574 fix(activities mobile): map collée au top via portal + reorder + Records simplifiés` :
  - Mobile rendu via `createPortal(document.body)`
  - Map fixed `top: env(safe-area-inset-top); height: 52vh`
  - Bottom-sheet `marginTop: calc(env(safe-area-inset-top) + 52vh)`
  - Records placés après Stats
  - Animation `slideUpSheet` réactivée
- Pas de scroll-parallax, pas de map sticky, pas de sheet overlap.
- Onglets Training restent masqués (CSS existante inchangée).

## NON-actions (selon consigne)
- Pas de re-tentative du layout Strava
- Pas de nouvelle modif sur la fiche activité
- On reviendra dessus avec une approche incrémentale dans un prochain prompt
