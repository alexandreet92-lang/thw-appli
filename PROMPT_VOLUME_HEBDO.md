# PROMPT_VOLUME_HEBDO — Refonte graphique Volume hebdomadaire

## Fichier modifié
- src/app/activities/page.tsx (SectionDonnees uniquement)

## FIX 1 — Alignement des barres (SVG)
Remplacer le chart div/flex par un SVG pur.

viewBox="0 0 600 200", preserveAspectRatio="none"
VH_T = 22 (espace labels durée), VH_B = 20 (labels dates), VH_H = 200
VH_CH = 200 - 22 - 20 = 158 (zone graphe)
N = 10 slots, SLOT_W = 60, BAR_W = 34
BASE_Y = VH_T + VH_CH = 180

Chaque barre :
  x = i * 60 + 13 (centré dans slot)
  barH = (w.total / maxSliceTime) * (VH_CH - 6)
  Segments sport empilés de BASE_Y vers le haut, rect par segment
  Barre vide : rect height=2 gris var(--border)

Label durée : text au-dessus de la barre, y = BASE_Y - barH - 4 (clampé à VH_T + 12)
Label date  : text en bas, y = VH_H - 4, toutes les barres

## FIX 2 — 10 semaines + navigation
weeklyActs fetch : 52 * 7 jours (was 12 * 7)
CHART_WEEKS : 52 (was 12)
État weekBlockOffset : number, default 0 (bloc le plus récent)

weekSlice : 10 semaines visibles
  maxBlockOffset = Math.max(0, Math.floor((weeks.length - 1) / 10))
  safeOffset = Math.min(weekBlockOffset, maxBlockOffset)
  sliceEnd = weeks.length - safeOffset * 10
  sliceStart = Math.max(0, sliceEnd - 10)
  weekSlice = weeks.slice(sliceStart, sliceEnd)
maxSliceTime = Math.max(...weekSlice.map(w => w.total), 1)

Navigation (dans le header du bloc) :
  ChevronLeft  : weekBlockOffset++ (désactivé si safeOffset >= maxBlockOffset)
  label plage dates : fmtDateShort(weekSlice[0].week) – fmtDateShort(weekSlice[last].week)
  ChevronRight : weekBlockOffset-- (désactivé/masqué si weekBlockOffset === 0)
  Boutons : 24×24px, borderRadius 50%, background T.bgAlt, border T.border
  Couleur icône : T.textMuted, désactivé : opacity 0.3

## FIX 3 — Deltas conservés
Garder les deltas sport discrets dans le header.
Calcul basé sur weekSlice (visible) vs les 10 semaines précédentes (prevSlice).

## Lucide imports
Ajouter ChevronRight (ChevronLeft déjà importé).
