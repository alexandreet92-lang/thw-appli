# Objectif

Créer une page d'administration **« Cockpit »** dans l'app THW Coaching (Next.js 15, TS strict, Tailwind, Supabase, Vercel — repo `alexandreet92-lang/thw-appli`). Elle est **réservée au fondateur** et donne, d'un coup d'œil et en onglets : croissance, engagement, revenus, usage IA + coûts, et adoption produit.

---

# 0. CONTRAINTE DESIGN — PRIORITAIRE, à lire en premier

Le design de cette page **doit être identique à l'existant de l'app**. On ne crée aucune identité visuelle nouvelle.

- **Logo** : réutiliser le composant logo existant de l'app (le shuriken). Ne pas en dessiner un autre.
- **Fond d'écran / thème** : identique à celui des autres pages de l'app. Mêmes couleurs, même fond.
- **Typographie, cartes, espacements, rayons** : utiliser les tokens / composants UI déjà en place. Aucun nouveau système.
- **Onglets** : réutiliser le **composant d'onglets existant** de l'app. Les onglets doivent être **identiques entre mobile et ordi** (même composant, même style, mêmes libellés — ils s'adaptent en responsive, ils ne changent pas de nature selon l'écran).
- La maquette HTML fournie séparément (`maquette_admin_stats.html`) ne sert **que** de référence pour l'**architecture d'information** : quels onglets, quelles métriques, quel agencement de cartes. **Ne PAS copier son skin** (couleurs sombres, polices) s'il diffère de l'app.

**Avant de coder l'UI** : localise dans le repo le composant logo, le thème/fond, le composant d'onglets, et les primitives carte/typo, puis réutilise-les. En cas de doute, calque-toi sur une page existante déjà aboutie (ex. la page Récupération à 5 onglets) pour le style des onglets et des cartes.

> Note : c'est une page fondateur, atteinte par URL directe (`/admin`). Ne l'ajoute **pas** à la barre de navigation principale (5 onglets) visible des utilisateurs.

---

# 1. SÉCURITÉ — non négociable, vérification réelle côté serveur

L'accès doit être **réellement** réservé, pas seulement masqué côté UI.

- Nouvelle variable d'env **`ADMIN_EMAIL`** : serveur uniquement, **jamais** préfixée `NEXT_PUBLIC_`. À configurer dans Vercel.
- Garde côté serveur sur la route `/admin` (et sur toute route API admin) :
  - récupérer l'utilisateur via le client Supabase **serveur** (`auth.getUser()`),
  - si non connecté → redirection login,
  - si `user.email !== process.env.ADMIN_EMAIL` → **403** (pas de redirection silencieuse, un vrai refus).
- Les **agrégats** sont calculés côté serveur avec un client Supabase construit sur la **`SUPABASE_SERVICE_ROLE_KEY`** (serveur only). Ce client :
  - ne doit **jamais** être importé dans un composant client ni exposé dans une route non gardée,
  - re-vérifie l'identité admin **avant** d'exécuter les requêtes (défense en profondeur : la couche données vérifie aussi, pas seulement la route).
- La RLS reste **activée** sur les nouvelles tables. La lecture admin passe par le service role (serveur) qui bypass la RLS ; les utilisateurs normaux n'ont **aucune** policy SELECT sur ces tables.
- Vérifier en fin de tâche que la service role key **n'apparaît pas** dans le bundle client.

---

# 2. Architecture

- App Router, route `/admin` (ou `/admin/stats`).
- `page.tsx` = **Server Component** : applique la garde (section 1), récupère les métriques via le client service role, et passe les données en props à un composant client `AdminDashboard`.
- `AdminDashboard` (client) : gère le switch d'onglets et le rendu des graphes. Réutiliser le **composant d'onglets** et les **composants de graphes déjà présents** dans l'app (ne pas ajouter une nouvelle lib de charts si une est déjà installée).
- Si certaines métriques sont lourdes, les exposer via des **Route Handlers** gardés (`/api/admin/...`) plutôt qu'au premier rendu, mais la garde reste la même.

---

# 3. Base de données — migration Supabase

⚠️ **Avant d'écrire la moindre requête business (section 4), lire le schéma réel** des tables existantes (`user_subscriptions`, `profiles`, `usage_logs`, `token_usage`, `user_token_wallet`, `ai_conversations`, `sync_logs`) : noms de colonnes exacts, valeurs de statut d'abonnement, format des prix tokens. **Ne deviner aucun nom de colonne.**

### 3.1 Présence (actif maintenant + DAU/WAU/MAU)

```sql
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists idx_profiles_last_seen
  on public.profiles (last_seen_at desc);
```

Mise à jour **côté serveur**, throttlée à 60 s (middleware ou route API authentifiée) — **pas** de heartbeat client :

```sql
update public.profiles
set last_seen_at = now()
where id = auth.uid()
  and (last_seen_at is null or last_seen_at < now() - interval '60 seconds');
```

- Actif maintenant = `count(*) where last_seen_at > now() - interval '5 minutes'`.
- DAU / WAU / MAU = `count(distinct user_id)` sur 1 / 7 / 30 jours (via `last_seen_at` et/ou `analytics_events`).

