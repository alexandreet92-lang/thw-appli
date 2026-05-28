# PROMPT_FITNESS_FIX — Corrections section Fitness + graphe hebdomadaire

## CONTEXTE
THW Coaching — page `/activities` (src/app/activities/page.tsx)

---

## PROBLÈME 1 — Cartes CTL/ATL/TSB affichent du noir

Cause : classes Tailwind construites dynamiquement (`${valColor}`)
non détectées par le scanner JIT → CSS jamais généré.

Fix : remplacer l'intégralité de la section par un JSX explicite
avec des class names STATIQUES (text-cyan-500, text-orange-500,
text-green-500, text-red-500 hardcodés, jamais dans une variable).

Supprimer aussi le conteneur inline-style existant. Remplacer par
bg-card / bg-muted Tailwind pur.

---

## PROBLÈME 2 — Graphe hebdomadaire montre 1 seule semaine

Cause :
- `weeks` useMemo dépend de `inRange` (activités filtrées)
- `inRange` provient de `activities` (50 items paginés)
- `nWeeks = numWeeks(filter)` : quand filter='1w' → nWeeks=1

Fix :
- Requête dédiée dans SectionDonnees :
  `started_at, moving_time_s, distance_m, sport_type`
  sur les 12 dernières semaines, sans limit, une seule fois au montage
- `weeks` useMemo utilise ce dataset, toujours 12 semaines fixes
- Les autres stats (totalDist, etc.) continuent d'utiliser `inRange`

---

## FICHIERS MODIFIÉS
| Fichier | Changements |
|---------|------------|
| `src/app/activities/page.tsx` | Fix 1 + Fix 2 dans SectionDonnees |
