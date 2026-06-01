# Compétences — Intégration au Coach IA (étape 5/5)

## Objectif
Injecter les compétences actives dans le coach Training + lien menu "+" + badge actif.

## Prérequis
Prompts 1-4 appliqués.

## Point d'injection identifié
Tous les chats Training passent par `POST /api/coach-stream` (mode 2 chat) avec `agentId: 'central'`. Networks utilise un autre flux. → Injection serveur **unique** dans cette route quand `agentId === 'central'`. Re-évaluée à chaque message (les nouvelles compétences s'appliquent dès le message suivant).

## Fichiers

### Partie 2 — Injection (cœur)
- `src/lib/ai/competences.ts` :
  - `getActiveCompetencesPrompt(userId)` — service client, lit `user_competences` actives + join `competences`, construit le bloc system (`prompt_custom ?? prompt_base`). Cache mémoire 30s par user (Partie 5). Fallback `''` + log si erreur (ne bloque jamais).
  - `invalidateCompetencesCache(userId)`
- `src/app/api/coach-stream/route.ts` (maj) : si `agentId === 'central'`, append le bloc compétences au system prompt (après les tool instructions). try/catch silencieux.

### Partie 1 — Menu "+"
- `AIPanel.tsx` PlusMenu : l'item "Compétences" affiche "X / Y actives" (ou "Aucune compétence active") et `router.push('/competences')` + ferme le menu. Comptage léger (count head + tier).

### Partie 3 — Badge actif
- `src/components/ai-coach/ActiveCompetencesBadge.tsx` : pills des compétences actives (max 2-3 + "+N autres"), affiché au-dessus du champ uniquement si `agentId/activeAgent === 'training'`. Clic pill / "+N" → `/competences`. (Le modal de détail vit dans /competences ; on y redirige — déviation assumée pour ne pas porter tout le modal dans l'overlay.)

### Partie 4 — Limite par plan
- Page `/competences` : tentative d'activation au-delà de la limite → **modal** "Limite atteinte" avec "Voir les compétences actives" (tab Actives) + "Découvrir les plans" (`/settings/subscription`). (Le hook `useUserCompetences.checkLimit` existait déjà.)

### Partie 5 — Cache
- Serveur : cache mémoire 30s dans `lib/ai/competences.ts`.
- Client : `useCompetences.reload()` déjà rappelé après activation/création/édition.

## Non cassé
Streaming, historique, autres agents (system prompt intact hors Training).
