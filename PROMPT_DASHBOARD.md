# PROMPT_DASHBOARD — Refonte page d'accueil (Modèle 1 « Plan & progression »)

> Spéc de travail + vérifications de données. Référence visuelle : `dashboard_mockup.html`
> (⚠ **absent du repo** au moment de l'implémentation — design appliqué via
> `docs/DESIGN_SYSTEM.md`, qui fait foi). Référence design : `docs/DESIGN_SYSTEM.md`.

## Fichier réellement rendu (confirmé)

- La page d'accueil est la route **`/`** → `src/app/page.tsx`.
- Preuve structurelle : `src/components/shared/Sidebar.tsx` mappe `href: '/'` → label
  **« Dashboard »** ; `src/middleware.ts:27` laisse passer `/` (« la page gère elle-même ») ;
  `src/app/layout.tsx` enveloppe tout enfant dans `DesktopShell` / `MobileShell`
  (sidebar + header flottant + bottom tab bar).
- L'ancien `page.tsx` n'était qu'un `SplashScreen` qui **redirigeait vers `/activities`**
  (pas de vrai dashboard). On le remplace par le contenu Dashboard. ⚠ comme l'ancienne page
  redirigeait avant tout rendu, le test « TEST123 » littéral ne pouvait pas s'afficher ;
  la confirmation est structurelle (routing ci-dessus) + build vert.

## Chrome réutilisé (non reconstruit)

- Sidebar desktop / tiroir mobile / bottom tab bar / header flottant : `DesktopShell.tsx`,
  `MobileShell.tsx`, `MobileTabBar.tsx`, `Sidebar.tsx`. **Réutilisés tels quels.**
- Shuriken IA : `/logos/logo_4bras.png` (FAB header). **Réutilisé, non redessiné.**
- Panneau Coach : `src/components/ai/AIPanel.tsx` (slide-over géré par l'état des shells).
- Ajouts minimes au header des deux shells :
  - **cloche notifications** à gauche du shuriken → lien vers `/notifications` (ENTRÉE
    SEULE — page stub d'état vide, aucun système de notifs construit) ;
  - écouteur `window` `thw:open-coach` → ouvre `AIPanel` (permet au Dashboard d'ouvrir le
    chat sans dupliquer le panneau).
- Couleurs sport : réutilise `sportColor()` / `sportLabel()` de
  `src/components/recovery/helpers.ts` (constantes sanctionnées) → **aucun hex** dans les
  nouveaux fichiers, tout en `var(--token)`.

## Vérification des données (état réel, base `thw-v2`, compte unique)

| Donnée | Source | État |
|---|---|---|
| Prénom / avatar | `profiles` (`useProfile`) | OK |
| Plan / essai | `user_subscriptions` (`tier`, `status`, `trial_ends_at`) | OK (premium/active) |
| Séance du jour | `planned_sessions` (semaine+jour) | OK |
| Tâches du jour (+`completed`) | `week_tasks` | OK (persiste via update, AUCUNE migration) |
| Cette semaine | `planned_sessions` + `day_intensity` + `activities` | OK |
| Prochaine compétition | `planned_races` (date ≥ today) | OK (9 futures) |
| Dernière activité | `activities` (dernière) | OK (1412) |
| Usage messages IA | `usage_logs` via `/api/subscriptions/summary` | OK (99 lignes). **PAS** `token_usage` (vide) |
| Records récents | `personal_records` (`useRecords`) | OK (116) |

### Module Nutrition — vérification dédiée (demandée)

Modèle : `nutrition_plans.plan_data` = `{ calories_low/mid/hard, macros_*, jours[] }` ;
`jours[]` = `PlanDay { date, type_jour, kcal, repas:{option_A,option_B} }`.

- **Objectif kcal du jour** : **DISPONIBLE** — `jours.find(date===today)?.kcal`, sinon
  fallback par type de jour (`calories_hard/mid/low`). `nutrition_plans` = 1 ligne (créateur).
- **Kcal consommées du jour** : **DISPONIBLE** — `useDailyMeals(today).totals.kcal`
  (`nutrition_meal_logs`, 24 lignes).
- **Repas planifiés HORODATÉS (avec heure)** : **ABSENT**. Les repas sont des **créneaux
  nommés** (`petit_dejeuner`, `dejeuner`, …) ; le seul champ de timing est `meal_timing`
  sur `nutrition_meal_templates`, un **enum** (`pre_training | post_training | rest |
  morning | evening`), **pas une heure**. → Pas de ligne « Prochain repas · {heure} ».

**Conséquence appliquée** (conforme au prompt) :
- Pas de plan actif → **bloc Nutrition masqué entièrement**.
- Plan actif → objectif vs consommé + « {x} kcal restantes » + jauge.
- **Pas** de ligne « prochain repas » (aucun repas horodaté). Rien n'est fabriqué.

## Architecture des fichiers (chaque fichier < 200 lignes, TS strict, 0 `any`)

- `src/app/page.tsx` — `DashboardPage` : garde d'auth (redirect `/auth` si pas de session)
  + grille responsive + orchestration. Chaque module charge ses propres données.
- `src/components/dashboard/lib.ts` — helpers dates (today/weekStart/dayIndex/format) + types.
- `src/components/dashboard/primitives.tsx` — `Card`, `SectionTitle`, `Gauge` (anim
  0→valeur, `prefers-reduced-motion`), `SportDot`, `Skeleton`, `EmptyState`.
- `src/components/dashboard/Greeting.tsx` — « Bonjour {prénom} » (Fraunces) + date + badge
  plan/essai.
- `src/components/dashboard/TodayCard.tsx` — héros : séance du jour + tâches cochables.
- `src/components/dashboard/NutritionCard.tsx` — conditionnel (cf. ci-dessus).
- `src/components/dashboard/WeekSummary.tsx` — bande 7 jours + compteurs + jauge volume.
- `src/components/dashboard/NextRaceCard.tsx` — J-x prochaine course.
- `src/components/dashboard/LastActivityCard.tsx` — dernière activité.
- `src/components/dashboard/CoachAICard.tsx` — champ « Demander au coach… » (ouvre AIPanel
  via `thw:open-coach`) + jauge messages (`/api/subscriptions/summary`).
- `src/components/dashboard/QuickActions.tsx` — pills « Faire mon check-in », « Créer un plan ».
- `src/components/dashboard/RecentRecords.tsx` — 1-2 records récents.
- `src/app/notifications/page.tsx` — stub état vide (cible de la cloche).

## Disposition

- **Mobile** : Salutation · Aujourd'hui · Nutrition · Cette semaine · [Prochaine compét |
  Dernière activité] · Coach IA · Actions rapides · Records. (+ bottom tab bar existante)
- **Desktop** : Salutation (badge + actions rapides à droite) ; grille 2 colonnes —
  gauche (Aujourd'hui, Nutrition, [Dernière activité | Records]), droite (Cette semaine,
  Prochaine compét, Coach IA).

## Style (rappels durs)

Titres Fraunces (`--font-display`) ; reste + chiffres Inter (`--font-body`) tabulaires
(`tabular-nums` + `'zero' 0`), **neutres**. Un seul accent `--primary` (cyan = action).
Sport = point 7px uniquement. Élévation via `--bg-card2`/`--bg-elev` + espace, **pas de
bordure** (sauf input/focus). **Aucun hex**, tout `var()`. Thème clair OK. Aucun emoji.
Jauges animées 0→valeur, `prefers-reduced-motion` respecté.

## Sortie

Commit **local** sur `claude/upbeat-hawking-4d3l5l`. **NE PAS PUSH.** Aucun déploiement.
