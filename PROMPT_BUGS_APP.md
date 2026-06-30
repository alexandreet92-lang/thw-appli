# Bugs à corriger — app Hybrid (audit test iOS)

> Audit + correctifs. Statut par bug ci-dessous. Branche : `claude/weekly-objectives-redesign-bvhkpn`.

## 1. CRITIQUE — Bouton logo (chat) en boucle infinie ✅ CORRIGÉ

**Symptôme** : le bouton logo IA (en bas à droite dans la barre d'onglets, et/ou
en haut à droite) ouvre puis ferme le chat en boucle infinie.

**Cause racine identifiée** : dans `src/components/MobileTabBar.tsx`, le `<AIPanel>`
était rendu comme **enfant** du composant, *après* un `if (hidden) return null`.
`hidden` passe à `true` quand le clavier logiciel réduit le `visualViewport`.
Boucle :
1. tap logo → `aiOpen = true` → l'AIPanel s'ouvre et auto-focus le textarea → clavier iOS s'affiche ;
2. le clavier réduit `visualViewport.height` → `setHidden(true)` → `MobileTabBar` retourne `null` → **l'AIPanel (enfant) se démonte** → le chat se ferme ;
3. plus de textarea → le clavier disparaît → `visualViewport` revient → `setHidden(false)` → l'AIPanel se remonte (`aiOpen` toujours `true`) → ré-ouverture → auto-focus → clavier → … **boucle infinie**.

**Correctif** : on ne court-circuite plus le rendu sur `hidden`. On masque
uniquement la barre `<nav>` (`{!hidden && (<nav…>)}`) en gardant l'`AIPanel`
monté en permanence. Un appui ouvre, un appui (croix du panneau) ferme. Net.

## 2. Page blanche + manque de fluidité au démarrage / entre pages — PARTIEL

**Traité** :
- Skeletons adoucis (voir #3) → le « gris moche » empilé après le flash est nettement moins agressif.
- Aside mobile sur surface douce (voir #4) → moins de flash de contraste.

**Diagnostic des causes profondes (à arbitrer ensemble avant gros chantier)** :
- **Double montage** : `layout.tsx` rend `DesktopShell` **et** `MobileShell`, chacun rendant `{children}`. Chaque page est donc montée 2×, et tous les effets/fetch tournent en double même côté masqué (`display:none`). Coût réel sur le 1er paint et la fluidité inter-pages. Déduplication = bascule conditionnelle selon le viewport (risque hydration/layout shift) → chantier dédié.
- **Bundle AIPanel** : `src/components/ai/AIPanel.tsx` ≈ 22 000 lignes / 1,1 Mo, chargé en `dynamic(ssr:false)`. À code-splitter plus finement (sous-composants lourds en lazy).
- Splash natif Capacitor : hors scope (traité côté Xcode).

## 3. Skeletons (Planning) trop visibles / moches ✅ CORRIGÉ

**Correctif** (`globals.css` → `.skeleton-shimmer`) :
- suppression de la **bordure dure** sur chaque bloc (effet « boîtes vides » supprimé) ;
- dégradé plus subtil (`--bg-card2` → `--bg-elev` → `--bg-card2`) ;
- balayage plus lent et plus doux (`2.1s` cubic-bezier) ;
- `prefers-reduced-motion` : animation coupée, surface fixe.

## 4. Contraste menu latéral trop marqué ✅ ADOUCI

**Correctif** (`MobileShell.tsx`) :
- la sidebar mobile passe de `var(--bg)` (noir quasi pur en nuit) à `var(--bg-card)` — surface légèrement relevée, calme, au lieu d'un aplat noir agressif ;
- ombre de la page qui glisse par-dessus adoucie : `rgba(0,0,0,0.30)` → `rgba(0,0,0,0.16)`.

> Pas d'image de référence fournie pour #4 : si tu veux un autre dosage (plus/moins
> relevé), envoie une capture et j'ajuste finement.
