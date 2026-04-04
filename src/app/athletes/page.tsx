import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const ATHLETES = [
  {
    initial: 'M',
    name: 'Marie D.',
    sport: 'Triathlon · 32 ans',
    goal: '🏆 Ironman 70.3',
    goalVariant: 'blue',
    week: 'S12',
    ctl: 72,
    ctlColor: 'bg-brand',
    next: 'Natation 06h00',
    online: true,
    avatarColor: 'bg-[rgba(0,200,224,0.15)] text-brand',
  },
  {
    initial: 'A',
    name: 'Alex R.',
    sport: 'Hyrox · Running · 28 ans',
    goal: '🏋️ Hyrox World',
    goalVariant: 'orange',
    week: 'S12',
    ctl: 91,
    ctlColor: 'bg-[#5b6fff]',
    next: 'Hyrox Sim 18h00',
    online: false,
    avatarColor: 'bg-[rgba(91,111,255,0.15)] text-[#5b6fff]',
  },
  {
    initial: 'S',
    name: 'Sophie M.',
    sport: 'Running · Cyclisme · 35 ans',
    goal: '🏃 Marathon Paris',
    goalVariant: 'brand',
    week: 'S8',
    ctl: 58,
    ctlColor: 'bg-[#ff5f5f]',
    next: 'Tempo Z3 17h00',
    online: false,
    avatarColor: 'bg-[rgba(255,95,95,0.15)] text-[#ff5f5f]',
  },
]

export default function AthletesPage() {
  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-[27px] font-bold tracking-[-0.03em]">Mes athlètes</h1>
          <p className="text-[12.5px] text-[var(--text-dim)] mt-1">Suivi · Coaching · Planification</p>
        </div>
        <Button variant="primary">+ Ajouter un athlète</Button>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {ATHLETES.map((a) => (
          <Card key={a.name} className="cursor-pointer hover:border-brand transition-all">

            {/* Avatar + nom */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-11 h-11 rounded-[12px] flex items-center justify-center',
                'font-display text-[18px] font-bold flex-shrink-0',
                a.avatarColor
              )}>
                {a.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold">{a.name}</p>
                <p className="text-[11px] text-[var(--text-dim)]">{a.sport}</p>
              </div>
              {a.online && (
                <span className="w-2 h-2 rounded-full bg-brand shadow-brand-sm flex-shrink-0"/>
              )}
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap mb-3">
              <Badge variant={a.goalVariant as any}>{a.goal}</Badge>
              <Badge variant="blue">{a.week}</Badge>
            </div>

            {/* CTL bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text-mid)]">CTL</span>
                <span className="font-mono font-medium">{a.ctl}</span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden bg-[var(--border)]">
                <div className={`h-full rounded-full ${a.ctlColor}`} style={{ width: `${a.ctl}%` }}/>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-dim)]">
              Prochaine : {a.next}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
