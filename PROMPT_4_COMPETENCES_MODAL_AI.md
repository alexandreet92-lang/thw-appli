# Compétences — Modal détail + IA de création (étape 4/5)

## Objectif
1. Modal de détail au clic sur une carte (voir + remodeler le prompt via IA).
2. Conversation IA fonctionnelle pour créer une compétence.
3. Résolution de conflits améliorée (nom + "désactiver l'autre").

## Prérequis
Prompts 1-3 appliqués. DB non modifiée.

## Endpoint créé
`src/app/api/competences-ai/route.ts` — streaming SSE Anthropic avec **system prompt arbitraire** + messages (l'endpoint coach-stream existant ne le permet pas). Auth Supabase serveur, modèle selon le tier, `logUsage`. Émet `data: {"text":"..."}` puis `data: [DONE]`.

## Front
- `src/app/competences/lib/streamCompetenceAI.ts` — util client (fetch SSE → onToken)
- `src/app/competences/hooks/useCreateCompetenceConversation.ts` — conversation de création : messages, isStreaming, parse `<competence>…</competence>` → metadata + prompt, `sendMessage`, `resetConversation`, `saveCompetence(activate)`
- `src/app/competences/components/CompetenceDetailModal.tsx` — modal détail :
  - prompt actuel (monospace, `prompt_custom ?? prompt_base`)
  - remodeler : conversation streaming, détection `<prompt>…</prompt>` → "Appliquer cette version"
  - footer : Supprimer (custom only), Fermer, Enregistrer (si modifié)
  - mobile : plein écran + flèche retour
- `CreateCompetencePanel.tsx` (maj) : conversation réelle + preview compétence générée + boutons Affiner / Enregistrer
- `page.tsx` (maj) : état modal + sélection carte ; `onSave` (UPSERT `user_competences.prompt_custom` ou UPDATE `competences` si custom du créateur) ; `onDelete` (DELETE competences) ; reload
- `useUserCompetences.ts` (maj) : `detectConflicts` renvoie déjà les objets (noms) ; résolution "désactiver l'autre + activer" gérée dans la page

## Sauvegarde création
INSERT competences (is_predefined=FALSE, created_by=uid, conflits=[]) + INSERT user_competences (active selon limite). Si limite atteinte → créée mais non activée + toast.

## Hors périmètre
Intégration menu "+" coach (5), injection des prompts actifs dans Training (5).
