'use client'
import { useEffect, useState } from 'react'

interface Props { config: Record<string, unknown> }

function WeeklyCalendar({ config }: { config: Record<string, unknown> }) {
  const days = config.days as string[]
  const sessions = config.sessions as Array<{ day: number; color: string; label: string; duration: string }>
  const sessionMap = new Map(sessions.map(s => [s.day, s]))
  return (
    <div style={{ padding: '20px 16px', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{d}</span>
            {sessionMap.has(i) ? (
              <div style={{ width: '100%', borderRadius: 8, padding: '6px 4px', background: `${sessionMap.get(i)!.color}22`, border: `1px solid ${sessionMap.get(i)!.color}55`, textAlign: 'center', opacity: 0, animation: `stagger-in 400ms ${i * 80}ms forwards` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: sessionMap.get(i)!.color, margin: '0 auto 2px' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', display: 'block' }}>{sessionMap.get(i)!.duration}</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthCalendar() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  const colors = ['#06B6D4', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444']
  const dots: Record<number, string> = { 2: colors[0], 5: colors[1], 8: colors[2], 12: colors[0], 15: colors[3], 18: colors[1], 21: colors[4], 24: colors[0], 26: colors[2] }
  return (
    <div style={{ padding: '16px', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['L','M','M','J','V','S','D'].map(d => <span key={d} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>{d}</span>)}
        {days.map(d => (
          <div key={d} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: d === 14 ? 'rgba(6,182,212,0.2)' : 'transparent', border: d === 14 ? '1px solid rgba(6,182,212,0.4)' : 'none' }}>
            <span style={{ fontSize: 10, color: d === 14 ? '#06B6D4' : 'rgba(255,255,255,0.6)' }}>{d}</span>
            {dots[d] && <div style={{ width: 4, height: 4, borderRadius: '50%', background: dots[d], marginTop: 1 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionList({ config }: { config: Record<string, unknown> }) {
  const sessions = config.sessions as Array<{ name: string; sport: string; duration: string; color: string }>
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {sessions.map((s, i) => (
        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', opacity: 0, animation: `count-up 350ms ${i * 120}ms ease forwards` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{s.name}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{s.sport} · {s.duration}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ZoneBars({ config }: { config: Record<string, unknown> }) {
  const zones = config.zones as Array<{ name: string; percent: number; color: string }>
  return (
    <div style={{ padding: '16px 20px', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {zones.map((z, i) => (
        <div key={z.name} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0, animation: `count-up 350ms ${i * 100}ms ease forwards` }}>
          <span style={{ fontSize: 11, color: z.color, width: 20, fontWeight: 700 }}>{z.name}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${z.percent}%`, background: z.color, borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 28, textAlign: 'right' }}>{z.percent}%</span>
        </div>
      ))}
    </div>
  )
}

function DonutRings({ config }: { config: Record<string, unknown> }) {
  const rings = config.rings as Array<{ label: string; percent: number; color: string }>
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t) }, [])
  const r = 28, cx = 120, cy = 110, gap = 18
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="240" height="220" viewBox="0 0 240 220">
        {rings.map(({ color, percent }, i) => {
          const radius = r + i * gap
          const circ = 2 * Math.PI * radius
          const dash = visible ? (percent / 100) * circ : 0
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
              <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} style={{ transition: `stroke-dasharray 1.2s ${i * 200}ms ease` }} transform={`rotate(-90 ${cx} ${cy})`} />
            </g>
          )
        })}
        {rings.map(({ label, color, percent }, i) => (
          <text key={label} x={cx + 12 + (r + i * gap)} y={cy + 4} fill={color} fontSize={10} fontFamily="DM Sans, sans-serif">{percent}% {label}</text>
        ))}
      </svg>
    </div>
  )
}

function ActivityList({ config }: { config: Record<string, unknown> }) {
  const activities = config.activities as Array<{ sport: string; title: string; distance: string; duration: string; color: string }>
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {activities.map((a, i) => (
        <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', opacity: 0, animation: `count-up 350ms ${i * 120}ms ease forwards` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{a.title}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{a.sport} · {a.distance} · {a.duration}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MockupVisual({ config }: Props) {
  const type = config.type as string
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {type === 'weekly_calendar' && <WeeklyCalendar config={config} />}
      {type === 'month_calendar' && <MonthCalendar />}
      {type === 'session_list' && <SessionList config={config} />}
      {type === 'zone_bars' && <ZoneBars config={config} />}
      {type === 'donut_rings' && <DonutRings config={config} />}
      {type === 'activity_list' && <ActivityList config={config} />}
    </div>
  )
}
