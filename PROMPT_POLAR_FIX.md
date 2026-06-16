# PROMPT — Correction Polar : token refresh + parsing sommeil

## Contexte (acquis du diagnostic)
- API v4 dynamique, base `https://www.polaraccesslink.com/v4/data`.
- Token expiré le 15/06, refresh en échec (`refresh_failed`, Basic Auth, `tokens.ts:119`).
- L'endpoint `/sleeps` renvoie des objets nuit COMPLETS (durée, phases, score) :
  schémas v4 `sleepListSleepsResponse` → `sleepNightSleep` → `sleepPhaseDurations`,
  `sleepSleepScoreData`. Bug actuel : le sync ne stocke que `sleepDate`.
- IL N'Y A PAS d'endpoint `/sleeps/{date}`. Les métriques sont déjà dans `/sleeps?from&to`.

On corrige DEUX choses.

---

## PARTIE 1 — Token (réparer + diagnostiquer le refresh)
Dans `src/lib/oauth/tokens.ts` :
1. **Logger la vraie cause** : sur échec de refresh, logger (sans le secret) :
   URL du token endpoint, `grant_type`, statut HTTP et BODY BRUT de la réponse Polar.
2. **Vérifier le flux refresh v4** : token endpoint correct, header
   `Authorization: Basic base64(client_id:client_secret)`, body
   `grant_type=refresh_token&refresh_token=…` en `application/x-www-form-urlencoded`.
3. **Filet reconnexion** : si refresh 400/401 → marquer `is_active=false` +
   `last_error='reconnect_required'` (pas de boucle d'erreur).
4. Vérifier que la reconnexion stocke `access_token, refresh_token, expires_at, scope,
   provider_user_id`. Scopes demandés incluent `sleep:read` + `nightly_recharge:read`.

---

## PARTIE 2 — Sommeil (parser les vraies métriques)
Dans `src/lib/sync/polar.ts`, `syncPolarSleep` :
1. **Appel correct** : `GET {base}/sleeps?from&to`, `Bearer`, `Accept: application/json`.
   Fenêtre 28 derniers jours (ou 90).
2. **LOGGER LA RÉPONSE BRUTE COMPLÈTE UNE FOIS** avant tout mapping (non tronqué).
3. **Mapper les vrais champs** (`sleepNightSleep`) : durée → `sleep_duration_min`,
   score → `sleep_score`, phases deep/light/rem/awake → colonnes dédiées (minutes,
   créées si absentes), coucher/lever si présents. NE PAS inventer de champ.
4. `upsert` par (`user_id`, `sleepDate`).
5. (Optionnel) `nightly-recharge-results` : ANS charge + HRV nocturne.

---

## VÉRIF FINALE
- `npm run build` doit passer (strict, pas de `any`).
- Donner : (1) body brut échec refresh, (2) body brut `/sleeps`, (3) colonnes remplies vs NULL.

## Ordre d'exécution réel
Après ce prompt : reconnexion Polar (token frais) → sync → envoi des logs.
Si le mapping doit être ajusté selon le body réel, on le fera ensuite.

**Commit local. NE PAS PUSH.**
