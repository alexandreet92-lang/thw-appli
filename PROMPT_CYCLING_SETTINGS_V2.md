# PROMPT CYCLING SETTINGS V2

## Animations globales pour bottom sheets

Ajout dans `globals.css` :
```css
@keyframes sheet-open  { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes sheet-close { from { transform: translateY(0); }    to { transform: translateY(100%); } }
.sheet-open  { animation: sheet-open  280ms cubic-bezier(0.16,1,0.3,1) forwards; }
.sheet-close { animation: sheet-close 220ms cubic-bezier(0.4,0,1,1)   forwards; }
```

Pattern dans chaque sheet :
```tsx
const [closing, setClosing] = useState(false)
const handleClose = () => { setClosing(true); setTimeout(onClose, 210) }
// className={closing ? 'sheet-close' : 'sheet-open'}
```

Appliqué à : `SportSelector`, `CyclingSettings`, `PageEditor` (nouveau).

## Nouveaux fichiers

### `src/types/cycling.ts`
- `DataField` (id, label, unit, requiresSensor?)
- `DataPage` (id, name, type 'data'|'map'|'custom', fields[])
- `ALL_FIELDS` (18 champs : durée, distance, vitesse, D+, altitude, watts, FC, cadence, lap_*)
- `DEFAULT_PAGES` (3 pages par défaut, conformes à l'implémentation actuelle)

### `src/hooks/useCyclingConfig.ts`
- Fetch `sport_page_configs` au mount via Supabase
- Si absent : `DEFAULT_PAGES`
- `savePages(newPages)` : upsert Supabase + setState
- Exports : `{ pages, savePages, loaded }`
- Gracieux si la table n'existe pas (try/catch silencieux — la migration V1 doit être appliquée manuellement)

### `src/components/record/PageEditor.tsx`
- Sub bottom sheet 85vh, fond identique au CyclingSettings
- Header : retour `<` + titre "Modifier la page"
- Nom de page (input éditable)
- Liste champs sélectionnés (numéro + label + ↑ ↓ ×)
- "Ajouter un champ" (pills cyan des champs non sélectionnés)
- Max champs : 7 pour `type='data'`, 2 pour `type='map'`
- Bouton "Sauvegarder" sticky bottom

## Modifications

### `src/components/record/CyclingSettings.tsx` (rewrite)
- Utilise `useCyclingConfig()`
- Section "Pages de données" devient interactive :
  - Header : titre + bouton "+ Ajouter"
  - Liste pages avec : ↑/↓ réorder, numéro cyan, nom+champs, "Modifier" → ouvre `PageEditor`, ✕ supprimer (si >1)
- Sections Capteurs / Unités / Alertes inchangées
- Pattern close animation appliqué

### `src/components/record/SportSelector.tsx`
- Ajout du pattern `closing` + `setTimeout` 210ms
- Conservation de l'animation `translateY` via inline style (équivalent à `.sheet-open/.sheet-close`)

### `src/components/record/Toast.tsx`
Inchangé (pas un sheet).

## Wire à la display du compteur

Hors scope V2 : les pages configurables ne sont pas (encore) reflétées dans CyclingScreen — les Page1/2/3 restent câblées en dur. La config est sauvegardée mais utilisée seulement dans le PageEditor. Une V3 fera le pont.

## Migration Supabase

Table `sport_page_configs` créée dans `src/supabase/migrations/create_workout_sessions.sql` (V1 record). À appliquer manuellement via SQL editor si pas déjà fait. Sans la table, les fetch/upsert échouent silencieusement et `DEFAULT_PAGES` reste utilisé.

## Règles

- Merge direct sur main
- `npm run build` doit passer
- Aucun autre fichier touché
