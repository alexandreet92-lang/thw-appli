# PROMPT_BACK_BUTTON_FIX — `isolation: isolate` sur ActivityMapCard mobileHero

## Fichier modifié
- `src/components/activity/ActivityMapCard.tsx` (1 propriété ajoutée à `cardStyle` mode `mobileHero`)

## Étape 1 — Localisation du conteneur Leaflet
- Le `<MapContainer>` Leaflet est rendu par `ActivityMapInner` (`src/components/activity/ActivityMapInner.tsx`)
- `ActivityMapInner` est lui-même monté dans `ActivityMapCard` (`src/components/activity/ActivityMapCard.tsx` l. 154 : `<div style={cardStyle}><ActivityMapInner …/></div>`)
- En mode `mobileHero=true` (utilisé par la fiche d'activité mobile), `cardStyle` (l. 97–105) déclarait :
  ```ts
  { position: 'relative', width: '100%', height: '100%', borderRadius: 0, overflow: 'hidden' }
  ```
  → **pas de stacking context propre** → les `.leaflet-pane` internes (z 200-1000) fuitaient dans le stacking context parent et écrasaient le bouton retour (`z-index: 10`).

## Étape 2 — Patch chirurgical
Ajouté `isolation: 'isolate'` dans la branche `mobileHero` de `cardStyle` uniquement.

```ts
if (mobileHero) {
  cardStyle = {
    position:  'relative',
    width:     '100%',
    height:    '100%',
    borderRadius: 0,
    overflow:  'hidden',
    isolation: 'isolate',  // ← ajout
  }
}
```

Effets :
- Crée un stacking context local sur le wrapper `<div>` qui héberge `ActivityMapInner`
- Les z-indexes Leaflet (200, 400, 500, 600, 700, 1000) restent **contenus** à l'intérieur de cette div
- Le bouton retour (sibling de la div ActivityMapCard, dans le même parent 50vh) garde son `z-index: 10` propre → maintenant **au-dessus** de la map (dont le z-index extérieur est `auto`)

## Étape 3 — Bouton retour
- Le bouton est bien **sibling** d'`ActivityMapCard` dans le wrapper parent 50vh (`src/app/activities/page.tsx` l. 5196–5218)
- `z-index: 10` inchangé
- Classe `thw-activity-back-btn` (bg + color adaptatifs light/dark) inchangée
- `onClick={onClose}` inchangé

## Ce qui n'a PAS été touché
- ❌ Pas de z-index 1100 (hack évité)
- ❌ Pas de modification des z-indexes internes Leaflet
- ❌ Pas de changement du CSS thème du bouton
- ❌ Pas de refactor d'ActivityMapInner ou de ActivityMapCard hors mobileHero
- Les autres modes (`mobileFullscreen`, mobile normal, desktop normal/expanded) n'ont PAS reçu `isolation: isolate` → comportement strictement identique

## Vérification
- `npm run build` : ✅ exit 0
- Sur mobile (fiche activité) : le bouton retour doit maintenant être visible au-dessus de la carte avec son cercle (blanc en clair / sombre en dark) + chevron en `currentColor`
- Clic → `onClose()` → retour à la liste (mécanisme inchangé)
- Aucun autre composant déplacé/restylé

## Note technique
`isolation: isolate` est supporté universellement (Chrome 41+, Firefox 36+, Safari 8+, iOS Safari 8+). Pas de risque de compatibilité. La propriété est une équivalent moderne de `transform: translateZ(0)` ou `opacity: 0.999` pour forcer un nouveau stacking context, sans effet visuel parasite.
