# PROMPT_CYCLING_FIXES_V2 — 5 fixes vélo

## FIX 1 — Supprimer tous les emojis
CyclingSettings.tsx : remplacer emojis dans tiles par SECTION_ICONS SVG.

## FIX 2 — Enregistrement paramètres + toast
Réécrire useCyclingSettings.ts : deepSet via JSON.parse/stringify,
debounce 500ms, toast "Enregistré" via ToastProvider dans CyclingSettings.

## FIX 3 — Strava : hook useStravaConnection
Créer hooks/useStravaConnection.ts — fetch /api/strava/connected.
Utiliser dans CyclingSettingsParams à la place du fetch inline.
Afficher badge vert "Strava connecté" quand actif.

## FIX 4 — Police uniforme sur toutes les données
CyclingPage1/2/3 (pour rétro-compat) + CyclingPageData + PagePreview :
récupérer dataFont depuis useCyclingSettings, appliquer sur toutes valeurs numériques.

## FIX 5 — PageEditor header : alignement correct
Remplacer header par layout flex avec retour + input + groupe boutons.
Boutons 32×32, borderRadius 8, SVG 12×12. Compteur N/MAX_FIELDS.
