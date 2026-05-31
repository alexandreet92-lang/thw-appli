# Restauration interface IA

## Diagnostic réel

Les reverts avaient bien restauré les fichiers à l'état `5091fc5` (2026-05-24).
Mais `5091fc5` avait LUI-MÊME les fonds hardcodés en blanc :
- `.aip-root { --ai-bg: #ffffff }` en mode clair
- `className="… bg-white dark:bg-[#0A0A0A]"` sur la zone input
- `className="… bg-white dark:bg-[#1E1E1E]"` sur le wrapper textarea

C'est pour ça que l'interface était "cassée" : fond blanc au lieu du thème app (#eef2f7 clair / #080A0F sombre).

## Solution

Garder la structure de `5091fc5` (layout correct, sidebar "Hybrid", header, input bar, logos)
+ remplacer les couleurs hardcodées par les variables CSS du thème global.

## Changements appliqués (AIPanel.tsx uniquement)

### Bloc CSS .aip-root
| Avant | Après |
|---|---|
| `--ai-bg: #ffffff` | `--ai-bg: var(--bg)` |
| `--ai-bg2: #F7F7F7` | `--ai-bg2: var(--bg-card)` |
| `--ai-border: rgba(0,0,0,0.06)` | `--ai-border: var(--border)` |
| `--ai-text: #0A0A0A` | `--ai-text: var(--text)` |
| `--ai-mid: #8C8C8C` | `--ai-mid: var(--text-mid)` |
| `--ai-dim: #8C8C8C` | `--ai-dim: var(--text-dim)` |
| `--aiq-bg: #ffffff` | `--aiq-bg: var(--bg)` |
| `--aiq-sidebar-bg: #F7F7F7` | `--aiq-sidebar-bg: var(--bg-alt)` |
| Bloc dark séparé | Supprimé (vars héritent du thème) |

### JSX
- Zone input : `bg-white dark:bg-[#0A0A0A]` → `style={{ background: 'var(--ai-bg)' }}`
- Wrapper textarea : `bg-white dark:bg-[#1E1E1E]` + `border-[#E8E8E8] dark:border-[#2A2A2A]` → CSS vars

## Checklist interface restaurée
- Sidebar desktop : "Hybrid" + nav Projets/Training/Networks + liste convs
- Header : nom agent centré + actions droite
- Écran vide : logo PNG par modèle + salutation heure + actions rapides
- Input bar : bouton + · pill agent PNG · micro · envoi
- Fond : var(--bg) = #eef2f7 clair / #080A0F sombre
