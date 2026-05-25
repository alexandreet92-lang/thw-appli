# PROMPT_SETTINGS_A — Animations globales + Menu 3 points pages vélo

## PARTIE 1 — ANIMATIONS GLOBALES

### globals.css
Mettre à jour les keyframes sheet-open/sheet-close pour ajouter l'opacité et ajuster le timing :

```css
@keyframes sheet-open  { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes sheet-close { from { transform: translateY(0); opacity: 1; }    to { transform: translateY(100%); opacity: 0; } }
.sheet-open  { animation: sheet-open  300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.sheet-close { animation: sheet-close 240ms cubic-bezier(0.4, 0, 1, 1)   forwards; }
```

### Pattern de fermeture (230ms)
Tous les bottom sheets du dossier /components/record/ utilisent :
```tsx
const [closing, setClosing] = useState(false)
const handleClose = () => { setClosing(true); setTimeout(onClose, 230) }
className={closing ? 'sheet-close' : 'sheet-open'}
```

Composants concernés : CyclingSettings, SportSelector, FieldPicker (setTimeout 210 → 230).

---

## PARTIE 2 — LISTE DES PAGES : menu 3 points (CyclingSettings.tsx)

### États ajoutés
- `menuOpenId: string | null` — id de la page dont le menu ⋯ est ouvert
- `renamingId: string | null` — id de la page en cours de renommage
- `confirmDeleteId: string | null` — id de la page en attente de confirmation de suppression

### Fonctions ajoutées
- `startRename(page)` — ouvre l'input de renommage
- `finishRename(id, value)` — sauvegarde le nouveau nom

### UX de la row
- Row entière cliquable → `openPageEditor(page)` (= setEditing)
- Bouton ⋯ en bout de row (e.stopPropagation)
- Menu contextuel : "Renommer" + "Supprimer" (absolu, zIndex 100)
- Fermeture menu au clic extérieur (useEffect + document.addEventListener)
- Renommage inline (input autoFocus, blur/Enter/Escape)
- Confirmation suppression inline (rouge, boutons Oui/Non)
- Supprimés : bouton "Modifier" séparé + icône poubelle
