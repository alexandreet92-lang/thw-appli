# PROGRESSION_FIXES

## DIAGNOSTIC (avant correction)
- **Routing** : la sidebar globale (`<Sidebar/>`) est dans `src/app/layout.tsx`
  (root) → présente sur **toutes** les routes. Ce n'est donc PAS elle qui
  « disparaît ». Aucun route group `(…)`, un seul `layout.tsx`.
- **Vrai contexte** : le hub est rendu **dans la section Progression de
  `/activities`** (sous-nav `Données / Analyse / Progression`). Les bulles
  faisaient `router.push('/progression/[sport]')` → on **quittait `/activities`**
  → la sous-nav Training (perçue comme « la sidebar ») disparaissait ; le retour
  `router.push('/progression')` allait sur la route autonome, toujours hors
  `/activities`.
- **Shuriken** : `.shuriken-container` = 320 px alors que les bulles sont à
  ~280 px du centre → trop grand, pas de respiration.

## BUG 1 — Shuriken trop grand
`.shuriken-container` : **320 → 210 px** (mobile 200 → 165). Séparation des bras
**−34% → −28%** (proportionnelle, reste fluide). Le logo tient désormais
largement dans les cercles d'ambiance avec respiration avant les bulles.

## BUG 2 — Sous-nav qui disparaît
**Cause** : navigation vers des routes autonomes hors `/activities`.
**Fix** : la vue sport est désormais rendue **INLINE dans la section** (état
interne `progSport`), **sans navigation** → on ne quitte jamais `/activities`,
donc la sidebar globale ET la sous-nav `Données/Analyse/Progression` restent.
- Vue sport extraite en composant réutilisable
  `progression/components/ProgressionSportView.tsx`.
- `ProgressionHub` accepte `onSelectSport?` : si fourni (usage inline dans
  `/activities`), le clic appelle le callback (état interne) ; sinon fallback
  route (`/progression/[sport]`).
- `/activities` : `progSport ? <ProgressionSportView onBack={() => setProgSport(null)} /> : <ProgressionHub onSelectSport={setProgSport} />`.
- Le retour `←` revient au hub **dans la même section** (sidebars intactes).
- La route `/progression/[sport]` reste fonctionnelle (accès URL direct) et
  utilise la même vue (retour → `/progression`).

## VÉRIF
- Progression (sous-nav visible) → clic bulle → vue sport **sans quitter
  `/activities`** (sidebar + sous-nav conservées) → retour `←` → hub, contexte
  intact.
- Shuriken : respiration visible, cercles d'ambiance visibles, séparation des
  bras ne touche pas les bulles.
- `npm run build` passe.
