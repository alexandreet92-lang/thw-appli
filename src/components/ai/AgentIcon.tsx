'use client'

export type AgentId = 'athena' | 'zeus' | 'hermes'

const COLORS: Record<AgentId, string> = {
  athena: '#2563EB',
  zeus:   '#7C3AED',
  hermes: '#D97706',
}

// 4-arm shuriken (Athena)
function Shuriken4({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 2 L20 12 L30 8 L22 16 L30 24 L20 20 L16 30 L12 20 L2 24 L10 16 L2 8 L12 12 Z"
        fill={color}
      />
    </svg>
  )
}

// 6-arm shuriken (Zeus)
function Shuriken6({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 2 L19 10 L27 7 L22 14 L30 16 L22 18 L27 25 L19 22 L16 30 L13 22 L5 25 L10 18 L2 16 L10 14 L5 7 L13 10 Z"
        fill={color}
      />
    </svg>
  )
}

// 3-arm shuriken (Hermès)
function Shuriken3({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 2 L22 14 L30 22 L16 20 L2 22 L10 14 Z"
        fill={color}
      />
    </svg>
  )
}

export function AgentIcon({ agent, size = 20 }: { agent: AgentId; size?: number }) {
  const color = COLORS[agent]
  if (agent === 'zeus')   return <Shuriken6 color={color} size={size} />
  if (agent === 'hermes') return <Shuriken3 color={color} size={size} />
  return <Shuriken4 color={color} size={size} />
}

export default AgentIcon
