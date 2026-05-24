# PROMPT IA POLISH

## Audit pré-modification

| Concern | Localisation actuelle |
|---|---|
| Conv items styling | `src/components/ai/AISidebar.tsx` ConvItem l.88-105 |
| Nav items separators | `src/components/ai/AISidebar.tsx` nav l.194-198 — déjà `gap-0.5`, aucun border. RIEN à faire. |
| Input bar wrapper | `src/components/ai/AIPanel.tsx` l.19311 (outer) + l.19338 (`aip-input-wrap`) |
| Mic button (non fonctionnel) | `src/components/ai/AIPanel.tsx` l.19519-19538 |

## Modifications appliquées

### Correction 1 — Conv items (AISidebar.tsx)

- `bg-black/[0.08]` (active) → `bg-black/[0.06]` (correspond au `bg-black/6` du spec)
- `hover:bg-black/5` → `hover:bg-black/[0.04]` (`bg-black/4` du spec)
- Date color `text-[#8C8C8C]` → `text-[#999]`
- Ajout `leading-snug` sur le titre

Tailwind n'a pas `bg-black/6` ni `bg-black/4` natifs → utilisation des arbitrary `bg-black/[0.06]` et `bg-black/[0.04]`.

### Correction 2 — Nav items separators

AUCUNE modification. Vérifié : nav utilise `gap-0.5` entre NavItems, aucun `border`, `divide-y` ou `hr`.

### Correction 3 — Input bar Claude-style (AIPanel.tsx)

- Outer wrapper l.19311 : padding `6px 10px 10px` → `px-4 pt-2 pb-4`, fond `var(--ai-bg)` → `bg-white dark:bg-[#0A0A0A]`. **Préserver `position: relative` et `flexShrink: 0`** (essentiels au layout : QuickActionsSheet absolute + flex column parent).
- Inner `aip-input-wrap` l.19338 : `max-w-[680px] mx-auto bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#E8E8E8] dark:border-[#2A2A2A] shadow + dark:shadow`. La classe `aip-input-wrap` est conservée (sélecteur CSS `:focus-within`).
- Textarea : taille `15px`, placeholder `#ABABAB`.
- Bouton `+` : w-8 h-8 rounded-xl, bg `#F0F0F0` / dark `#2A2A2A`.
- Pill agent : h-8 px-3 rounded-xl, même bg, img 14px, label binaire Training/Networks.
- Bouton micro : voir correction 4.
- Bouton envoi : w-8 h-8 rounded-xl, bg `#0A0A0A` dark `bg-white` actif, sinon bg `#F0F0F0` / dark `#2A2A2A`.

### Correction 4 — Bouton micro fonctionnel (Web Speech API)

- Nouveau hook `src/hooks/useVoiceInput.ts` : `startListening` / `stopListening` / `isListening` via `SpeechRecognition` (`webkitSpeechRecognition` fallback). Lang `fr-FR`. Callback `onResult(text)` appelée à la fin.
- Types `SpeechRecognition` non standards : déclaration globale inline dans le hook.
- Intégration dans AIPanel.tsx : `const { isListening, startListening, stopListening } = useVoiceInput(t => setInput(p => p + t))`. Le bouton micro toggle entre les deux. Style rouge + `animate-pulse` quand `isListening`.

## Non touché

- Logo écran vide
- Structure Hybrid / Projets / Training / Networks (sidebar nav)
- Bouton "Nouvelle conversation"
- Logique des agents, fetch, API, system prompts, streaming
- Autres pages

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
