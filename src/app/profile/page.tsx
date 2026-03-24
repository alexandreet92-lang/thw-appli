import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const ZONES = [
  { z: 'Z1', color: 'text-[#00e5ff]', bar: 'bg-[rgba(0,229,255,0.25)]', range: '< 138bpm · > 5\'30/km' },
  { z: 'Z2', color: 'text-brand',     bar: 'bg-[rgba(0,200,224,0.30)]', range: '138–155bpm · 4\'45–5\'20' },
  { z: 'Z3', color: 'text-[#ffb340]', bar: 'bg-[rgba(255,179,64,0.30)]',range: '155–165bpm · 4\'15–4\'45' },
  { z: 'Z4', color: 'text-[#ff5f5f]', bar: 'bg-[rgba(255,95,95,0.30)]', range: '165–172bpm · 3\'55–4\'15' },
  { z: 'Z5', color: 'text-red-500',   bar: 'bg-[rgba(220,40,40,0.30)]', range: '> 172bpm · < 3\'55/km' },
]

const GOALS = [
  {
    type: 'Principal',
    variant: 'brand',
    title: 'Hyrox World Championships',
    sub: 'Berlin · Mai 2025 · Objectif sub 1h00',
    bg: 'bg-[rgba(0,200,224,0.06)] border-[rgba(0,200,224,0.15)]',
  },
  {
    type: 'Secondaire',
    variant: 'blue',
    title: 'Ironman 70.3 Nice',
    sub: 'Septembre 2025 · Qualification AG',
    bg: 'bg-[rgba(91,111,255,0.06)] border-[rgba(91,111,255,0.12)]',
  },
  {
    type: 'Secondaire',
    variant: 'orange',
    title: 'Semi-marathon Paris',
    sub: 'Mars 2025 · Objectif sub 1h25',
    bg: 'bg-[rgba(255,179,64,0.06)] border-[rgba(255,179,64,0.12)]',
  },
]

const CONNECTIONS = [
  { emoji: '🟠', name: 'Strava',        status: 'Connecté · Sync. auto', connected: true },
  { emoji: '🔵', name: 'Garmin Connect', status: 'Non connecté',          connected: false },
  { emoji: '🍎', name: 'Apple Health',   status: 'Non connecté',          connected: false },
]

export default function ProfilePage() {
  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Mon Profil</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">
            Paramètres athlète · Zones · Objectifs
          </p>
        </div>
        <Button variant="primary">Modifier</Button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">

        {/* Colonne gauche */}
        <div className="flex flex-col gap-3.5">

          {/* Infos athlète */}
          <Card>
            <div className="flex items-center gap-4 mb-5">
              <div className={cn(
                'w-20 h-20 rounded-[20px] flex-shrink-0',
                'bg-[rgba(0,200,224,0.10)] border-2 border-[var(--border-mid)]',
                'flex items-center justify-center',
                'font-display text-[28px] font-bold text-brand'
              )}>
                T
              </div>
              <div>
                <p className="font-display text-[20px] font-bold">Thomas L.</p>
                <p className="text-[12px] text-[var(--text-dim)] mt-1">Coach · Athlète Hybride</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Badge variant="brand">Triathlon</Badge>
                  <Badge variant="orange">Hyrox</Badge>
                  <Badge variant="blue">Running</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Âge',    value: '31' },
                { label: 'Poids',  value: '75kg' },
                { label: 'FTP',    value: '301W', color: 'text-brand' },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-2.5 bg-[var(--bg-card2)] rounded-[8px] border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-dim)] mb-1">{stat.label}</p>
                  <p className={cn('font-display text-[22px] font-bold', stat.color || 'text-[var(--text)]')}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Zones Running */}
          <Card>
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
              Zones Running (LTHR 172bpm)
            </h2>
            <div className="flex flex-col gap-2">
              {ZONES.map((z) => (
                <div key={z.z} className="flex items-center gap-2.5">
                  <span className={cn('w-7 text-center font-semibold text-[12px]', z.color)}>{z.z}</span>
                  <div className={cn('flex-1 h-[6px] rounded-full', z.bar)}/>
                  <span className="font-mono text-[11px] text-[var(--text-dim)] w-[140px] text-right">{z.range}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-3.5">

          {/* Objectifs */}
          <Card>
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
              Objectifs 2025
            </h2>
            <div className="flex flex-col gap-2.5">
              {GOALS.map((g) => (
                <div key={g.title} className={cn('p-3 rounded-[10px] border', g.bg)}>
                  <div className="mb-1.5">
                    <Badge variant={g.variant as any}>{g.type}</Badge>
                  </div>
                  <p className="text-[13px] font-medium">{g.title}</p>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1">{g.sub}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Connexions */}
          <Card>
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
              Connexions externes
            </h2>
            <div className="flex flex-col gap-2">
              {CONNECTIONS.map((c) => (
                <div key={c.name} className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-[10px]',
                  'bg-[var(--bg-card2)] border border-[var(--border)]'
                )}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[20px]">{c.emoji}</span>
                    <div>
                      <p className="text-[12px] font-medium">{c.name}</p>
                      <p className={cn('text-[10px]', c.connected ? 'text-brand' : 'text-[var(--text-dim)]')}>
                        {c.status}
                      </p>
                    </div>
                  </div>
                  {c.connected
                    ? <Badge variant="brand">Actif</Badge>
                    : <Button variant="ghost" size="sm">Connecter</Button>
                  }
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
