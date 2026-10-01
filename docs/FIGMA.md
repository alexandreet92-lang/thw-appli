# Figma — THW Design System (source de vérité visuelle)

Fichier : https://www.figma.com/design/Jm3GwZ1Z94hIhLMydQpUTb (clé `Jm3GwZ1Z94hIhLMydQpUTb`, équipe Alex, plan Starter).
Lu via le connecteur Figma (`get_design_context`, `get_screenshot`, `get_variable_defs`). Toujours lire la maquette AVANT de coder un écran.

## Pages (Starter = 3 pages max)
| Page | id | Contenu |
|---|---|---|
| Foundations | `0:1` | Planches Sombre `4:4` / Clair `4:71` : couleurs, typo, rayons, espacement |
| Components | `4:2` | Button (set `6:57`), Icon Button `6:60`, Card `6:86`, Stat Card `6:89`, List Row `6:95`, Badge `6:127`, Segmented `6:133`, Input `6:142`, Tab Capsule `6:146`, Icons `6:5`…`6:32` |
| Screens | `4:3` | Planning `8:2`, Activités `8:166`, Profil `8:270` (390×844) |

## Variables (code syntax WEB = `var(--…)` identiques à `globals.css`)
- `Color` (clair) `VariableCollectionId:2:2` et `Color Dark` `VariableCollectionId:2:3` — 1 mode par collection (limite Starter) : bg, bg-card, bg-card2, bg-elev, surface-neutral, input-bg, text, text-mid, text-dim, border, primary, primary-dim, on-primary, danger, ai-accent, scrim.
- `Spacing` `space/1…12` (4 px), `Radius` `radius/sm|md|lg|pill` (8/14/20/999), `Typography` `size/*` + `family/display` (Fraunces) / `family/body` (Inter).
- Styles texte `Display/*` (Fraunces), `Body/*`, `Metric/*` (Inter) ; effets `Shadow/Card|Float|Lens`.

## Bibliothèque Apple
Le kit communautaire **iOS and iPadOS 26** est rattaché au fichier (clé `lk-a5b98dec…`) : Tab Bar iPhone `1a05576d…`, Button Liquid Glass `9f6ac5f0…`, Sheets `b983495e…`, Status bar `51ddb19d…`.

## Règle
Tout nouvel écran = instances de ces composants + variables. Un écart entre le code et Figma se corrige d’abord dans Figma (Alex valide), puis dans le code (`npm run design:check`, `npm run design:shots`).
