# THW Coach IA — Capacités Claude à exploiter pour devenir la référence

> Audit des fonctionnalités de l'API Anthropic (Claude) **pas encore exploitées**
> dans l'app, mappées au coaching sportif THW, classées par impact/effort.
> But : faire de l'IA THW la plus capable du marché sport.

## Méthode
On distingue **ce que l'IA fait déjà** (à ne pas refaire) de **ce qui manque**.
Modèles THW : Hermès = Haiku (rapide/sobre) · Athéna = Sonnet 4.6 · Zeus = Opus 4.8
(le plus puissant). Les capacités « riches » (graphiques, raisonnement profond)
doivent être réservées à Athéna/Zeus — Hermès reste léger.

---

## ✅ Ce que l'IA fait DÉJÀ (socle)
- Boucle agentique streamée (read → reason → act) + 4 outils de lecture serveur.
- Rendu markdown dans le chat : **tableaux** (`|`), gras, listes, code, citations.
- Graphiques SVG dans les **flows structurés** : barres de séance (SessionBlockChart),
  rapports d'entraînement, analyse de semaine (CTL/ATL/TSB), stratégie de course.
- Vision **partielle** : analyse de photo de repas (nutrition) — `analyze-meal-photo`.
- Web search **partiel** : uniquement dans le briefing quotidien (Pro/Expert).
- Prompt caching (boucle coach), couche d'apprentissage (feedback → insights),
  mode vocal (écrit + oral), animation des appels d'outils.

→ Le socle est solide. Les manques ci-dessous sont les **leviers de différenciation**.

---

## 🥇 TIER 1 — Différenciateurs forts (à faire en priorité)

### 1. Graphiques & tableaux générés par l'IA DANS le chat libre  ⭐ (ta demande)
**Le manque** : aujourd'hui l'IA ne peut tracer une **courbe** que dans les flows
structurés. En conversation libre, elle ne sort que du texte/tableaux markdown —
pas de courbe d'évolution, pas de graphe à la volée.
**La solution** : donner à l'IA un **outil `render_chart`** (et `render_table`
enrichi) qu'elle appelle *quand c'est pertinent*, avec les données → le front
dessine un **SVG raw** (courbe / barres / aire), conforme à la règle « zéro lib
de chart ». On réutilise le pattern existant de SessionBlockChart.
**Cas d'usage sport** : « montre mon évolution de FTP », « compare mes 3 derniers
10 km », « trace ma charge de la semaine », « répartition de mes zones ».
**L'intelligence requise** : l'IA décide elle-même quand un graphe aide (vs texte).
On l'instruit pour Athéna/Zeus, pas Hermès. → C'est *le* point qui matérialise
« l'IA est réellement intelligente ».
**Effort** : moyen · **Impact** : très élevé (visuel premium + ta demande directe).

### 2. Vision dans le coach (pas seulement la nutrition)
**Le manque** : Claude *lit les images*, mais le coach training ne l'exploite pas.
**Cas d'usage sport** : capture d'écran d'une montre/Garmin/Strava à analyser,
photo d'un tableau de séance (crossfit/hyrox au mur), profil d'une course en
photo, photo d'une blessure (œdème/posture), capture d'un test labo.
**Effort** : faible-moyen (la brique vision existe déjà côté nutrition) ·
**Impact** : élevé (différenciateur rare sur le marché).

### 3. Raisonnement approfondi (adaptive thinking) sur Zeus/Athéna
**Le manque** : le chat tourne en streaming « simple ». Opus 4.8 (Zeus) et
Sonnet 4.6 (Athéna) supportent le **thinking adaptatif** : le modèle réfléchit
en profondeur avant de répondre sur les tâches complexes (stratégie de course,
conception de plan, diagnostic de plateau). Réglage `effort` (low→high).
**Cas d'usage** : « pourquoi je stagne sur 10 km depuis 3 mois ? » → analyse
multi-facteurs vraiment poussée. On peut même afficher « réflexion approfondie… »
dans l'animation existante.
**Effort** : faible (paramètre API) · **Impact** : élevé (qualité brute Zeus).
**À surveiller** : coût/latence → réserver aux questions complexes, pas au bavardage.

