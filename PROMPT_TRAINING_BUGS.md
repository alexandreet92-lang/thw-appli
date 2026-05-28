# PROMPT_TRAINING_BUGS — Corrections page Training

## CONTEXTE
THW Coaching (Next.js 15, TS, Tailwind, Supabase).
Page `/activities` — corrections visuelles et overlays.

---

## ÉTAPE 0 — components/ui/BottomSheet.tsx
Composant base de tous les overlays. createPortal vers document.body.
Props : isOpen, onClose, children, title?, icon?

## ÉTAPE 1 — Cartes CTL / ATL / TSB
- Fond codé en dur `rgba(0,0,0,0.18)` → `bg-card` (blanc en thème clair)
- Valeurs 38px, couleurs : CTL=cyan-500, ATL=orange-500, TSB vert/rouge
- Layout flex au lieu de grid pour overflow-x-auto mobile

## ÉTAPE 2 — Sheets "?" CTL/ATL/TSB → BottomSheet (createPortal)
- Remplace l'ancien BottomSheet local (z-index insuffisant)
- 3 sheets : CTL 42j / ATL 7j / TSB = CTL−ATL

## ÉTAPE 3 — Détail semaine → BottomSheet scrollable
- Remplace WeekDetailModal (centré, pas scrollable mobile)
- Grille KPI + répartition sport + liste activités dans le sheet

## ÉTAPE 4 — Bouton "App" remplace "Strava" + "Import"
- Dropdown via createPortal (passe devant nav et FAB)
- 3 items : Strava / Garmin ("Importer" si non connecté) / Polar
- Statut connexion via GET /api/oauth/status

## FICHIERS MODIFIÉS
| Fichier | Changements |
|---------|------------|
| `tailwind.config.js` | Ajout background, foreground, card, muted, border CSS vars |
| `src/components/ui/BottomSheet.tsx` | Créé |
| `src/app/activities/page.tsx` | Étapes 1-4 |
