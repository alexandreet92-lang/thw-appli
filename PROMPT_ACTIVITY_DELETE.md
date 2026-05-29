# PROMPT_ACTIVITY_DELETE — Suppression d'activité avec confirmation

## Fichier modifié
`src/app/activities/page.tsx` — composant `ActivityDetail`

## Implémentation

### États ajoutés
```ts
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [isDeleting,        setIsDeleting]        = useState(false)
const [deleteError,       setDeleteError]       = useState<string | null>(null)
```

### handleDelete
Utilise `createClient()` pour supprimer l'activité par `id`.
Appelle `onClose()` après succès → retour automatique à la liste.
Affiche l'erreur inline dans le BottomSheet en cas d'échec.

### Bouton "Supprimer"
Ajouté dans le header hero (à droite du bloc titre/badges).
Style discret : bordure rouge `#EF4444`, fond transparent.

### BottomSheet de confirmation
- Message : l'action est irréversible, restera sur Strava/Polar
- Affichage conditionnel de l'erreur
- Bouton Annuler (disabled pendant la suppression)
- Bouton Supprimer rouge (disabled + texte "Suppression…" pendant l'op)

### Navigation post-suppression
`onClose()` suffit — retour à la liste des activités (même page).
Pas besoin de `router.push` car `ActivityDetail` est rendu inline
dans `SectionAnalyse`.

## Import BottomSheet
Déjà importé en tête du fichier (`@/components/ui/BottomSheet`). ✓
