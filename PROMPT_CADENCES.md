# CADENCES — Spécification complète (site + app THW)

> **Fichiers matérialisés depuis cette spéc :**
> - Config §6 (source de vérité des chiffres) : [`src/lib/cadences/cadences.config.json`](src/lib/cadences/cadences.config.json)
> - Cas de référence §13 : [`src/lib/cadences/reference-cases.json`](src/lib/cadences/reference-cases.json)
> - Moteur de calcul (§8) : [`src/lib/cadences/engine.ts`](src/lib/cadences/engine.ts) — validé par `npx tsx src/lib/cadences/validate.ts`
> - Points ouverts 🔶 (§20) : [`docs/cadences-open-points.md`](docs/cadences-open-points.md)
>
> Ne jamais dupliquer les chiffres : la config JSON est l'unique source.

## 0. Comment lire et utiliser ce document

- Repo `thw-appli` (Next.js 15, TypeScript, Tailwind, Supabase, Vercel ; iOS via Capacitor ; domaine `the-hybridway.com`). **Avant d'écrire du code, lire la structure existante** (conventions de dossiers, composants UI, auth, rôles admin, i18n, charte, chargement Capacitor) et la suivre si elle diverge de ce document.
- **Source de vérité des chiffres : le JSON de la §6** (`cadences.config.json`). Ne rien recalculer/arrondir/« améliorer ». Les points 🔶 sont des décisions ouvertes : implémenter la valeur indiquée mais **configurable** et la lister dans `docs/cadences-open-points.md`.
- **Ne pas inventer de données.** Aucune stat/courbe/norme dans l'UI si elle n'est pas dans ce document ou sourcée (§17 G8).
- Procéder par phases (§4). Terminer, tester, déployer une phase avant la suivante. Rien hors périmètre (§22).
- Langue : français. Unités : mètres, secondes, kilos, watts.

## 1. Contexte et objectifs

CADENCES = batterie de **24 épreuves** (course majoritaire, force, haltérophilie, natation, vélo, Hyrox), **18 à 80 ans**, notée sur **1000 points** de référence, décomposée en **7 qualités**. Conçue par Alex, testée d'abord sur lui.

Objectifs : (1) passer le test seul, à l'identique, chaque année ; (2) score global + par qualité, barème général + ajusté à l'âge ; (3) motiver à retester (graphes de progression, comparaisons, pédagogie) ; (4) constituer une base de données (avec consentement) pour recalibrer les barèmes estimés.

**Principe fondamental.** Protocole **fixe, répété dans le temps** : le but est la **comparabilité** (entre personnes et d'une année à l'autre), pas la perf maximale sur chaque épreuve. La fatigue accumulée fait partie du test ; récupérer vite est une qualité. Ne jamais ajouter de repos automatique ni d'avertissement « tu devrais être frais ».

## 2. Décisions figées

1. Score = somme des points par épreuve ; **total de référence = 1000** exactement.
2. Chaque épreuve : seuil **Réf = 60 %** et **Max = 100 %**. Interpolation **linéaire**, **sans plafond** au-dessus de 100 %, plancher à 0. **Aucun palier**.
3. Niveaux nommés = habillage d'affichage posé sur le % continu ; ne changent jamais le calcul.
4. Force en **3RM** (haltéro : Clean et Clean and press en **2RM**, Front squat en 3RM). Barème en **ratio au poids de corps**.
5. Vélo : **20 min à bloc** ; barème en **W/kg** ; FTP = 95 % de la puissance 20 min (affichage seulement).
6. Course longue : **3200 m** (8 tours).
7. Barème **H / F**, deux modes : **général** (21-35 ans) et **ajusté à l'âge** (12 tranches, §9).
8. Une épreuve se répartit sur **1 à 5 qualités** (§10). Qualités : Vitesse, Force, Puissance, Explosivité, Endurance, VO2max, Coordination. **Souplesse non évaluée** (« non évaluée par CADENCES »).
9. **Équipement** : pointes (sprints/400/3200) et ceinture (squat/SDT) corrigés vers une base « sans équipement » (§12).
10. Planning figé en **12 jours** (§5).
11. **Site** : tout. **App** : lecture seule des anciens résultats (§3).
12. **Move** : 100 m total dont 35 m en arrière, 3 passages, 1 min de récup (détail §7).
13. **Hyrox** : tour = 12 burpees box jump (ou 15 « to plate ») + 20 thrusters + 300 m rameur, 1 min récup, ×5, score = somme des tours (détail §7).
14. **Âge et chronos courts** : assouplissement **beaucoup plus faible** sur les efforts très courts. Chaque chrono a son exposant d'âge (§9).
15. **Profils animés G8** : sources et libellé validés (§17).
16. **Percentiles / classements** : interdits avant **100 testeurs** consentants (§17, §20).
17. Barème versionné (`scale_version`). Résultats bruts conservés pour **recalculer** l'historique quand le barème change.

