# Multiplicateurs de modèles + modèle forcé sur actions rapides

Pondère la consommation de tokens selon le modèle (Hermès ×1, Athéna ×3,
Zeus ×8) et reflète le modèle forcé des actions rapides. Ajouté PAR-DESSUS le
système de tokens existant (pas de refonte).

## Découvertes (code réel)
- Modèles = `THWModel` `hermes`/`athena`/`zeus`. ⚠️ Zeus et Athéna partagent le
  même ID API (`claude-sonnet-4-6`) → le multiplicateur doit se baser sur la
  **clé THWModel** (`modelId`), pas sur l'ID API. La route chat passe désormais
  `chatBody.modelId` à `recordTokenUsage`.
- Chaque `QuickAction` a DÉJÀ un champ `model: THWModel` = le modèle forcé. Pas
  besoin d'un mapping par id ; on utilise `qa.model`. Le badge modèle existe déjà.
- `MODEL_CONFIGS` fournit déjà des couleurs par modèle (réutilisées pour le badge).

## Parties
1. `lib/tokens/multipliers.ts` : `MODEL_MULTIPLIERS`, `getModelMultiplier`,
   `getModelDisplayName`.
2. Migration : `token_usage += raw_tokens, multiplier`. `recordTokenUsage` /
   `consumeTokens` pondèrent (tokens_used = pondéré, raw_tokens = réel). Pré-check
   chat pondère l'estimation. (Compte créateur : non bloqué, inchangé.)
3. `TokenUsageBubble` : section « Modèle actuel » + explication + ligne
   `Hermès ×1 · Athéna ×3 · Zeus ×8` (actif mis en évidence). Prop `currentModel`.
4. `lib/quick-actions/models.ts` : couleurs de badge + estimation tokens par flow.
5. Cartes d'actions rapides : badge modèle coloré + estimation `~XX 000 tokens`.
6. Forçage : clic action rapide → `setModel(qa.model)` ; `ModelPicker` grisé
   pendant la génération (`loading`).
7. Erreur 402 → modal contextualisé (mentionne le modèle/×N) + 3 boutons :
   « Switcher sur Hermès », « Acheter des tokens », « Fermer ».
8. `/topup` : estimations « À quoi correspondent ces tokens » mises à jour
   (pondérées par modèle).

npm run build : 0 erreur TypeScript.
