# PROMPT_LAPS_CHART_MOBILE_FIX — Mauvais graphique sur mobile, swap LapsChart → LapsBikeChart

## Diagnostic
Le prompt précédent (`PROMPT_LAPS_BAR_CHART_MOBILE`) avait branché `<LapsChart>` sur la section Intervalles mobile. **C'était le mauvais composant** :

| Composant | Type de rendu | Fichier |
|---|---|---|
| `LapsChart` | **Vue temporelle continue** — courbe de puissance brute en arrière-plan + rectangles de tours violets superposés (chaque tour = un rectangle horizontal qui couvre sa zone temporelle) | `src/components/activity/LapsChart.tsx` |
| `LapsBikeChart` | **Barres verticales par tour** — 1 barre par tour (T1, T2, …), largeur proportionnelle à la durée, couleur selon zone de puissance (violet clair → foncé % FTP), valeur watts au-dessus, ligne moyenne pointillée, clic → panneau détail du tour | `src/components/activity/LapsBikeChart.tsx` |

L'image 1 du prompt utilisateur (rendu actuel à corriger) correspond à `LapsChart`.
L'image 2 du prompt utilisateur (rendu attendu) correspond à `LapsBikeChart` — déjà rendu en bas de la section MMP du desktop (l. 6137) et également visible sous PowerCurveChart pour les activités vélo.

## Fix (1 swap chirurgical)
Dans la branche mobile, l'intérieur du `<Section title="Intervalles — N tours">` :

```diff
- <LapsChart
-   laps={a.laps}
-   streams={a.streams}
-   avgWatts={a.avg_watts}
-   hoveredLap={hoveredLapBar}
-   onHoverLap={setHoveredLapBar}
- />
+ <LapsBikeChart
+   activityId={a.id}
+   cachedLaps={a.laps}
+   avgWatts={a.avg_watts}
+   streams={a.streams}
+   ftp={bikeZoneRow?.ftp_watts ?? null}
+ />
```

`bikeZoneRow` est déjà disponible dans le scope de `ActivityDetail` (l. 4736 : `const bikeZoneRow = zones.find(z => z.sport === 'bike')`). Aucune nouvelle dépendance.

## Comportement de `LapsBikeChart`
- **Largeur** : `100%` du conteneur (SVG natif, viewBox 600, preserveAspectRatio xMidYMid meet) → s'auto-adapte edge-to-edge dans le sheet mobile
- **Hauteur** : ~200 px (PAD_T 22 + CH 150 + PAD_B 26)
- **Tri** : tours dans l'ordre chronologique (T1 → TN), largeurs proportionnelles à `lap.moving_time_s`
- **Couleurs** : palette violet `POWER_ZONE_COLORS` selon zone FTP (`< 55 %` → `#EDE9FE` jusqu'à `> 120 %` → `#6B21A8`). Fallback Z3 (`#A78BFA`) si FTP inconnu
- **Labels** : valeur watts au-dessus de chaque barre (si barre assez large), tags `T1, T2, …` en bas avec step adaptatif (≤ 10 tours → tous, ≤ 20 → tous les 2, ≤ 40 → tous les 5, sinon /10) — évite la surcharge
- **Ligne moyenne** : pointillée `#475569 strokeDasharray=4 3` à la hauteur de `avgWatts`
- **Tap** : clic sur une barre ouvre un `LapDetailPanel` inline (déjà implémenté dans le composant) → comportement préservé

## Pas de scroll horizontal nécessaire
`LapsBikeChart` utilise un SVG responsive avec `viewBox` fixe + `preserveAspectRatio` → toutes les barres tiennent dans la largeur disponible. Pour 45 tours sur un viewport 343 px, chaque barre ≈ 6-7 px (suffisant pour identifier les pics). Pas besoin d'`overflow-x: auto` (l'option B du prompt précédent).

## Fallback table conservé
Pour run / swim / gym (pas de watts), le tableau historique reste affiché. Logique inchangée :
```ts
isBike && a.streams?.watts && a.streams.watts.length >= 2 ? <LapsBikeChart /> : <table>...</table>
```

## Inchangé
- **Composant `LapsBikeChart`** : aucune modification (déjà responsive desktop)
- **Composant `LapsChart`** : non touché (toujours utilisé sur desktop ligne 6021 dans une autre section)
- **Branche desktop** : strictement intouchée (la section sous PowerCurveChart utilise déjà `LapsBikeChart` ligne 6137)
- **Section title `Intervalles — N tours`** conservé
- **Fallback table run/swim/gym** : non touché
- Import `LapsChart` du fichier conservé (utilisé ailleurs en desktop)

## Vérification
- npm run build : 0 erreur TS
- Mobile + activité vélo → barres verticales par tour (style image 2 du prompt)
- Plus de graphique continu temporel (style image 1)
- Mobile + run/swim/gym → tableau historique (non régression)
- Desktop : aucune modification
- Clic sur une barre → panneau détail du tour s'ouvre inline
