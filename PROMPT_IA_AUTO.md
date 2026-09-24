# THW — Rendre l'IA proactive + sécurité

### Repo THW existant. Objectif : que l'app tienne sa promesse — l'IA interprète AUTOMATIQUEMENT les données pour faire gagner du temps au coach et lui permettre de gérer plus d'athlètes.

Contexte : une analyse du code (ANALYSE_HONNETE_IA_COACH.md) a montré que la couche multi-athlètes fonctionne bien, mais que l'interprétation IA est 100% manuelle et que certaines données sont estimées au lieu d'être calculées. Ce prompt corrige ça.

⚠️ Priorité : livrer chaque brique fonctionnelle et testée avant de passer à la suivante. Ne casse RIEN de l'existant (roster, Studio, alertes, dashboard coach). Montre-moi le résultat après chaque brique.

---

## BRIQUE 0 — SÉCURITÉ (à faire EN PREMIER)
Le fichier `CLAUDE.md` contient en clair un token Facebook/Instagram et une clé secrète d'application, versionnés dans git.
- Retire ces secrets du fichier `CLAUDE.md` et de tout autre fichier versionné ; remplace-les par des variables d'environnement (`.env.local`, avec des placeholders dans `.env.example`).
- Purge ces secrets de l'historique git (réécriture d'historique).
- Ajoute `.env.local` au `.gitignore` s'il n'y est pas.
- Dis-moi clairement, à la fin, quelles clés étaient exposées et confirme qu'elles ne sont plus ni dans le code ni dans l'historique. (Je les révoquerai/regénérerai moi-même côté Meta ensuite.)

---

## BRIQUE 1 — DÉCLENCHEMENT AUTOMATIQUE DE L'ANALYSE IA APRÈS SYNC
Aujourd'hui, quand une séance arrive (sync Strava / webhook), le code calcule seulement les records. Aucune analyse IA n'est déclenchée.
- Après le post-traitement d'une nouvelle activité synchronisée, déclenche automatiquement l'analyse IA de la séance (le chemin d'analyse existant `/api/analyze-training`), sans que l'utilisateur ait à cliquer.
- Stocke le résultat pour qu'il soit affiché directement quand le coach/athlète ouvre la séance (pas de recalcul à chaque ouverture).
- **Gestion du coût/quota** : rends ce déclenchement configurable (activable/désactivable), et prévois le cas où le quota API est atteint (file d'attente ou skip propre, pas de crash).
- Respecte le paramètre de niveau de détail choisi par l'utilisateur (minimum / avancé / spécialiste) s'il existe déjà ; sinon, prévois-le simplement.

## BRIQUE 2 — DIGEST PROACTIF HEBDO AU COACH
Aujourd'hui l'agrégation ne se calcule que quand le coach ouvre l'app, et les alertes poussées sont individuelles, jamais synthétisées.
- Crée un digest récurrent (cron hebdo, + option quotidien) qui réutilise la brique roster existante et envoie au coach une synthèse : « X athlètes à surveiller cette semaine » avec les cas prioritaires (blessés, inactifs, fatigue élevée, course proche).
- Envoi par le canal de notification déjà en place (et/ou email si Resend est configuré).
- Le digest doit être court, actionnable, et lier directement vers les athlètes concernés.

## BRIQUE 3 — ZONES CALCULÉES SUR LES VRAIS STREAMS
Aujourd'hui la répartition en zones est estimée par l'IA, pas calculée sur la FC/puissance réelle. Les streams sont déjà stockés.
- Calcule la répartition en zones à partir des streams réels (FC et/ou puissance) au lieu de l'estimation.
- Fournis ces zones calculées comme contexte à l'analyse IA (pour qu'elle interprète des données exactes, pas approximatives).

---

## HORS PÉRIMÈTRE (ne PAS faire dans ce prompt)
- Le modèle de charge CTL/ATL/TSB/EWMA et la détection quantifiée de surcharge = gros chantier séparé, à cadrer plus tard. Ne le commence pas ici.
- Corrige toutefois l'incohérence de schéma signalée si elle est triviale : l'outil `roster_overview` interroge `main_goal`/`planned_races` alors que le reste utilise `primary_goal`/`race_events` — aligne sur le schéma réel pour que l'outil ne se dégrade pas silencieusement.

## Qualité
- Ne casse pas l'existant, garde tout typé, mets à jour le README (nouveaux crons, config du déclenchement auto, variables d'env).
- Après chaque brique, montre-moi ce qui a changé et comment le tester.

Commence par écrire ce brief dans PROMPT_IA_AUTO.md, puis implémente dans l'ordre : Brique 0 (sécurité) → 1 → 2 → 3. Pose une question si un choix d'architecture doit être tranché, mais privilégie la solution la plus simple qui marche.
