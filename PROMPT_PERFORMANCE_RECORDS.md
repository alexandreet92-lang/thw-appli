# Performance / Datas › Records — refonte par sport (PLAN + slice 1)

## Honnêteté d'emblée
La refonte Records demandée est **énorme** : 7 sports rendus inline dans
`RecordsSubTab` (~820 l.) à l'intérieur de `DatasTab.tsx` (5 813 l.), avec jauges de
puissance, radars, stations Hyrox, blocs Muscu, segments triathlon, barème, feuilles
d'édition par sport. **C'est un chantier multi-sessions.** Je ne le fais PAS croire fait.
Ce passage livre une **slice 1 vérifiable** (composants partagés year-bars + lignes de
records) et documente le reste avec la checklist cochée honnêtement.

## Phase 0 — État réel (constat)
- L'onglet **« Zones »** de Datas est **déjà supprimé** (commit précédent `8c293e8`,
  sur main `a7625c0`) : Datas = Records + Year Datas.
- `RecordsSubTab` (DatasTab.tsx:2971) rend les 7 sports inline ; composants partagés :
  `TimeBarChart` (388, barres par année), `RecordRow` (1182, lignes par distance),
  `RecordDrawer` (1241) / `TriathlonDrawer` (1631) / `HyroxSection` (695, modal d'ajout),
  `PowerCurveLogSVG` (courbe de puissance).
- **Déjà présent** : barres par année **colorées + étoile sur le meilleur** (TimeBarChart),
  Natation/Aviron **sans radar**, drawers d'édition (RecordDrawer/TriathlonDrawer/Hyrox
  modal). Données réelles (Supabase). Donc une partie du squelette existe.
- **Saturation** : `RecordRow` affichait le record en `DM Mono` **cyan** + carte bordée ;
  nombreux chiffres colorés (watts, segments) ; palette d'année non conforme.

## Slice 1 — réalisée (composants partagés)
1. **Palette par année en tokens** (globals, sanctionnés DS §2.1) : `--year-2026 #06b6d4`,
   `--year-2025 #6366f1`, `--year-2024 #f59e0b`, `--year-2023 #94a3b8`, `--year-default`.
   `getPCColor` repointé sur ces tokens **par année** (au lieu d'un index).
2. **Barres par année animées** : `TimeBarChart` — remplissage `chartBarEnter` (scaleY
   0→1, ~0,9 s, respecte reduced-motion), opacité au survol, **étoile** conservée.
3. **`RecordRow` neutralisé** : record en **`var(--text)`** (plus de cyan), police
   `var(--font-body)` (plus de DM Mono), `.tnum` ; **carte bordée supprimée** (fond
   transparent, `--bg-card2` seulement si sélectionné, pas de bordure) ; badge PR en
   `var(--primary)`. → touche **Course / Natation / Aviron** (lignes par distance).
Build vert, enforce 0 couleur (34 fichiers). `RecordRow`/`TimeBarChart` restent dans
`DatasTab` (non enforced) : restyle en place, à extraire lors des slices par sport.

## Checklist d'acceptation (honnête)
- [x] Onglet « Zones » supprimé ; reste Records + Year Datas.
- [~] Aucune carte bordée : **`RecordRow` dé-bordé** ; les cartes englobantes de section
      restent (à faire dans les slices par sport).
- [~] Aucun chiffre coloré : **`RecordRow` neutralisé** ; watts/segments/Hyrox/Muscu
      restent colorés ailleurs (slices à venir).
- [~] « Modifier »/« Ajouter » en feuille : `RecordDrawer`/`TriathlonDrawer`/Hyrox sont
      déjà des drawers/modals — **à uniformiser** en bottom-sheet (createPortal) + champs
      soignés (slices à venir).
- [x] Barres par année colorées **par année** (palette demandée) + étoile sur le meilleur.
- [x] Jauges/barres **year-bars animées** au montage ; (autres jauges : à venir).
- [ ] Vélo : jauges de puissance pour toutes les durées — **non fait**.
- [ ] Triathlon : barres par segment + feuille total recalculé — **non fait**.
- [ ] Hyrox : jauge par station + run compromised + moyennes + feuille Ajouter — **non fait**.
- [ ] Muscu : blocs par exercice + jauges + « + Exercice » — **non fait**.
- [x] Natation/Aviron sans radar — déjà le cas.

## Plan incrémental (suite, une slice = fichiers extraits + enforced + commit)
1. ✅ Year-bars + RecordRow partagés (palette, animation, neutre).
2. ⏳ Course/Natation/Aviron : extraire la vue (titres Fraunces, sans carte, toggle
   distance, feuille d'édition uniforme).
3. ⏳ Vélo : radar calme + jauges de puissance horizontales animées + power curve.
4. ⏳ Triathlon : barres par segment + feuille (splits, total recalculé).
5. ⏳ Hyrox : stations + run compromised + moyennes annuelles + feuille Ajouter
   (runs→total auto ; **roxzone non recompté en double**, cf. PROMPT_PERFORMANCE_DATAS.md).
6. ⏳ Muscu : blocs par exercice + jauges + « + Exercice ».
7. ⏳ Barème en feuille (toggle M/F) pour les sports à profil.

## Contraintes respectées
TS strict, zéro mock, `npm run build` vert, aucun emoji, commit local, pas de push.
`strava.ts` intact, aucune migration.
