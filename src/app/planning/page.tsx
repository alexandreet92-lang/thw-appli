import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const WEEK_SESSIONS = [
  { day: 'Lun', date: '18', am: { sport: '🏊', title: 'Natation Tech', time: '06:00', duration: '55min', type: 'swim' }, pm: null },
  { day: 'Mar', date: '19', am: null, pm: { sport: '🚴', title: 'Sweet Spot', time: '17:30', duration: '1h45', type: 'bike' } },
  { day: 'Mer', date: '20', am: { sport: '🏃', title: 'Endurance Z2', time: '06:30', duration: '70min', type: 'run' }, pm: null },
  { day: 'Jeu', date: '21', am: null, pm: { sport: '🏋️', title: 'Hyrox Sim', time: '18:00', duration: '65min', type: 'hyrox' } },
  { day: 'Ven', date: '22', am: { sport: '🏊', title: '6×100m', time: '06:00', duration: '60min', type: 'swim' }, pm: { sport: '🏃', title: 'Tempo Z3', time: '17:00', duration: '60min', type: 'run' } },
  { day: 'Sam', date: '23', am: { sport: '🚴', title: 'Long Z2', time: '08:00', duration: '3h00', type: 'bike' }, pm: null },
  { day: 'Dim', date: '24', am: null, pm: { sport: '🏃', title: 'Récup Z1', time: '10:00', duration: '40min', type: 'run' } },
]

const SESSION_COLORS: Record<string, string> = {
  run:   'bg-[rgba(0,200,224,0.12)] border-l-[2px] border-brand',
  bike:  'bg-[rgba(91,111,255,0.12)] border-l-[2px] border-[#5b6fff]',
  swim:  'bg-[rgba(0,229,255,0.10)] border-l-[2px] border-[#00e5ff]',
  hyrox: 'bg-[rgba(255,179,64,0.12)] border-l-[2px] border-[#ffb340]',
}

const ANNUAL_BLOCKS = [
  { label: 'BASE', flex: 2, color: 'rgba(0,200,224,0.2)', text: 'text-brand' },
  { label: '', flex: 0.4, color: 'var(--border)', text: '' },
  { label: 'CONSTRUCTION', flex: 3, color: 'rgba(91,111,255,0.2)', text: 'text-[#5b6fff]' },
  { label: '', flex: 0.4, color: 'var(--border)', text: '' },
  { label: 'SPÉCIFIQUE', flex: 2, color: 'rgba(255,95,95,0.18)', text: 'text-[#ff5f5f]' },
  { label: '', flex: 0.4, color: 'var(--border)', text: '' },
  { label: 'AFFÛT', flex: 1, color: 'rgba(0,200,224,0.25)', text: 'text-brand' },
]

export default function PlanningPage() {
  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Planning</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">
            Semaine 12 — 18 au 24 mars · Bloc construction
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">← Préc.</Button>
          <Button variant="ghost">Suiv. →</Button>
          <Button variant="primary">
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Ajouter
          </Button>
        </div>
      </div>

      {/* KPIs semaine */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="TSS prévu" value={520} unit="pts" variant="blue"/>
        <StatCard label="Volume" value={13.5} unit="h" variant="brand"/>
        <StatCard label="Séances" value={8} unit="sess." variant="orange"/>
        <Card>
          <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-dim)] mb-2.5">Phase</p>
          <Badge variant="blue">Construction</Badge>
          <p className="text-[12px] text-[var(--text-dim)] mt-2">Semaine 3/4 du bloc</p>
        </Card>
      </div>

      {/* Grille semaine */}
      <Card noPadding className="p-4 mb-5 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Headers */}
          <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-2 mb-2">
            <div/>
            {WEEK_SESSIONS.map((d) => (
              <div key={d.day} className="text-center">
                <p className="text-[11px] text-[var(--text-dim)] uppercase tracking-[0.06em] font-medium">{d.day}</p>
                <p className="text-[13px] font-semibold text-[var(--text)]">{d.date}</p>
              </div>
            ))}
          </div>

          {/* Matin */}
          <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-2 mb-2">
            <div className="flex items-center justify-end pr-2">
              <span className="text-[10px] font-mono text-[var(--text-dim)]">AM</span>
            </div>
            {WEEK_SESSIONS.map((d) => (
              <div key={d.day} className={cn(
                'min-h-[52px] rounded-[8px] border border-[var(--border)]',
                'bg-[var(--bg-card2)] cursor-pointer hover:border-brand transition-all',
                'relative overflow-hidden'
              )}>
                {d.am && (
                  <div className={cn('absolute inset-[3px] rounded-[6px] p-1.5', SESSION_COLORS[d.am.type])}>
                    <p className="text-[11px] font-semibold truncate">{d.am.sport} {d.am.title}</p>
                    <p className="text-[10px] opacity-70">{d.am.time} · {d.am.duration}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Soir */}
          <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-2">
            <div className="flex items-center justify-end pr-2">
              <span className="text-[10px] font-mono text-[var(--text-dim)]">PM</span>
            </div>
            {WEEK_SESSIONS.map((d) => (
              <div key={d.day} className={cn(
                'min-h-[52px] rounded-[8px] border border-[var(--border)]',
                'bg-[var(--bg-card2)] cursor-pointer hover:border-brand transition-all',
                'relative overflow-hidden'
              )}>
                {d.pm && (
                  <div className={cn('absolute inset-[3px] rounded-[6px] p-1.5', SESSION_COLORS[d.pm.type])}>
                    <p className="text-[11px] font-semibold truncate">{d.pm.sport} {d.pm.title}</p>
                    <p className="text-[10px] opacity-70">{d.pm.time} · {d.pm.duration}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Vue annuelle */}
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)]">
          Vue annuelle — Blocs d'entraînement
        </h2>
      </div>

      <Card>
        <div className="flex gap-[3px] h-[30px] rounded-[8px] overflow-hidden mb-2">
          {ANNUAL_BLOCKS.map((b, i) => (
            <div
              key={i}
              className={cn('flex items-center justify-center text-[10px] font-semibold', b.text)}
              style={{ flex: b.flex, background: b.color }}
            >
              {b.label}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep'].map((m) => (
            <span key={m} className="text-[10px] text-[var(--text-dim)]">{m}</span>
          ))}
        </div>
      </Card>

    </div>
  )
}