## 3. Site vs app

| | Site | App iOS |
|---|---|---|
| Déroulé J1→J12, consignes, protocoles, fiches imprimables | ✅ | ❌ |
| **Saisie** des résultats | ✅ (seul endroit) | ❌ jamais |
| Progression / score partiel | ✅ | ❌ |
| Résultats d'une campagne terminée | ✅ | ✅ (simplifié) |
| Historique | ✅ | ✅ |
| Graphiques | ✅ tous (G1–G9) | G1, G3, G4, G6 + liste G9 |
| Animations pédagogiques | ✅ | ❌ |
| Base des protocoles | ✅ | ❌ (lien vers le site) |

- L'app **n'affiche aucun champ de saisie** CADENCES. Bouton « Passer / continuer le test sur le site » → `the-hybridway.com/cadences` (navigateur intégré). Détection via `Capacitor.isNativePlatform()` (ou la méthode du repo) ; blocage **route + données (RLS)**.
- 🔶 *(non validé)* Rappel de retest à 12 mois : prévoir le champ `next_retest_on`, ne pas notifier sans validation.

## 4. Phases

- **Phase 1 — Socle** : config + moteur testé, DB + RLS, parcours de test sur le site (J1→J12, protocoles, saisie, brouillon/validation, clôture), page résultats (G1, G3, G4, G5, G9), historique, écrans app lecture seule, pédagogie §18, consentement.
- **Phase 2 — Analyse** : G2, G6, G7, comparaison de 2 campagnes, recalcul d'historique, fiches imprimables, outils de test (chronos) *(suggestion non validée)*.
- **Phase 3 — Pédagogie animée** : G8 + page explicative.
- **Phase 4 — Calibrage** : tableau de bord admin des données consenties (§14, §20).

## 5. Parcours de test (12 jours)

| Jour | Contenu |
|---|---|
| J1 | Haltérophilie |
| J2 | Sauts / Sprints (+ agilité 🔶 placée ici par défaut, configurable) |
| J3 | Nage |
| J4 | Force (dead hang toujours en dernier) |
| J5 | repos |
| J6 | 400 m + 6.200 |
| J7 | Vélo (20 min) |
| J8 | AMRAP |
| J9 | repos |
| J10 | 3200 m |
| J11 | repos |
| J12 | Hyrox |

Batterie complète (jour, ordre, slug, points) : voir `cadences.config.json`. **Total = 1000.**

