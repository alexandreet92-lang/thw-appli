# PROMPT_PROGRESSION_COMPLETE

Onglet « Progression » : hub + pages sport + comparaison.

## PHASE 1 — INSPECTION — VERDICT
- ✅ « Progression » **existe bien** : c'est une **section de la page Training
  `/activities`** (sous-nav `Données / Analyse / Progression`, sous Analyse —
  `type Section`, `SECTIONS`, l.~9403). Son contenu actuel = `<SectionProgression>`,
  **remplacé** par le nouveau hub (le contenu actuel est jeté, comme demandé).
- ℹ️ Routes `/progression` et `/progression/[sport]` **créées en complément**
  (le hub y est aussi accessible et les bulles y naviguent pour le détail sport).
- ❌ Fichiers `schema_progression_hub_v4.html` / `schema_progression_sports.html`
  **absents** à la racine.
- ❌ Asset `/public/logo_branch.png` **absent** (l'image envoyée en chat ne peut
  pas être écrite en fichier ici) → shuriken **recréé en SVG inline**.
- ⚠️ **Données absentes** (mêmes blocages que muscu/hyrox/nutrition) :
  - table `session_families` : n'existe pas.
  - détection auto : exige des **intervalles « work »** (`laps[].isWorkInterval`,
    `avgHrPctMax`), **segments Hyrox**, **exercices/séries**, **1RM/FTP/CSS** —
    tous **absents** du schéma / non fournis par le sync.

## INTÉGRATION
- Section `progression` de `/activities` : `<SectionProgression>` (ancien
  contenu) → remplacé par `<ProgressionHub />`. `SectionProgression` n'est plus
  rendu (laissé défini, non supprimé pour éviter un retrait en cascade ; lint OK).

## IMPLÉMENTÉ (réel, autoportant, build OK)
- **HUB** (section Progression + route `/progression`) :
  - `ShurikenAnimated` — logo 4 branches **SVG inline** (gradient cyan), rotation
    douce + halo pulsant, `prefers-reduced-motion` respecté, 60fps.
  - 7 bulles sports **équidistantes sur un cercle** (math d'angles), flottement
    déphasé, lignes de connexion pointillées animées, anneaux d'ambiance.
  - Clic → animation d'explosion → navigation `/progression/[sport]`.
  - Bulle **Trail = « À venir »** : pas de navigation (message).
- **Page sport (shell)** `/progression/[sport]` : header + flèche retour, onglets
  familles spécifiques au sport, scroll-top au mount, et **état « non disponible »
  documenté** (pas de chiffre inventé).

## NON IMPLÉMENTÉ (bloqué — documenté, zéro mock)
Tout le cœur « données » : table `session_families` + détection auto + hero/stats/
liste/évolution + comparaison + cas spéciaux (RM reps bars muscu, grille stations
Hyrox). **Prérequis** :
1. **Schéma** : `session_families` (+ index) **et** les structures sous-jacentes
   (intervalles work, segments Hyrox, exos/séries, 1RM/FTP/CSS).
2. **Source** : un pipeline qui peuple ces données (détection à l'import) — le
   sync actuel ne fournit pas le détail nécessaire.
Sans (1)+(2), le hero/stats/comparaison ne peuvent afficher que des données
inventées → exclu.

## ACCESSIBILITÉ
- Le hub est atteignable via la **section Progression de Training** (sous
  Analyse) — l'entrée de nav existait déjà, rien à ajouter.

## CONTRAINTES RESPECTÉES
- Aucun emoji · couleurs sport sémantiques + `var(--*)` · animations transform/
  opacity · `prefers-reduced-motion` · TS strict sans `any` · `npm run build` passe.
