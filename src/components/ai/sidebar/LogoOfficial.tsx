'use client'

/**
 * LogoAgent — affiche le PNG officiel du shuriken selon l'agent.
 *
 *  - training (athena) → /logos/logo_4bras.png
 *  - networks (zeus)   → /logos/logo_6bras.png
 *  - hermes            → /logos/logo_3bras.png
 *
 * `LogoOfficial` est gardé comme alias rétrocompat (= LogoAgent agent="training").
 */

export type DisplayAgent = 'training' | 'networks' | 'hermes'

const AGENT_LOGO: Record<DisplayAgent, string> = {
  training: '/logos/logo_4bras.png',
  networks: '/logos/logo_6bras.png',
  hermes:   '/logos/logo_3bras.png',
}

/** Mappe le modèle interne (Anthropic) vers le display agent user-facing. */
export function modelToAgent(model: 'hermes' | 'athena' | 'zeus'): DisplayAgent {
  if (model === 'zeus')   return 'networks'
  if (model === 'hermes') return 'hermes'
  return 'training'
}

export function LogoAgent({
  agent = 'training',
  size = 18,
  alt,
}: {
  agent?: DisplayAgent
  size?: number
  alt?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={AGENT_LOGO[agent]}
      alt={alt ?? agent}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
    />
  )
}

/** Alias rétrocompat : LogoOfficial = LogoAgent(agent='training'). */
export function LogoOfficial({ size = 18, alt = 'Training' }: { size?: number; alt?: string }) {
  return <LogoAgent agent="training" size={size} alt={alt} />
}

export default LogoOfficial
