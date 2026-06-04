# PROMPT_ACTIVITY_CLEAN_LAYOUT — Layout linéaire propre

## Étape 1 — Diagnostic des résidus (état avant fix)

Lecture de `src/app/activities/page.tsx` branche mobile (l. 5161–5219) :

| Résidu | Effet visible |
|---|---|
| `<div data-fullscreen-activity style={{position:'relative', minHeight:'100vh'}}>` | Réserve 100vh de placeholder dans le flux → contribue au gros « espace blanc » |
| Map `<div style={{position:'fixed', top:0, height:'52vh', zIndex:10}}>` | `position:fixed` se résout au containing block créé par `<div.fade-up>` (animation `forwards` retient transform) et `<ScrollReveal>` (motion.div avec y animé) → la carte est positionnée à `top: 0` du `.fade-up` qui n'est PAS au viewport top → carte « tout en bas » par rapport au viewport, sous les onglets Training et le placeholder |
| Sheet `marginTop:'52vh'; zIndex:20; animation:'slideUpSheet'` | Sheet ré-empilé sous la carte fixed → contenu apparaît APRÈS la map sur le scroll |
| Back button `position:absolute; top:16` | Pas de respect safe-area iOS |
| Pas d'`overflowY:auto` sur le wrapper | Mais ça n'est pas un problème ici, car le parent `<main>` a déjà `overflow-y:auto` |

Le bug containing block était documenté dans `PROMPT_MAP_FIX_DIAGNOSTIC.md` : `transform:translateY(0)` non-`none` retenu par `forwards` + framer-motion → tout descendant `position:fixed` est positionné par rapport à cet ancêtre, plus le viewport.

## Étape 2 — Layout linéaire (pas de position:fixed)
Solution la plus simple : la carte rentre dans le flux normal (`position:relative; height:50vh`). Plus de containing block à gérer, plus de placeholder 100vh, plus de marginTop 52vh.

Modifications dans `src/app/activities/page.tsx` (branche mobile) :
- Wrapper `<div data-fullscreen-activity>` : retire `minHeight:100vh`, garde l'attribut (utile pour CSS hide d'autres barres). Pas de style supplémentaire.
- Map : `<div style={{position:'relative', width:'100%', height:'50vh', overflow:'hidden'}}>`. Pas de fixed. Pas de zIndex.
- Back button : `position:absolute; top:'calc(env(safe-area-inset-top, 0px) + 12px)'; left:12; zIndex:10`. Cercle blanc 40×40 avec ombre, chevron #0f172a.
- Sheet : retire `marginTop:52vh`, retire `zIndex:20`, retire `animation:slideUpSheet`. Reste : `paddingBottom:120`, `borderRadius:'20px 20px 0 0'`. Coule naturellement sous la map.
- Handle bar conservée (indicateur visuel, harmless).

## Étape 3 — Masquage onglets Training (gardé en bonus)
Très peu coûteux : on remet les `data-training-topbar` / `data-training-tabs` sur la TOP BAR et la barre d'onglets de `TrainingPageInner` + 2 règles CSS dans `globals.css`. Si ça pose problème, ça se retire d'une ligne.

## Étape 4 — Aucune fioriture
Pas de zoom, pas de sticky, pas de fixed, pas de min-height fantôme, pas de portal, pas de refs scroll, pas de RAF. Juste du flux.

## Vérification (mentale)
1. ✅ Map en haut (premier élément du wrapper, height:50vh)
2. ✅ Titre, sport·date, stats, records, AI, sections détaillées en flux après la map
3. ✅ Scroll classique de `<main>` (parent) — pas de scroll imbriqué
4. ✅ Pas de blanc géant (plus de placeholder 100vh)
5. ✅ Bouton retour cercle blanc en haut à gauche sur la carte, safe-area iOS
6. ✅ Onglets Training masqués (CSS body:has + body.hide-app-header déjà existant)
