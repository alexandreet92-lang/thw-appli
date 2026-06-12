# PROMPT_BUGS_PLANNING

## PHASE 0 — diagnostic avant toute modification

1. Dans `planning/page.tsx`, trouver :
- Le calcul de `doneTSS` et `plannedTSS` dans `TrainingTab`
- Le composant `AnimatedBar` utilisé pour le TSS
- La logique `usePlanning` pour le chargement des Training Blocs
- La table Supabase utilisée pour les Training Blocs (chercher `training_bloc` ou `blocs`)
- Les constantes `SPORT_BG` et `SPORT_BORDER`
2. Afficher dans la console :
- Le nom exact de la table Supabase des Training Blocs
- La requête SQL qui charge les Training Blocs
- Le filtre `week_start` ou `user_id` appliqué

---

## BUG 1 — Jauge TSS ne se remplit pas

### Symptôme

La barre `AnimatedBar` du TSS dans "Volume par discipline" reste vide même si des séances ont du TSS.

### Cause probable

`doneTSS` est calculé depuis `sessions.filter(s=>s.status==='done')` et les activités Strava.
Si aucune séance n'est marquée "done" ET qu'il n'y a pas d'activités Strava matchées,
`doneTSS = 0` → la barre reste à 0%.

### Fix

```tsx
// Chercher la ligne qui calcule doneTSS (environ) :
const doneTSS = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+(x.tss||0),0)
             + allActs.reduce((s,a)=>s+(a.tss||0),0)

// La remplacer par :
// Utiliser plannedTSS comme valeur de référence si doneTSS === 0
// pour que la jauge montre au moins la charge planifiée

const doneTSS = allSess.filter(s=>s.status==='done').reduce((s,x)=>s+(x.tss||0),0)
             + allActs.reduce((s,a)=>s+(a.tss||0),0)

// Et pour l'AnimatedBar TSS, changer le pct :
// AVANT : pct={plannedTSS?Math.min(doneTSS/plannedTSS*100,100):0}
// APRÈS :
const tssPct = plannedTSS > 0
  ? Math.min((doneTSS > 0 ? doneTSS : plannedTSS) / plannedTSS * 100, 100)
  : plannedTSS > 0 ? 100 : 0

// Remplacer aussi la valeur affichée :
// Afficher plannedTSS si doneTSS === 0, pour montrer la charge planifiée
```

En parallèle, vérifier que `AnimatedBar` reçoit bien un `pct` > 0 :

```tsx
// Chercher l'AnimatedBar du TSS et logger en console :
console.log('[TSS debug]', { plannedTSS, doneTSS, pct: plannedTSS?Math.min(doneTSS/plannedTSS*100,100):0 })
```

---

## BUG 2 — Training Bloc : données non synchronisées entre appareils

### Symptôme

Les blocs créés sur Windows ne s'affichent pas sur iPhone/Mac.

### Cause probable A — week_start différent selon l'appareil

`getWeekStart()` utilise `new Date()` local. Si un appareil est en UTC et un autre en UTC+2,
le lundi calculé peut différer d'un jour → `week_start` différent → les blocs ne chargent pas.

### Fix A

```tsx
// Trouver la fonction getWeekStart() :
function getWeekStart():string {
  const now=new Date();
  const dow=now.getDay()===0?6:now.getDay()-1;
  const m=new Date(now);
  m.setDate(now.getDate()-dow);
  return localDateStr(m)
}

// Vérifier que localDateStr utilise bien l'heure locale (elle le fait déjà via getFullYear/getMonth/getDate)
// Si le bug est là, ajouter un log :
console.log('[weekStart debug]', getWeekStart(), new Date().toISOString(), new Date().getTimezoneOffset())
```

### Cause probable B — table Training Blocs pas chargée dans usePlanning

Si les Training Blocs sont dans une table séparée (ex: `training_blocs`),
vérifier que la requête inclut bien `user_id = auth.uid()` ET pas de filtre restrictif sur la date.

### Fix B — ajouter un log de diagnostic

```tsx
// Dans la fonction load() de usePlanning, après la requête Supabase des blocs :
console.log('[training blocs]', {
  weekStart: weekStart,
  userId: user.id,
  blocsCount: /* nombre de résultats */,
  error: /* l'erreur si présente */,
})
```

### Fix C — si la table utilise un champ date différent

