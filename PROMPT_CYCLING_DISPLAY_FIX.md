# PROMPT_CYCLING_DISPLAY_FIX — 4 fixes compteur vélo

## FIX 1 — Pages ajoutées visibles dans le compteur principal

Le compteur vélo (CyclingScreen.tsx) utilise DEFAULT_PAGES en dur.
Remplacer par useCyclingConfig('cycling') pour charger depuis Supabase.
Les dots indicateurs de pages = pages.length.
Safety effect : pageIndex ramené à pages.length - 1 si dépassement.
Créer CyclingPageData.tsx : renderer générique avec données live (GPS + stopwatch).
Conserver CyclingPage2 pour les pages type='map'.

## FIX 2 — Aperçu PagePreview : hauteur adaptative

PageEditor : height: 280 → minHeight: 320, overflow-y auto sur wrapper principal.
PagePreview grid : gridAutoRows: 'minmax(70px, auto)'.
BigField minHeight: 80, SmallField minHeight: 70.

## FIX 3 — Boutons +/- PageEditor : nouveau style

SVG icons au lieu de texte.
Compteur champs entre les boutons : N/MAX_FIELDS.
Couleurs conditionnelles rouge (−) / cyan (+).

## FIX 4 — Police des données

types/cycling.ts : DataFont + FONT_OPTIONS (system/mono/rounded/condensed/sport).
globals.css : Nunito, Barlow Condensed, Bebas Neue, Roboto Mono via Google Fonts.
useCyclingSettings.ts : display.dataFont (défaut: 'system').
CyclingSettingsParams : font picker dans section AFFICHAGE.
CyclingScreen + PagePreview : appliquer dataFontFamily sur valeurs numériques.