Règles : jours non imposés en dates (l'utilisateur démarre J1 quand il veut, repos J5/J9/J11 conservés) ; 🔶 saisie d'un jour avant la date prévue **non bloquante** par défaut (avertissement léger) ; chaque épreuve enregistrée **dès qu'elle est faite** ; épreuve « non passée » avec motif ; 🔶 score partiel = « X / Y possibles » + équivalent `points ÷ pts_max_passés × 1000` (à valider) ; campagne **clôturée** par l'utilisateur (fige un snapshot, §14). Avant clôture, saisies modifiables.

## 6. Configuration — source de vérité (JSON)

→ **`src/lib/cadences/cadences.config.json`** (chargé en base comme première `scale_version` active).
Temps en **secondes**, distances en **mètres**, charges en **kg** ; `kind: "ratio"` → `ref`/`max` sont des **ratios** (charge ÷ poids, ou W/kg). `direction`, `attempts`, `aggregate`, `age_time_exponent` (configurable) par épreuve. Validé : 24 épreuves, Σ points = 1000, Σ poids de qualités = 1 par épreuve.

## 7. Catalogue des épreuves (protocoles, saisie, données dérivées)

Chaque épreuve a une **page protocole** sur le site, générée depuis des **fichiers de contenu versionnés** (pas en dur dans les composants) : objectif, matériel, protocole pas à pas, échauffement spécifique, erreurs invalidantes, ce qu'il faut saisir, **données dérivées** après saisie, barème Réf/Max (H/F) **converti dans les unités dérivées** (ex. 3200 m : Réf 12:50 = 4:01/km), niveau atteint. Passages 🔶 : afficher le texte + drapeau interne de relecture.

Échauffement général commun : 10 min footing facile, mobilité (chevilles, hanches, épaules), 4–6 accélérations progressives de 20–30 m. Agilité et 6.200 sur **gazon**, jamais bitume. Plots contournés de l'**extérieur vers l'intérieur**.

> Le détail complet par épreuve (protocole, échauffement, saisie, données dérivées, notes 🔶) est repris du présent brief dans les fichiers de contenu `src/lib/cadences/content/*`. Points 🔶 majeurs : Move (règle de score = meilleur passage par défaut), géométries Square/Slalom à valider, table des charges thrusters Hyrox à fournir, conventions haltéro/natation/AMRAP à fixer. Voir `docs/cadences-open-points.md`.

Données dérivées par épreuve (jamais utilisées dans le score) : ratios au poids + 1RM Epley (force/haltéro) ; vitesses m/s & km/h (sprints, agilité) ; allure au km (400/3200/nage) ; W/kg + FTP (vélo) ; temps moyen / dérive (6.200, Hyrox, Move, AMRAP tours/min).

## 8. Moteur de calcul

→ **`src/lib/cadences/engine.ts`** (fonctions pures, client/serveur, sans réseau/DB). Entrées : `config`, `profil` (sexe M|F, poids, tranche d'âge), `résultats` par slug, équipement.

Pour une épreuve `t` : (1) valeur brute `x` agrégée (`attempts`/`aggregate` : 6.200 = somme ; Hyrox = somme ; Move = meilleur 🔶 ; AMRAP = tours + partiels ÷ 35) ; (2) équipement (§12) : `x ← x×(1±pct)` ; (3) si `ratio`, `x ← x ÷ poids` ; (4) seuils `ref`/`max` par sexe ; (5) facteur d'âge `PF = Σ_q poids[t][q]×pf[tranche][q]` (mode général → `PF=1`) — `higher` : `ref'=ref×PF`, `max'=max×PF` ; `lower` : `ref'=ref÷PF^e`, `max'=max÷PF^e` (`e = age_time_exponent`) ; (6) `pct = max(0 ; 0,6 + 0,4×(x−ref')÷(max'−ref'))`, **pas de plafond** ; (7) `points = pct×pts_max` ; (8) niveau sur `pct`.

Totaux : `total = Σ points` (réf 1000, peut dépasser). Par qualité : `points_q = Σ points_t×poids[t][q]`, `pts_max_q = Σ pts_max_t×poids[t][q]`, `pct_q = points_q÷pts_max_q`. Campagne partielle : ne sommer que les épreuves passées (num **et** dénom). Niveau global sur `total÷1000`.

Détails : double précision, **arrondi à l'affichage seulement** ; valeur manquante → ignorée (jamais 0) ; temps en secondes, saisie `m:ss` / `m:ss.d` / décimale ; refuser ≤ 0 ; confirmer si `pct>1,5` ou `pct<0,05` (sans bloquer) ; âge 18–80 (<18 refusé, >80 🔶 message « non défini ») ; sexe M/F, sinon « barème choisi » enregistré sans justification ; données dérivées calculées à part.

## 9. Barème par âge

18–80 ans en 12 tranches. Coefficients `PF` par tranche × qualité → `cadences.config.json` (`age.pf`). Mécanique : coefficient d'épreuve = moyenne pondérée des PF de ses qualités ; « plus = mieux » → seuils ×PF ; chronos → ÷PF^e.

🔶 Limites : PF = **estimations** (littérature masters) ; Explosivité/Puissance déclinent plus vite que Force ; **Endurance = VO2max** (même courbe) ; **Coordination = Vitesse** ; exposants d'âge des chronos : seul le 30 m (`e=0.45`) est calé sur Alex, les autres sont des propositions. Calibré pour **pratiquants réguliers**, jamais la population générale.

## 10. Qualités physiques

Définitions courtes à afficher : Vitesse, Force, Puissance, Explosivité, Endurance, VO2max, Coordination (voir brief). Souplesse : non évaluée. Répartition par épreuve (somme 100 %) : voir `weights` dans `cadences.config.json` — **éditable en admin** (estimations à challenger).

## 11. Niveaux nommés

| Niveau | Plage (% du Max) |
|---|---|
| Faible | < 20 % |
| Insuffisant | 20–39 % |
| Moyen | 40–59 % |
| Référence | 60–79 % |
| Solide | 80–99 % |
| Élite | 100–119 % |
| Exceptionnel | ≥ 120 % |

Le libellé change seul, jamais les points. Une couleur par niveau (échelle séquentielle, lisible clair/sombre et daltonisme ; jamais l'info par la couleur seule).

## 12. Équipement

Base : **chaussures normales**, **sans ceinture**. Corrections (configurables, estimations 🔶) : sprints 30/100 m pointes ×1,03 ; 400 m ×1,02 ; 3200 m ×1,01 ; squat / SDT ceinture ×0,93. Non appliqué au 6.200 ni à l'agilité (gazon). Aucune correction pour front squat, DC, militaire, Clean.

## 13. Cas de test de référence

→ **`src/lib/cadences/reference-cases.json`** (3 cas issus du classeur Excel d'Alex). Le moteur doit reproduire `pct`/`points` à ± 0,001 et les totaux à ± 0,01. **Validé** : `npx tsx src/lib/cadences/validate.ts` (écarts max pct 0,00005 · points 0,0005 · total 0,0004).

## 14. Base de données (Supabase)

Principe : stocker les **résultats bruts**, jamais seulement le score (recalcul possible avec n'importe quelle version). Tables (préfixe `cadences_`) : `cadences_scale_versions` (config JSON versionnée, une seule active), `cadences_campaigns` (un passage annuel : user, version, sexe du barème, âge/tranche, poids, statut, dates, `next_retest_on`, `share_for_calibration`), `cadences_results` (un par épreuve/campagne : `raw_value`, `raw_parts`, variant, equipment, timing_method, pool_length_m, statut draft/validated/skipped, motif, notes), `cadences_snapshots` (instantané des scores à la clôture, par version × mode général/âge). Schéma complet dans le brief original.

Sécurité (RLS sur toutes les tables) : chacun ne voit/modifie que ses lignes (`user_id = auth.uid()`) ; **aucune écriture depuis l'app** (bloqué route + API) ; `cadences_scale_versions` lecture authentifiée, écriture admin ; vue de calibrage anonymisée (sans `user_id`, poids par classes ±5 kg, seuil ≥ 5 contributeurs par cellule) admin uniquement. Calcul de référence **côté serveur** à la clôture ; le client recalcule pour l'aperçu. Snapshots `general` + `age` stockés à la clôture.

## 15. Site — pages

- `/cadences` — présentation, pourquoi tester, durée (12 j), pré-requis (18+, matériel), démarrer / reprendre ; extrait G8 (phase 3).
- `/cadences/test` — tableau de bord du parcours (frise J1→J12, prochaine action, « où j'en suis » : score partiel, qualités provisoires).
- `/cadences/test/[jour]` — page du jour (épreuves ordonnées, protocole, échauffement, saisie, « non passée », auto-brouillon + valider).
- `/cadences/test/[jour]/[slug]` — fiche d'une épreuve.
- `/cadences/resultats/[campagne]` — résultats complets (G1, G2, G3, G4, G5, G7, G9, niveaux, données dérivées, bascule général/âge).
- `/cadences/historique` — liste des campagnes, G6, comparaison de 2 campagnes.
- `/cadences/methode` — barème (§18), définitions, limites, version.
- `/cadences/comprendre` — G8 (phase 3).
- Fiche imprimable par jour (phase 2).

UX : saisie **terrain sur téléphone** (grandes cibles, clavier numérique, `m:ss`), reprise après coupure (brouillon local + sync), un écran = une épreuve, jamais de perte. Accessible (contrastes, clavier, `prefers-reduced-motion`). Consentements à l'entrée (cases séparées non pré-cochées) : (1) traitement nécessaire ; (2) partage anonymisé optionnel (§19).

## 16. App iOS — lecture seule

Liste des campagnes ; détail (G1, G3, G4, liste G9 simplifiée, mode général/âge) ; évolution (G6) ; bouton « Passer / continuer sur le site ». **Aucune saisie, aucun protocole détaillé.** Réutiliser les composants graphiques du site.

## 17. Graphiques

API commune (`data`, `mode`, `compact`), états vide/chargement/erreur, version accessible (tableau de données), clair/sombre, mobile d'abord. Animations 600–900 ms ease-out, coupées si `prefers-reduced-motion`. Repères constants : trait à **60 %** (Référence) et **100 %** (Max). G1 donut global · G2 donut points obtenus/perdus par qualité · G3 7 mini-anneaux · G4 radar 7 axes · G5 barres par épreuve · G6 courbe d'évolution · G7 position sur la courbe d'âge · **G8** deux profils animés (phase 3, sources validées, garde-fou : refuse de s'afficher sans source) · **G9** comparaison par exercice (bullet charts, tri force→faiblesse, « points perdus », fantôme campagne précédente). 🔶 Aucun classement « top X % » avant 100 testeurs consentants.

## 18. Contenus pédagogiques

Contenus éditables (fichiers de contenu), français, ton direct, sans promesse médicale : « comment est calculé mon score » (Réf 60 %, Max 100 %, linéaire sans plafond, exemple) ; barème général vs âge ; les 7 qualités + les niveaux ; pourquoi retester chaque année / pourquoi le même enchaînement ; équipement (corrections = estimations) ; **avertissements** (effort intense, avis médical conseillé, pas un diagnostic — 🔶 faire relire) ; limites du barème.

## 19. RGPD, sécurité

Données de perf rattachées à une personne = **potentiellement sensibles**. Consentement explicite, finalité claire, **minimisation** (réutiliser âge/sexe/poids du profil THW existants), **export** + **suppression** (cascade). Partage calibrage = **opt-in séparé**, révocable, anonymisé (seuil ≥ 5/cellule). Aucune donnée CADENCES dans les analytics admin au niveau individuel (RGPD-gated existant). Journaliser les modifs après validation. Aucune exploitation commerciale ni affichage public individuel. 🔶 Partage aux coachs : hors v1.

## 20. Points ouverts 🔶

→ **`docs/cadences-open-points.md`** (tenu à jour).

## 21. Critères d'acceptation

1. Moteur reproduit les 3 cas (§13) + tests unitaires (bas/haut, ratio, >100 %, plancher 0, équipement, général vs âge, campagne partielle, bornes d'âge 17/18/80/81, Σ poids = 1, Σ points = 1000). **✓ fait** (`validate.ts`).
2. Dérouler J1→J12 sur téléphone, saisir (dont 6 temps 6.200, 5 Hyrox), corriger avant clôture, clôturer, retrouver après reconnexion.
3. App : campagnes clôturées en lecture seule, **aucun** champ de saisie ; écriture CADENCES refusée par la base.
4. Graphiques G1–G7 + G9 OK clair/sombre, mobile, `prefers-reduced-motion`, données accessibles.
5. RLS : A ne lit jamais B ; données de calibrage sans identifiant.
6. Changer la version active recalcule l'historique sans modifier les résultats bruts.
7. Aucune valeur affichée hors config (§6), données utilisateur ou `aging-profiles.json` sourcé.
8. `docs/cadences-open-points.md` existe et reprend la §20. **✓ fait.**

## 22. Hors périmètre

VO2max chiffrée ; classements/percentiles ; partage social ; partage coachs ; notifications de retest (non validées) ; test de souplesse ; recalibrage automatique ; import Strava/Polar auto.

## 23. Ordre d'implémentation

1. Lire le repo ; proposer l'arborescence (message court) avant de coder.
2. **Config JSON + types + moteur + tests (§6, §8, §13).** ✓ fait.
3. Migration SQL + RLS + seed v1.0 (§14).
4. Parcours du test sur le site (§5, §7, §15).
5. Résultats : G1, G3, G4, G5, G9, bascule général/âge, données dérivées.
6. Historique + écrans app lecture seule (§16).
7. Pédagogie, consentements, export/suppression (§18, §19).
8. Phases 2 → 3 → 4, livrées séparément.
