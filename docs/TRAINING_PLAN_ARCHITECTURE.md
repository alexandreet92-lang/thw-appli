# Training Plan — Architecture

_Proposé le 2026-04-25 après feedback user sur le flow Coach IA → Planning._

## Objectif

Quand un plan IA est généré et sauvegardé, la page `/planning` doit :

1. **Afficher les mêmes graphiques** que le result view Coach IA (périodisation, volume hebdo, + nouveaux : volume/sport, distribution intensités)
2. **Permettre l'édition** inline de chaque séance par l'athlète
3. **Proposer un chat IA contextualisé** qui se souvient de tout le plan et des modifications
4. **Rester clair, complet et organisé** — pas d'UI fourre-tout

## Modèle de données

### Situation actuelle

- `planned_sessions` — sessions individuelles avec `week_start + day_index` (pas groupées)
- Pas de concept de "plan" — un plan = un tas de sessions reliées par période uniquement

### Modèle cible

#### 1. Table `training_plans` (nouvelle)

```sql
CREATE TABLE training_plans (
  id                    uuid PRIMARY KEY,
  user_id               uuid REFERENCES auth.users ON DELETE CASCADE,
  name                  text NOT NULL,          -- "Ironman Leeds 2026 — Sub 11h30"
  objectif_principal    text,
  duree_semaines        int  NOT NULL,
  start_date            date NOT NULL,          -- lundi de S1
  end_date              date NOT NULL,          -- dimanche de S_duree (calculé)
  sports                text[] DEFAULT '{}',    -- ['natation', 'cyclisme', 'musculation']
  blocs_periodisation   jsonb DEFAULT '[]',     -- frise SVG
  conseils_adaptation   jsonb DEFAULT '[]',
  points_cles           jsonb DEFAULT '[]',
  ai_context            jsonb,                  -- questionnaire original + full JSON agent
                                                -- pour que l'IA ait la mémoire complète
  status                text DEFAULT 'active',  -- 'active' | 'archived' | 'completed'
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
```

Indexes : `user_id`, `(user_id, status)`, `(user_id, start_date, end_date)`.  
RLS : user voit ses plans uniquement.

#### 2. Colonne `plan_id` sur `planned_sessions`

```sql
ALTER TABLE planned_sessions
  ADD COLUMN plan_id uuid REFERENCES training_plans(id) ON DELETE SET NULL;
```

- `NULL` pour les séances manuelles / pré-existantes (rétrocompat)
- Renseigné quand la session fait partie d'un plan IA
- `ON DELETE SET NULL` : si le plan est supprimé, les sessions deviennent "orphelines" mais conservées

Index : `(user_id, plan_id)`.

#### 3. Table `training_plan_messages` (nouvelle)

```sql
CREATE TABLE training_plan_messages (
  id         uuid PRIMARY KEY,
  plan_id    uuid NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL,
  applied    boolean DEFAULT false,  -- l'user a cliqué "Appliquer" sur une suggestion IA
  metadata   jsonb,                  -- pour stocker des propositions structurées de l'IA
  created_at timestamptz DEFAULT now()
);
```

Indexes : `(plan_id, created_at)`.  
RLS : user voit messages de ses plans uniquement.

### Source de vérité

