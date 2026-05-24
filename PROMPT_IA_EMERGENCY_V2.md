# PROMPT IA EMERGENCY V2 — Audit visuel sur capture utilisateur

## Diagnostic visuel

La capture (light mode, fullscreen) montre des items conv perçus comme des "cards". Mais l'audit code prouve qu'il n'y a aucun `bg-gray`, aucun `border` ni shadow sur les items eux-mêmes.

Sources réelles du look "card" :

1. **3-dot menu (`⋯`) toujours visible** dans le coin top-right de chaque item → renforce visuellement l'impression de "card avec menu d'actions"
2. **`mb-px`** entre les items → 1px de fond sidebar visible entre chaque, donnant une apparente séparation
3. **Layout 2 lignes** (titre + date) → items hauts qui ressemblent à des cards

## Fixes appliqués

### AISidebar.tsx — ConvItem

1. **3-dot menu caché au repos** : pattern `group` + `group-hover:opacity-100 opacity-0 transition-opacity` sur le bouton 3-dot. Visible uniquement au hover ou si actif.
2. **Items flush** : `mb-px` → suppression (items vraiment collés)
3. **Défense browser default** : ajout `border-0 outline-none focus:outline-none` sur le bouton item

### Aucune autre modification

Pas de fichier autre touché. Pas de changement de logique. La date `text-[11px] text-[#999]` reste visible (le spec utilisateur la veut).

## Résultat attendu

Items au repos :
```
Analyser ma semaine
8 mai
```
(titre + date, sans 3-dot visible, items collés)

Items au hover :
```
Analyser ma semaine          ⋯
8 mai
```
(3-dot apparaît, fond `bg-black/[0.05]`)

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
- Aucun autre fichier touché
