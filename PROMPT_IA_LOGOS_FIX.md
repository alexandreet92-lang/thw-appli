# PROMPT IA LOGOS FIX

## Mapping logos PNG ↔ agents

Les 3 fichiers PNG des logos sont dans `/public/logos/` (et non `/public/` racine, et avec underscores et non tirets) :

| Agent (user-facing) | Modèle interne | Fichier PNG |
|---|---|---|
| Training | athena | `/logos/logo_4bras.png` |
| Networks | zeus | `/logos/logo_6bras.png` |
| Hermès (actions rapides) | hermes | `/logos/logo_3bras.png` |

> Note : le prompt original mentionnait `/public/logo-4bras.png` (racine, tirets) — c'est inexact. Les vrais chemins sont en sous-dossier `/logos/` et avec underscores.

## Règle d'utilisation

Remplacer TOUS les `<AgentIcon>` SVG par des `<img>` qui pointent vers le bon fichier PNG selon l'agent actif :
- Sidebar nav, item Training → `/logos/logo_4bras.png`
- Sidebar nav, item Networks → `/logos/logo_6bras.png`
- Logo écran vide → logo de l'agent actif (mapping via `model`)
- Logo header → logo de l'agent actif
- Logo pill input bar → logo de l'agent actif
- QuickActionsSheet → logo de l'agent de l'action

## Tailles

| Contexte | Taille |
|---|---|
| Sidebar nav | 20px |
| Écran vide centré | 52px |
| Header | 18px |
| Pill input | 14px |

## Couleurs sidebar (Claude-like, neutre, PAS bleu/navy)

```
fond       : #1A1A1A
texte      : #FFFFFF
hover      : rgba(255,255,255,0.06)
actif      : rgba(255,255,255,0.10)
"Hybrid"   : font-semibold blanc
```

## Composant central : LogoAgent

Un seul composant React qui charge le bon PNG :

```tsx
type DisplayAgent = 'training' | 'networks' | 'hermes'

const AGENT_LOGO: Record<DisplayAgent, string> = {
  training: '/logos/logo_4bras.png',
  networks: '/logos/logo_6bras.png',
  hermes:   '/logos/logo_3bras.png',
}

export function LogoAgent({ agent = 'training', size = 18 }: {
  agent?: DisplayAgent
  size?: number
}) {
  return (
    <img
      src={AGENT_LOGO[agent]}
      alt={agent}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}
```

Helper pour passer du modèle interne au display agent :

```ts
export function modelToAgent(model: 'hermes' | 'athena' | 'zeus'): DisplayAgent {
  if (model === 'zeus') return 'networks'
  if (model === 'hermes') return 'hermes'
  return 'training'
}
```

## Règles de merge

- Merge direct sur main, jamais de PR (autorisation permanente)
- `npm run build` doit passer avant push
- Ne pas modifier la logique des agents (API, system prompts)
