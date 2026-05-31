# PROMPT_AI_BUBBLE_FIX — Correctifs IA : message vide + bulle chat

## FIX 1 — Erreur API : message vide

### Cause identifiée
`buildGlobalPrompt()` / `buildDecouplingPrompt()` retournent le prompt complet.
Appelé via `globalAI.run(buildGlobalPrompt())` → `systemPrompt = fullPrompt`, `userMessage = ''`.
L'API envoie `userMessage: ''` à Anthropic → erreur 400 "user messages must have non-empty content".
`??` ne remplace pas une chaîne vide (seulement null/undefined).

### Fix dans useAIAnalysis.ts
- Ajouter logs debug : `[AI Debug] userMessage:` et `[AI Debug] systemPrompt:`
- Si `userMessage` est vide, utiliser `systemPrompt` comme contenu effectif du message
- Guard : si `effectiveMsg` vide → `setStatus('error')` + return
- Envoyer `{ systemPrompt: '', userMessage: effectiveMsg }` quand userMessage était vide

## FIX 2 — Design : bulle de réponse IA chat style

### AIBubble.tsx — redesign
- Pendant chargement : ShurikenSpinner + "Analyse en cours..."
  `borderRadius: '4px 16px 16px 16px'`, `maxWidth: '85%'`
- Après réponse : avatar shuriken (32px, bg cyan/12%) + bulle texte
  Même borderRadius chat
- Deux sections séparées : "Analyse technique" / "En clair"
- Boutons Copier / Relancer en bas à droite de la bulle

## FIX 3 — ShurikenSpinner

### Composant dans AIBubble.tsx
- Utilise `/logos/logo_4bras.png`
- `animation: 'spinPause 2s ease-in-out infinite'`
- spinPause déjà dans globals.css

## Fichiers modifiés
- src/hooks/useAIAnalysis.ts
- src/components/activity/AIBubble.tsx
