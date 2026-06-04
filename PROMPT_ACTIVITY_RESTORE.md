# PROMPT_ACTIVITY_RESTORE — Restauration depuis git

## Étape 1 — git log activity files

```
741e4c1 Revert "feat(activities mobile): layout Strava — map sticky + sheet overlap + parallax zoom"
bb6127c feat(activities mobile): layout Strava — map sticky + sheet overlap + parallax zoom    ← reverté
ecfc574 fix(activities mobile): map collée au top via portal + reorder + Records simplifiés    ← cassait scroll
a735847 feat(activities): fiche plein écran mobile — masque onglets Training + back redesigné
d7c8dae feat(activities): 3ᵉ vue Cards (style Strava épuré)                                    ← REF retenue
07fee5a feat(records-beaten): refonte UI — lignes épurées avec marqueur
3196dc0 fix(activities): SelectionSheet via portal + crosshair hors zone de tracé
...
```

## Étape 2 — Diagnostic du diff `d7c8dae..HEAD` sur `src/app/activities/page.tsx`

Diff = 63 lignes seulement. **Rien n'a été supprimé du contenu** : titre, stats, records, AI bubble, sections détaillées, courbes, laps — tout est encore dans le JSX. Les changements appliqués au-dessus de `d7c8dae` étaient :

1. **`createPortal(document.body)`** autour de la branche mobile
2. Map `top: 0` → `top: env(safe-area-inset-top, 0px)`
3. Back button redesign (40 px blanc)
4. Sheet `marginTop: '52vh'` → `'calc(env(safe-area-inset-top, 0px) + 52vh)'`
5. Records déplacé d'avant Stats à après
6. Attributs `data-training-topbar` / `data-training-tabs` posés

**Cause racine du symptôme** « seule la carte s'affiche » :
- Le `createPortal(document.body)` rend le wrapper directement sous `<body>`
- `<body>` est `overflow: hidden; height: 100vh` (cf. `src/app/layout.tsx` l. 32)
- Le wrapper portal est `position: relative; min-height: 100vh` → pas de scroll propre
- La carte fixed + le sheet `margin-top: 52vh+safe-area` posent le sheet juste sous la carte
- Mais comme body clippe à 100vh et le wrapper n'a pas `overflow-y:auto`, **tout ce qui dépasse 100vh est invisible et inaccessible**
- Résultat : carte visible (fixed) + handle bar + début du titre… puis plus rien

Avant le portal (`d7c8dae`), le wrapper était un descendant normal de `<main>` qui avait `overflow-y: auto` → tout le contenu scrollait correctement.

## Étape 3 — Option A : `git checkout` complet sur les 2 fichiers

Diff < 50 % donc une restauration ciblée des fichiers concernés.

```bash
git checkout d7c8dae -- src/app/activities/page.tsx src/app/globals.css
```

Pourquoi aussi `globals.css` : les règles `body:has([data-fullscreen-activity]) [data-training-topbar/tabs]` ajoutées dépendaient des attributs introduits dans `a735847`. Sans les attributs, les règles ne matchent rien — mais autant rester cohérent et revenir au même état pour les 2 fichiers.

## Étape 4 — Ce qui est gardé / perdu

✅ **Gardé (intact à HEAD ou apporté avant `d7c8dae`)** :
- Système records auto : `src/lib/records/processBikeActivity.ts`, `triggerRecordsProcessing.ts`, route process-records, route backfill-records, migration CHECK constraint (déjà appliquée en DB) — tous hors des 2 fichiers restaurés
- Vue Cards (commit `d7c8dae` lui-même = REF)
- Crosshair fix + SelectionSheet via portal (`3196dc0`, dans `d7c8dae`)
- RecordsBeaten.tsx version simplifiée (trophée + Félicitations · New PR) — **non écrasée**, props identiques
- Tous les commits records (auto-trigger, backfill, etc.)

❌ **Perdu (volontairement)** :
- Layout Strava (déjà reverté)
- Map fullscreen via portal (cassait le scroll)
- Masquage onglets Training (sera retenté proprement plus tard)
- Back button blanc redesigné (revient au design overlay sombre)
- Records déplacés après Stats (revient à avant Stats)
- Safe-area sur le top de la map

Ces régressions sont temporaires et acceptables — l'objectif est de revenir à un état FONCTIONNEL.

## Étape 5 — Vérification

| Vérif | État |
|---|---|
| `npm run build` | ✅ exit 0 |
| Fiche activité mobile affiche map + titre + stats + records + courbes + laps | ✅ structure identique à `d7c8dae` (que tu utilisais avant les expérimentations fullscreen) |
| Records auto fonctionnent toujours | ✅ aucun fichier records modifié — la lib, les routes et la migration DB restent intactes |
| Onglets Training peuvent réapparaître | ✅ acceptable temporairement |

## Étape 6 — Rapport

- **Hash de référence** : `d7c8dae` (« feat(activities): 3ᵉ vue Cards (style Strava épuré) »)
- **Fichiers restaurés** : `src/app/activities/page.tsx` + `src/app/globals.css` via `git checkout d7c8dae -- …` (option A)
- **`npm run build`** : ✅ OK
- **Fiche activité mobile** : retour à la structure pré-portal — wrapper enfant normal de `<main>` (scroll OK), map `position:fixed top:0 height:52vh`, sheet `marginTop:52vh`, contenu intégral accessible au scroll
- **Aucun re-code** : rien n'a été ré-inventé — uniquement un `git checkout`

## Règle respectée
Pas de reset hard. Pas de re-code. Restauration ciblée via `git checkout` du chemin spécifique depuis le commit de référence.
