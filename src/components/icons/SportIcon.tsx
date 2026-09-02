import {
  IconRun,
  IconBike,
  IconSwimming,
  IconKayak,       // IconRowing absent → IconKayak (aviron/pagaie)
  IconBarbell,
  IconStretching2, // IconStretching existe aussi, mais Stretching2 est plus dynamique
  IconStretching,  // Mobilité (assouplissement / amplitude articulaire)
  IconTreadmill,
  IconMountain,    // VTT
  IconHome,        // Home Trainer (vélo d'intérieur)
  IconBolt,        // Hybrid (multi-modalité)
  IconKarate,      // Boxe
  IconSnowboarding,// Ski
  IconYoga,        // Yoga
  IconBallTennis,  // Padel
  IconWalk,        // Randonnée
  IconActivity,    // Autre (générique)
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

type SportIconComponent = ComponentType<{ size?: number; color?: string; stroke?: number }>

// Icône SPÉCIFIQUE d'un sous-type (VTT / Home Trainer / Tapis) — pour différencier
// dans la grille du planning. null → on garde l'icône générique du sport.
export function subSportIcon(sub?: string | null): SportIconComponent | null {
  if (sub === 'vtt') return IconMountain
  if (sub === 'ht') return IconHome
  if (sub === 'treadmill') return IconTreadmill
  return null
}

export type SportKey =
  | 'run' | 'bike' | 'swim' | 'rowing' | 'muscu' | 'hyrox' | 'ellip' | 'hybrid' | 'boxe' | 'mobilite'
  | 'ski' | 'yoga' | 'padel' | 'hiking' | 'other'

// Mapping depuis les SportType de l'app (run|bike|swim|hyrox|rowing|gym|elliptique)
// + alias éventuels (running, cycling…). Inconnu → null.
const SPORT_TYPE_TO_KEY: Record<string, SportKey> = {
  run: 'run', running: 'run',
  bike: 'bike', cycling: 'bike',
  swim: 'swim',
  rowing: 'rowing',
  gym: 'muscu', muscu: 'muscu',
  hyrox: 'hyrox',
  elliptique: 'ellip', ellip: 'ellip',
  hybrid: 'hybrid', boxe: 'boxe', boxing: 'boxe',
  mobilite: 'mobilite', mobility: 'mobilite',
  ski: 'ski', yoga: 'yoga', padel: 'padel', tennis: 'padel',
  hiking: 'hiking', randonnee: 'hiking', rando: 'hiking', walk: 'hiking',
  other: 'other', autre: 'other', autres: 'other',
}

export function sportKeyFromType(sport: string): SportKey | null {
  return SPORT_TYPE_TO_KEY[sport] ?? null
}

// MAP CENTRALISÉE — couleur + icône au même endroit.
// Pour changer une couleur : modifier UNE ligne ici, rien d'autre.
const SPORT_ICON: Record<SportKey, { Icon: ComponentType<{ size?: number; color?: string; stroke?: number }>; color: string; label: string }> = {
  run:    { Icon: IconRun,        color: '#22c55e', label: 'w4d.si_run'    },
  bike:   { Icon: IconBike,       color: '#3b82f6', label: 'w4d.si_bike'   },
  swim:   { Icon: IconSwimming,   color: '#0ea5e9', label: 'w4d.si_swim'   },
  rowing: { Icon: IconKayak,      color: '#8b5cf6', label: 'w4d.si_rowing'     }, // IconRowing absent → IconKayak
  muscu:  { Icon: IconBarbell,    color: '#f97316', label: 'w4d.si_muscu'      },
  hyrox:  { Icon: IconStretching2,color: '#ef4444', label: 'w4d.si_hyrox'      }, // IconStretching2 (mouvement fonctionnel)
  ellip:  { Icon: IconTreadmill,  color: '#ec4899', label: 'w4d.si_ellip' },
  hybrid: { Icon: IconBolt,       color: '#f59e0b', label: 'w4d.si_hybrid'     },
  boxe:   { Icon: IconKarate,     color: '#e11d48', label: 'w4d.si_boxe'       },
  mobilite: { Icon: IconStretching, color: '#86efac', label: 'w4d.si_mobilite' }, // vert CLAIR distinct du run (#22c55e), figure d'assouplissement
  ski:    { Icon: IconSnowboarding, color: '#38bdf8', label: 'w4d.si_ski'       },
  yoga:   { Icon: IconYoga,         color: '#a78bfa', label: 'w4d.si_yoga'      },
  padel:  { Icon: IconBallTennis,   color: '#facc15', label: 'w4d.si_padel'     },
  hiking: { Icon: IconWalk,         color: '#65a30d', label: 'w4d.si_hiking' },
  other:  { Icon: IconActivity,     color: '#64748b', label: 'w4d.si_other'     },
}

export function SportIcon({
  sport,
  size = 40,
  circle = true,
}: {
  sport: SportKey | string
  size?: number
  circle?: boolean
}) {
  // Accepte une SportKey directe OU un SportType de l'app (gym, elliptique, running…)
  const key = (sport in SPORT_ICON ? sport : sportKeyFromType(sport)) as SportKey | null
  const cfg = key ? SPORT_ICON[key] : undefined
  if (!cfg) return null
  const { Icon, color } = cfg
  // Variante « nue » : juste le pictogramme dans la couleur du sport, sans pastille.
  if (!circle) return <Icon size={size} color={color} stroke={2.2} />
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
