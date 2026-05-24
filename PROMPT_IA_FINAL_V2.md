# PROMPT IA FINAL V2

## Audit pré-modification

| Marqueur recherché | Fichier | Ligne |
|---|---|---|
| "CONVERSATIONS" + "Rechercher" + sélecteur Athéna/Zeus/Hermès | `src/components/ai/AISidebar.tsx` | 151, 178, 212-240 |
| "Pose ta question…" | `src/components/ai/AIPanel.tsx` | 19444 |
| "Comment puis-je t'aider" | `src/components/ai/AIPanel.tsx` | 18901 |
| Header avec étoile + "Athena/Zeus/Hermes" | `src/components/ai/AIHeader.tsx` | 64-67 |

`AIInputBar.tsx` contient `"Message..."` mais c'est un composant orphelin non importé — ignoré.

## Modifications appliquées

### Mod 1 — AISidebar.tsx : nouvelle structure (rewrite contrôlé)

- Zone haute : "CONVERSATIONS" + recherche → titre **Hybrid** + avatar avec initiale
- Navigation ajoutée : 3 NavItems **Projets** / **Training** / **Networks** (SVG dossier / haltère / globe)
- Label `Récents` entre nav et liste
- Liste conversations : nouveau style item (rounded-lg, hover bg-black/5, actif bg-black/8 — variantes `dark:`)
- Section "Agent selector" (3 pills Athéna/Zeus/Hermès) supprimée → remplacée par pill blanche **Nouvelle conversation**
- Couleurs Tailwind `dark:` partout : sidebar `bg-[#F7F7F7] dark:bg-[#1A1A1A]`

Conservé : props signature, `useUserInitial` hook, fmt date helper, comportement `persistent` desktop vs overlay mobile.

### Mod 2 — AIHeader.tsx : nom agent sans étoile

- Suppression `<AgentIcon agent={model} size={16} />` (l.64)
- Mapping `AGENT_NAMES` athéna/zeus/hermes → "Training"/"Networks" (binaire : zeus = Networks, sinon Training)
- Imports `AgentIcon` + `AgentId` retirés (orphelins)

### Mod 3 — AIPanel.tsx : tailles ajustées

- Empty state logo (l.18890) : `width={52} height={52}` → `width={48} height={48}`
- Pill agent (l.19504) : `width={14} height={14}` → `width={13} height={13}`
- Empty state, pill logo, mic button déjà en place depuis le commit précédent — aucun changement

### Mod 4 — Chemins PNG

User indique `/logo-4bras.png` et `/logo-6bras.png` à la racine. Ces chemins n'existent pas.
Vrais chemins : `/logos/logo_4bras.png` et `/logos/logo_6bras.png`. Le code utilise les vrais chemins.

## Non touché

- AIPanel.tsx au-delà des 2 edits taille (logique flow, messages, streaming intacts)
- AIInputBar.tsx (orphelin)
- AgentIcon.tsx (encore utilisé par QuickActionsSheet.tsx)
- Logique fetch, API, routing, system prompts, streaming
- Tous les autres fichiers de l'app

## Règles

- Merge direct sur main
- `npm run build` doit passer avant push
