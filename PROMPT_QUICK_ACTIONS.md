# Actions rapides — navigation par thèmes (2 colonnes)

## Règle : ne pas supprimer de flows, ne pas toucher au streaming.

## État lu
- `QUICK_ACTIONS` contient déjà les **14 actions** (vérifié) — non modifié
- Sous-écran "Actions rapides" (PlusMenu, `activeScreen === 'actions'`) = liste plate → remplacé par layout 2 colonnes
- `actionIcon(flow)` mappe déjà chaque flow à une icône
- Header retour (ArrowLeft) conservé

## Nouveau design — 2 colonnes
- **Gauche (160px)** : 6 thèmes avec icône + ChevronRight ; hover/actif = bg var(--bg-hover), color var(--text)
- **Droite (flex)** : actions du thème actif ; item = icône + label + badge modèle ; hover bg var(--bg-hover)
- Conteneur : `display flex, minWidth 420, maxHeight 360`
- État initial : thème `entrainement` actif
- Hover sur thème → change `activeTheme` → colonne droite en `aip_fade_in 150ms`

## Thèmes → flows
| Thème | Icône | Flows |
|---|---|---|
| Entraînement | Zap | sessionbuilder, analyze_training, analyser_semaine, analyser_progression, weakpoints |
| Course | Flag | strategie_course, estimer_zones, analyzetest |
| Nutrition | Apple | nutrition, recharge |
| Récupération | Moon | analyser_recuperation, conseils_sommeil |
| Plan | Calendar | training_plan |
| Application | BookOpen | app_guide |

## Comportement
- Clic action → `onFlow/onEnriched/onPrepare` (logique existante) + `onClose()`
- Navigation menu → Actions rapides inchangée (slide depuis la droite)

## TypeScript
`type QuickActionTheme`, `const [activeTheme, setActiveTheme] = useState<QuickActionTheme>('entrainement')`

## Imports lucide ajoutés : Flag, Moon, Calendar, BookOpen
## Keyframe ajouté : aip_fade_in
