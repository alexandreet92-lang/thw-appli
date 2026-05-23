# Fix Scanner Code-barres — Nutrition

## Problème
Le scanner code-barres affiche "Scanner disponible sur mobile uniquement" sur mobile.
Cause probable : détection via navigator.userAgent qui échoue côté SSR dans Next.js.

## Fix 1 — Supprimer la détection JS, utiliser Tailwind

Remplacer toute logique `isMobile` basée sur `navigator.userAgent`
par des classes Tailwind responsive.

Le bouton scanner dans la barre de recherche :

```tsx
{/* Visible SEULEMENT sur mobile */}
<button
  onClick={() => setScannerOpen(true)}
  className="flex md:hidden absolute right-3 top-1/2 -translate-y-1/2
             text-muted-foreground hover:text-foreground transition-colors"
  aria-label="Scanner un code-barres"
>
  {/* SVG code-barres 20px */}
</button>
```

Sur desktop (md+) : le bouton est hidden, pas de message d'erreur,
juste absent. L'input de recherche prend toute la largeur.

## Fix 2 — Camera qui ne s'ouvre pas sur mobile

Le composant BarcodeScanner avec @zxing/library peut echouer
silencieusement sur iOS Safari ou certains Android.

Remplacer l'implementation par une approche plus robuste :
- BarcodeDetector natif si disponible (Chrome Android)
- Fallback @zxing/library pour iOS Safari
- playsInline + muted obligatoires (requis iOS)
- Gestion d'erreur explicite (NotAllowedError, NotFoundError)

## Fix 3 — playsInline obligatoire
S'assurer que la balise video a `playsInline` et `muted`.
Sans ca, iOS bloque la lecture automatique.

## Regles
- BarcodeScanner.tsx < 150 lignes
- Aucun emoji
- npm run build doit passer
