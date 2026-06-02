# PROMPT_DETAIL_SEMAINE — Refonte panneau détail semaine

## Fichier modifié
- src/app/activities/page.tsx (WeekDetailModal + usage inline SectionDonnees)

## Architecture
- WeekDetailModal : fonction autonome, remplace l'ancienne (non utilisée) + le bloc inline BottomSheet
- Module-level constant WK_HR_ZONES (ParsedZone[]) défini juste avant WeekDetailModal
- SectionDonnees : remplace le bloc inline lines 3193-3277 par <WeekDetailModal>

## Props WeekDetailModal
```typescript
{ week, activities, zones, onClose }
week: { week: string; total: number; time: number; dist: number; count: number; sports: Map<string, number> }
activities: Activity[]  // full paginated list with streams
zones: TrainingZoneRow[]
onClose: () => void
```

## Hooks internes
- useState<string>('all') → sportFilter
- useWindowWidth() → isMobile (< 768)
- useMemo: weekStart, weekEnd, weekActs, prevWeekActs, sportsPresent, daysOfWeek, tssBySport, filteredActs, hrTimesZ, bikeTimesZ

## Sections
1. Header : titre semaine, pills sport (couleur+nom+count), comparaison vs préc.
2. Stats 6 KPIs : Temps / Distance / D+ / TSS / FC moy / Séances
3. Ligne 1 (2 cols desktop) : Répartition semaine | TSS total
4. Ligne 2 (2 cols desktop) : Polarisation FC (sélecteur) | Polarisation puissance cyclisme
5. Pleine largeur : Zones FC détaillées (sélecteur)
6. Pleine largeur : Activités cliquables → /activities?id=<id>

## Layout
Desktop (≥768) : overlay modal maxWidth=900px, overflowY auto, 2-col grid pour lignes 1 et 2
Mobile (<768)  : BottomSheet existant (handle + arrondi 20px natif), 1 colonne

## HR polarisation (3 bandes)
Z1+Z2 → Endurance #10B981 | Z3 → Tempo #F97316 | Z4+Z5 → Haute int. #EF4444
Sélecteur Tous/sport filtrent les streams.heartrate

## Power polarisation (bike uniquement)
bikeZones depuis zones.find(z => z.sport === 'bike') → buildZones()
Z1+Z2 → Endurance | Z3 → Tempo/Seuil | Z4+Z5 → VO2/Anaérobie
Si aucune donnée watts → "—"

## Navigation activité
window.location.href = `/activities?id=${act.id}`
(deep-link existant dans la page, route /activities?id=xxx)

## Streams null-safety
a.streams ?? (a.raw_data?.streams as StreamData | null)

## Règles
- stat-number className sur tous les grands chiffres
- T tokens partout (T.bg, T.bgAlt, T.surface, T.border, T.text, T.textMuted, T.textSub)
- Données manquantes → "—", jamais inventées
- SPORT_COLOR pour couleurs barres/accents
- SPORT_LABEL pour labels sport
