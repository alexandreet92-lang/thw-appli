'use client'
import { useState, useEffect, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'

const MONTHS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
const DOW    = ['L','M','M','J','V','S','D']

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
function status(kcal: number, target: number): 'complete' | 'partial' | 'none' {
  if (!kcal) return 'none'
  return kcal / (target || 2000) >= 0.85 ? 'complete' : 'partial'
}

const SC = {
  complete: { bg: 'rgba(16,185,129,0.20)', color: '#10B981' },
  partial:  { bg: 'rgba(245,158,11,0.20)', color: '#F59E0B' },
  none:     { bg: 'transparent',           color: 'var(--text-dim)' },
}

const navBtnStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-card2)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--text)',
}

interface Props {
  targetKcal:  number
  onDayClick?: (date: string) => void
}

export default function CalendarView({ targetKcal, onDayClick }: Props) {
  const now = new Date()
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth())
  const [byDate, setByDate] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const first = iso(year, month, 1)
    const last  = iso(year, month, new Date(year, month + 1, 0).getDate())

    const [{ data: ml }, { data: dl }] = await Promise.all([
      supabase.from('nutrition_meal_logs').select('date, actual_kcal')
        .eq('user_id', session.user.id).is('plan_id', null)
        .not('actual_kcal', 'is', null).gte('date', first).lte('date', last),
      supabase.from('nutrition_daily_logs').select('date, kcal_consommees')
        .eq('user_id', session.user.id).gte('date', first).lte('date', last),
    ])

    const acc: Record<string, number> = {}
    dl?.forEach(l => { if (l.date) acc[l.date] = (acc[l.date] ?? 0) + (l.kcal_consommees ?? 0) })
    ml?.forEach(l => { if (l.date) acc[l.date] = (acc[l.date] ?? 0) + (l.actual_kcal     ?? 0) })
    setByDate(acc)
  }, [year, month])

  useEffect(() => { void load() }, [load])

  function nav(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const todayISO  = now.toISOString().split('T')[0]
  const firstDow  = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMon = new Date(year, month + 1, 0).getDate()
  const cells = Array.from(
    { length: Math.ceil((firstDow + daysInMon) / 7) * 7 },
    (_, i) => { const d = i - firstDow + 1; return d >= 1 && d <= daysInMon ? d : null }
  )

  return (
    <div style={{ marginTop: 16 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button style={navBtnStyle} onClick={() => nav(-1)}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
          {MONTHS[month]} {year}
        </span>
        <button style={{ ...navBtnStyle, opacity: (year > now.getFullYear() || isCurrentMonth) ? 0.3 : 1, cursor: (year > now.getFullYear() || isCurrentMonth) ? 'default' : 'pointer' }}
          onClick={() => { if (!isCurrentMonth) nav(1) }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* DOW header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, fontFamily: 'DM Sans,sans-serif', paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateISO  = iso(year, month, day)
          const kcal     = byDate[dateISO] ?? 0
          const st       = status(kcal, targetKcal)
          const isToday  = dateISO === todayISO
          const isFuture = dateISO > todayISO
          const { bg, color } = SC[st]
          return (
            <div key={i}
              onClick={() => { if (!isFuture) onDayClick?.(dateISO) }}
              style={{
                aspectRatio: '1', borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                background: bg, color,
                cursor: isFuture ? 'default' : 'pointer',
                opacity: isFuture ? 0.3 : 1,
                outline: isToday ? '1.5px solid #00c8e0' : 'none',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!isFuture) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = bg }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{day}</span>
              {kcal > 0 && (
                <span style={{ fontSize: 9, opacity: 0.75, lineHeight: 1 }}>
                  {kcal > 999 ? `${(kcal / 1000).toFixed(1)}k` : kcal}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {([
          { color: '#10B981',           label: 'Objectif atteint' },
          { color: '#F59E0B',           label: 'Partiel'          },
          { color: 'var(--text-dim)',   label: 'Pas de donnees'   },
        ] as const).map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
