'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Race, RaceStage, RACE_CFG, MONTHS, getDaysInMonth, getFirstDayISO } from './types'
import GpxRouteMap from '@/components/gpx/GpxRouteMap'

// ── Stage day popover ─────────────────────────────────────────
interface PopoverState { stage: RaceStage; date: string; x: number; y: number }

function StageDayPopover({ stage, date, x, y, onClose, onMouseEnter, onMouseLeave }: PopoverState & { onClose: () => void; onMouseEnter: () => void; onMouseLeave: () => void }) {
  const supabase = createClient()
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileUrl,  setFileUrl]  = useState<string | null>(null)
  const [fetched,  setFetched]  = useState(false)

  const program  = stage.dailyProgram.find(p => p.date === date)?.content ?? ''
  const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    supabase
      .from('race_event_files')
      .select('file_url, file_name')
      .eq('event_id', stage.id)
      .eq('event_date', date)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as { file_url: string; file_name: string }
          setFileName(d.file_name)
          setFileUrl(d.file_url)
        }
        setFetched(true)
      })
  }, [stage.id, date]) // eslint-disable-line react-hooks/exhaustive-deps

  // Position near cursor, prefer above if in bottom half of screen
  const W = 320
  const vw = typeof window !== 'undefined' ? window.innerWidth  : 800
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600
  const above = y > vh * 0.55
  const left  = Math.min(x + 12, vw - W - 8)
  const top   = above ? Math.max(y - 280, 8) : Math.min(y + 10, vh - 280)

  const isGpx = !!fileName?.toLowerCase().endsWith('.gpx')

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:490 }} />
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position:'fixed', left, top, zIndex:491,
          width:W, background:'var(--bg-card)',
          border:'1px solid var(--border)', borderRadius:12,
          padding:12, boxShadow:'0 8px 32px rgba(0,0,0,0.45)',
          pointerEvents:'auto',
        }}
      >
        <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#3b82f6',margin:'0 0 2px' }}>
          {stage.name}
        </p>
        <p style={{ fontSize:12,fontWeight:600,color:'var(--text)',margin:'0 0 8px',textTransform:'capitalize' }}>
          {dayLabel}
        </p>

        {fetched && fileUrl && isGpx && (
          <div style={{ marginBottom:8 }}>
            <GpxRouteMap fileUrl={fileUrl} height={150} />
          </div>
        )}

        {fetched && fileName && !isGpx && fileUrl && (
          <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,background:'var(--bg-card2)',marginBottom:8 }}>
            <span style={{ fontSize:12 }}>📄</span>
            <span style={{ fontSize:10,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{fileName}</span>
          </div>
        )}

        {program ? (
          <p style={{ fontSize:11,color:'var(--text-mid)',margin:0,lineHeight:1.5,whiteSpace:'pre-wrap',maxHeight:80,overflow:'hidden' }}>
            {program}
          </p>
        ) : (
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,fontStyle:'italic' }}>
            Pas de programme renseigné
          </p>
        )}
      </div>
    </>
  )
}

// ── MonthlyView ───────────────────────────────────────────────
interface Props {
  races: Race[]
  stages: RaceStage[]
  year: number
  initialMonth?: number
  onRaceClick: (race: Race) => void
  onStageClick?: (stage: RaceStage) => void
  onStageDayClick?: (stage: RaceStage, date: string) => void
  onDayClick?: (date: string) => void
}

