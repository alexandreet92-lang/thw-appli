Écrire dans PROMPT_BAREMES_FORME.md à la racine, puis implémenter.

# Test de forme : barèmes v1.2 par catégorie d'âge (navette + circuit)

Catégories : 8-10, 11-12, 13-15, 16-40 (barème général, le plus relevé : ces épreuves jugent l'endurance et la VO2max, pas la force max), 41-50, 51-60, 61-80 (les 71-80 ans utilisent le barème 61-70).
Chaque épreuve vaut 50 points : Référence = 60 %, Max = 100 %, linéaire (le moteur ne change pas).

| Catégorie | Navette H (réf/max, paliers) | Navette F | Circuit H (s) | Circuit F (s) |
| --- | --- | --- | --- | --- |
| 8-10 | 5 / 11 | 4,5 / 10 | 315 / 210 | 345 / 235 |
| 11-12 | 6,5 / 13 | 5,5 / 11,5 | 390 / 255 | 420 / 285 |
| 13-15 | 8,5 / 16 | 6,5 / 14 | 590 / 390 | 650 / 445 |
| 16-40 | 10 / 18 | 8 / 16 | 540 / 345 | 600 / 405 |
| 41-50 | 8 / 15,5 | 6,5 / 14 | 585 / 375 | 650 / 435 |
| 51-60 | 6,5 / 13 | 4,5 / 11,5 | 630 / 405 | 700 / 475 |
| 61-80 | 4,5 / 10,5 | 2,5 / 9 | 690 / 440 | 770 / 520 |

Hypothèses à recaler avec des données réelles : baisse de vitesse de course de 7 % par décennie après 40 ans, circuit enfants estimé.

## À faire
1. `src/lib/cadences/configs/forme.config.json` → v1.2 (7 tranches, band_refs pour toutes, pf à 1 : le barème de chaque catégorie est explicite).
2. Migration `supabase/migrations/20261022_cadences_forme_v1_2.sql` (idempotente : nouvelle ligne v1.2 active, v1.1 désactivée ; les campagnes existantes restent épinglées).
3. `public/site/components/cadences/CadencesForme.jsx` : `scaleFor` = mêmes valeurs (estimation avant enregistrement).
4. Aucun nouveau libellé. Pas de `any`. Aucun emoji. Branche main, pas de push sans go.
