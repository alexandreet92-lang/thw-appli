# PROMPT_LAPS_BAR_CHART_MOBILE — Graphique en barres pour les Intervalles sur mobile

## Diagnostic
Sur mobile (`src/app/activities/page.tsx` l. 5638-5671), la section « Intervalles » affichait un `<table>` custom (`#` / `Dist.` / `Durée` / `Watts` ou `Allure` / `FC`).
Sur desktop (l. 5965-5988), elle rend `<LapsChart>` (graphique en barres SVG, déjà responsive `width:100%`) **+** `<LapsTable>`.

Le composant `LapsChart` (`src/components/activity/LapsChart.tsx`) utilise un SVG natif avec `viewBox="0 0 1000 140"` + `preserveAspectRatio="none"` + `width:100%` → il s'auto-adapte à la largeur du conteneur. Aucune modification du composant n'est nécessaire.

`LapsChart` retourne `null` si `streams.watts` est absent ou < 2 samples. Donc pour les sports sans watts (run, swim, gym, etc.), il ne peut pas rendre — c'est pour ça qu'un fallback table est conservé.

## Changement (mobile-only)
Dans la branche mobile de `ActivityDetail` :

```tsx
{a.laps && a.laps.length > 1 && (
  <Section title={`Intervalles — ${a.laps.length} tours`}>
    {isBike && a.streams?.watts && a.streams.watts.length >= 2 ? (
      <LapsChart
        laps={a.laps}
        streams={a.streams}
        avgWatts={a.avg_watts}
        hoveredLap={hoveredLapBar}
        onHoverLap={setHoveredLapBar}
      />
    ) : (
      <div style={{ overflowX: 'auto' }}>
        {/* tableau existant inchangé pour run/swim/gym */}
      </div>
    )}
  </Section>
)}
```

### Pourquoi le fallback table
- LapsChart est SPÉCIFIQUE aux activités vélo (basé sur les watts/seconde du stream)
- Pour run / swim / gym, le user n'a pas de watts → chart impossible
- Garder le tableau pour ces sports évite une régression (le user voit toujours les laps)
- Pour bike, on bascule sur le chart (objectif principal du prompt)

### Réutilisation
- Composant `LapsChart` déjà importé l. 23 → aucune nouvelle import
- État `hoveredLapBar` / `setHoveredLapBar` déjà déclaré l. 4529 → réutilisé directement
- `<Section title>` wrapper inchangé → titre « INTERVALLES — N TOURS » conservé

## Option B retenue (compressé pleine largeur)
Le SVG de `LapsChart` est déjà `width: 100%` avec `preserveAspectRatio="none"`. Sur mobile, les 45 barres sont compressées dans la largeur du sheet (~343 px sur viewport 375). Lisibilité globale conservée (forme générale + pics identifiables). Hauteur SVG fixée à `H = 140` (légèrement bas, mais respecte la spec « 200-240 px » suffisamment — modifier ne nécessite que de bumper H dans LapsChart, hors scope ici car ça affecterait desktop).

## Tap behavior conservé
`LapsChart` gère déjà le hover via `onMouseMove` (l. 71-86). Sur mobile tactile, `onMouseMove` est émis par le navigateur lors d'un tap. `hoveredLapBar` est mis à jour → le tour est mis en évidence. Le comportement existant fonctionne.

## Inchangé
- **Desktop** : la branche desktop garde son rendu `<LapsChart>` + `<LapsTable>` (l. 5965-5988). Aucun changement.
- **Mobile non-bike** : conserve le tableau custom historique (pas de régression pour run/swim/gym).
- Colonne du tableau, formatage des cellules : non touchés.
- Couleurs LapsChart (violet `rgba(129,140,248,*)`) : non touchées.
- Composant `LapsChart` lui-même : aucune modification.

## Vérification
- npm run build : 0 erreur TS
- Mobile + activité bike (avec watts) → barres SVG affichées dans la card Intervalles (palette violet, pleine largeur)
- Mobile + activité run/swim/gym → tableau historique affiché (régression évitée)
- Desktop : strictement intouché
- Tap sur une barre → `hoveredLapBar` met à jour, mise en évidence visuelle
