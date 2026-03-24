import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn, formatTime, getTSBColor, getReadinessLabel } from '@/lib/utils'

const LOAD = { ctl: 84, atl: 91, tsb: -7, volume: 12.4 }

const WEEK_BARS = [
  { label: 'S5',  pct: 55, type: 'build'    },
  { label: 'S6',  pct: 70, type: 'build'    },
  { label: 'S7',  pct: 42, type: 'recovery' },
  { label: 'S8',  pct: 78, type: 'build'    },
  { label: 'S9',  pct: 85, type: 'build'    },
  { label: 'S10', pct: 44, type: 'recovery' },
  { label: 'S11', pct: 90, type: 'build'    },
  { label: 'S12', pct: 75, type: 'current'  },
]

const SESSIONS = [
  { sport: '🚴', name: 'Sweet Spot — 2×20min',  meta: 'Hier · 1h45 · 247W · 122 TSS' },
  { sport: '🏃', name: 'Endurance fondamentale', meta: "Sam · 1h20 · 4'42/km · 68 TSS" },
  { sport: '🏊', name: 'Technique + 6×100m',     meta: "Ven · 55min · 1'28/100m · 45 TSS" },
  { sport: '🏋️', name: 'Hyrox Simulation',       meta: 'Jeu · 1h05 · 890m Ski Erg · 88 TSS' },
]

const RECOVERY = {
  score: 75, sleep: '7h 20', hrv: '58ms', hr: '44bpm',
  sleepPct: 74, hrvPct: 68, hrPct: 85,
}

function ReadinessRing({ score }: { score: number }) {
  const r = 35
  const c = 2 * Math.PI * r
  const off = c - (score / 100) * c
  return (
    <div className="relative w-[88px] h-[88px] flex-shrink-0">
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--border)" strokeWidth="7"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke="url(#rg)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}/>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00c8e0"/>
            <stop offset="100%" stopColor="#5b6fff"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-[22px] leading-none text-brand">{score}</span>
        <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)]">/100</span>
      </div>
    </div>
  )
}

function ProgressBar({ label, value, pct, color }: {
  label: string; value: string; pct: number; color: string
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-[var(--text-mid)]">{label}</span>
        <span className="font-mono font-medium">{value}</span>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden bg-[var(--border)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const now = new Date()
  const weekDay = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em] capitalize">
            Bonjour, Thomas 👋
          </h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">
            <span className="capitalize">{weekDay}</span> {dateStr} · Semaine 12 · Phase de construction
            <span className="text-brand font-medium ml-2">· {formatTime(now)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            3
          </Button>
          <Button variant="primary">
            <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nouvelle séance
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="CTL · Forme" value={LOAD.ctl} unit="pts" variant="brand"
          sub={<span className="text-brand">↑ +3 cette semaine</span>}/>
        <StatCard label="ATL · Fatigue" value={LOAD.atl} unit="pts" variant="red"
          sub={<span className="text-[#ff5f5f]">↓ Charge élevée</span>}/>
        <StatCard label="TSB · Forme nette" value={LOAD.tsb} unit="pts" variant="blue"
          sub={<span className={getTSBColor(LOAD.tsb)}>→ Zone de charge</span>}/>
        <StatCard label="Volume S12" value={LOAD.volume} unit="h" variant="orange"
          sub={<span className="text-brand">↑ +1.2h vs S11</span>}/>
      </div>

      {/* Charge + Readiness */}
      <div className="grid grid-cols-[2fr_1fr] gap-3.5 mb-5">
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)]">
              Charge hebdomadaire — 8 semaines
            </h2>
            <div className="flex gap-1.5">
              {['TSS', 'Volume', 'RPE'].map((t, i) => (
                <span key={t} className={cn(
                  'text-[11px] px-2.5 py-1 rounded-tag border cursor-pointer transition-all',
                  i === 0
                    ? 'bg-[rgba(0,200,224,0.10)] border-[rgba(0,200,224,0.25)] text-brand'
                    : 'bg-[var(--bg-card2)] border-[var(--border)] text-[var(--text-dim)] hover:text-brand hover:border-brand'
                )}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {WEEK_BARS.map((b) => (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-[4px] hover:brightness-125 transition-all"
                  style={{
                    height: `${b.pct}%`,
                    background: b.type === 'current'
                      ? 'linear-gradient(180deg,rgba(0,200,224,0.85),rgba(0,200,224,0.30))'
                      : b.type === 'recovery'
                        ? 'linear-gradient(180deg,rgba(0,200,224,0.55),rgba(0,200,224,0.18))'
                        : 'linear-gradient(180deg,rgba(91,111,255,0.60),rgba(91,111,255,0.20))',
                    border: b.type === 'current' ? '1px solid rgba(0,200,224,0.4)' : 'none',
                  }}
                />
                <span className={cn('text-[10px] font-mono',
                  b.type === 'current' ? 'text-brand' : 'text-[var(--text-dim)]')}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[11px] text-[var(--text-dim)]">
            <span>Semaine actuelle : <span className="text-brand font-semibold font-mono">487 TSS</span></span>
            <span>Objectif : <span className="text-[var(--text-mid)]">520 TSS</span></span>
          </div>
        </Card>

        <div className="flex flex-col gap-3.5">
          <Card>
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
              Aujourd'hui
            </h2>
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-all',
              'bg-[var(--bg-card2)] border border-[var(--border)] hover:border-brand'
            )}>
              <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(0,200,224,0.10)] flex items-center justify-center text-[17px]">
                🏃
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">Tempo Z3 — 10km</p>
                <p className="text-[11px] text-[var(--text-dim)]">17h00 · 60min · 65 TSS</p>
              </div>
              <Badge variant="blue">Planifié</Badge>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
              Readiness
            </h2>
            <div className="flex items-center gap-4">
              <ReadinessRing score={RECOVERY.score} />
              <div className="flex-1">
                <ProgressBar label="Sommeil" value={RECOVERY.sleep} pct={RECOVERY.sleepPct} color="bg-[#5b6fff]"/>
                <ProgressBar label="HRV" value={RECOVERY.hrv} pct={RECOVERY.hrvPct} color="bg-brand"/>
                <ProgressBar label="FC repos" value={RECOVERY.hr} pct={RECOVERY.hrPct} color="bg-[#00e5ff]"/>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--text-dim)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand inline-block shadow-brand-sm"/>
              {getReadinessLabel(RECOVERY.score)} · Séance intensive possible
            </p>
          </Card>
        </div>
      </div>

      {/* Séances récentes */}
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)]">
          Séances récentes
        </h2>
        <button className="text-[11px] text-[var(--text-dim)] hover:text-brand transition-colors">
          Tout voir →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {SESSIONS.map((s, i) => (
          <div key={i} className={cn(
            'flex items-center gap-3 p-3 rounded-[12px] cursor-pointer transition-all',
            'bg-[var(--bg-card)] border border-[var(--border)] shadow-card',
            'hover:border-brand hover:shadow-brand-sm'
          )}>
            <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(0,200,224,0.08)] flex items-center justify-center text-[17px]">
              {s.sport}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{s.name}</p>
              <p className="text-[11px] text-[var(--text-dim)]">{s.meta}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-brand shadow-brand-sm flex-shrink-0"/>
          </div>
        ))}
      </div>

    </div>
  )
}
