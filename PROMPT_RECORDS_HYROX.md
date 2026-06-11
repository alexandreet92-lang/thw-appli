# PROMPT — Refonte Records / Hyrox (page + double profil + ajouter une course)

> Application du Design System (`docs/DESIGN_SYSTEM.md`). App en mode sombre — tokens
> uniquement. Réutiliser les composants Vélo/Course (segmented, radar lisible, feuille
> neutre). Fichiers < 200 lignes.
>
> **Contrainte de livraison : commit LOCAL. NE PAS PUSH. Aucun déploiement Vercel.**

## A. Page
1. Pill sport Hyrox calmée (neutre + point hyrox, plus de fond orange plein). Pills
   période en segmented neutre.
2. Profil — bascule deux niveaux (Vue globale 5 axes ↔ Détail stations 9 axes). Style
   lisible commun (anneaux neutres, un polygone athlète `var(--primary)`, niveau
   pointillé, axes scalés par barème). Toggle neutre, « Barème » lien cyan.
3. Format (segmented neutre) : Solo Open / Solo Pro / Duo Open / Duo Pro. Filtre les courses.
4. Bouton « + Ajouter une course » (lien cyan) → feuille (B).
5. Comparaison : courses entre elles (barres verticales, hauteur = total, animées) +
   stations + run compromised (barres horizontales, repère = moyenne). Chiffres neutres.

## B. Feuille « Ajouter une course » (createPortal)
En-tête neutre (tag « Hyrox » + date + ✕). Format segmented. 8 stations (temps). 8 runs
1 km → « Run compromised (auto) » = somme. Roxzone (1 champ). Temps total auto = stations
+ runs + roxzone. Champs neutres, focus cyan. Bouton « Enregistrer la course » cyan.

## Implémentation
- `SportTabs.tsx` neutralisé : pill active en fond neutre élevé + **point sport** (plus
  d'aplat plein) — vaut pour Hyrox et tous les sports (cohérence).
- Pills période déjà en `Segmented` neutre (lot précédent). Filtre format → `Segmented`.
- Profil : `HyroxRadar` existant (toggle Vue globale 5 axes ↔ Détail stations 9 axes)
  rendu via `RadarCard` déjà neutralisé (un polygone `var(--primary)`, anneaux pointillés,
  axes scalés par barème, toggle H/F neutre, « Barème » lien cyan).
- `HyroxRecords.tsx` : orchestrateur (filtre format segmented, « + Ajouter une course »
  lien cyan, état vide, comparaison).
- `HyroxCompare.tsx` : courses (barres verticales animées, hauteur = total, teinte hyrox)
  + stations/run compromised (barres horizontales, run compromised en cyan, repère = moyenne).
- `HyroxRaceSheet.tsx` : feuille (createPortal) format segmented + 8 stations + 8 runs →
  run compromised auto + roxzone + total auto, bouton `var(--primary)`.

## Checklist (cochée avant commit)
- [x] Pill Hyrox calmée (point sport, plus d'aplat orange), pills/format en segmented neutre.
- [x] Toggle profil Vue globale (5 axes) ↔ Détail stations (9 axes) — `HyroxRadar` existant.
- [x] Radars lisibles (un polygone `var(--primary)`, anneaux pointillés, axes scalés).
- [x] Feuille Ajouter : format + 8 stations + 8 runs → run compromised auto + roxzone +
      total auto + date, createPortal, bouton cyan.
- [x] Comparaison : barres courses verticales + stations horizontales + run compromised
      total (cyan) + repère moyenne, animées, chiffres neutres.

### Réserves documentées
- **Roxzone non persistée séparément** : la table `hyrox_races` n'a pas de colonne
  roxzone (vérifié sur la base) et aucune migration n'est autorisée. Le temps de roxzone
  saisi est **replié dans le total** (`temps_final` = stations + runs + roxzone) ; il
  n'est pas stocké isolément.
- Le champ « Temps final » manuel de l'ancienne feuille est remplacé par un **total
  auto** (somme des segments) — plus de saisie manuelle redondante.

## Contraintes
TypeScript strict, aucun `any`. Aucune migration/schéma. Ne pas toucher `strava.ts`.
Max 200 lignes/fichier. Couleurs via `var()`. `npm run build` passe. Aucun emoji. Zéro mock.
**Commit local. NE PAS PUSH. Aucun déploiement Vercel.**
