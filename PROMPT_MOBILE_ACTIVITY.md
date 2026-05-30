# PROMPT_MOBILE_ACTIVITY — Redesign complet de la page activité sur MOBILE

## Objectif
Redesign complet de la vue détail d'une activité sur MOBILE (< 768px).
Sur DESKTOP (≥ 768px) : rien ne change.

## Partie 1 — Sidebar déjà masquée
Sidebar déjà masquée sur mobile (`!isMobile && (...)` dans TrainingPageInner). ✓

## Partie 2 — Header fixe mobile (52px)
- Position : fixed, top:0, left:0, right:0, height:52px, zIndex:100
- Fond : var(--bg), borderBottom : var(--border)
- Contenu : [ChevronLeft → onClose] [ActivityTitle flex:1] [MoreHorizontal → setShowDeleteConfirm(true)]
- Bouton "Supprimer" existant dans le héro : masqué sur mobile
- `SectionAnalyse` : bouton "← Retour à la liste" masqué sur mobile (header fixe prend le relais)

## Partie 3 — Composant `ActivityTitle.tsx`
- `src/components/activity/ActivityTitle.tsx`
- Props : `activityId: string`, `initialName: string | null`
- Affichage : span cliquable → input inline (autoFocus)
- onBlur / Enter → save via `supabase.from('activities').update({ title: value }).eq('id', activityId)`
- Escape → annule l'édition sans save
- Style compact : fontSize:14, fontWeight:700, color: var(--text)

## Partie 4 — Carte GPS mobile pleine largeur + plein écran
- Hauteur mobile : 340px, borderRadius : 0 (pas 16)
- Pas de toggle externe sur mobile ; état fullscreen interne dans `ActivityMapCard`
- Bouton Maximize2 interne (en haut à droite, toujours visible sur mobile) → position:fixed, inset:0, zIndex:999, height:100dvh
- Bouton Minimize2 pour sortir du plein écran

## Partie 5 — Stats grid 2×3
- 6 cartes en grille 2 colonnes sur mobile (après la carte GPS)
- Métriques : Distance, Durée, Watts moy. (vélo) / Allure moy. (course), D+, TSS, Vitesse
- Fond : T.surface, border : T.border, texte label muted + valeur bold

## Partie 6 — Sections dans l'ordre (mobile uniquement)
1. DONNÉES : label-value rows (les 5 blocs de données existants)
2. COURBES : SyncCharts
3. ZONES : ZoneBars uniquement (pas de toggle Donuts, pas de donuts)
4. COURBE DE PUISSANCE : PowerCurveChart (h=180px)
5. DÉCOUPLAGE : DecouplingChart — masqué par défaut, toggle "Voir le graphique"
6. DURÉE CUMULÉE : HrCumulativeChart — masqué par défaut, toggle "Voir le graphique"
7. Bouton Supprimer pleine largeur rouge en bas

## Partie 7 — Séparateurs de sections
- uppercase, fontSize:10, fontWeight:700, letterSpacing:0.9, borderBottom:1px solid var(--border), paddingBottom:5
- Déjà appliqué via le composant `Section` existant

## Fichiers modifiés
- `src/components/activity/ActivityTitle.tsx` (nouveau)
- `src/components/activity/ActivityMapCard.tsx`
- `src/app/activities/page.tsx`
