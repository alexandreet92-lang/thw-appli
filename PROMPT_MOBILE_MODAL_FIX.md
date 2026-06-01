# Mobile /competences — tabbar, header coupé, modal blanc

## Problèmes
1. Header coupé en haut (mobile) sur /competences — le header global de l'app
   (burger + avatar) chevauche le header dédié de la page.
2. Tabbar mobile (Plan, Stats, …) encore visible sur /competences.
3. Modal détail compétence : fond gris bleuté au lieu de blanc.

## Diagnostic
- La tabbar (`MobileTabBar`, client component) a déjà `usePathname()` + hide.
  Condition alignée sur `pathname?.startsWith('/competences')`.
- Le header global mobile est rendu par `Sidebar.tsx` :
  `<div data-app-header className="md:hidden" position:fixed top:0 height:56>`.
  Le `<main>` mobile a `margin-top: var(--header-height)` réservé à ce header.
- Le modal plein écran mobile utilisait `background: var(--bg)` = #eef2f7
  (gris bleuté). **Cause** : `var(--bg)`/`var(--bg-alt)` sont bleutés en clair,
  pas `var(--bg-card)` (= #fff).

## Correctifs
### FIX 1 — Tabbar (déjà fait, consolidé)
`if (pathname?.startsWith('/competences')) return null` dans `MobileTabBar`.

### FIX 2 — Header global masqué + gap supprimé
CSS via `:has` (robuste, sans toucher Sidebar/layout, dégradation propre) :
```css
body:has(.competences-mobile-root) [data-app-header] { display: none !important; }
main:has(.competences-mobile-root) { margin-top: 0 !important; }
```
Le header dédié de la page (burger filtres / titre+sous-titre / bouton X)
existe déjà ; ajout de `env(safe-area-inset-top)` à son padding (il est
désormais tout en haut du viewport).

### FIX 3 — Modal détail blanc
Classe `.comp-modal-fullscreen` : `#FFFFFF` en clair, `var(--bg-card)` en
sombre. Appliquée à la racine plein écran du modal (suppression du
`background: var(--bg)` inline). Bloc "Prompt actuel" laissé en `var(--bg-alt)`
(bloc distinctif). Champ "Remodeler" déjà blanc (`.comp-input-wrap`).

### FIX 4 — Champ création (déjà blanc)
`.comp-input-wrap` : `#FFFFFF` + bordure + ombre (fait précédemment).

## Note déploiement
Si les fixes précédents n'apparaissaient pas, suspecter un cache du service
worker PWA (hard refresh) ou un build Vercel échoué. Code revérifié.

npm run build : 0 erreur.