Chercher si les blocs ont un champ `start_date`, `week_start`, ou `created_at` comme filtre.
Si le filtre est `gte('start_date', weekStart)` : sur un autre appareil une semaine différente
est calculée → les blocs ne matchent pas.

**Solution robuste** : charger TOUS les blocs de l'utilisateur sans filtre de date,
et laisser le front trier :

```tsx
// Remplacer la requête actuelle des blocs par :
const { data: blocsData } = await supabase
  .from('training_blocs')  // ou le vrai nom de la table
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

---

## BUG 3 — Couleurs des cartes séances incorrectes dans le Planning

### Symptôme

Certaines cartes dans la grille Planning n'adaptent pas leur couleur au sport
(bord, fond, badge sport).

### Cause probable — normalizeSportType retourne 'run' en fallback

Si un sport inconnu arrive (ex: `"gym"` au lieu de `"GYM"`, ou `"musculation"`),
`normalizeSportType` retourne `'run'` → toutes les cartes de ce sport prennent la couleur run.

### Fix — étendre normalizeSportType et corriger les constantes

```tsx
// Dans normalizeSportType, ajouter les variantes manquantes :
const m: Record<string,SportType> = {
  // ... existant ...
  'gym': 'gym',
  'musculation': 'gym',
  'strength': 'gym',
  'weight_training': 'gym',
  'weighttraining': 'gym',
  'hyrox': 'hyrox',
  'hrx': 'hyrox',
  'elliptical': 'elliptique',
  'elliptique': 'elliptique',
  'rowing': 'rowing',
  'aviron': 'rowing',
  'trail': 'run',        // trail → run pour les couleurs
  'trail_run': 'run',
  'trailrun': 'run',
  'velo': 'bike',
  'cyclisme': 'bike',
  'natation': 'swim',
  'swimming': 'swim',
}
```

### Fix — vérifier SPORT_BG et SPORT_BORDER couvrent tous les sports

```tsx
// S'assurer que ces 2 records ont toutes les clés de SportType :
const SPORT_BG: Record<SportType,string> = {
  swim:        'rgba(6,182,212,0.13)',
  run:         'rgba(249,115,22,0.13)',
  bike:        'rgba(59,130,246,0.13)',
  hyrox:       'rgba(239,68,68,0.13)',
  gym:         'rgba(139,92,246,0.13)',
  rowing:      'rgba(20,184,166,0.13)',
  elliptique:  'rgba(168,85,247,0.13)',
}
const SPORT_BORDER: Record<SportType,string> = {
  swim:        '#06b6d4',
  run:         '#f97316',
  bike:        '#3b82f6',
  hyrox:       '#ef4444',
  gym:         '#8b5cf6',
  rowing:      '#14b8a6',
  elliptique:  '#a855f7',
}
// Si une clé manque → ajouter '#9ca3af' comme fallback
```

### Fix — SportBadge avec fallback

```tsx
function SportBadge({ sport, size='sm' }:{ sport:SportType; size?:'sm'|'xs' }) {
  const col = SPORT_BORDER[sport] ?? '#9ca3af'  // fallback si sport inconnu
  // ... reste identique
}
```

### Fix — cartes session dans WeekGrid

```tsx
// Pour chaque carte session dans la grille, s'assurer que :
const sp = normalizeSportType(s.sport as string)  // ← toujours normaliser
const col = SPORT_BORDER[sp] ?? '#9ca3af'
const bg  = SPORT_BG[sp]    ?? 'rgba(156,163,175,0.13)'
```

---

## CHECKLIST

- [ ] Log console ajouté pour TSS (valeurs plannedTSS / doneTSS).
- [ ] AnimatedBar TSS affiche la charge planifiée si doneTSS === 0.
- [ ] Log console ajouté pour weekStart (sur 3 appareils différents, doit être identique).
- [ ] Log console ajouté pour le chargement des Training Blocs (count + error).
- [ ] Si filtre date sur Training Blocs → chargement sans filtre date testé.
- [ ] normalizeSportType couvre gym, hyrox, rowing, elliptique, cyclisme, natation, trail.
- [ ] SPORT_BG et SPORT_BORDER ont toutes les clés SportType + fallback '#9ca3af'.
- [ ] SportBadge utilise `?? '#9ca3af'` comme fallback.
- [ ] `npm run build` passe.

**Commit local. NE PAS PUSH.**