export default function MonthlyView({ races, stages, year, initialMonth, onRaceClick, onStageClick, onStageDayClick, onDayClick }: Props) {
  const [month, setMonth] = useState(initialMonth ?? new Date().getMonth())
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const daysInMonth  = getDaysInMonth(year, month)
  const firstDayISO  = getFirstDayISO(year, month)
  const today        = new Date().toISOString().split('T')[0]

  function racesForDay(day: number) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return races.filter(r => r.date === ds)
  }

  function stagesForDay(day: number) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return stages.filter(s => s.startDate <= ds && s.endDate >= ds)
  }

  function scheduleHide() {
    hideTimer.current = setTimeout(() => setPopover(null), 300)
  }
  function cancelHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }

  const prevMonth = () => setMonth(m => m === 0 ? 11 : m - 1)
  const nextMonth = () => setMonth(m => m === 11 ? 0 : m + 1)

  return (
    <>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-card)',
      }}>
        {/* Header nav */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <button onClick={prevMonth} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 11px',cursor:'pointer',color:'var(--text-mid)',fontSize:13 }}>←</button>
            <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0 }}>
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 11px',cursor:'pointer',color:'var(--text-mid)',fontSize:13 }}>→</button>
          </div>
        </div>

        {/* Day headers */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:2,marginBottom:4 }}>
          {['L','M','M','J','V','S','D'].map((d, i) => (
            <div key={i} style={{ textAlign:'center',fontSize:9,fontWeight:600,color:'var(--text-dim)',padding:'3px 0' }}>{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:2 }}>
          {/* Leading empty cells */}
          {Array.from({ length: firstDayISO - 1 }, (_, i) => (
            <div key={`e${i}`} style={{ minHeight:72,borderRadius:7,background:'var(--bg-card2)',opacity:0.3 }} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const ds  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dr  = racesForDay(day)
            const ds2 = stagesForDay(day)
            const isToday = ds === today

            return (
              <div
                key={day}
                onClick={() => onDayClick?.(ds)}
                style={{
                  minHeight:72,borderRadius:7,background:'var(--bg-card2)',
                  border:`1px solid ${isToday ? '#00c8e0' : 'var(--border)'}`,
                  padding:'3px 4px',display:'flex',flexDirection:'column' as const,gap:1,
                  cursor: onDayClick ? 'pointer' : 'default',
                }}
              >
                <p style={{ fontSize:10,fontWeight:isToday?700:500,color:isToday?'#00c8e0':'var(--text-mid)',margin:0,textAlign:'right' as const }}>
                  {day}
                </p>

                {/* Race pills */}
                {dr.map(r => {
                  const cfg = RACE_CFG[r.level]
                  return (
                    <div
                      key={r.id}
                      onClick={e => { e.stopPropagation(); onRaceClick(r) }}
                      style={{
                        height: 24, borderRadius: 6, padding: '0 8px',
                        display: 'flex', alignItems: 'center',
                        cursor: 'pointer',
                        background: r.status === 'completed' ? 'var(--bg-card)' : `${cfg.color}26`,
                        borderLeft: `3px solid ${r.status === 'completed' ? 'var(--text-dim)' : cfg.color}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        opacity: r.status === 'completed' ? 0.6 : 1,
                        overflow: 'hidden', minWidth: 0,
                      }}
                    >
                      <p style={{ fontSize:11, fontWeight:500, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, color: r.status === 'completed' ? 'var(--text-dim)' : (r.level === 'gty' ? 'var(--gty-text)' : cfg.color) }}>
                        {r.status === 'completed' ? '✓ ' : ''}{r.name}
                      </p>
                    </div>
                  )
                })}

                {/* Stage pills */}
                {ds2.map(s => (
                  <div
                    key={s.id}
                    onClick={e => {
                      e.stopPropagation()
                      cancelHide()
                      setPopover(null)
                      if (onStageDayClick) {
                        onStageDayClick(s, ds)
                      } else {
                        onStageClick?.(s)
                      }
                    }}
                    onMouseEnter={e => {
                      cancelHide()
                      setPopover({ stage: s, date: ds, x: e.clientX, y: e.clientY })
                    }}
                    onMouseLeave={() => scheduleHide()}
                    style={{
                      height: 24, borderRadius: 6, padding: '0 8px',
                      display: 'flex', alignItems: 'center',
                      background: 'rgba(59,130,246,0.12)',
                      borderLeft: '3px solid #3b82f6',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      overflow: 'hidden', minWidth: 0,
                    }}
                  >
                    <p style={{ fontSize:11, fontWeight:500, margin:0, color:'#3b82f6', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                      {s.name}
                    </p>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage day popover */}
      {popover && (
        <StageDayPopover
          {...popover}
          onClose={() => { cancelHide(); setPopover(null) }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </>
  )
}
