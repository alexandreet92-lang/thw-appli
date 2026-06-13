import {
  IconRun,
  IconBike,
  IconSwimming,
  IconKayak,       // IconRowing absent → IconKayak (aviron/pagaie)
  IconBarbell,
  IconStretching2, // IconStretching existe aussi, mais Stretching2 est plus dynamique
  IconTreadmill,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

export type SportKey =
  | 'run' | 'bike' | 'swim' | 'rowing' | 'muscu' | 'hyrox' | 'ellip'

// MAP CENTRALISÉE — couleur + icône au même endroit.
// Pour changer une couleur : modifier UNE ligne ici, rien d'autre.
const SPORT_ICON: Record<SportKey, { Icon: ComponentType<{ size?: number; color?: string; stroke?: number }>; color: string; label: string }> = {
  run:    { Icon: IconRun,        color: '#22c55e', label: 'Running'    },
  bike:   { Icon: IconBike,       color: '#3b82f6', label: 'Cyclisme'   },
  swim:   { Icon: IconSwimming,   color: '#0ea5e9', label: 'Natation'   },
  rowing: { Icon: IconKayak,      color: '#8b5cf6', label: 'Aviron'     }, // IconRowing absent → IconKayak
  muscu:  { Icon: IconBarbell,    color: '#f97316', label: 'Muscu'      },
  hyrox:  { Icon: IconStretching2,color: '#ef4444', label: 'Hyrox'      }, // IconStretching2 (mouvement fonctionnel)
  ellip:  { Icon: IconTreadmill,  color: '#ec4899', label: 'Elliptique' },
}

export function SportIcon({
  sport,
  size = 40,
}: {
  sport: SportKey
  size?: number
}) {
  const cfg = SPORT_ICON[sport]
  if (!cfg) return null
  const { Icon, color } = cfg
  const inner = Math.round(size * 0.56)
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={inner} color="#fff" stroke={2.2} />
    </span>
  )
}

export { SPORT_ICON }