### 3.2 Événements comportementaux

```sql
create table if not exists public.analytics_events (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete set null,
  session_id   text,
  event_name   text not null,        -- 'page_view' | 'feature_used' | 'quick_action'
  path         text,
  from_path    text,
  duration_ms  integer,
  is_mobile    boolean,
  properties   jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_ae_created       on public.analytics_events (created_at desc);
create index if not exists idx_ae_event_created on public.analytics_events (event_name, created_at desc);
create index if not exists idx_ae_user_created  on public.analytics_events (user_id, created_at desc);
create index if not exists idx_ae_path          on public.analytics_events (path);
create index if not exists idx_ae_props_gin     on public.analytics_events using gin (properties);

alter table public.analytics_events enable row level security;

create policy ae_insert_own
  on public.analytics_events for insert
  to authenticated
  with check (user_id = auth.uid());
-- Aucune policy SELECT pour 'authenticated' => lecture client bloquée.
```

---

# 4. Onglets & métriques (mirroir de la maquette)

Mêmes onglets sur mobile et ordi. Pour chaque métrique, calculer depuis les sources indiquées.

1. **Vue d'ensemble** — Utilisateurs total (+ croissance nette mois vs mois) `profiles`/`user_subscriptions` ; Actifs maintenant `last_seen_at` ; DAU/WAU/MAU ; MRR `user_subscriptions` ; Stickiness DAU/MAU ; courbe inscrits cumulés ; donut répartition par abonnement.
2. **Revenus** — MRR / ARR, ARPU, conversion essai→payant, churn — `user_subscriptions` ; MRR par palier ; funnel inscrits → essai activé → payant.
3. **IA & coûts** — modèle le plus utilisé, tokens (total/jour/modèle), **coût IA par modèle ET par palier d'abonnement exprimé en % du revenu du palier (surveillance de marge)** + alerte visuelle si un palier dépasse un seuil ; top consommateurs ; taux d'atteinte des quotas — `token_usage`, `user_token_wallet`, `ai_conversations`. (Prévoir une table de prix par modèle si elle n'existe pas déjà.)
4. **Produit** — top pages par temps moyen ; fonctionnalités les plus utilisées ; parcours fréquents A→B ; répartition mobile/desktop — `analytics_events`. **Voir section 5 (collecte gated).**
5. **Engagement** — rétention J1/J7/J30 par cohorte d'inscription (heatmap) ; churn / inactifs > 30 j ; courbe DAU/WAU/MAU.
6. **Intégrations & métier** — connexions par provider + taux de succès sync `sync_logs` ; répartition par sport ; adoption nutrition / récup / plans IA — `usage_logs`.

---

# 5. Tracking comportemental — IMPLÉMENTER MAIS DÉSACTIVÉ par défaut

La table 3.2 et l'instrumentation client peuvent être codées, mais **la collecte ne doit pas tourner en prod** tant que la politique de confidentialité + le recueil de consentement (analytics non essentiel) ne sont pas en ligne.

- Créer un util client `track(event_name, props)` qui insère dans `analytics_events` via le client Supabase de l'utilisateur (RLS).
- Le wrapper derrière **un drapeau `NEXT_PUBLIC_ANALYTICS_ENABLED` (défaut `false`) ET un check de consentement** : si l'un des deux est faux, `track` ne fait rien.
- `page_view` : envoyer `duration_ms` à la sortie de page via `navigator.sendBeacon` sur `visibilitychange`/`pagehide`.
- Documenter clairement (commentaire + README) que ce flag reste à `false` jusqu'à mise en ligne de la politique.

---

# 6. Performance

À l'échelle actuelle, requêter directement les tables au rendu est acceptable. **Ne pas** sur-construire : pas de table de rollups, pas de cache complexe pour l'instant. Laisser un TODO documenté : « à gros volume → index BRIN sur `analytics_events.created_at` + table `analytics_daily` de rollups ».

---

# 7. Definition of Done (à vérifier explicitement)

- [ ] Un autre utilisateur connecté (non-admin) reçoit **403** sur `/admin` et sur toute route `/api/admin/*`.
- [ ] Un visiteur non connecté est redirigé vers le login.
- [ ] La `SUPABASE_SERVICE_ROLE_KEY` est **absente** du bundle client.
- [ ] Un utilisateur normal peut insérer uniquement ses propres lignes dans `analytics_events` et **ne peut PAS** lire celles des autres.
- [ ] Les onglets utilisent le composant existant et sont **identiques mobile et ordi** ; logo et fond d'écran **identiques au reste de l'app**.
- [ ] La collecte comportementale est **désactivée par défaut** (`NEXT_PUBLIC_ANALYTICS_ENABLED=false`).
- [ ] `tsc` strict passe, build Next passe.

---

# 8. Interdits

- ❌ Garde d'accès uniquement côté UI.
- ❌ Client service role importé/exposé côté client.
- ❌ Noms de colonnes inventés sur les tables existantes (les inspecter d'abord).
- ❌ Nouvelle identité visuelle / nouveau logo / nouveau fond — réutiliser l'existant.
- ❌ Ajout de `/admin` à la navigation utilisateur.
- ❌ Activer la collecte `analytics_events` en prod à ce stade.
