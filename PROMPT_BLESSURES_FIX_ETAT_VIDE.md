# Bug — page Blessures affiche « table absente » alors que la table existe

## Phase 0 — Diagnostic (résultats réels)

### 1. Condition qui déclenche l'état vide
`src/app/injuries/useInjuries.ts:48` (avant correctif) :
```
if (error) { setTableMissing(true); ... }
```
→ **toute** erreur de la requête `from('injuries').select(...)` faisait afficher
« base à initialiser ». Détection beaucoup trop agressive (RLS, réseau, cache de
schéma, transitoire → tous traités comme « table absente »).

### 2. Erreur réelle / état de la base (vérifié via le projet Supabase)
- Projets : `thw-v2` (`sfrcnyzntgrxlwlmwifi`) = **ACTIVE_HEALTHY** ; `thw-coaching`
  et `thw-coaching-db` = **INACTIVE**.
- Sur le projet actif `thw-v2`, requête `information_schema.tables` →
  **`injuries` ET `injury_logs` EXISTENT**. Donc **pas** de `42P01`.
- Cause réelle la plus probable : **`PGRST205`** — la table existe en Postgres mais le
  **cache de schéma de PostgREST (API REST)** n'avait pas été rechargé après création ;
  l'API renvoie « could not find the table in the schema cache ». Combiné au `if (error)`
  trop large → l'app conclut « table absente ».

### 3. Config client
`src/lib/supabase/client.ts` utilise `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY`.
La valeur runtime n'est **pas** dans le repo (injectée au build/Vercel) → non lisible
ici. Le projet **actif** étant `thw-v2`, l'app devrait pointer sur
`https://sfrcnyzntgrxlwlmwifi.supabase.co`. **À confirmer côté Vercel** (cf. action humaine).

## Action infra réalisée (autorisée par le prompt, pas une migration)
Exécuté sur `thw-v2` : `notify pgrst, 'reload schema';` → recharge le cache de schéma
PostgREST pour que l'API voie les tables. (Aucune DDL, aucune migration ré-appliquée.)

## Phase 1 — Correctif code
`useInjuries.ts` :
- `tableMissing` n'est **vrai que** pour une vraie absence / cache non rechargé :
  `code === '42P01' || code === 'PGRST205' || /schema cache|does not exist/`.
- **Toute autre erreur** (RLS, réseau, transitoire) → `tableMissing=false` : la page
  **fonctionne** en état vide normal (« Aucun signalement »), le bouton « + Signaler » écrit.
- **Log de diagnostic** : `console.warn` avec `error.code`, `error.message` et l'URL Supabase.
- Expose `errorCode` + `reload`.
- `200` + 0 ligne → aucun error → état vide normal (la confusion vide/absent est levée).

`page.tsx` (injuries) :
- Bannière reformulée + **bouton « Réessayer »** (re-fetch à chaud, sans recharger la page).
- Message adapté : si `PGRST205` → « recharge le cache de schéma » ; sinon → « table
  introuvable via l'API ({code}), vérifie le projet ciblé ».

## Phase 2 — Rapport
- **Cause** : code de détection trop agressif + très probable **`PGRST205`** (cache de
  schéma PostgREST non rechargé). La table **existe** bien (projet actif `thw-v2`).
- **Corrigé en code** : détection fine, logs, page fonctionnelle en état vide, bouton
  Réessayer. Build vert, enforce 0 couleur (34 fichiers).
- **Action infra faite** : `notify pgrst, 'reload schema'` sur `thw-v2`.
- **Action humaine restante** (si ça persiste après « Réessayer ») :
  1. Confirmer que **`NEXT_PUBLIC_SUPABASE_URL` (Vercel)** = projet `thw-v2`
     (`sfrcnyzntgrxlwlmwifi`), pas un projet INACTIVE. Si l'app pointe ailleurs, c'est
     l'écart de projet — **je ne modifie pas les secrets sans ton accord**.
  2. Au besoin, re-exécuter `notify pgrst, 'reload schema';` dans le SQL Editor du projet
     de l'app (le cache peut mettre quelques secondes).

## Contraintes respectées
Aucune migration ré-appliquée/modifiée, aucun secret modifié, TS strict, build vert,
commit local, pas de push.
