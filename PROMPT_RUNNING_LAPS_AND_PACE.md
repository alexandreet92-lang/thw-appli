# PROMPT_RUNNING_LAPS_AND_PACE
Écrire dans PROMPT_RUNNING_LAPS_AND_PACE.md à la racine, puis implémenter.
npm run build doit passer sans erreur.

## Contexte
La vue détaillée des laps pour le **cyclisme** (`LapsDetailView` + bottom sheet `LapDetailsSheet`) fonctionne. Maintenant créer l'équivalent pour la **course à pied** :
1. Reprendre l'architecture existante des laps cyclisme (vue principale slide droite + bottom sheet détails) avec les MÊMES animations, MÊMES patterns, MÊME logique de hitbox plein hauteur pour le tap mobile
2. Adapter les données : retirer tout ce qui est watts, remplacer vitesse km/h par allure min/km, ajouter allure ajustée (GAP)
3. Ajouter une nouvelle section "Allure réelle vs Allure ajustée" sur la fiche activité, sous la section Courbes existante

## Détection sport
**Première étape** : grep dans le repo pour identifier comment le sport d'une activité est stocké :
```bash
grep -rn --include="*.tsx" --include="*.ts" "sport\|sportType\|activityType" src/types/ src/lib/ src/app/activities/ | head -30
```
Identifier :
- Le nom du champ (`activity.sport`, `activity.type`, `activity.sportType`, etc.)
- Les valeurs possibles (`'cycling'`, `'running'`, `'trail'`, etc.)
- Reporter la convention dans la sortie pour qu'on l'utilise dans le code
Si le champ n'existe pas, fallback : utiliser une heuristique (`activity.streams.watts.length > 0 ? 'cycling' : 'running'`).

> NOTE RECON (relevée à l'implémentation) : le champ réel est `activity.sport_type`
> avec valeurs `'run'`, `'trail_run'`, `'bike'`, `'virtual_bike'`. Convention
> running = `['run','trail_run'].includes(activity.sport_type)`.
> ATTENTION : l'archi "slide droite + bottom sheet + donuts + hitbox 240px" décrite
> ci-dessous N'EXISTE PAS pour le vélo. Le réel = `LapsBikeChart.tsx` (barres SVG +
> petit panneau inline). Le langage donuts/4-col vit dans `SelectionSheet`.

---
## Concept : ALLURE et ALLURE AJUSTÉE (GAP)
### Allure (Pace)
- **Format affichage** : `min'sec"/km` (ex: `4'30"`, `5'12"`)
- **Calcul** : `pace = 60 / vitesse_kmh` minutes, puis formaté
- **Lecture** : plus le chiffre est PETIT, plus c'est RAPIDE
### Allure ajustée (GAP - Grade Adjusted Pace)
- **Définition** : ton allure équivalente sur plat.
- **Formule (approximation Minetti / Strava)** :
  ```
  function gapAdjustment(gradePercent: number): number {
    const g = gradePercent / 100
    return 1 + (g * 5.43) + (g * g * 18.84)
  }
  ```
- Sur plat : GAP = allure réelle ; montée : GAP plus rapide ; descente : plus lent.
### Hauteur des barres du graphique laps (running)
- En interne : **vitesse moyenne (km/h)** pour la hauteur (barre haute = lap rapide)
- En affichage : **allure (min/km)**

---
## PARTIE 1 — Composant `LapsRunView`
Préférer une prop `sport` plutôt que dupliquer.
### Différences avec la version cyclisme
Bandeau récap : Running `Tour 4 · 4'30"/km · Zone 3 · 175 spm`.
Liste 4 colonnes : N° / Distance / Durée / **Allure**.
Hauteur barres : `(lap.avgSpeed / maxSpeed) × 240`.
Label barre : `4'30"`.
### Identique au cyclisme
Hitbox plein hauteur 240px, profil altitude grise, numéros sous barres, trait
violet barre active, Y-axis sticky, largeurs proportionnelles à la durée, min lap
width responsive (95px mobile/30px desktop), ResizeObserver, touch-action, slide
0.3s, portals via `createPortal(node, document.body)`.

---
## PARTIE 2 — Bottom sheet détails running (`LapDetailsSheetRun` ou prop `sport`)
Hero KPIs 2x2 : Distance / Allure / FC moy / Allure ajustée (GAP).
Si GAP non calculable → remplacer par "Allure max".
Détails 6 lignes : Durée / Allure max / D+ / D− / Cadence moy (spm) / Température moy.
Donuts : FC zones / Température / Cadence (tranches running) [/ Allure zones si profil].
Supprimer le donut Puissance. Masquer donuts sans données.
Tranches cadence running : <150 #94a3b8 / 150-160 #cbd5e1 / 161-170 #06b6d4 /
171-180 #10b981 / 181-190 #eab308 / >190 #f97316.

---
## PARTIE 3 — Section "Allure réelle vs Allure ajustée" (running uniquement)
Sous la section Courbes existante. 2 courbes superposées (réelle #06b6d4, ajustée
#7c3aed), lissage 30s, profil altitude en fond, crosshair, tooltip multi-lignes via
portal, Y en min/km **inversé** (rapide en haut).
### Calcul allure ajustée (Minetti) + helpers `src/lib/utils/pace.ts`
```ts
export function formatPace(minutesPerKm: number): string {
  if (!isFinite(minutesPerKm) || minutesPerKm <= 0) return '—'
  const m = Math.floor(minutesPerKm)
  const s = Math.round((minutesPerKm - m) * 60)
  return `${m}'${String(s).padStart(2, '0')}"`
}
export function speedToPace(speedKmh: number): number {
  if (speedKmh <= 0) return Infinity
  return 60 / speedKmh
}
export function paceToSpeed(paceMinPerKm: number): number {
  if (paceMinPerKm <= 0) return 0
  return 60 / paceMinPerKm
}
```
Réutilisation : prop `customSeries` sur `ActivityCurves` (option A recommandée),
ou composant `PaceComparisonChart` séparé (option B).

---
## PARTIE 4 — Branchement dans `activities/page.tsx`
`const isRunning = ['run','trail_run'].includes(activity.sport_type)`.
Laps : `LapsRunChart` si running sinon `LapsBikeChart`.
Vue détaillée : prop `sport`.
Section comparaison : running uniquement.

---
## Règles
- Lire AVANT de modifier ; réutiliser MAX le code existant ; prop `sport` > duplication.
- Allure interne = nombre min/km ; affichage = `formatPace`. Vitesse interne = km/h.
- GAP via Minetti. Axe Y comparaison inversé. Portals via createPortal(document.body).
- Donuts masqués si pas de données. npm run build doit passer.
