# Réglages IA — Card « Mes compétences » + toggle « Recherche web par défaut »

## Lecture préalable (existant, non cassé)
- Onglet Réglages IA = `IASettingsBloc` dans `src/app/profile/page.tsx`.
  Cartes nav via composant `NavRow` ; section « Comportement » = liste de
  toggles persistés en **localStorage** (`thw_ai_*`).
- Page cible : `/competences` (existe). Table `user_competences` (`user_id`,
  `competence_id`, `active`). Total bibliothèque = **70** compétences (vérifié).
- « Recherche Web » dans le menu « + » du chat (`AIPanel.tsx`) = **placeholder
  inactif** (`pointerEvents:none`). Aucune logique fonctionnelle à réutiliser :
  on stocke donc la **préférence** (le vrai nouveau besoin) sans toucher au
  placeholder.

## Backend — réutiliser la table existante `user_settings`
Une table de préférences existe déjà (`user_settings`, `user_id` UNIQUE, RLS
`user_settings_user` ALL). Conformément au prompt (« si OUI : ajouter une
colonne »), on **ajoute une colonne** plutôt que créer `user_ai_settings` :
```sql
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ai_web_search_default boolean NOT NULL DEFAULT false;
```
RLS et contrainte d'unicité déjà en place → pas de trigger nécessaire (l'API
fait un upsert `onConflict: user_id` via service client, scoping par
`auth.getUser()`).

## API — `src/app/api/user/ai-settings/route.ts`
- `GET` → `{ ai_web_search_default }` (défaut `false` si pas de ligne).
- `PATCH` body `{ ai_web_search_default?: boolean }` → upsert filtré (whitelist),
  renvoie l'état. Pattern identique à `api/notifications/preferences`
  (`createClient` auth + `createServiceClient` upsert).

## UI — `IASettingsBloc`
1. **Card « Mes compétences »** : 3ᵉ `NavRow` dans le même `Card` que Modèles /
   Abonnement, icône cible, sub = « {actives} actives sur 70 », clic →
   `router.push('/competences')`. Compte via `user_competences` (active=true).
2. **Toggle « Recherche web par défaut »** : 3ᵉ entrée de la section
   « Comportement », sous « Autoriser les suggestions ». Description : « Active la
   recherche web au démarrage de chaque conversation. » Optimistic update +
   persistance localStorage (`thw_ai_web_search_default`, instantané) **et** API
   PATCH (rollback si erreur). Chargé au mount (API, fallback localStorage).

## Note V1
La « Recherche Web » du chat étant un placeholder inactif, la préférence est
stockée et prête (localStorage + DB) ; aucune activation fonctionnelle à câbler
tant que la feature n'est pas implémentée. Les autres toggles (économie,
suggestions, modèle, police) restent en localStorage (migration optionnelle non
faite, conforme au prompt).

npm run build : 0 erreur.
