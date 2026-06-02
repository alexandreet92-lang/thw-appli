# Page Mon Profil — responsive desktop

## Diagnostic
Page : `src/app/profile/page.tsx` (composant `ProfileContent`).
Cause : le conteneur principal est figé à `maxWidth: 680` quel que soit l'écran
→ contenu étroit (~600-680px) même sur desktop 1300px+. De plus, l'onglet
Notifications empile ses sections en 1 colonne (`flex-direction: column`).

La sidebar de l'app reste déjà visible sur /profile (le composant `Sidebar`
n'est masqué que sur /topup et /competences) — rien à changer de ce côté.

## Correctifs (CSS responsive, styles inline → classes)
1. **Conteneur principal** : classe `.profile-shell`
   - mobile : `max-width: 680px` (= 100% sous 680), `margin: 0 auto`, `padding: 0 0 80px`
   - tablet (≥768) : `max-width: 760px`
   - desktop (≥1024) : `max-width: 900px`
   (Le padding horizontal reste géré par le header/contenu internes → pas de
   double marge.)
2. **Onglet Notifications** : conteneur des sections → `.profile-notif-grid`
   - mobile : `flex` colonne (inchangé)
   - ≥768 : `grid` **2 colonnes**, `column-gap: 16px`, `align-items: start`
   (Les `Card` gardent leur `margin-bottom: 12` pour l'espacement vertical.)

Le breakpoints utilisés : 768px (tablet) et 1024px (desktop). L'onglet Profil
bénéficie directement de la largeur élargie (stats déjà en grille 4 colonnes ;
cartes plus larges mais ≤900px = lisible, pas étiré).

## Vérifs
- 1920/1440/1024 : contenu ~900px centré, lisible.
- 768 : intermédiaire (760px, notifications 2 col).
- 375 : layout mobile conservé.
- Notifications : sections en 2 colonnes sur desktop.
- Sidebar visible sur desktop (inchangé).
- npm run build : 0 erreur.
