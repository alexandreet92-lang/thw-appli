# Photo IA — Auto-analyse

## Objectif
Dans l'onglet "Photo IA" du modal repas : supprimer le bouton
"Analyser avec l'IA" et déclencher l'analyse automatiquement
dès qu'une photo est sélectionnée ou prise.

---

## Modification du handler de sélection

Remplacer le comportement actuel par :

```ts
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 1. Afficher la preview immédiatement
  const previewUrl = URL.createObjectURL(file)
  setPreviewUrl(previewUrl)

  // 2. Démarrer l'analyse en parallèle sans attendre
  setAnalyzing(true)
  setAnalysisResult(null)

  try {
    const base64 = await resizeImage(file) // compression existante
    const result = await analyzePhoto(base64)
    setAnalysisResult(result)
  } catch (err) {
    setAnalysisError('Analyse impossible. Réessaye avec une photo plus nette.')
  } finally {
    setAnalyzing(false)
  }
}
```

## États visuels pendant l'analyse

### Preview + loading simultanés
La photo s'affiche en preview (même rectangle 200px).
Par-dessus la photo, un overlay semi-transparent avec :

```tsx
{analyzing && (
  <div className="absolute inset-0 bg-black/50 rounded-2xl
                  flex flex-col items-center justify-center gap-2">
    {/* Spinner SVG animé, 32px, blanc */}
    <div className="w-8 h-8 border-2 border-white/30 border-t-white
                    rounded-full animate-spin" />
    <p className="text-white text-xs font-medium">Analyse en cours...</p>
  </div>
)}
```

### Erreur
Si l'analyse échoue :

```tsx
<div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
  {/* Icône warning SVG 16px */}
  {analysisError}
</div>
```

+ Bouton "Changer de photo" (outline xs) qui reset l'état et
  réouvre le file picker.

## Supprimer
- Le bouton "Analyser avec l'IA" — retiré complètement
- Tout état ou texte qui demandait à l'utilisateur de cliquer
  pour analyser

## Conserver sans modification
- La logique de resize (resizeImage)
- Le prompt API et le parsing du résultat
- L'affichage du résultat (liste d'aliments éditables, totaux,
  boutons "Enregistrer" / "Recommencer")
- Le bouton "Recommencer" reset previewUrl + analysisResult
  et permet de choisir une nouvelle photo

## Règles
- Ne modifier que MealModalPhotoAI.tsx
- npm run build doit passer
