# Sous-pages Modèles / Abonnement → vraies bottom sheets iOS

## Constat
Les sous-pages `ModelesSubPage` / `AbonnementSubPage` étaient des **pages plein
écran** (`position:fixed; inset:0; zIndex:1000`) rendues **dans `<main>`**
(stacking context `zIndex:10`). Conséquences :
1. Pas une vraie bottom sheet — juste une page qui apparaît.
2. Contenu coupé en haut (header app sibling de `<main>` à z 50/100 peint
   au-dessus de tout le sous-arbre de `<main>`, quel que soit le z-index interne).
3. Abonnement « vide » : le haut (carte plan) passait sous le header app.

## Étape 1 — réutiliser le composant existant (PAS de réinvention)
Les modals de test de Performance/Training utilisent déjà
`src/components/ui/BottomSheet.tsx` :
- `createPortal(..., document.body)` → **z-index 9999**, échappe au stacking
  context de `<main>` → peint par-dessus header + sidebar.
- Coins arrondis **haut uniquement** (`border-radius: 20px 20px 0 0`).
- **Handle** gris centré en haut (36×4).
- `maxHeight: 88vh`, slide-up `translateY(100%→0)` 300ms
  `cubic-bezier(0.32,0.72,0,1)`, overlay sombre + blur, tap overlay = close.
- Contenu **scrollable** à l'intérieur (`overflowY:auto`).
- Fond opaque garanti via `[data-sheet-panel]` dans globals.css.

API : `<BottomSheet isOpen onClose title? icon?>`.

## Implémentation (`src/app/profile/page.tsx`)
1. `import { BottomSheet } from '@/components/ui/BottomSheet'`.
2. `AbonnementSubPage(onBack)` → **`AbonnementContent()`** : suppression du
   wrapper fixed + header + animation `sub-page-enter/exit` + `closing`/`handleBack`.
   Ne reste que le contenu (carte plan, jauges, paiements, moyen de paiement,
   « En savoir plus », « Résilier », modal de confirmation). Padding géré par la
   sheet.
3. `ModelesSubPage(onBack)` → **`ModelesContent()`** : idem, ne reste que les
   3 cartes (Hermès/Athéna/Zeus) + note + « En savoir plus ».
4. `IASettingsBloc` : les deux `{open && <…SubPage/>}` deviennent
   ```tsx
   <BottomSheet isOpen={modelsPageOpen} onClose={() => setModelsPageOpen(false)} title="Les modèles IA">
     <ModelesContent />
   </BottomSheet>
   <BottomSheet isOpen={subPageOpen} onClose={() => setSubPageOpen(false)} title="Abonnement">
     <AbonnementContent />
   </BottomSheet>
   ```

## Abonnement plus jamais vide
La carte « Plan actuel » + « En savoir plus » sont rendues sans condition
(même `details=null` → tier `trial`). Les jauges (Hebdomadaire / Sur 6 heures
glissantes) s'affichent dès que l'API renvoie `monthly`/`rolling_6h`
(compte créateur = 2 000 000 / 350 000 via `getUserTokenLimits`).
Compte sans Stripe : pas de paiements / moyen de paiement / résiliation (déjà
conditionnés sur `hasStripe`). Plus de coupe en haut → contenu visible.

## Conservé
Prix « €/mois » intacts. Quota tokens « Hebdomadaire ». `fmtTokens` =
`toLocaleString('fr-FR')`.

npm run build : 0 erreur.
