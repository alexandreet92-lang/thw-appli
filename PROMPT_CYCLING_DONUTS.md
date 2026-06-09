# PROMPT_CYCLING_DONUTS

Refonte de la **section donuts** en bas de la fiche cyclisme uniquement.
Le reste de la fiche cyclisme n'est pas touché.

## Convention de sport (réelle)
`activity.sport_type` : cyclisme = **`'bike'`** (ou `'virtual_bike'`),
détecté par `isBike = ['bike','virtual_bike'].includes(sport_type)`.

## Cible
- `src/app/activities/page.tsx` : ajout d'une section donuts cyclisme.
- Réutilise `DonutChart` (légende temps + %, 0 % masqués) + `zoneTimesFromStream`
  + les défs de zones partagées (Altitude, Température, Cadence) déjà créées
  pour trail/running.

## 5 donuts
1. **Puissance** — zones FTP utilisateur (`bikeZones` via `buildZones`),
   temps par zone `powerTimesZ`. Masqué si pas de FTP/zones.
2. **FC zones** — `hrZones` + `hrTimesZ`. Masqué si non défini.
3. **Cadence (RPM)** — 7 tranches (`CADENCE_ZONES_DEF`), **0 rpm exclu**
   (min 0.01 → roue libre retirée du dénominateur).
4. **Altitude** — 7 tranches (`ALTITUDE_ZONES_DEF`). Masqué sans flux altitude.
5. **Température** — 9 tranches (`TEMP_ZONES_PARSED`). Masqué sans flux temp.

## Layout
Grille `.cyc-donuts-grid` : **2 colonnes < 768 px**, **3 colonnes ≥ 768 px**
(donc 2+2+1 mobile, 3+2 desktop). Donuts à 0 % de données entièrement masqués.

## Format légende
Temps + % (via `DonutChart`), tranches à 0 % masquées du donut et de la légende.

## Règles
- Ne pas toucher au reste de la fiche cyclisme (Hero, courbes, laps, panneau
  sélection…).
- Couleurs sémantiques fixes (zones) ; reste via `var(--*)`.
- `npm run build` doit passer.
