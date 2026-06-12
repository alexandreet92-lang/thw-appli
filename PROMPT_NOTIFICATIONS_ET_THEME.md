# PROMPT — Correctifs : Notifications (surpage) + Training Bloc overlay (thème)

## Phase 0 (diagnostic)
1. Bouton cloche : `<Link href="/notifications">` dans **`src/components/shared/DesktopShell.tsx`**
   (l. 92) et **`src/components/shared/MobileShell.tsx`** (l. 128) → navigation vers la route.
2. Surpage Training Bloc : `src/components/planning/BlocDetailOverlay.tsx`
   (+ picker `src/components/planning/FocusPicker.tsx`).
3. Couleurs en dur dans l'overlay : **déjà migrées** vers les tokens de thème au lot
   « Correctifs » précédent (`var(--bg-card)`, `var(--bg-card2)`, `var(--border)`,
   `var(--text)`, `var(--text-mid)`, `var(--text-dim)`). Grep de contrôle = vide.
4. Route `/notifications` : `src/app/notifications/page.tsx` (état vide) — **conservée**.

## Correctif 1 — Notifications en surpage
- Nouveau composant `src/components/shared/NotificationsOverlay.tsx` : overlay centré
  (createPortal, scale .92→1), fond `var(--bg-card)` + `var(--border)`, ✕ + clic sur le
  fond = fermeture, état vide « Rien de neuf pour l'instant ».
- DesktopShell + MobileShell : la cloche devient un `<button onClick={() => setNotifOpen(true)}>`
  (même style/SVG), state `notifOpen`, montage de `<NotificationsOverlay/>`. La cloche ne
  navigue plus ; la route `/notifications` reste disponible (non supprimée).

## Correctif 2 — Training Bloc overlay : fond adapté au thème
Le projet n'a pas `--card/--muted/--foreground` (shadcn) ; on utilise les tokens RÉELS
(`var(--bg-card)` = panneau, `var(--bg-card2)` = surfaces 2, `var(--border)`, `var(--text)`,
`var(--text-mid)`, `var(--text-dim)`). Migration déjà effectuée pour `BlocDetailOverlay.tsx`
et `FocusPicker.tsx` au lot précédent — vérifié : plus aucun fond/texte sombre en dur.
Couleurs fonctionnelles conservées : `#22d3ee` + `rgba(34,211,238,…)`, sport, `#ef4444`,
`#04141a` (texte sur cyan).

## Checklist
- [x] Cloche : ouvre une surpage centrée (scale .92→1), ne navigue plus.
- [x] Surpage notifications : fond `var(--bg-card)`, s'adapte au thème.
- [x] Clic fond / ✕ → ferme la surpage.
- [x] Surpage Training Bloc jour = fond clair ; nuit = fond sombre (`var(--bg-card)`).
- [x] Picker Focus : même adaptation thème.
- [x] Aucun hex de fond en dur dans BlocDetailOverlay ni le picker.
- [x] Couleurs fonctionnelles (cyan, rouge, sport) non modifiées.
- [x] `npm run build` passe.

## Contraintes
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
