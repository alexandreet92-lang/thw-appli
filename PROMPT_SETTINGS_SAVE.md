# PROMPT_SETTINGS_SAVE — Réglages : police d'écriture (et tout réglage) appliqué en direct

## Diagnostic

### 1. Comment la police est stockée
`settings.display.dataFont` est stocké dans les tables Supabase sport-spécifiques :
`cycling_settings`, `running_settings`, `hiking_settings`, `mtb_settings`,
`ski_settings`, `trail_settings` — colonne `settings JSONB`.
Les hooks `useXxxSettings()` persiste via `upsert` avec debounce 500ms.

### 2. Comment les autres réglages persistent
Même pattern : toutes les préférences sport passent par Supabase upsert via
les mêmes hooks. La persistance fonctionne. Le bug n'est pas côté Supabase.

### 3. OÙ la police est consommée
Chaque Screen lit `settings.display.dataFont` pour `dataFontFamily`.
Exemple CyclingScreen :
```typescript
const { settings } = useCyclingSettings()
const dataFontFamily = FONT_OPTIONS.find(f => f.id === settings.display.dataFont)?.fontFamily
```

### Root cause (confirmée)
`useXxxSettings()` crée une instance React indépendante à chaque appel.
Le **Screen** a son propre état (instance A).
Le **Settings panel** appelle aussi `useXxxSettings()` → instance B séparée.
Quand Settings change `dataFont` → instance B se met à jour + sauve Supabase
→ instance A du Screen **reste sur l'ancienne valeur** jusqu'au prochain reload.

---

## Fix : partager une seule instance d'état

### Pattern appliqué (6 sports)
- **Screen** : ajoute `updateSetting` au destructuring, passe `settings` et
  `updateSetting` en props au Settings panel.
- **Settings panel** : accepte `settings` et `updateSetting` comme props,
  supprime le call `useXxxSettings()` interne, ombre `updateSetting` avec
  un wrapper optimiste qui déclenche le toast.

```typescript
// Screen (ex: CyclingScreen.tsx)
const { settings, updateSetting } = useCyclingSettings()
// ...
<CyclingSettings settings={settings} updateSetting={updateSetting} ... />

// Settings panel (ex: CyclingSettings.tsx)
interface Props { ...; settings: CyclingSettingsData; updateSetting: (...) => void }
// Dans l'inner component : shadow du nom pour toast optimiste
const updateSetting = useCallback((path: string, value: unknown) => {
  updateSetting_prop(path, value)
  showToast('Modification enregistrée')
}, [updateSetting_prop, showToast])
```

### Comportement
- Changer la police (ou tout réglage) → apply **instantané** dans le Screen
- Toast "Modification enregistrée" à chaque changement (optimiste)
- Debounce 500ms → persist Supabase en arrière-plan
- Reload → valeur conservée

### Fichiers modifiés
- `src/components/record/CyclingSettings.tsx` + `CyclingScreen.tsx`
- `src/components/record/RunningSettings.tsx` + `RunningScreen.tsx`
- `src/components/record/HikingSettings.tsx` + `HikingScreen.tsx`
- `src/components/record/MTBSettings.tsx` + `MTBScreen.tsx`
- `src/components/record/SkiSettings.tsx` + `SkiScreen.tsx`
- `src/components/record/TrailSettings.tsx` + `TrailScreen.tsx`
