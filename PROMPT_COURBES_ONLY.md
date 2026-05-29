# PROMPT_COURBES_ONLY — Courbes Vitesse et Température

## Fichier concerné
src/app/activities/page.tsx — composant SyncCharts, tableau `tracks`

## État
Courbes déjà implémentées dans PROMPT_ANALYSE_COMPLETE.

---

## COURBE VITESSE
Position : entre Puissance/Allure et Cadence
```
speedKmh ? {
  label: 'Vitesse', data: speedKmh, color: '#60A5FA', fill: 'rgba(96,165,250,0.10)',
  unit: 'km/h', H: 48,
  formatY: (v) => `${v.toFixed(1)} km/h`,
  formatVal: (v) => v.toFixed(1),
} : null
```
speedKmh = (isBike || isRun) && velocity ? velocity.map(v => v * 3.6) : null

---

## COURBE TEMPÉRATURE
Position : après Cadence (dernière courbe)
```
(isBike || isRun) && temp ? {
  label: 'Température', data: temp, color: '#6EE7B7', fill: 'rgba(110,231,183,0.10)',
  unit: '°C', H: 48,
  formatY: (v) => `${Math.round(v)} °C`,
  formatVal: (v) => `${Math.round(v)}`,
} : null
```
// streams.temp sera disponible après l'ajout de 'temp'
// dans STREAM_KEYS (voir PROMPT_TEMP_STREAM)

---

## Ordre complet des courbes
1. Altitude  (#94A3B8)
2. FC        (#F87171)
3. Puissance (#818CF8) — vélo uniquement
3. Allure    (#f97316) — course uniquement
4. Vitesse   (#60A5FA) — vélo + course
5. Cadence   (#F472B6)
6. Température (#6EE7B7) — si streams.temp disponible
