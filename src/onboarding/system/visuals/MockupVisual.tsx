'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props { config: Record<string, unknown> }

function WeeklyGrid() {
  const { t } = useI18n()
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const sessions: Record<number, { color: string; label: string; duration: string }> = {
    0: { color: '#06B6D4', label: 'Vélo', duration: '1h30' },
    1: { color: '#10B981', label: 'Muscu', duration: '1h' },
    3: { color: '#8B5CF6', label: 'Running', duration: '45min' },
    5: { color: '#F59E0B', label: 'Trail', duration: '2h' },
  }
  return (
    <div style={{ padding: '20px 16px', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{t('onboarding.dayShort' + (i + 1))}</span>
            {sessions[i] ? (
              <div style={{ width: '100%', borderRadius: 8, padding: '6px 4px', background: `${sessions[i].color}22`, border: `1px solid ${sessions[i].color}55`, textAlign: 'center', opacity: 0, animation: `stagger-in 400ms ${i * 80}ms forwards` }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: sessions[i].color, margin: '0 auto 2px' }} />
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', display: 'block' }}>{sessions[i].duration}</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PlannedVsDone() {
  const { t } = useI18n()
  const rows = [
    { sport: t('onboarding.g.sports.cycling'), color: '#06B6D4', planned: '1h30', done: '1h42', status: t('onboarding.statusCompleted'), statusColor: '#10B981' },
    { sport: t('onboarding.g.sports.strength'), color: '#8B5CF6', planned: '1h', done: '55min', status: t('onboarding.statusModified'), statusColor: '#F59E0B' },
    { sport: t('onboarding.g.sports.running'), color: '#10B981', planned: '45min', done: '—', status: t('onboarding.statusMissed'), statusColor: '#EF4444' },
  ]
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 4 }}>
        {[t('onboarding.colSport'), t('onboarding.planned'), t('onboarding.done'), t('onboarding.colStatus')].map(h => (
          <span key={h} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={r.sport} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 8px', opacity: 0, animation: `count-up 350ms ${i * 120}ms ease forwards` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
            <span style={{ fontSize: 11, color: '#fff' }}>{r.sport}</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{r.planned}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{r.done}</span>
          <span style={{ fontSize: 10, color: r.statusColor, fontWeight: 600 }}>{r.status}</span>
        </div>
      ))}
    </div>
  )
}

function SessionLibraryList() {
  const { t } = useI18n()
  const items = [
    { name: t('onboarding.sessionLib1'), sport: t('onboarding.g.sports.cycling'), duration: '2h', color: '#06B6D4' },
    { name: t('onboarding.sessionLib2'), sport: t('onboarding.g.sports.running'), duration: '1h', color: '#10B981' },
    { name: t('onboarding.sessionLib3'), sport: t('onboarding.g.sports.strength'), duration: '1h15', color: '#8B5CF6' },
    { name: t('onboarding.sessionLib4'), sport: t('onboarding.g.sports.trail'), duration: '1h30', color: '#F59E0B' },
  ]
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        {[t('onboarding.filterAll'), t('onboarding.g.sports.cycling'), t('onboarding.g.sports.running'), t('onboarding.g.sports.strength')].map((f, i) => (
          <div key={f} style={{ padding: '3px 10px', borderRadius: 12, background: i === 0 ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${i === 0 ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
            <span style={{ fontSize: 10, color: i === 0 ? '#06B6D4' : 'rgba(255,255,255,0.5)' }}>{f}</span>
          </div>
        ))}
      </div>
      {items.map((s, i) => (
        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px', opacity: 0, animation: `count-up 350ms ${i * 100}ms ease forwards` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.sport} · {s.duration}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function LiveWorkout() {
  const { t } = useI18n()
  return (
    <div style={{ padding: '16px', width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{t('onboarding.benchPress')}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>{t('onboarding.liveSetInfo')}</p>
          </div>
          <div style={{ background: 'rgba(139,92,246,0.3)', borderRadius: 8, padding: '4px 10px' }}>
            <span style={{ fontSize: 12, color: '#A78BFA', fontWeight: 600 }}>{t('onboarding.inProgress')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= 3 ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{t('onboarding.rest')}</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#06B6D4', fontFamily: 'DM Mono, monospace' }}>1:30</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('onboarding.next')}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{t('onboarding.liveNextInfo')}</p>
      </div>
    </div>
  )
}

function ActivityFeed() {
  const { t } = useI18n()
  const items = [
    { title: t('onboarding.feed1'), sport: t('onboarding.g.sports.cycling'), distance: '65km', duration: '2h18', color: '#06B6D4' },
    { title: t('onboarding.feed2'), sport: t('onboarding.g.sports.running'), distance: '12km', duration: '58min', color: '#10B981' },
    { title: t('onboarding.feed3'), sport: t('onboarding.g.sports.trail'), distance: '22km', duration: '3h05', color: '#F59E0B' },
  ]
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {items.map((a, i) => (
        <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', opacity: 0, animation: `count-up 350ms ${i * 120}ms ease forwards` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{a.title}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{a.sport} · {a.distance} · {a.duration}</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </div>
      ))}
    </div>
  )
}

function SegmentLeaderboard() {
  const { t } = useI18n()
  const rows = [
    { pos: 1, name: 'Nicolas M.', time: '4:12', gap: '—', highlight: false },
    { pos: 2, name: 'Thomas B.', time: '4:18', gap: '+6s', highlight: false },
    { pos: 3, name: t('onboarding.you'), time: '4:31', gap: '+19s', highlight: true },
    { pos: 4, name: 'Alex D.', time: '4:45', gap: '+33s', highlight: false },
  ]
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('onboarding.segmentName')}</p>
      {rows.map((r, i) => (
        <div key={r.pos} style={{ display: 'flex', alignItems: 'center', gap: 10, background: r.highlight ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${r.highlight ? 'rgba(6,182,212,0.3)' : 'transparent'}`, borderRadius: 8, padding: '8px 12px', opacity: 0, animation: `count-up 350ms ${i * 100}ms ease forwards` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: r.pos <= 1 ? '#F59E0B' : r.highlight ? '#06B6D4' : 'rgba(255,255,255,0.4)', width: 16 }}>{r.pos}</span>
          <span style={{ flex: 1, fontSize: 12, color: r.highlight ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: r.highlight ? 700 : 400 }}>{r.name}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Mono, monospace' }}>{r.time}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 30, textAlign: 'right' }}>{r.gap}</span>
        </div>
      ))}
    </div>
  )
}

function SwipeDelete() {
  const { t } = useI18n()
  return (
    <div style={{ padding: '20px 16px', width: '100%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{ width: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 70, background: '#EF4444', borderRadius: '0 10px 10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20 }}>🗑</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', marginRight: 50, position: 'relative', animation: 'count-up 500ms ease forwards', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4' }} />
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{t('onboarding.swipeItemTitle')}</p>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 16px' }}>{t('onboarding.yesterday')} · 2h18</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>← {t('onboarding.swipe')}</span>
        <svg width="30" height="12" viewBox="0 0 30 12" fill="none"><path d="M25 6H5M5 6l5-4M5 6l5 4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
    </div>
  )
}

function NutritionRings() {
  const { t } = useI18n()
  const rings = [
    { label: t('onboarding.macroCalories'), percent: 72, color: '#06B6D4' },
    { label: t('onboarding.macroProtein'), percent: 85, color: '#10B981' },
    { label: t('onboarding.macroCarbs'), percent: 60, color: '#F59E0B' },
    { label: t('onboarding.macroFat'), percent: 55, color: '#8B5CF6' },
  ]
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t) }, [])
  const cx = 120, cy = 100, r = 24, gap = 18
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="240" height="200" viewBox="0 0 240 200">
        {rings.map(({ color, percent }, i) => {
          const radius = r + i * gap
          const circ = 2 * Math.PI * radius
          const dash = visible ? (percent / 100) * circ : 0
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={circ * 0.25}
                style={{ transition: `stroke-dasharray 1.2s ${i * 180}ms ease` }}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            </g>
          )
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={18} fontWeight="800" fontFamily="DM Mono">1840</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={9} fontFamily="DM Sans">/ 2000 kcal</text>
        {rings.map(({ label, color, percent }, i) => (
          <text key={label} x={cx + 16 + (r + i * gap)} y={cy + 4} fill={color} fontSize={9} fontFamily="DM Sans">{percent}% {label}</text>
        ))}
      </svg>
    </div>
  )
}

function MealSlots() {
  const { t } = useI18n()
  const meals = [
    { name: t('onboarding.mealBreakfast'), time: '07:30', cal: 520, color: '#F59E0B', filled: true },
    { name: t('onboarding.mealMorningSnack'), time: '10:00', cal: 180, color: '#06B6D4', filled: true },
    { name: t('onboarding.mealLunch'), time: '12:30', cal: 680, color: '#10B981', filled: true },
    { name: t('onboarding.mealSnack'), time: '16:00', cal: 0, color: 'rgba(255,255,255,0.15)', filled: false },
    { name: t('onboarding.mealDinner'), time: '19:30', cal: 0, color: 'rgba(255,255,255,0.15)', filled: false },
  ]
  return (
    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {meals.map((m, i) => (
        <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px', opacity: 0, animation: `count-up 300ms ${i * 90}ms ease forwards` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, color: m.filled ? '#fff' : 'rgba(255,255,255,0.35)' }}>{m.name}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{m.time}</span>
          {m.filled && <span style={{ fontSize: 11, color: m.color, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{m.cal} kcal</span>}
          {!m.filled && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>+ {t('onboarding.add')}</span>}
        </div>
      ))}
    </div>
  )
}

function StravaSyncFlow() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(252,76,2,0.15)', border: '1.5px solid rgba(252,76,2,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'stagger-in 400ms 0ms both' }}>
            <span style={{ fontSize: 22 }}>🟠</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Strava</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 40, height: 1.5, background: 'linear-gradient(90deg,rgba(252,76,2,0.5),rgba(6,182,212,0.5))', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>→</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>←</span>
            <div style={{ width: 40, height: 1.5, background: 'linear-gradient(90deg,rgba(6,182,212,0.5),rgba(252,76,2,0.5))', borderRadius: 1 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(6,182,212,0.15)', border: '1.5px solid rgba(6,182,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'stagger-in 400ms 200ms both' }}>
            <span style={{ fontSize: 22 }}>⚡</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>THW</span>
        </div>
      </div>
    </div>
  )
}

function ZoneDistribution() {
  const zones = [
    { name: 'Z1', percent: 38, color: '#10B981' },
    { name: 'Z2', percent: 28, color: '#06B6D4' },
    { name: 'Z3', percent: 18, color: '#F59E0B' },
    { name: 'Z4', percent: 12, color: '#EF4444' },
    { name: 'Z5', percent: 4,  color: '#8B5CF6' },
  ]
  return (
    <div style={{ padding: '16px 20px', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {zones.map((z, i) => (
        <div key={z.name} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0, animation: `count-up 350ms ${i * 100}ms ease forwards` }}>
          <span style={{ fontSize: 11, color: z.color, width: 20, fontWeight: 700 }}>{z.name}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${z.percent}%`, background: z.color, borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 28, textAlign: 'right' }}>{z.percent}%</span>
        </div>
      ))}
    </div>
  )
}

function MonthGrid() {
  const { t } = useI18n()
  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const dots: Record<number, string> = { 2: '#06B6D4', 5: '#10B981', 7: '#06B6D4', 10: '#8B5CF6', 12: '#F59E0B', 14: '#06B6D4', 17: '#10B981', 19: '#06B6D4', 21: '#EF4444', 24: '#F59E0B', 26: '#06B6D4', 28: '#10B981' }
  return (
    <div style={{ padding: '14px', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {[1,2,3,4,5,6,7].map(n => <span key={'hdr-' + n} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>{t('onboarding.dayShort' + n)}</span>)}
        {days.map(d => (
          <div key={d} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 5, background: d === 15 ? 'rgba(6,182,212,0.2)' : 'transparent', border: d === 15 ? '1px solid rgba(6,182,212,0.4)' : 'none' }}>
            <span style={{ fontSize: 9, color: d === 15 ? '#06B6D4' : 'rgba(255,255,255,0.6)' }}>{d}</span>
            {dots[d] && <div style={{ width: 3, height: 3, borderRadius: '50%', background: dots[d], marginTop: 1 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayDetail() {
  const { t } = useI18n()
  const items = [
    { label: t('onboarding.dayItem1'), type: t('onboarding.statusPlanned'), duration: '1h30', color: '#06B6D4', done: true },
    { label: t('onboarding.dayItem2'), type: t('onboarding.statusPlanned'), duration: '1h', color: '#8B5CF6', done: false },
  ]
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.2)', border: '1.5px solid rgba(6,182,212,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: '#06B6D4', fontWeight: 700 }}>15</span>
        </div>
        <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{t('onboarding.dayDetailDate')}</span>
      </div>
      {items.map((it, i) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px', opacity: 0, animation: `count-up 350ms ${i * 120}ms ease forwards`, borderLeft: `2.5px solid ${it.color}` }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: it.done ? '#fff' : 'rgba(255,255,255,0.6)', margin: 0 }}>{it.label}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{it.type} · {it.duration}</p>
          </div>
          {it.done && <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#10B981' }}>✓</span>
          </div>}
        </div>
      ))}
    </div>
  )
}

export function MockupVisual({ config }: Props) {
  const type = config.type as string
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {(type === 'weekly_grid' || type === 'weekly_calendar') && <WeeklyGrid />}
      {type === 'planned_vs_done' && <PlannedVsDone />}
      {type === 'session_library_list' && <SessionLibraryList />}
      {type === 'live_workout' && <LiveWorkout />}
      {type === 'activity_feed' && <ActivityFeed />}
      {type === 'segment_leaderboard' && <SegmentLeaderboard />}
      {type === 'swipe_delete' && <SwipeDelete />}
      {type === 'nutrition_rings' && <NutritionRings />}
      {type === 'meal_slots' && <MealSlots />}
      {type === 'strava_sync_flow' && <StravaSyncFlow />}
      {type === 'zone_distribution' && <ZoneDistribution />}
      {type === 'month_grid' && <MonthGrid />}
      {type === 'day_detail' && <DayDetail />}
      {type === 'month_calendar' && <MonthGrid />}
      {type === 'zone_bars' && <ZoneDistribution />}
      {type === 'donut_rings' && <NutritionRings />}
    </div>
  )
}
