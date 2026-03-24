import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const METRICS = [
  { label: '💤 Sommeil', value: '7h 22min', color: 'text-[#5b6fff]' },
  { label: '📈 HRV (VFC)', value: '58ms', color: 'text-brand' },
  { label: '❤️ FC repos', value: '44bpm', color: 'text-brand' },
  { label: '🧠 Fatigue subjective', value: '3/10', color: 'text-[#ffb340]' },
  { label: '😓 Stress', value: '4/10', color: 'text-[#ffb340]' },
]

const FATIGUE_DIMS = [
  { label: 'Centrale',          pct: 35, color: 'bg-brand',       val: 'Faible',  valColor: 'text-brand' },
  { label: 'Périphérique',      pct: 55, color: 'bg-[#ffb340]',   val: 'Modérée', valColor: 'text-[#ffb340]' },
  { label: 'Neuromusculaire',   pct: 40, color: 'bg-[#5b6fff]',   val: 'Faible',  valColor: 'text-[#5b6fff]' },
  { label: 'Mentale',           pct: 45, color: 'bg-[#ffb340]',   val: 'Modérée', valColor: 'text-[#ffb340]' },
]

const HRV_BARS = [
  { day: '9',   pct: 70, color: 'rgba(0,200,224,0.4)'  },
  { day: '10',  pct: 65, color: 'rgba(0,200,224,0.4)'  },
  { day: '11',  pct: 80, color: 'rgba(0,200,224,0.6)'  },
  { day: '12',  pct: 55, color: 'rgba(255,179,64,0.6)' },
  { day: '13',  pct: 45, color: 'rgba(255,95,95,0.6)'  },
  { day: '14',  pct: 50, color: 'rgba(255,179,64,0.6)' },
  { day: '15',  pct: 60, color: 'rgba(0,200,224,0.4)'  },
  { day: '16',  pct: 75, color: 'rgba(0,200,224,0.5)'  },
  { day: '17',  pct: 78, color: 'rgba(0,200,224,0.5)'  },
  { day: '18',  pct: 70, color: 'rgba(0,200,224,0.4)'  },
  { day: '19',  pct: 60, color: 'rgba(0,200,224,0.4)'  },
  { day: '20',  pct: 65, color: 'rgba(0,200,224,0.4)'  },
  { day: '21',  pct: 72, color: 'rgba(0,200,224,0.5)'  },
  { day: 'Auj', pct: 74, color: 'rgba(0,200,224,0.8)', current: true },
]

function ReadinessRing({ score }: { score: number }) {
  const r = 50
  const c = 2 * Math.PI * r
  const off = c - (score / 100) * c
  return (
    <div className="relative w-[120px] h-[120px]">
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke="url(#rg2)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}/>
        <defs>
          <linearGradient id="rg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00c8e0"/>
            <stop offset="100%" stopColor="#5b6fff"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-[32px] leading-none text-brand">{score}</span>
        <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)]">/100</span>
      </div>
    </div>
  )
}

export default function RecoveryPage() {
  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Récupération</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">
            Readiness · HRV · Fatigue multidimensionnelle
          </p>
        </div>
        <Button variant="primary">+ Log du jour</Button>
      </div>

      {/* 3 colonnes */}
      <div className="grid grid-cols-3 gap-3.5 mb-5">

        {/* Readiness score */}
        <Card className="flex flex-col items-center py-6">
          <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--text-dim)] mb-4">
            Readiness Score
          </p>
          <ReadinessRing score={75} />
          <div className="mt-4 text-center">
            <Badge variant="brand">Bonne forme</Badge>
            <p className="text-[11px] text-[var(--text-dim)] mt-2 leading-relaxed">
              Charge maîtrisée.<br/>Séance intensive possible.
            </p>
          </div>
        </Card>

        {/* Métriques */}
        <Card>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
            Métriques du jour
          </h2>
          <div className="flex flex-col gap-2">
            {METRICS.map((m) => (
              <div key={m.label} className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-[9px]',
                'bg-[var(--bg-card2)] border border-[var(--border)]'
              )}>
                <span className="text-[12px] text-[var(--text-mid)]">{m.label}</span>
                <span className={cn('font-mono text-[13px] font-medium', m.color)}>{m.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Fatigue multidimensionnelle */}
        <Card>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-3">
            Fatigue multidimensionnelle
          </h2>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {FATIGUE_DIMS.map((f) => (
              <div key={f.label} className="p-3 rounded-[10px] bg-[var(--bg-card2)] border border-[var(--border)]">
                <p className="text-[11px] text-[var(--text-dim)] mb-1.5">{f.label}</p>
                <div className="h-[4px] rounded-full overflow-hidden bg-[var(--border)] mb-1.5">
                  <div className={`h-full rounded-full ${f.color}`} style={{ width: `${f.pct}%` }}/>
                </div>
                <p className={cn('text-[12px] font-medium font-mono', f.valColor)}>{f.val}</p>
              </div>
            ))}
          </div>
          {/* Systémique */}
          <div className="p-3 rounded-[10px] bg-[var(--bg-card2)] border border-[var(--border)] mb-3">
            <p className="text-[11px] text-[var(--text-dim)] mb-1.5">Systémique / Autonomique</p>
            <div className="h-[4px] rounded-full overflow-hidden bg-[var(--border)] mb-1.5">
              <div className="h-full rounded-full bg-brand" style={{ width: '30%' }}/>
            </div>
            <p className="text-[12px] font-medium font-mono text-brand">Faible · HRV stable</p>
          </div>
          {/* Recommandation */}
          <div className="p-3 rounded-[10px] bg-[rgba(0,200,224,0.06)] border border-[rgba(0,200,224,0.15)]">
            <p className="text-[11px] font-semibold text-brand mb-1">✦ Recommandation</p>
            <p className="text-[12px] text-[var(--text-mid)] leading-relaxed">
              Fatigue périphérique légèrement élevée. Séance tempo OK, évite un second bloc intense ce soir.
            </p>
          </div>
        </Card>
      </div>

      {/* HRV chart */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)]">
            HRV — 14 derniers jours
          </h2>
          <div className="flex gap-3 text-[11px] text-[var(--text-dim)]">
            <span>Moyenne : <span className="text-[var(--text-mid)] font-mono">61ms</span></span>
            <span>Aujourd'hui : <span className="text-brand font-mono">58ms</span></span>
            <span>Tendance : <span className="text-brand">↑ Positive</span></span>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {HRV_BARS.map((b) => (
            <div key={b.day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-[4px] hover:brightness-125 transition-all"
                style={{
                  height: `${b.pct}%`,
                  background: b.color,
                  border: b.current ? '1px solid rgba(0,200,224,0.5)' : 'none',
                }}
              />
              <span className={cn('text-[10px] font-mono', b.current ? 'text-brand' : 'text-[var(--text-dim)]')}>
                {b.day}
              </span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
