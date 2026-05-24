# PROMPT IA FIXES CHIRURGICAUX

## Audit pré-modification

État de main après le revert d'hier (`af80891` + revert commits).

- `AISidebar.tsx` (251 lignes) utilise des inline styles + CSS vars (`var(--aiq-sidebar-bg)`, `var(--ai-bg2)`, `var(--ai-text)`, etc.). Ces vars sont théoriquement theme-aware, définies dans `<style>` inline d'AIPanel pour `.aip-root` (light) et `html.dark .aip-root` (dark).
- `AIInputBar.tsx` (118 lignes) est un composant orphelin, **non importé** ailleurs. L'input bar visible en prod est inlined dans AIPanel.tsx vers la ligne 19450.
- `AIPanel.tsx` contient :
  - Empty state à `l.18891` : `<AgentIcon agent={model as AgentId} size={48} />`
  - Pill agent à `l.19497-19500` : `<AgentIcon /> + MODEL_CONFIGS[model].name` ("Hermès" / "Athéna" / "Zeus")
  - Pas de bouton microphone dans l'input bar
- Fichiers PNG : `/public/logos/logo_4bras.png` et `/public/logos/logo_6bras.png` (sous-dossier `/logos/`, underscores — chemins racine `/logo-Xbras.png` n'existent pas)
- CSS var `--aiq-sidebar-bg` dark = `#141414` (proche mais ≠ de la spec `#1A1A1A`)

## Modifications appliquées (uniquement les lignes citées, aucun rewrite)

### Problème 1 — Thème incohérent (ajustement minimal)

La sidebar suit déjà le thème via `var(--aiq-sidebar-bg)`. Seule la valeur dark `#141414` ne matche pas la spec `#1A1A1A`. Modification chirurgicale d'une seule ligne dans le bloc `<style>` d'AIPanel.tsx :

- `--aiq-sidebar-bg: #141414` → `--aiq-sidebar-bg: #1A1A1A` (uniquement bloc `html.dark .aip-root`)

Aucune autre couleur fixe `bg-[#1A1A1A]` ou `bg-white` sans `dark:` n'a été trouvée dans la sidebar — elle est déjà theme-aware.

### Problème 2 — Bouton microphone

Inséré entre la pill agent (`l.19501`) et le bouton envoi (`l.19506` dans la version actuelle). Le bouton micro utilise `var(--ai-btn-bg)` si défini, sinon fallback `rgba(0,0,0,0.06)`.

### Problème 3 — Logo PNG empty state + pill

- Empty state `l.18891` : `<AgentIcon … size={48}>` remplacé par `<img src="/logos/logo_{4|6}bras.png" width={52} height={52}>` selon `model === 'zeus' ? networks : training`
- Pill agent `l.19497` : `<AgentIcon … size={12}>` remplacé par `<img … width={14}>`
- Pill label `l.19499` : `{MODEL_CONFIGS[model].name}` remplacé par `{model === 'zeus' ? 'Networks' : 'Training'}`

## Ce qui n'est PAS touché

- Layout global de la page IA
- AISidebar.tsx (à l'exception du CSS var commenté ci-dessus — qui est dans AIPanel, pas AISidebar)
- AgentIcon.tsx (toujours utilisé par QuickActionsSheet)
- Le bouton Nouvelle conversation (déjà OK)
- La liste des conversations
- La logique des agents (cycling, API, system prompts)
- Tous les autres fichiers de l'app

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
- Aucun rewrite — uniquement Edit ciblé
