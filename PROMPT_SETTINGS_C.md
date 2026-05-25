# PROMPT_SETTINGS_C — Sélecteur de champs 2 niveaux + auto-save PageEditor

## PARTIE 1 — FIELDPICKER : navigation catégorie → champs

### États
- `selectedCategory: FieldCategory | null` — null = vue catégories
- `search: string`

### Logique d'affichage
- search non vide → SearchResults (tous champs correspondants à plat, catégorie en label discret)
- search vide + selectedCategory null → CategoryList (liste des catégories avec count)
- search vide + selectedCategory → FieldList (champs de la catégorie)

### Header dynamique
Bouton retour (chevron gauche) quand selectedCategory != null.
Titre = catégorie sélectionnée ou "Choisir un champ".

### CategoryList
Chaque catégorie : nom + "N champ(s) disponible(s)" + chevron droit.
Catégories sans champs disponibles cachées.

### FieldList
Champs de la catégorie sélectionnée, même style que l'ancien FieldRow.
Badges : GRAPHIQUE (cyan), VISUEL (violet), capteur (rouge), parcours (jaune).

### SearchResults
Même rendu que FieldList avec catégorie en label discret sur chaque item.

---

## PARTIE 2 — PAGEEDITOR : auto-save sans bouton Sauvegarder

### Supprimer
- Bouton "Sauvegarder" sticky en bas

### Ajouter
- `saving: boolean` — spinner 14px dans le header
- Debounce 600ms via useRef + setTimeout (pas de lib externe)
- autoSave appelé sur : swap, ajout champ, suppression champ, changement position, changement nom
- Toast "Modifications enregistrées" après upsert Supabase réussi

### globals.css
`@keyframes spin` déjà présent — ne pas dupliquer.
