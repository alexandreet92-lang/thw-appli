Écrire dans PROMPT_TEST_FORME.md à la racine, puis implémenter.

# Test de forme (Decaform, test_key = 'forme')

Batterie de 100 points : navette de Léger (50) + circuit au poids du corps x3 (50), le même jour, sans matériel.

## Parcours (public/site/test-de-forme.html + components/cadences/CadencesForme.jsx)
1. Profil : prénom, nom, date, âge (18-80), poids, barème H/F. Prérempli (compte + dernier passage), modifiable, validé avant le test.
2. Léger : départ 8,5 km/h, +0,5 km/h par palier, navettes par palier [7,8,8,9,9,10,10,11,11,12,12,13,13,13,14,14,15,15,16,16,16]. Bips pré-programmés sur AudioContext.currentTime (square, compresseur, volume réglable, bouton "Tester le son", flash visuel, vibration, Wake Lock).
3. Récupération 20 min minimum.
4. Circuit : 8 burpees, 12 pompes, 16 fentes, 20 squats, 24 m marche de l'ours, x3. Mode avec partenaire (bouton "Exercice terminé", temps par exercice) ou autonome (chrono simple).
5. Résultat /100, enregistrement (campagne, résultats, courbes cardio, clôture), historique "Mes passages".

## Cardio Bluetooth (facultatif)
Web Bluetooth (service heart_rate). Chrome/Edge ordinateur ou Android uniquement, message explicite. Courbe SVG, min, max, moyenne, détail par palier (Léger) et par exercice (circuit assisté). Stockage : table cadences_hr_traces via /api/cadences/hr.

## Backend
- src/lib/cadences/configs/forme.config.json + catalog.ts, presentations.ts, protocols.ts
- supabase/migrations/20261020_cadences_forme.sql (barème actif + table HR + RLS) à appliquer manuellement
- src/app/api/cadences/hr/route.ts (PUT/GET)

## À calibrer
Barèmes provisoires (Léger H 10/18 paliers, F 8/16 ; circuit H 540/345 s, F 600/405 s).
