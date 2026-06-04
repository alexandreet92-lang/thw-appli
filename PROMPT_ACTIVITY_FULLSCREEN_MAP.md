# PROMPT_ACTIVITY_FULLSCREEN_MAP — Fiche activité plein écran mobile

## État existant trouvé
- `ActivityDetail` mobile (line 4894 de `src/app/activities/page.tsx`) rend déjà la carte en `position: fixed; top: 0; height: 52vh` + bottom-sheet à `marginTop: 52vh`. La structure plein écran existe.
- `<div data-fullscreen-activity>` est déjà posé sur le wrapper mobile (ligne 5162) → `globals.css` (l. 686-696) masque déjà `[data-app-header]`, `[data-mobile-nav]` et reset le `<main>` quand cet attribut est dans le DOM.
- **Ce qui manque** : la TOP BAR Training (sticky, ligne 7116) et la barre d'onglets Données/Analyse/Progression (ligne 7242) ne sont pas couvertes par les sélecteurs CSS existants → elles restent visibles au-dessus de la carte.
- Bouton retour mobile présent à la ligne 4925 : 36×36, fond noir 55%, icône blanche — à refaire au design spec (40×40 blanc / icône foncée / safe-area).

## Changements

### 1. Tagger les éléments à masquer
Dans `src/app/activities/page.tsx` (TrainingPageInner) :
- TOP BAR sticky (l. 7116) → ajouter `data-training-topbar=""`
- Barre d'onglets Strava (l. 7242, `isMobile && …`) → ajouter `data-training-tabs=""`

### 2. CSS dans `src/app/globals.css`
Étendre le bloc existant `@media (max-width: 767px)` :
```css
body:has([data-fullscreen-activity]) [data-training-topbar],
body:has([data-fullscreen-activity]) [data-training-tabs] {
  display: none !important;
}
body.hide-app-header [data-training-topbar],
body.hide-app-header [data-training-tabs] {
  display: none !important;
}
```
Le fallback `body.hide-app-header` est déjà géré côté composant (toggle via `useEffect` du `ActivityDetail` mobile, vu en l. 4899+).

### 3. Bouton retour redesigné
Composant `ActivityDetail` mobile :
- Position : `top: 'calc(env(safe-area-inset-top, 0px) + 12px)'`, `left: 12`
- Taille : 40×40
- `background: '#ffffff'`
- `border-radius: 50%`
- `box-shadow: '0 2px 8px rgba(0, 0, 0, 0.25)'`
- Icône `<ChevronLeft size={20} color="#0f172a" strokeWidth={2.2}/>`
- `z-index: 20` (au-dessus de la carte, sous les modales/overlays qui sont >300)

### 4. Carte
La carte mobile reste à `top: 0` (immersif, sous la notch) — c'est l'approche Strava/Apple Maps. Le bouton retour est dans la safe-area, la carte fill le viewport. Cohérent avec ce qui existe et avec le bottom-sheet à `marginTop: 52vh`.

### 5. Desktop intouché
Aucun changement desktop. La règle CSS de masquage est scoped `@media (max-width: 767px)`.

## Vérification
- npm run build : 0 erreur TS
- Sur mobile, ouvrir activité depuis Training/Analyse → TOP BAR + onglets Données/Analyse/Progression masqués, carte edge-to-edge, bouton retour blanc rond ramène à la liste
- Sur desktop, comportement inchangé
- Le swipe iOS back / Android back continue de fonctionner via `setSelected(null)` (`onClose` du bouton existant) — pas modifié
