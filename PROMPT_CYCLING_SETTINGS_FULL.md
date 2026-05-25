# PROMPT_CYCLING_SETTINGS_FULL — Réglages vélo complets (4 sections)

## Structure
Bottom sheet scrollable unique. 4 sections dans l'ordre :
1. Pages de données (existante — non modifiée)
2. Navigation (CyclingSettingsNav)
3. Entraînement (CyclingSettingsTraining)
4. Paramètres (CyclingSettingsParams : alertes, capteurs, affichage, profil athlète, enregistrement, unités, après séance)

## Composants UI (/components/record/settings/)
- types.ts — ThemeColors interface partagée
- SettingsSection.tsx — wrapper section avec titre + SettingsSectionSubtitle
- SettingsRow.tsx — row label/description/right/onClick/disabled
- Toggle.tsx — switch 44x26
- Select.tsx — select natif stylé
- NumberInput.tsx — stepper +/-

## Hook useCyclingSettings.ts
- Charge depuis cycling_settings WHERE user_id
- Si absent : DEFAULT_CYCLING_SETTINGS + upsert
- updateSetting(path, value) : state local + debounce 500ms upsert Supabase
- setNestedValue helper pour path dot-notation (ex: 'navigation.followPosition')

## CyclingSettingsNav.tsx
Toggles/Selects pour : followPosition, autoRecenter, defaultMapType, climbDetection, climbThreshold

## CyclingSettingsTraining.tsx
- Lier une séance : ouvre session picker bottom sheet (planned_sessions, semaine courante)
- linkedSession state local
- showTargetZones, outOfZoneAlert (disabled si pas de linkedSession)

## CyclingSettingsParams.tsx
7 SettingsSection : NOTIFICATIONS & ALERTES, CAPTEURS, AFFICHAGE, PROFIL ATHLÈTE,
ENREGISTREMENT, UNITÉS & MESURES, APRÈS LA SÉANCE

## CyclingSettings.tsx (modifié)
- Supprime anciens blocs Capteurs/Unités/Alertes
- Importe et rend les 3 nouvelles sections après Pages de données
- Passe theme + settings + updateSetting

## Notes
- Table sessions = planned_sessions (title, sport, duration_min, day_index, week_start)
- stravaConnected = false par défaut
- sensorConnected = { hr: false, power: false, cadence: false }
- userWeight depuis useProfile().profile?.weight_kg
