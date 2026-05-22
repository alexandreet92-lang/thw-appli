# Bilan du jour — Redesign visuel

## Objectif
Refonte du "Bilan du jour" avec grand anneau central + 3 mini-anneaux,
et carte de confirmation animée après enregistrement d'un repas.

---

## FEATURE 10 — DailyBilan.tsx (< 150 lignes)

Props :
```ts
interface DailyBilanProps {
  consumed: { calories: number; protein: number; carbs: number; fat: number }
  targets:  { calories: number; protein: number; carbs: number; fat: number }
  dayType:  'low' | 'mid' | 'hard'
}
```

### Grand anneau calories
- SVG 140px, r=55, strokeWidth=10
- Fond : stroke="var(--border)" opacity 0.5
- Progression : linearGradient id="kcal-ring-grad" cyan→bleu
- strokeDasharray={circ}, strokeDashoffset={circ*(1-pct)}
- transform="rotate(-90 70 70)"
- Transition CSS stroke-dashoffset 800ms ease-out
- Centre : valeur | "kcal" | "/ objectif"

### 3 mini-anneaux macros
- SVG 72px, r=28, strokeWidth=7
- Proteines #10B981, Glucides #F59E0B, Lipides #3B82F6
- Meme animation strokeDashoffset

### Badge jour
- Bas droite du header (Jour Low=vert, Mid=ambre, Hard=rouge)

---

## FEATURE 11 — MealConfirmCard.tsx (< 60 lignes)

Props :
```ts
interface MealConfirmCardProps {
  mealName: string
  calories: number
  protein:  number
  visible:  boolean
  onHide:   () => void
}
```

- `fixed bottom-24 left-1/2 -translate-x-1/2 z-[200]`  (bottom: 96px)
- Transition opacity + translateY (300ms)
- Cercle vert avec checkmark animé (strokeDashoffset 0→22)

### Logique page.tsx
```ts
onSaved={(data) => {
  reloadTodaySlots()
  setConfirmCard({ visible: true, mealName: data.meal_name, calories: data.actual_kcal, protein: data.actual_prot })
  setTimeout(() => setConfirmCard(c => ({ ...c, visible: false })), 2200)
}}
```

## Fichiers modifiés
- DailyBilan.tsx (nouveau)
- MealConfirmCard.tsx (nouveau)
- MealSlotGrid.tsx : onSaved enrichi avec { meal_name, actual_kcal, actual_prot }
- page.tsx : intégration DailyBilan + MealConfirmCard

## Règles
- Aucun emoji
- npm run build doit passer
- TypeScript strict — pas de any
