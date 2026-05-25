# PROMPT_SETTINGS_B — Layout aperçu 2 champs max + init Supabase

## PARTIE 1 — LAYOUT APERÇU : max 2 champs par ligne (PagePreview.tsx)

### Règle absolue
Jamais plus de 2 champs côte à côte. Le grand champ prend toujours toute la largeur (`gridColumn: '1 / -1'`).

### Grille
`display: grid; gridTemplateColumns: '1fr 1fr'`

### Logique de positionnement
- `bigFieldId = page.bigFieldId || page.fields[0]`
- `otherFields = page.fields.filter(f => f !== bigFieldId)`
- `bigOnTop = page.bigFieldPosition !== 'middle'`
- `midIndex = Math.floor(otherFields.length / 2)` (pour position middle)

### renderBigCell
- `gridColumn: '1 / -1'` (pleine largeur)
- `minHeight: 80`, `fontSize: 48` pour la valeur
- Sélection : `rgba(6,182,212,0.08)` + `border: 2px solid #06B6D4`

### renderSmallCell
- Occupe 1fr (2 par ligne automatiquement)
- `fontSize: 28` pour la valeur

### Valeurs mock
Dictionnaire statique `getMockValue(fieldId)` remplace `valueForField`.

---

## PARTIE 2 — INITIALISATION DEPUIS SUPABASE (useCyclingConfig.ts)

### Paramètre `sport`
Hook accepte `sport: string = 'cycling'`.

### Chargement au montage
- Si config en base → utiliser
- Sinon → DEFAULT_PAGES + upsert en base (initialisation automatique)

### Retour
`{ pages, setPages, savePages, loading }` — `loading: boolean` (était `loaded: boolean` inversé).

### Pas de useAuth
Conserver le pattern `sb.auth.getUser()` du projet (pas de hook useAuth).
