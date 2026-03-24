import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

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

const SPORTS_DIST = [
  { emoji: '🚴', label: 'Vélo',     hours: '21h', pct: '33%', color: 'bg-[#5b6fff]', flex: 3   },
  { emoji: '🏃', label: 'Running',  hours: '18h', pct: '28%', color: 'bg-brand',     flex: 2.5 },
  { emoji: '🏊', label: 'Natation', hours: '10h', pct: '16%', color: 'bg-[#00e5ff]', flex: 1.5 },
  { emoji: '🏋️', label: 'Hyrox',    hours: '7h',  pct: '11%', color: 'bg-[#ff5f5f]', flex: 1   },
  { emoji: '🚣', label: 'Ergo',     hours: '7h',  pct: '11%', color: 'bg-[#ffb340]', flex: 1   },
]

export default function DataPage() {
  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Données & Analyse</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">
            Charge · Tendances · Métriques de performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">Importer Strava</Button>
          <Button variant="ghost">Garmin Connect</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Volume 4 sem." value="48.2" unit="h" variant="brand"
          sub={<span className="text-brand">↑ +8% vs mois préc.</span>}/>
        <StatCard label="TSS moyen / sem" value={480} unit="pts" variant="blue"
          sub={<span className="text-[var(--text-dim)]">→ Stable</span>}/>
        <StatCard label="RPE moyen" value="6.4" unit="/10" variant="orange"
          sub={<span className="text-brand">Zone optimale</span>}/>
        <StatCard label="Dérive cardiaque" value="+4.2" unit="%" variant="red"
          sub={<span className="text-[var(--text-dim)]">→ Bonne tolérance</span>}/>
      </div>

      <div className="grid grid-cols-2 gap-3.5 mb-5">

        {/* Analyse séance */}
        <Card>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-1">
            Analyse — Dernière séance vélo
          </h2>
          <p className="text-[12px] text-[var(--text-mid)] mb-4">Sweet Spot 2×20min · Hier</p>

          {[
            { label: 'Puissance normalisée', value: '247W',      pct: 82, color: 'bg-[#5b6fff]' },
            { label: 'FC moyenne',           value: '158bpm',    pct: 79, color: 'bg-[#ffb340]' },
            { label: 'Dérive cardiaque',     value: '+3.8%',     pct: 15, color: 'bg-brand'     },
            { label: 'Efficience cardiaque', value: '1.56 W/bpm',pct: 78, color: 'bg-brand'     },
          ].map((m) => (
            <div key={m.label} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text-mid)]">{m.label}</span>
                <span className="font-mono font-medium text-brand">{m.value}</span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden bg-[var(--border)]">
                <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }}/>
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 rounded-[10px] bg-[rgba(0,200,224,0.06)] border border-[rgba(0,200,224,0.15)]">
            <p className="text-[11px] font-semibold text-brand mb-1">✦ Analyse IA</p>
            <p className="text-[12px] text-[var(--text-mid)] leading-relaxed">
              Dérive cardiaque faible (+3.8%) sur puissance stable → excellente tolérance aérobie. Bonne adaptation au Sweet Spot. Continuer la progression.
            </p>
          </div>
        </Card>

        {/* Répartition sports */}
        <Card>
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)] mb-4">
            Répartition sports — 30 jours
          </h2>
          <div className="flex gap-[3px] h-[14px] rounded-full overflow-hidden mb-4">
            {SPORTS_DIST.map((s) => (
              <div key={s.label} className={`${s.color} opacity-70`} style={{ flex: s.flex }}/>
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {SPORTS_DIST.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px]">
                  <div className={`w-2 h-2 rounded-full ${s.color}`}/>
                  {s.emoji} {s.label}
                </div>
                <span className="font-mono text-[12px] text-[var(--text-mid)]">{s.hours} · {s.pct}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charge chart */}
      <Card>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-mid)]">
            Charge hebdomadaire — 8 semaines
          </h2>
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

    </div>
  )
}
