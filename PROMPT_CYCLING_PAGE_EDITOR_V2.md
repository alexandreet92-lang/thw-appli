# PROMPT CYCLING PAGE EDITOR V2

## Refonte complète de l'éditeur de page

### Types étendus (`types/cycling.ts`)
Ré-écriture complète avec :
- `FieldCategory` (10 catégories : temps, vitesse, distance, dénivelé, puissance, fc, cadence, énergie, navigation, environnement)
- `FieldType` (numeric | chart | climb_profile)
- `DataField` enrichi avec category, type, requiresSensor, requiresRoute
- ~50 champs `ALL_FIELDS` (vs 18 avant)
- `MAX_FIELDS = 12`
- `DataPage` ajoute `bigFieldId` et `bigFieldPosition: 'top' | 'middle'`

### Toast réutilisable
- `ToastContext` + `useToast()` (React context, partagé)
- `<ToastProvider>` monté dans PageEditor (couvre tous ses enfants)
- `Toast` slide-in depuis la droite, durée 2s, slide-out gauche

### Éditeur de page — full-screen (vs bottom sheet V1)
- Animation slide-from-right (translateX 100→0, 300ms)
- Position fixed inset:0 zIndex:10002 (par-dessus CyclingSettings)
- Header : retour + input nom inline + boutons +/− (ajout/retrait dernier champ)
- Position grand champ : pills "Grand champ en haut" / "Grand champ au centre"
- Aperçu temps réel (PagePreview)
- Instructions contextuelles
- Bouton Sauvegarder sticky bottom

### PagePreview
- Layout selon `bigFieldPosition`
- `bigFieldPosition === 'top'` : grand champ en haut 40%, autres champs grille dessous
- `bigFieldPosition === 'middle'` : champs partagés haut + grand champ milieu + champs bas
- Champs cliquables : simple tap = sélectionner/échanger, double tap = remplacer
- Cellule sélectionnée = border 2px cyan + bg cyan/10

### FieldPicker
- Bottom sheet 80vh slide-up
- Recherche + liste par catégorie
- Filtre les champs déjà présents
- Badges : `GRAPHIQUE`, `VISUEL`, `capteur`, `parcours`
- `selectField` : si replacingFieldId → remplacer, sinon ajouter

### ClimbProfile
- SVG du profil d'élévation
- Aire en dégradé cyan
- Ligne pointillée verticale = position actuelle
- 3 métriques sous le graph : Restant / D+ restant / Pente
- Fallback "Aucune montée détectée" si data null

### CyclingSettings — modif minimale
- Le bouton "Modifier" remplace `setEditing(page)` par `setEditing(page)` mais PageEditor s'affiche désormais comme overlay full-screen, pas un sub-sheet. (zIndex augmenté à 10002)

## globals.css

Ajout `editor-slide-in` / `editor-slide-out` (translateX) pour transitions full-screen de l'éditeur.

## Fichiers

| Fichier | Lignes cibles |
|---|---|
| `src/types/cycling.ts` (rewrite) | ~120 |
| `src/hooks/useCyclingConfig.ts` (inchangé) | 65 |
| `src/hooks/useToast.ts` (nouveau) | ~40 |
| `src/components/ui/Toast.tsx` (nouveau, Provider + UI) | ~80 |
| `src/components/record/ClimbProfile.tsx` (nouveau) | ~110 |
| `src/components/record/FieldPicker.tsx` (nouveau) | ~170 |
| `src/components/record/PagePreview.tsx` (nouveau) | ~140 |
| `src/components/record/PageEditor.tsx` (rewrite full-screen) | ~190 |
| `src/components/record/CyclingSettings.tsx` (tweak) | unchanged majeur |
| `src/app/globals.css` (animations) | +6 lignes |

## Hors scope V2

- Les pages configurées ne sont toujours pas reflétées dans le compteur live (Page1/2/3 restent câblés en dur). V3 fera le pont.
- Le champ `climb_profile` ne reçoit pas de vraies données (pas de détection de montée live) → fallback "Aucune montée détectée".

## Règles

- Merge direct sur main
- `npm run build` doit passer
- Aucun autre fichier touché
