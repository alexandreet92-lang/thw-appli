# PROMPT_CYCLING_SETTINGS_FIX — 5 fixes réglages vélo

## FIX 1 — Auto-save tous les paramètres
useCyclingSettings.ts : vérifier que updateSetting fait bien un upsert Supabase
à chaque appel avec debounce 500ms. Utiliser settingsRef pour éviter les stale closures.

## FIX 2 — Animation feedback toggles/sélecteurs/nombre
Toggle : gradient + transition bounce cubic-bezier(0.34,1.56,0.64,1).
Select : justChanged state → flash bordure verte 600ms.
NumberInput : bouncing state → scale(1.15) sur la valeur 150ms.

## FIX 3 — Profil athlète : zones depuis training_zones
Table : training_zones, sport='bike', is_current=true.
Champs : ftp_watts, z1_value…z5_value (strings "min-max").
Afficher Z1-Z5 avec couleurs de zone dans la section Profil athlète.
Lien "Configurer dans Performance" si pas de zones.

## FIX 4 — Strava : vrai statut de connexion
Remplacer stravaConnected=false par fetch('/api/strava/connected').
Table réelle : strava_tokens (vérifiée dans lib/strava/tokens.ts).

## FIX 5 — Navigation par sections (accordion)
CyclingSettings.tsx : remplacer le scroll plat par une liste de tiles cliquables.
Clic → sous-page avec animation editor-slide-in/out (slide depuis la droite).
10 sections : pages, navigation, entraînement, notifications, capteurs,
affichage, profil athlète, enregistrement, unités, après la séance.
CyclingSettingsParams.tsx : accepter section? prop pour rendre une seule section.
