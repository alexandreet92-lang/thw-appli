# PROMPT_GPS_PERMISSION

## Objectif
Afficher un écran d'explication avant de demander la permission GPS au navigateur.
L'écran s'affiche une seule fois (flag localStorage `gps_permission_explained`).

---

## FIX 1 — Nouvel écran pré-permission `GPSPrePermissionScreen`

Fichier : `src/components/record/GPSPrePermissionScreen.tsx`

Props :
```ts
{ onAuthorize: () => void; onDismiss: () => void }
```

Design :
- Fond blanc (`#FFFFFF`), position fixed inset 0, zIndex 10010
- Centré verticalement, padding 32px 24px, fontFamily DM Sans
- Icône GPS : cercle 80px, background rgba(6,182,212,0.1), SVG localisation 24px couleur #06B6D4
- Titre "Autoriser la localisation" : fontSize 24, fontWeight 700, Syne
- Description : fontSize 14, color #666, lineHeight 1.6, maxWidth 320, centré
- 3 points avec checkmark SVG cyan (#06B6D4) :
  1. Tracé GPS précis de ta sortie
  2. Calcul distance, vitesse, altitude
  3. Carte en temps réel pendant l'effort
- Bouton principal "Autoriser la localisation" : pleine largeur, height 52, borderRadius 16, gradient #06B6D4→#2563EB
  - Au clic : appeler `navigator.geolocation.getCurrentPosition(...)` puis `onAuthorize()`
- Bouton secondaire "Pas maintenant" : background none, border none, fontSize 14, color #8C8C8C, marginTop 12
  - Au clic : `onDismiss()`

---

## FIX 2 — Mise à jour `GPSPermissionScreen` (écran refus)

Fichier : `src/components/record/GPSPermissionScreen.tsx`

Changements :
- Titre : "Localisation désactivée"
- Sous-titre : "Pour activer le GPS, suis ces étapes :"
- Instructions iOS (5 étapes) :
  1. Ouvre l'app Réglages sur ton iPhone
  2. Appuie sur "Confidentialité et sécurité"
  3. Appuie sur "Service de localisation"
  4. Descends jusqu'à Safari (ou ton navigateur)
  5. Sélectionne "Lors de l'utilisation"
- Bouton : "J'ai activé la localisation" → `window.location.reload()`
- Note sous le bouton : fontSize 12, color dim :
  "Sur Android : Réglages → Applications → Chrome → Autorisations → Position"

---

## FIX 3 — Mise à jour `CyclingScreen`

Fichier : `src/components/record/CyclingScreen.tsx`

Changements :
- Ajouter `gpsEnabled: boolean` state (default false)
- Ajouter `showPrePermission: boolean` state (default false)
- Après mount : lire `localStorage.getItem('gps_permission_explained')`
  - Si présent : `setGpsEnabled(true)` directement
  - Si absent : `setShowPrePermission(true)`
- Passer `useGPSTracking(gpsEnabled)` au lieu de `useGPSTracking(true)`
- `handleGpsAuthorize` : `localStorage.setItem('gps_permission_explained','true')`, `setShowPrePermission(false)`, `setGpsEnabled(true)`
- `handleGpsDismiss` : `setShowPrePermission(false)` (GPS reste désactivé)
- Rendre `<GPSPrePermissionScreen>` quand `showPrePermission`
- L'écran refus `<GPSPermissionScreen>` reste inchangé (affiché quand status === denied)

---

## Règle
- `npm run build` doit passer
- Merger sur `main`, pas de PR
