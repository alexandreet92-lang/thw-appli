# PROMPT_E_AI — Analyse IA par séance

## Architecture commune

### Hook `src/hooks/useAIAnalysis.ts`
- États : idle | loading | streaming | done | error
- `run(systemPrompt, userMessage)` déclenche la requête
- `reset()` remet à idle
- Lit le stream byte par byte, accumule dans `text`

### Route `src/app/api/ai-analysis/route.ts`
- POST `{ systemPrompt?, userMessage? }`
- Auth Supabase + quota `enforceQuota`
- Modèle selon tier (TIER_LIMITS / MODEL_IDS)
- `system` = systemPrompt, `messages[0].content` = userMessage
- Retourne ReadableStream plain text (identique à recharge-stream)

### Composant `src/components/activity/AIBubble.tsx`
- Props : `text`, `status`, `onRetry`
- Invisible si status === 'idle'
- Header : icône coach + "Analyse IA" + animation dots (loading/streaming)
- Split sur `---EN CLAIR---` :
  - Partie 1 : "Analyse technique" — fontSize 12.5, pre-wrap
  - Partie 2 : "En clair" — fontSize 14, fond dégradé subtil
- Footer : boutons "Copier" et "Relancer" (discrets)
- Animation dots via @keyframes aiDot

## Bouton 1 — IA Analyse Découplage
Ajout dans la section Découplage (`isBike && s.watts && s.heartrate`)
Prompt construit dynamiquement à partir des variables ActivityDetail.
Bouton dégradé `#06B6D4 → #818CF8`, borderRadius 20.
State `decoupAI = useAIAnalysis()`.

## Bouton 2 — IA Analyse Globale
- Mobile : après stats 3×2, avant les sections
- Desktop : après hero row (carte+stats), avant PARTIE 4
Bouton discret : fond none, border var(--border).
State `globalAI = useAIAnalysis()`.

## Fichiers modifiés
- `src/app/activities/page.tsx`
  - Import Sparkles (lucide-react)
  - Import AIBubble
  - Import useAIAnalysis
  - 2 hooks dans ActivityDetail
  - Boutons + bulles dans mobile et desktop (4 emplacements)
