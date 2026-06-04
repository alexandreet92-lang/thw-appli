# PROMPT_ACTIVITY_NAV_HIDE — Back button adaptatif + tab bar mobile masquée

## Fichiers modifiés
- src/app/activities/page.tsx                (className `thw-activity-back-btn` + drop des couleurs inline)
- src/app/globals.css                        (3 rules : tab-bar hide + back-btn light/dark)

## Diagnostic

### Back button
Déjà en place dans le commit précédent (`487348e`), positionné, safe-area iOS, ombre. Manquait l'adaptation light/dark : le `backgroundColor: '#ffffff'` inline et le `color="#0f172a"` sur l'icône bloquaient toute variation thème.

### Tab bar mobile basse
Composant : `src/components/MobileTabBar.tsx`, rendu dans `src/app/layout.tsx:81`. Le `<nav>` utilise `className="mobile-tab-bar md:hidden"` (donc déjà mobile-only). Il NE possède PAS l'attribut `[data-mobile-nav]` que ciblait la règle CSS existante — c'est pour ça que le masquage existant rate.

L'app ouvre la fiche d'activité via **state local** dans `SectionAnalyse` (pas un changement de route). Donc l'approche pathname ne fonctionne pas. L'approche state global imposerait un refactor. La voie la plus simple, sans refactor : utiliser le pattern CSS déjà en place (`body:has([data-fullscreen-activity])`) en visant la classe `.mobile-tab-bar`.

## Changements

### globals.css
```css
/* Dans @media (max-width: 767px) — masquage CSS-driven via attribut */
body:has([data-fullscreen-activity]) .mobile-tab-bar {
  display: none !important;
}
body.hide-app-header .mobile-tab-bar {            /* fallback className */
  display: none !important;
}

/* Hors media — back btn thème adaptatif */
.thw-activity-back-btn {
  background-color: #ffffff;
  color: #0f172a;
}
html.dark .thw-activity-back-btn {
  background-color: #0f172a;
  color: #ffffff;
}
```

### activities/page.tsx — back button
- Ajout `className="thw-activity-back-btn"`
- Retrait `backgroundColor: '#ffffff'` inline (passe par CSS)
- Retrait `color="#0f172a"` sur `<ChevronLeft>` → utilise `currentColor` par défaut (lucide-react) → hérite de la `color` du parent → light=#0f172a / dark=#ffffff
- `strokeWidth` 2.2 → 2.5 (spec)
- Ajout `padding: 0` pour éviter tout offset interne

### activities/page.tsx — onClose
Inchangé. Le bouton appelle `onClose()` (mécanisme existant qui fait `setSelected(null)` dans le `SectionAnalyse` parent). Pas de refactor de navigation.

## Vérification
- npm run build : 0 erreur
- Mobile + fiche activité ouverte :
  - Tab bar (Plan / Stats / + / Plus / Réglages) masquée
  - Back button cercle blanc en haut à gauche, lisible
- Mode sombre → cercle noir avec chevron blanc, toujours lisible
- Clic sur back → retour à la liste, tab bar réapparaît
- Desktop : strictement intouché (classe `md:hidden` déjà sur la nav, CSS additions scoped via `@media` + `:has`)
