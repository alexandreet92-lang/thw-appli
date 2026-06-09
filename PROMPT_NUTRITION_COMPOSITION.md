# PROMPT_NUTRITION_COMPOSITION

Refonte de l'onglet « Composition » (poids & composition corporelle) : tendance
lissée neutre reliée à l'objectif, import balance + saisie manuelle en repli.

## PHASE 1 — INSPECTION (lecture seule)

| Élément | Constat |
|---|---|
| Composant | `nutrition/page.tsx`, bloc `{tab === 'body'}` (l.~1832) + `WeightChart` (l.409) + `computeBodyStats` (l.375). |
| Table mesures | `body_measurements` → `WeightLog { measured_at, weight_kg, fat_mass_percent, muscle_mass_kg, source: 'manual'|'connected_scale' }`. |
| Saisie manuelle | Formulaire « Ajouter une mesure » (date, poids, MG %, masse musculaire) → `saveWeightLog` (source `'manual'`). |
| **Source connectée** | ⚠️ La sync **Withings écrit dans une table générique par `provider`/`data_type`**, **pas** dans `body_measurements`. Aucune mesure `source: 'connected_scale'` n'est écrite aujourd'hui → pas de signal fiable « balance connectée alimentant la compo ». Détection faite **génériquement** sur `source === 'connected_scale'` (pas de Withings en dur). Documenté. |
| **Objectif du plan** | ⚠️ Pas de champ objectif/poids-cible dans le plan (`plan_data` n'a que `description`/`type`). Le poids cible est stocké en **localStorage** (`thw_goal_weight`). « Relié à Mon plan » = lien vers l'onglet Plan (la valeur n'est pas dérivée du plan). Documenté. |
| Taille (profil) | ✅ `profile.height_cm` (pour FFMI & IMC ; masqués si absent). |

## PHASE 2/3/4/5 — IMPLÉMENTÉ (réel, build OK)

- **FFMI** ajouté (masse maigre = poids × (1 − MG %/100) ; FFMI = maigre / taille²),
  **IMC relégué en dernier** dans le sélecteur ; FFMI/IMC **masqués** (valeur nulle)
  si poids/MG %/taille manquent.
- **Graphe `WeightChart` refait** :
  - axe X **chronologique** (proportionnel au temps, plus index),
  - **dates lisibles `JJ/MM`** (corrige l'ancien format cassé « 11-19 »),
  - **points bruts discrets** (gris) + **courbe lissée** (moyenne mobile fenêtre 3)
    par-dessus + **ligne de cible** en pointillés.
- **Sélecteur de période 30 j / 3 mois / 1 an** → filtre graphe + tuiles.
- **Tuiles neutres** : Actuel, Min, Max, Variation, **Tendance/sem** (sans glyphe
  ▲/▼, **sans rouge alarmiste**, ton neutre), **Écart objectif**.
- **État source** (générique) : puce « Synchronisé · balance connectée » si des
  mesures `connected_scale` existent, sinon **bannière** « Aucune balance
  connectée » + lien **Connecter →** vers `/connections` ; saisie manuelle
  conservée (repli/principal).
- **Objectif relié à Mon plan** : lien cliquable « Relié à Mon plan → » (vers
  l'onglet Plan) ; champ cible **sans police monospace**.
- Aucun emoji/glyphe, aucune couleur alarmiste sur la tendance.

## RESTE À FAIRE (incrément dédié)
- **Sous-nav verticale gauche (`SectionLayout`) + pleine largeur** : staggé (même
  page 2392 l., anti-régression sur les 4 onglets). Le contenu compo est déjà en
  grille responsive (`xl:grid-cols-3`).
- **Vrai import balance dans `body_measurements`** : nécessite que la sync écrive
  des mesures `source: 'connected_scale'` (mapping à ajouter côté sync) — alors
  la puce de source + dernière synchro afficheront des données réelles.
- **Poids cible dérivé de l'objectif du plan** : nécessite un champ objectif /
  poids-cible dans le schéma du plan.

## CONTRAINTES RESPECTÉES
- TS strict sans `any` · zéro mock (manques documentés) · SVG brut · variables CSS ·
  pas de rouge alarmiste · `strava.ts` intact · aucune migration · `npm run build` passe.
