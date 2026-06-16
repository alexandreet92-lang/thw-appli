# PROMPT — Diagnostic intégration Polar (sommeil manquant)

## But
Le sommeil existe bien dans Polar Flow mais n'arrive pas dans THW. Ce prompt **DIAGNOSTIQUE uniquement** — ne corrige rien, ne touche à aucune logique. On veut savoir précisément à quelle étape ça casse.

---

## PHASE A — cartographie du code Polar (lecture seule)
Trouver et reporter :

1. Le fichier d'intégration Polar (chercher `polar`, `accesslink`, `nightly`, `sleep`).
2. La base URL utilisée pour les appels data (ex. `https://www.polaraccesslink.com/v3` ou v4).
3. La version d'API : V3 (`/v3/users/sleep`) ou v4 dynamique (`/sleeps`, `/nightly-recharge-results`).
4. Les scopes demandés dans l'URL d'autorisation OAuth (chercher `scope=`).
5. Où et comment le token Polar + le polar-user-id sont stockés (table Supabase, colonnes).
6. **Crucial** : est-ce que le code appelle RÉELLEMENT un endpoint sommeil ? Lister chaque endpoint Polar appelé (exercices, activité, HRV/recharge, sommeil…). Si aucun appel sommeil n'existe → réponse partielle déjà trouvée.
7. Est-ce que le sommeil est traité comme transactionnel (open/commit) ? Le sommeil et le Nightly Recharge sont NON-transactionnels (simple GET, pas de transaction).

---

## PHASE B — script de diagnostic live
Créer une route de debug temporaire `src/app/api/debug/polar/route.ts` (protégée : accessible seulement à mon user_id, à supprimer ensuite).
Avec le token Polar stocké de mon compte :

1. **Token & scopes** : logger les scopes réellement accordés au token stocké (colonne `scope` en base si présente). Indiquer si `sleep` / `nightly` y figurent.
2. **User registration** : appeler l'endpoint user info Polar et logger le statut HTTP.
3. **Sommeil** : appeler l'endpoint sommeil correspondant à la version détectée :
   - V3 : `GET {base}/v3/users/sleep`
   - v4 : `GET {base}/sleeps`
   Logger : code HTTP, headers, et le BODY BRUT complet (même si vide ou erreur).
4. **Nightly Recharge** : idem
   - V3 : `GET {base}/v3/users/nightly-recharge`
   - v4 : `GET {base}/nightly-recharge-results`
   Logger code HTTP + body brut.
5. Retourner un JSON récapitulatif :

```json
{ "apiVersion": "...", "tokenScopes": "...", "userInfoStatus": 000,
  "sleep":   { "endpoint":"...", "status":000, "bodyPreview":"..." },
  "recharge":{ "endpoint":"...", "status":000, "bodyPreview":"..." } }
```

### Interprétation attendue
- `sleep.status` 403 / "insufficient_scope" → token sans scope sommeil → remède = déconnecter/reconnecter Polar.
- `sleep.status` 200 mais body vide `[]` → token OK mais aucune nuit dans la fenêtre, ou mauvais user_id, ou enregistrement < date des nuits (fenêtre 90 j).
- `sleep.status` 404 → mauvais endpoint / mauvaise version d'API.
- Aucun appel sommeil dans le code (Phase A) → endpoint jamais branché.

---

## Contraintes
- Lecture seule sauf la route debug temporaire.
- Ne pas logger le token en clair (juste les scopes).
- `npm run build` doit passer.
- Donner le JSON de sortie + interprétation.
- Commit local. **NE PAS PUSH.**
