# Open Food Facts — Onglet Manuel

## Objectif
Remplacer les steppers manuels (kcal/prot/gluc/lip) de l'onglet "Manuel"
par une recherche d'aliments via l'API Open Food Facts + scanner code-barres.

---

## API Open Food Facts
- Recherche : `https://world.openfoodfacts.org/cgi/search.pl?search_terms={q}&json=1&page_size=8&fields=product_name,brands,nutriments,image_small_url,code`
- Code-barres : `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- Champs nutriments : `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`

## Interfaces TypeScript
```ts
export interface FoodItem {
  id: string
  name: string
  brand?: string
  kcal_100g: number
  prot_100g: number
  gluc_100g: number
  lip_100g: number
  image_url?: string
}

export interface AddedIngredient {
  food: FoodItem
  qty: number   // grammes
}
```

## Nouveaux composants

### FoodSearch.tsx (< 150 lignes)
- Export `FoodItem`, `AddedIngredient`, `calcMacros(food, qty)`
- Input de recherche + bouton barcode
- Debounce 400ms via useRef+setTimeout (pas de librairie externe)
- Dropdown résultats (image, nom, marque, kcal/100g)
- Sélection → picker inline : boutons −/qty/+ (incrément 10g), macros recalculées en temps réel
- Bouton "Ajouter" → onAdd(ingredient)

### IngredientRow.tsx (< 80 lignes)
- 1 ligne : image | nom | qty g | kcal P G L | bouton ×

### BarcodeScanner.tsx (< 100 lignes)
- Native `BarcodeDetector` Web API (pas de @zxing/library)
- Si BarcodeDetector absent : "Scanner disponible sur mobile uniquement"
- Stream camera + viewfinder + scan loop requestAnimationFrame
- createPortal vers document.body

## MealModalManual.tsx (réécriture)
- Conserver l'export `ManualSaveData` (compatibilité)
- Conserver l'interface Props (champs initiaux ignorés sauf initialName)
- Intégrer FoodSearch + IngredientRow + BarcodeScanner
- handleBarcodeDetected : fetch produit OFF, ajouter avec qty=100g
- Totaux calculés depuis la liste d'ingrédients
- Input nom du repas (optionnel, en bas)
- Enregistrer : mapper vers ManualSaveData

## Règles
- Aucun emoji
- npm run build doit passer
- TypeScript strict — pas de any
- Ne modifier que les fichiers listés
