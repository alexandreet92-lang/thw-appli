# Nutrition — Synchronisation & Toasts

## Objectif
Synchronisation en temps réel entre toutes les sections de la page Nutrition,
persistence correcte des données, et système de toast animé.
Aucun reload de page. Aucune navigation parasite.

---

## 1 — ARCHITECTURE STATE PARTAGÉ

### Problème actuel
Chaque section (Bilan du jour, Repas de la journée, Historique) fetche 
ses propres données indépendamment. Une insertion dans une section 
n'affecte pas les autres.

### Solution : état centralisé au niveau de la page

Dans le composant parent `NutritionPage` (ou `page.tsx`), définir :

```ts
const [dailyLogs, setDailyLogs] = useState<NutritionLog[]>([])
const [selectedDate, setSelectedDate] = useState<string>(
  new Date().toISOString().split('T')[0]
)
const refreshDailyLogs = useCallback(async () => {
  const { data } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('log_date', selectedDate)
  setDailyLogs(data ?? [])
}, [selectedDate, session])
useEffect(() => { refreshDailyLogs() }, [refreshDailyLogs])
```

### Propagation aux composants enfants
```tsx
<BilanDuJour logs={dailyLogs} />
<RepasJournee 
  logs={dailyLogs} 
  onMealSaved={refreshDailyLogs}
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
/>
<Historique refreshTrigger={dailyLogs} />
```

---

## 2 — BILAN DU JOUR : donuts réactifs

Calcul totaux en temps réel depuis prop `logs` :
```ts
const totals = useMemo(() => ({
  calories: logs.reduce((sum, l) => sum + (l.calories ?? 0), 0),
  protein:  logs.reduce((sum, l) => sum + (l.protein_g ?? 0), 0),
  carbs:    logs.reduce((sum, l) => sum + (l.carbs_g ?? 0), 0),
  fat:      logs.reduce((sum, l) => sum + (l.fat_g ?? 0), 0),
}), [logs])
```

Animation CSS sur strokeDashoffset (transition 600ms cubic-bezier).

---

## 3 — REPAS DE LA JOURNÉE : insertion correcte

Après chaque save dans le modal :
- Fermer le modal
- Appeler `onMealSaved()` → rafraîchit le state parent
- Afficher toast succès

---

## 4 — POIDS : insertion correcte

Après save mesure poids :
- Vider les champs
- Appeler `refreshBodyMeasurements()`
- Afficher toast succès

---

## 5 — HISTORIQUE : mise à jour automatique

Ajouter `useEffect` sur `refreshTrigger` pour re-fetcher quand un repas du jour est ajouté.

---

## 6 — SYSTÈME TOAST

### hook useToast.ts
State local : tableau de toasts `{ id, message, type, leaving }`.
`showToast(message, type)` → ajoute, auto-dismiss après 3200ms avec animation "leaving" 280ms avant suppression.

### ToastContainer.tsx
Position : `fixed top-4 left-4 z-[9999]`.
Slide-in depuis la gauche (translateX(-110%) → 0).

### CSS animations (globals.css)
- `toast-in` : slide depuis gauche + bounce
- `toast-out` : slide vers gauche + fade
- `progress-bar` : largeur 100% → 0% sur 3000ms

### Design SUCCESS : fond emerald-950, border emerald-500/40, icône check
### Design ERROR : fond red-950, border red-500/40, icône ×

---

## Règles
- Ne modifier que ce qui est listé ici. Ne pas refactoriser d'autres sections.
- Aucun emoji
- Tous les nouveaux fichiers < 200 lignes
- npm run build doit passer
