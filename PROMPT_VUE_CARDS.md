# PROMPT_VUE_CARDS — 3ᵉ vue Cards (style Strava épuré)

## Fichiers créés / modifiés
- src/lib/records/format.ts                                 (NEW : helper partagé)
- src/components/activity/RecordsBeaten.tsx                 (import helper au lieu de dup)
- src/components/activity/ActivityCard.tsx                  (NEW : la card)
- src/app/activities/page.tsx                               (toggle 3 vues + branche Cards)

## Toggle 3 vues — segmented control
- Bloc segmenté : container `border: 1px solid var(--border)`, radius 8, padding 3, gap 2
- 3 boutons : Liste (☰), Calendrier (📅), Cards (▦)
- Bouton actif : background `var(--bg-card2)`, color `var(--text)`
- Bouton inactif : transparent, `var(--text-dim)`, hover `var(--text-mid)`
- Icônes SVG inline lucide-style + label texte (caché sous 640px)
- **Persistence** via `localStorage('thw_activities_view')`, restauration au mount

## Layout vue Cards
- Grille : 1 col <768, 2 cols ≥768, max 2 cols + max-width 1200 ≥1024
- Gap : 12 mobile / 16 desktop

## ActivityCard
1. **Header** (padding 14-16-10) : titre 14/700 truncate + ligne sport (dot 6px coloré + Vélo · DD mois YYYY · HH:mm) 10/var(--text-dim)
2. **Map preview** : Mapbox Static Images API
   - `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/path-2.5+{color}-1({URL-encoded polyline})/auto/600x{h}@2x?access_token={NEXT_PUBLIC_MAPBOX}`
   - Color = SPORT_COLOR sans le `#`
   - Hauteur 160 mobile / 180 desktop
   - Pas de marqueur, pas de zoom (carte statique)
   - Si pas de polyline → map masquée, la card prend moins de hauteur
3. **Grid 4 stats** (padding 12-16, grid 4 cols egales, gap 8) :
   - Label 9px uppercase ls 0.08em var(--text-dim) fw 600
   - Valeur 16px fw 700 var(--text) tabular-nums
   - Distance | Durée | D+ | TSS | `—` si manquant
4. **Records (conditionnel)** (padding 0-16-14) :
   - **1 seul** : cercle 22px coloré (rgba accent 0.15) + trophy lucide + durée + valeur + label
   - **2+** : compteurs côte à côte (gap 16) — `[cercle+nb] / All Time` et/ou `[cercle+nb] / Record YYYY`
   - Or `#eab308`, cyan `#06B6D4`, année = year de l'activité
5. **Comportement** :
   - Toute la card cliquable → `setSelected(act)`
   - Hover desktop : border-color → `var(--border-mid)` transition 0.2s
   - Active mobile : opacity 0.85
   - background `var(--bg-card)`, border `var(--border)`, radius 14

## Helper format (NEW lib)
`src/lib/records/format.ts` exporte :
- `DURATION_ORDER: string[]`
- `durationRank(label): number`
- `formatRecordDuration(label): string` (Pmax | 5s | 1' | 1h30 | 2h…)

`RecordsBeaten.tsx` importe `formatRecordDuration` + `durationRank` au lieu de dupliquer.

## Récupération records (anti N+1)
Dans la branche Cards, useEffect au montage charge tous les records `event_type='auto_session'` du user filtrés par `activity_id IN (filtered.map(a => a.id))` en **une seule requête** Supabase. Résultat groupé client-side dans une `Map<activityId, { allTime: [], year: [] }>`. Comme on n'a pas de colonne `is_all_time`, on reconstitue côté client : un record est "All Time" si c'est le max sur son `distance_label` parmi TOUS les records bike du user (manuels + auto). Pour rester simple et exact :
- une seconde query (déjà faite par la page Performance) charge `bestPerLabelAllTime: Map<distance_label, watts>`
- record `auto_session` lié à `activity_id` ∈ visibles → "All Time" si `parseInt(performance) >= bestPerLabelAllTime[distance_label]`, sinon → "Année"

Année affichée = `started_at.slice(0,4)` de l'activité.

## Vérifications
- npm run build : 0 erreur TS
- Toggle 3 vues persisté entre rechargements
- Cards en grille, scroll fluide
- Map Mapbox affichée sur les activités outdoor, masquée sur trainer/indoor
- Records dorés/cyans alignés au design
- Toutes les couleurs via var(--*) hors sémantiques (sport, or, cyan)
