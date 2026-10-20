Écrire dans PROMPT_TEST_FORME_ENFANTS.md à la racine, puis implémenter.

# Test de forme dès 8 ans + écran de présentation

## Règles
- Test de forme ouvert dès 8 ans. 8-10 ans et 11-12 ans : circuit allégé. Dès 13 ans : même circuit que les adultes.
- Au clic sur le test : d'abord une présentation (déroulement, matériel, circuit selon l'âge), puis le profil, puis le test.
- Chaque nouveau libellé est traduit tout de suite en EN / ES / IT / DE (i18n-dict-15.js, i18n-dict-16.js, i18n-it.js, i18n-de.js).

## Circuits (3 tours, le plus vite possible)
- 8-10 ans : 6 burpees sans aller au sol (position de pompes) + 12 taps d'épaule + 16 montées de genoux (mains devant à hauteur des hanches, les genoux touchent les mains) + 20 m de marche de l'ours.
- 11-12 ans : 6 burpees complets + 12 taps d'épaule + 16 montées de genoux (idem) + 20 squats + 20 m de marche de l'ours.
- 13 ans et plus : circuit adulte (8 burpees, 12 pompes, 16 fentes, 20 squats, 24 m de marche de l'ours).

## Technique
- forme.config.json v1.1 : age.min 8, tranches 8-10 / 11-12 / 13-14 / 15-17, `band_refs` par épreuve (barèmes PROVISOIRES à calibrer sur des passages réels).
- engine.ts : `band_refs` optionnel remplace male/female pour la tranche d'âge.
- Migration supabase/migrations/20261021_cadences_forme_enfants.sql (nouvelle version de barème active, v1.0 conservée pour les anciens tests).
- CadencesForme.jsx : étape Présentation, exFor(age), scaleFor(age, sex), libellés Garçon / Fille, âge 8-80, poids dès 15 kg.
