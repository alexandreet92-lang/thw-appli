# PROMPT_JAUGES_FIXES — 4 corrections jauges Ressenti / Difficulté

## Fix 1 — Modal centrée au milieu du viewport
**Cause** : le modal était positionné en bottom-sheet (`left: 0; right: 0; bottom: 0`). La spec voulait un modal centré.

**Fix** : passage à `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`.
- Backdrop z-index 9998, modal z-index 9999 (au-dessus de tout)
- `width: 90vw; max-width: 380px`, `padding: 24`, `borderRadius: 16`
- `boxShadow: 0 20px 60px rgba(0,0,0,0.4)`
- Click sur modal → `e.stopPropagation()` pour ne pas fermer (le backdrop gère le close)
- Animation d'entrée `fdModalEnter 0.22s cubic-bezier(0.32,0.72,0,1)` (scale + opacity)
- Animation backdrop `fdModalBackdrop 0.2s ease-out` (fade in)
- Portal sur `document.body` conservé (s'extrait de tout ancêtre transformé)

## Fix 2 — Animation fluide de la jauge
Ajout de `style={{ transition: 'stroke-dasharray 0.4s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }}` sur le `<circle>` rempli (carte + modal). Quand la valeur change :
- Arc se remplit / vide en transition fluide
- Couleur passe progressivement d'un palier à l'autre (rouge → orange → jaune → vert → cyan)

**Pulse du chiffre central** :
```css
@keyframes fdGaugePulse {
  0%   { transform: scale(0.92); opacity: 0.6 }
  50%  { transform: scale(1.05); opacity: 1 }
  100% { transform: scale(1);    opacity: 1 }
}
```
Appliqué avec `key={String(value)}` pour forcer le re-mount → animation joue à chaque changement.

**Description sémantique** : `transition: color 0.3s ease` pour fondu doux.

**Drag live** : `<input type=range onChange>` sur React fire en continu (équivalent natif `oninput`). Le state local `draft` change à chaque mouvement → preview, arc, couleur, description s'actualisent en temps réel sans attendre le release.

## Fix 3 — Persistance Supabase
**Vérification base** : colonnes `feeling` + `difficulty` confirmées en base (migration `add_feeling_difficulty_columns` du prompt précédent).

**Vérification SELECT** : `createClient().from('activities').select('*', { count: 'exact' })` (l. 330) — `*` inclut bien les nouvelles colonnes au refresh.

**Logging diagnostique ajouté** :
```ts
console.log('[JAUGES] Saving:', { activityId, field, value })
const { data, error } = await sb.from('activities').update({ [kind]: v }).eq('id', a.id).select()
console.log('[JAUGES] Save result:', { data, error })
```

**Root cause de la perte** : avant ce fix, la `FeelingDifficultyCard` détenait son propre state interne — au refresh de la page, le state était re-initialisé depuis `activity.feeling` (donc OK si la BDD est OK), mais le state n'était PAS partagé avec la ligne `Ressenti` du tableau CARDIO qui lisait `localSensation` (champ `perceived_effort`, ≠ `feeling`). D'où l'impression de désync.

**Fix** : remontée du state à `ActivityDetail` :
- `localFeeling`, `localDifficulty` initialisés depuis `a.feeling` / `a.difficulty`
- `saveFdValue(kind, v)` au niveau parent → update Supabase + set state local + toast
- Si erreur : `toast(Échec : ${error.message})` (message visible, plus de "Échec" générique)

## Fix 4 — Sync avec le tableau CARDIO + ajout ligne Difficulté

### Refactor — single source of truth
Le composant `FeelingDifficultyCard` est désormais **controlled** :
```tsx
function FeelingDifficultyCard({ feeling, difficulty, onEdit }: {
  feeling:    number | null
  difficulty: number | null
  onEdit:     (kind: 'feeling' | 'difficulty') => void
})
```
Plus de state interne, plus de modal interne, plus de save interne. Tout vit dans `ActivityDetail`.

### Modal partagé
Une seule instance de `GaugeEditModal` rendue **à la fin de `ActivityDetail`**, contrôlée par `fdEditing` (`null | 'feeling' | 'difficulty'`) :
```tsx
<GaugeEditModal
  open={fdEditing !== null}
  kind={fdEditing ?? 'feeling'}
  value={fdEditing === 'feeling' ? localFeeling : localDifficulty}
  onClose={() => setFdEditing(null)}
  onSave={async v => { if (fdEditing) await saveFdValue(fdEditing, v) }}
/>
```

### CARDIO — ligne Ressenti
Avant : utilisait `localSensation` (champ `perceived_effort`, scale 0-5) avec `setShowRpeModal`.
Après : utilise `localFeeling` + `setFdEditing('feeling')`.
- Valeur saisie → `4 / 5` cliquable (color var(--text)) → ouvre modal
- Pas de valeur → `+ Saisir` en cyan `#06B6D4` → ouvre modal

### CONDITIONS — ligne Difficulté (NOUVEAU)
Insérée juste après TRIMP, structure identique :
- Valeur saisie → `7 / 10` cliquable → ouvre modal
- Pas de valeur → `+ Saisir` cyan → ouvre modal

### Synchronisation bidirectionnelle
Carte des jauges + lignes tableau → tous lisent `localFeeling` / `localDifficulty`. Au save, ces 2 states sont mis à jour → tous les consommateurs re-render automatiquement. Pas de duplication, pas de double state.

## Inchangé
- `localSensation` / `localRpe` + `RpeModal` (existant) — non touchés (séparés du nouveau système)
- API SelectionSheet, ActivityCurves, autres composants
- Animations CSS `selSheet*`
- Couleurs sémantiques (4 paliers Ressenti / 6 paliers Difficulté)
- Logique des arcs (rotate 135, dasharray 217/289)
- État null : `—` + `Non renseigné` + bouton `Ajouter`

## Vérification
- ✅ `npm run build` exit 0
- ✅ Modal centrée (top: 50% + translate)
- ✅ Transition fluide stroke-dasharray 0.4s + couleur 0.3s + pulse du chiffre 0.3s
- ✅ Slider drag live (onChange React = oninput natif)
- ✅ Save via `supabase.update().select()` + console.log diagnostique
- ✅ Sync carte ↔ table CARDIO Ressenti ↔ table CONDITIONS Difficulté via single source of truth (state `ActivityDetail`)
- ✅ `select('*')` au load inclut les colonnes feeling / difficulty
- ✅ Toast `Enregistré` succès / `Échec : <error.message>` en cas d'erreur
- ✅ Mode jour/nuit OK (var(--bg), var(--text), var(--text-dim), var(--border))
