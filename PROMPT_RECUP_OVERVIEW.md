# PROMPT — Page Récupération : coquille à onglets + onglet "Vue d'ensemble"

## Périmètre de CE prompt
On construit UNIQUEMENT :

1. La coquille à onglets de la page Récupération (sidebar verticale).
2. L'onglet **"Vue d'ensemble"** : bande KPI en haut + graphe multi-courbes interactif.

Les autres onglets (Check-in, Charge & forme, Sommeil & HRV, Sources) = simples placeholders pour l'instant. On les remplira dans des prompts suivants.

Référence visuelle : `maquette_recuperation.html` (déjà validée).

---

## PHASE 0 — diagnostic (ne rien modifier)
Afficher en console :

- Le chemin exact de la page Récupération actuelle (chercher `recovery` / `recuperation`).
- Si un hook `useTrainingLoad` existe et ce qu'il retourne (CTL/ATL/TSB).
- La table Supabase des check-in (chercher `checkin` / `check_in`).
- La table `health_data` : colonnes liées à HRV, FC repos, sommeil.
- Dire quelles séries de Vue d'ensemble ont des données réelles disponibles (HRV, Sommeil, Readiness, FC repos, Fatigue) et lesquelles seront vides.

---

## PHASE 1 — couleurs en variables CSS
Dans le fichier de styles globaux, ajouter ces variables (les 2 thèmes si applicable) :

```css
--rec-hrv:#06b6d4;
--rec-sommeil:#a855f7;
--rec-readiness:#22d3ee;
--rec-fc:#ef4444;
--rec-fatigue:#f97316;
```

Aucune couleur hex en dur dans les composants : on référence ces variables.

---

## PHASE 2 — composant graphe : `src/components/recovery/RecoveryTrendChart.tsx`
Composant autonome, < 200 lignes. Il reçoit les données et gère tout l'interactif.

### Props
```ts
type Serie = 'hrv'|'sommeil'|'readiness'|'fc'|'fatigue'
interface DayPoint { label:string }            // 'L','M',...
interface WeekData {
  label:string                                  // ex. '2 – 8 juin'
  values: Record<Serie, (number|null)[]>        // 7 valeurs, null si absent
}
interface Props { weeks: WeekData[] }           // ordre chronologique, dernière = courante
```

### Config interne (couleurs via variables CSS)
```ts
const SERIES: Record<Serie,{label:string;cssVar:string;unit:string;min:number;max:number}> = {
  hrv:      {label:'HRV',       cssVar:'--rec-hrv',       unit:' ms',  min:40, max:80},
  sommeil:  {label:'Sommeil',   cssVar:'--rec-sommeil',   unit:' h',   min:5,  max:9},
  readiness:{label:'Readiness', cssVar:'--rec-readiness', unit:'',     min:0,  max:100},
  fc:       {label:'FC repos',  cssVar:'--rec-fc',        unit:' bpm', min:45, max:62},
  fatigue:  {label:'Fatigue',   cssVar:'--rec-fatigue',   unit:'/10',  min:0,  max:10},
}
const KEYS:Serie[] = ['hrv','sommeil','readiness','fc','fatigue']
```

Couleur d'une série en JS : `getComputedStyle(document.documentElement).getPropertyValue(cssVar)`.

### Comportement (identique à la maquette)
- État `wIdx` = index semaine affichée (init = dernière).
- État `visible: Record<Serie,boolean>` (toutes true au départ).
- Bande KPI en haut (au-dessus du graphe) : une tuile par série affichant valeur du dernier jour de la semaine affichée + delta vs 1er jour (vert si amélioration : hausse pour HRV/Sommeil/Readiness, baisse pour FC/Fatigue ; rouge sinon ; gris si 0). La tuile EST le toggle : clic = masque/affiche la courbe ; double-clic = isole. Si toute la série est `null` → tuile grisée, valeur "—", non sélectionnable, libellé "non synchronisé".
- Navigation semaine : boutons ‹ › (désactivés aux extrémités) + label "Semaine du …".
- Graphe SVG viewBox 0 0 720 300, padding {l:46,r:18,t:24,b:34}.
  - Normalisation par série : `y = H-PAD.b - ((v-min)/(max-min))*(H-PAD.t-PAD.b)`.
  - Une polyline + points par série visible. Points `null` : interrompre la ligne.
  - Grille horizontale légère (var(--border)), labels jours en bas (var(--text-dim)).
- Survol : ligne guide verticale au jour le plus proche + tooltip suivant le curseur, listant chaque série visible avec sa VRAIE valeur et unité.
- Mobile : swipe horizontal au doigt pour changer de semaine (touchstart/touchend, seuil 40px). `touch-action:pan-y` sur le conteneur.

### Style
- Variables projet uniquement : var(--bg-card), var(--bg-card2), var(--text), var(--text-dim), var(--border).
- Titres/valeurs en Fraunces, chiffres tabular-nums.
- Pas d'emoji, icônes ligne uniquement.

---

## PHASE 3 — coquille à onglets : page Récupération
Sidebar verticale (même logique que la page Planning) avec 5 onglets :

1. Vue d'ensemble (actif par défaut)
2. Check-in
3. Charge & forme
4. Sommeil & HRV (badge "vide" si health_data sans sommeil)
5. Sources

- Onglet Vue d'ensemble : banner reco + `<RecoveryTrendChart weeks={...} />`. Brancher les vraies données disponibles ; pour chaque série sans données, passer un tableau de `null`.
- Onglets 2 à 5 : pour l'instant un simple bloc placeholder centré "À implémenter — prochain lot".
- État onglet actif géré en local (useState), pas de refonte du routing.

---

## CONTRAINTES
- `npm run build` doit passer, TypeScript strict, pas de `any`.
- Max 200 lignes par fichier → si la page dépasse, extraire la sidebar dans `RecoverySidebar.tsx`.
- Ne PAS toucher au pipeline de sync (strava.ts, sync Polar).
- Lister à la fin : quelles séries affichent des vraies données et lesquelles sont en état vide.
- Puis PUSH.
