# Nutrition — Fixes V2

## 5 corrections distinctes. Les traiter dans l'ordre.

---

## FIX 1 — MODAL REPAS : centré sur desktop, inchangé sur mobile

Backdrop fixed, panel drawer-bottom mobile / modal centré desktop.
Animation modal-in scale+translateY 220ms.

## FIX 2 — PHOTO IA : analyse détaillée avec liste d'aliments

API retourne meal_name + items[] + totals + confidence (low/medium/high) + notes.
Resize image côté client avant envoi (max 1024px, jpeg 0.82).
Double bouton mobile (capture caméra / galerie). Drag&drop desktop.
Items éditables : nom + quantité → kcal recalculé automatiquement.
Boutons "Enregistrer ce repas" + "Recommencer".

## FIX 3 — HISTORIQUE : barres avec vraies données

Diagnostic console.log avant correction.
Fetch par date + groupement client-side.
Barre minimale 3px pour les jours sans données.
Re-fetch quand refreshTrigger change.

## FIX 4 — POIDS : navigation par scroll au lieu des pills période

Supprimer les 4 pills 3m/6m/1y/5y.
Fenêtre glissante WINDOW_SIZE=8, windowEnd state.
Flèches chevron desktop (SVG), swipe mobile (touchStart/touchEnd).
Dots indicateur de position sous le graphique.

## FIX 5 — COURBE POIDS : gradient fill sous la courbe

linearGradient id unique par métrique `gradient-${metric}`.
Area avec fill + strokeDashoffset animation déjà présente.

---

## Règles
- FIX 1 : toucher uniquement le wrapper positionnel
- FIX 2 : mettre à jour la route API
- FIX 3 : logger d'abord, corriger ensuite
- FIX 4 : filtrer côté client uniquement
- FIX 5 : ajouter fill sur le path area existant
- Aucun emoji
- npm run build doit passer