- **`planned_sessions`** reste canonique pour les séances individuelles (ce que l'athlète va exécuter)
- **`training_plans`** stocke le métadonnées + l'original AI generation
- Une modification user sur une session → UPDATE planned_sessions directement, PAS de re-sync sur training_plans
- `training_plans.ai_context` est immuable : c'est la référence de "ce que l'IA avait proposé au départ", utile pour les diffs + pour donner du contexte au chat

## UI `/planning`

### Structure proposée (par ordre vertical)

```
┌─────────────────────────────────────────────────────────┐
│ PLAN HEADER (seulement si semaine appartient à un plan) │
│ ─ Nom + objectif en gros                                │
│ ─ Progress bar : S3/20 + dates                          │
│ ─ Boutons : [💬 Coach IA]  [⋯ Options du plan]        │
├─────────────────────────────────────────────────────────┤
│ GRAPHIQUES (collapsible, défaut replié)                 │
│ ─ Frise périodisation (reprise du result view)          │
│ ─ Volume par sport (NEW : barres horizontales)          │
│ ─ Volume hebdomadaire (reprise, avec semaine active      │
│   surlignée)                                            │
│ ─ Distribution intensités (NEW : donut ou stacked bar)  │
├─────────────────────────────────────────────────────────┤
│ WEEK NAV (existant)                                     │
│ ─ Boutons semaine préc./suiv.                           │
│ ─ Label "Semaine du 27 avril 2026"                      │
│ ─ Indicateur S3/20 si plan actif                        │
├─────────────────────────────────────────────────────────┤
│ TRAINING GRID (existant, inchangé)                      │
│ ─ Sessions du jour par jour                             │
│ ─ Hover → bouton "Éditer" + "Supprimer"                 │
├─────────────────────────────────────────────────────────┤
│ CHAT COACH IA (drawer qui slide depuis la droite quand  │
│ l'user clique "💬 Coach IA" dans le plan header)        │
└─────────────────────────────────────────────────────────┘
```

### Détection du plan actif

- Au chargement de `/planning?week=YYYY-MM-DD` :
  1. Fetch `planned_sessions` pour la semaine
  2. Extrait les `plan_id` distincts
  3. Si ≥1 plan_id : fetch `training_plans.*` pour cet id
  4. Render le Plan Header + Graphiques

- Si plusieurs plans coexistent sur une semaine (overlap) : afficher un tab par plan ou fallback sur "Aucun plan spécifique".

### Édition inline des séances

**Modal "Éditer la séance"** déclenché par clic sur la session card :
- Champs éditables : titre, sport, heure, durée_min, TSS, intensité, notes
- Sous-section "Blocs" : liste éditable des blocs (zone, watts, allure, durée, répétitions)
- Boutons : [Annuler] [Enregistrer] [Supprimer]
- Sauvegarde = UPDATE planned_sessions direct
- Optimistic UI + revert si erreur DB

### Chat Coach IA plan-aware

**Drawer latéral** (désktop) ou **fullscreen** (mobile) :

```
┌─ Coach IA — Ironman Leeds 2026 ─────┐
│ Historique des messages             │
│                                     │
│ User: "Ma séance de jeudi est dure" │
│                                     │
│ IA: "Vu ton plan, le jeudi S3 est   │
│ un Sweet Spot 90min. Je propose:    │
│ - Réduire à 60min Z2 pur            │
│ [Appliquer] [Rejeter]               │
│                                     │
│ [Tape ton message...]               │
└─────────────────────────────────────┘
```

- **Contexte envoyé à chaque message** :
  - `training_plans.*` (nom, objectif, duree, blocs, conseils, points_cles, ai_context)
  - Semaines proches : S_current -1, S_current, S_current +1, S_current +2 (sessions détaillées)
  - Historique des messages (fenêtre glissante : 20 derniers)
  - Prompt user courant

- **Endpoint dédié** : `POST /api/training-plan/chat`
  - Body : `{ plan_id, message }`
  - Response stream : texte markdown, avec support pour propositions structurées `{ type: 'modify_session', session_id, changes }` dans metadata
  - Store dans `training_plan_messages`

- **Bouton "Appliquer"** : exécute les changements proposés (UPDATE planned_sessions) + flip `applied = true` sur le message

## Nouveaux graphiques à construire

### Volume par sport (horizontal bar)

Calcul : somme `duration_min` par `sport` pour les sessions du plan actif.
```
Natation    ████████ 12h30
Cyclisme    ██████████████ 38h00
Musculation ████ 5h00
```
- Labels en heures (pas minutes pour lisibilité)
- Couleurs : même palette SPORT_BORDER

### Distribution des intensités (donut ou stacked bar)

Calcul : somme `duration_min` par `intensity` bucket (`low`, `moderate`, `high`, `max`).
Visualiser en donut avec % + légende.
Pédagogique pour voir si l'athlète fait trop de Z3/Z4 (tendance naturelle).

### Volume hebdo avec semaine active surlignée

Réutilise le chart existant du result view, mais surligne la barre correspondant à `currentWeekStart` (outline cyan épais).

## Phasing

### Phase 1 — Data model (migrations + liaison saveToPlanning) — **2h**
- Migration `training_plans` + `plan_id` sur `planned_sessions` + `training_plan_messages`
- Modif `saveToPlanning` dans AIPanel.tsx : crée un plan puis insert sessions avec `plan_id`
- Tests via MCP

### Phase 2 — Plan Header + Graphiques sur /planning — **4h**
- Détection plan actif
- Render header : nom, objectif, progress bar S_current / duree_semaines
- Graphiques collapsibles : périodisation (reprise), volume hebdo (reprise), volume/sport (nouveau), distribution intensités (nouveau)
- Week nav avec indicateur S_current/duree

### Phase 3 — Édition inline des séances — **3h**
- Modal "Éditer" riche
- Sub-section blocs éditables
- Save + delete fonctionnels

### Phase 4 — Chat Coach IA plan-aware — **5h**
- Endpoint `/api/training-plan/chat` + context injection
- UI drawer avec historique + input
- Persistance messages en DB
- Bouton "Appliquer" sur propositions structurées

### Phase 5 — Polish — **2h**
- Indicateur visuel des séances modifiées (diff vs original AI)
- Historique des modifications
- Export PDF du plan
- Bouton "Régénérer cette semaine" → relance l'agent pour rafraîchir S_current

**Total estimé : 16h de dev** (par ordre de valeur : 1 > 2 > 3 > 4 > 5).

## Questions à trancher avant implémentation

1. **Un seul plan actif à la fois** ? Ou plusieurs plans peuvent se superposer dans le temps (ex. un plan Ironman long + un plan sprint court) ? → je propose **un seul plan actif à la fois** pour simplicité, archives pour les anciens.

2. **Chat IA : modèle** ? Je propose Claude Sonnet 4.6 (même modèle que training-plan) avec un system prompt dédié "Tu es le coach de ${plan.name}, voici son état...".

3. **Historique des chats : durée de rétention** ? Indéfini ou rolling window 6 mois ?

4. **Les modifications user vs le plan original** : garde-t-on une trace (diff) ou bien les changements overrident purement ?

---

**Ma recommandation** : commencer par **Phase 1 + Phase 2** (6h total) pour livrer le visuel demandé rapidement. Phases 3-4 ensuite selon priorité (édition fine vs chat IA).
