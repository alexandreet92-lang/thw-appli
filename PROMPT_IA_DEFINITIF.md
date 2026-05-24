# PROMPT IA DÉFINITIF

## Audit pré-modification

Vérifications avant édition :

| Étape | État actuel | Diff à appliquer |
|---|---|---|
| Etape 1 — Conv items style | `rounded-lg py-2` + actif `bg-black/[0.06]` + hover `bg-black/[0.04]` | Passer à `rounded-xl py-2.5` + hover `bg-black/[0.05]` |
| Etape 2 — Nav separators | Déjà aucun (gap-0.5 entre NavItems) | Rien à faire |
| Etape 3 — Sidebar bg | `bg-[#F7F7F7] dark:bg-[#1A1A1A]` | Rien à faire |
| Etape 4 — Wrapper input | outer `px-4 pt-2 pb-4`, inner dark `bg-[#1A1A1A]`, shadow `0_2px_12px / 0.08-0.3` | outer `pb-6`, inner dark `bg-[#1E1E1E]`, shadow `0_4px_24px / 0.06-0.4` |
| Texte "Entrée · Shift" | `fontSize: 11, color: #8C8C8C, textAlign: center` | `text-[#BABABA] mt-2 hidden md:block` |
| Etape 5 — Textarea | inline `lineHeight: 1.55, color: var(--ai-text), padding 14/16/6, min 26 / max 130` + `aip-textarea` (16px mobile / 14px desktop) | Tailwind `w-full px-4 pt-4 pb-2 text-[15px] leading-relaxed text-[#0A0A0A] dark:text-white placeholder:text-[#BABABA] dark:placeholder:text-[#555] min-h-[56px] max-h-[180px]`. Retire `aip-textarea` (font-size géré en Tailwind). |
| Etape 6 — Boutons + / pill / mic / send | bg `#F0F0F0` / hover `#E5E5E5` / text `#666` | bg `#F2F2F2` / hover `#E8E8E8` / text `#555` |
| Hook useVoiceInput | Existe (`src/hooks/useVoiceInput.ts`) | Rien à faire |
| Etape 7 — Fond contenu principal | `.aip-root` `background: var(--ai-bg)` = `white` / `#0A0A0A` via CSS var (déjà theme-aware) | Rien à faire |

## Note — Bouton envoi

Le spec utilisateur demande `stroke={input?.trim() ? 'white' : '#999'}` mais en dark mode le bouton actif est `bg-white` → stroke white = invisible.
Implémentation cross-theme : SVG en `currentColor`, button `text-white dark:text-[#0A0A0A]` quand actif → stroke blanc en light, sombre en dark. Visuellement équivalent au spec utilisateur, mais lisible aussi en dark.

## Risque iOS Safari zoom

Textarea passée à `text-[15px]`. iOS Safari déclenche un zoom automatique sur focus quand `font-size < 16px`. Le code original utilisait `aip-textarea` qui forçait 16px sur mobile pour bloquer ce zoom. Je respecte le spec utilisateur (15px) — l'effet de zoom est connu et accepté.

## Règles

- Modifications uniquement dans `AISidebar.tsx` et `AIPanel.tsx`
- Aucun autre fichier touché
- Aucun changement de logique, state ou import
- Merge direct sur main
- `npm run build` avant push
