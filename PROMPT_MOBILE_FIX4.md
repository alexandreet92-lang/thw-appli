# PROMPT_MOBILE_FIX4 — Correctifs mobile page activité (suite)

## FIX 1 — Bouton retour visible sur fond sombre
- Fond `rgba(0,0,0,0.55)` + `backdropFilter: blur(8px)` + border blanc
- Icône ChevronLeft blanc, strokeWidth 2.5

## FIX 2 — Touch sur les courbes : listener natif passive:false
- useEffect + addEventListener('touchmove', ..., { passive: false })
- Suppression onTouchMove React sur le div conteneur
- setCursorX/setIsOverCharts via handleCursorMove

## FIX 3 — "Découplage" affiché deux fois
- Supprimer le titre de section Section title="Découplage"
- Garder seulement le titre interne du graphique
- Même correction pour "Durée cumulée" si doublon

## FIX 4 — Vitesse : trouver le bon champ
- Tester activity.avg_speed_ms / average_speed / avg_speed
- Convertir m/s → km/h si nécessaire

## Fichiers modifiés
- `src/app/activities/page.tsx`