### 4. Sorties structurées garanties (structured outputs / strict tools)
**Le manque** : les flows parsent du JSON « best-effort » (`parseJsonResponse`).
Parfois ça casse. Les **structured outputs** (`output_config.format` + `strict`)
garantissent un JSON conforme au schéma → fini les plans/séances mal parsés.
**Cas d'usage** : génération de plan, séance, stratégie, zones, et les nouveaux
`render_chart` (le spec de graphe TOUJOURS valide).
**Effort** : moyen · **Impact** : élevé (fiabilité = confiance).

---

## 🥈 TIER 2 — Forte valeur, à enchaîner

### 5. Web search dans le chat (au-delà du briefing)
Coach à jour : météo/profil/résultats d'une course, dernières études (méthode
norvégienne, lactate…), produits nutrition. **Avec citations** (point 7).
**Effort** : faible · **Impact** : élevé. À gater Athéna/Zeus (coût/appel).

### 6. Lecture de PDF (tests labo, roadbooks, plans externes)
Claude lit nativement les PDF : rapport VO2max/lactate, prise de sang, roadbook
de course, plan d'un autre coach à importer/critiquer.
**Effort** : faible-moyen · **Impact** : élevé (cas « pro » très différenciant).

### 7. Citations des sources
Quand l'IA utilise web search ou un document, **citer la source** → crédibilité
(« selon … »). Renforce la posture d'expert.
**Effort** : faible · **Impact** : moyen-élevé (confiance).

---

## 🥉 TIER 3 — Optimisations / plus tard

### 8. Code execution serveur pour l'analyse lourde
Claude exécute du Python (pandas/scipy) sur les données de l'athlète :
modélisation de courbe de puissance, régressions de progression, prédiction de
temps de course. Renvoie **les données** → le front trace en SVG (respect de la
règle design). **Effort** : moyen-élevé · **Impact** : élevé pour les power users.

### 9. Batch API (coût −50 %)
Pour les traitements de masse non temps-réel : distillation nocturne (phase 3),
briefings de tous les utilisateurs, pré-calculs. **Effort** : moyen · **Impact** :
coût (marge).

### 10. Mémoire / outil mémoire natif
Tu as déjà ta couche maison (coach-memory + insights) — très bien. L'outil mémoire
d'Anthropic est une alternative ; **pas prioritaire** vu ton existant.

### 11. Tool search
Utile seulement si tu dépasses ~15-20 outils. Pas encore le cas.

---

## 📊 Synthèse priorisée

| # | Capacité | Effort | Impact | Tier |
|---|----------|--------|--------|------|
| 1 | **Graphiques/tableaux IA dans le chat** (ta demande) | Moyen | ⭐⭐⭐ | 1 |
| 2 | **Vision dans le coach** (photos/captures) | Faible-moyen | ⭐⭐⭐ | 1 |
| 3 | **Adaptive thinking** (Zeus/Athéna) | Faible | ⭐⭐⭐ | 1 |
| 4 | **Structured outputs** (fiabilité) | Moyen | ⭐⭐ | 1 |
| 5 | Web search dans le chat | Faible | ⭐⭐ | 2 |
| 6 | Lecture de PDF (labo/roadbook) | Faible-moyen | ⭐⭐ | 2 |
| 7 | Citations | Faible | ⭐⭐ | 2 |
| 8 | Code execution (analyse lourde) | Moyen-élevé | ⭐⭐ | 3 |
| 9 | Batch API (coût) | Moyen | ⭐ | 3 |

---

## 🎯 Recommandation de démarrage
**Commencer par #1 (graphiques dans le chat)** — c'est ta demande, c'est le plus
visible, et ça oblige l'IA à *décider quand* l'utiliser (la vraie intelligence).
Enchaîner avec **#3 (adaptive thinking Zeus)** — gros gain qualité pour un effort
minime — puis **#2 (vision)**.

Trio « waouh » qui place THW devant le marché :
**graphes à la volée + raisonnement profond + lecture de photos/PDF.**
