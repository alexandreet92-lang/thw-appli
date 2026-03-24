import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const RUNNING_METRICS = [
  { icon: '🏃', name: 'FTP Running (seuil)', sub: 'Allure au seuil lactique', value: "4'08/km", color: 'text-brand' },
  { icon: '📉', name: 'Découplage cardiaque', sub: 'Dérive FC / allure stable', value: '+3.2%', color: 'text-brand' },
  { icon: '⚡', name: 'Efficience aérobie', sub: 'min/km par battement', value: '1.84', color: 'text-[#5b6fff]' },
]

const CYCLING_METRICS = [
  { icon: '🚴', name: 'FTP', sub: 'Functional Threshold Power', value: '301W', color: 'text-[#5b6fff]' },
  { icon: '📊', name: 'W/kg', sub: 'Puissance relative', value: '4.01', color: 'text-brand' },
  { icon: '📉', name: 'Découplage puissance/FC', sub: 'Sur 2×20min Sweet Spot', value: '+3.8%', color: 'text-brand' },
]

const HYROX_STATIONS = [
  { name: 'Ski Erg',    time: "3'44", color: 'text-[#5b6fff]' },
  { name: 'Sled Push',  time: "2'12", color: 'text-brand' },
  { name: 'Sled Pull',  time: "2'31", color: 'text-brand' },
  { name: 'Burpee BJ',  time: "4'18", color: 'text-[#ffb340]' },
  { name: 'Row Erg',    time: "3'52", color: 'text-[#5b6fff]' },
  { name: 'Farmers',    time: "1'48", color: 'text-brand' },
  { name: 'Sandbag',    time: "4'05", color: 'text-[#ffb340]' },
  { name: 'Wall Balls', time: "5'22", color: 'text-[#ff5f5f]' },
]

const SCORES = [
  { label: 'Endurance aérobie', value: 87, color: 'text-brand', badge: 'brand', trend: '↑ +4 ce mois' },
  { label: 'Score de durabilité', value: 73, color: 'text-[#5b6fff]', badge: 'blue', trend: '↑ +2 ce mois' },
  { label: 'Stabilité mécanique', value: 81, color: 'text-[#ffb340]', badge: 'orange', trend: '→ Stable' },
]

export default function PerformancePage() {
  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Performance</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">
            Scores · Métriques avancées · Analyse intelligente
          </p>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-3.5 mb-5">
        {SCORES.map((s) => (
          <Card key={s.label} className="text-center py-7">
            <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-dim)] mb-3">
              {s.label}
            </p>
            <p className={cn('font-display text-[52px] font-bold tracking-[-2px] leading-none', s.color)}>
              {s.value}
            </p>
            <p className="text-[12px] text-[var(--text-dim)] mt-1">/100</p>
            <div className="mt-3">
              <Badge variant={s.badge as any}>{s.trend}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Métriques Running + Vélo */}
      <div className="grid grid-cols-2 gap-3.5 mb-5">

        <Card>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
            Métriques Running
          </h2>
          <div className="flex flex-col gap-2">
            {RUNNING_METRICS.map((m) => (
              <div key={m.name} className={cn(
                'flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-all',
                'bg-[var(--bg-card)] border border-[var(--border)]',
                'hover:border-brand'
              )}>
                <div className="w-9 h-9 rounded-[9px] bg-[rgba(0,200,224,0.08)] flex items-center justify-center text-[16px] flex-shrink-0">
                  {m.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium">{m.name}</p>
                  <p className="text-[11px] text-[var(--text-dim)]">{m.sub}</p>
                </div>
                <p className={cn('font-display text-[18px] font-bold', m.color)}>{m.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
            Métriques Vélo
          </h2>
          <div className="flex flex-col gap-2">
            {CYCLING_METRICS.map((m) => (
              <div key={m.name} className={cn(
                'flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-all',
                'bg-[var(--bg-card)] border border-[var(--border)]',
                'hover:border-brand'
              )}>
                <div className="w-9 h-9 rounded-[9px] bg-[rgba(91,111,255,0.08)] flex items-center justify-center text-[16px] flex-shrink-0">
                  {m.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium">{m.name}</p>
                  <p className="text-[11px] text-[var(--text-dim)]">{m.sub}</p>
                </div>
                <p className={cn('font-display text-[18px] font-bold', m.color)}>{m.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Hyrox */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)]">
            Hyrox — Stations de référence
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--text-dim)]">Temps total estimé</span>
            <span className="font-display text-[20px] font-bold text-brand">1:02:14</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {HYROX_STATIONS.map((s) => (
            <div key={s.name} className="bg-[var(--bg-card2)] border border-[var(--border)] rounded-[8px] p-2.5 text-center">
              <p className="text-[10px] text-[var(--text-dim)] mb-1">{s.name}</p>
              <p className={cn('font-mono text-[13px] font-medium', s.color)}>{s.time}</p>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
