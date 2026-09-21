'use client'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useAgenda } from './useAgenda'
import { EventSheet, type SheetDraft } from './EventSheet'
import { GoogleConnectButton } from './GoogleConnect'
import { moveEvent, moveSession } from '@/lib/agenda/data'
import type { CalEvent } from '@/lib/agenda/types'

type View = 'day' | 'week' | 'month' | 'agenda'
const DAY = 86400000
const HOUR_H = 44               // px par heure
const SNAP_MIN = 15

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function mondayOf(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x }
function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * DAY) }
function sameDay(a: Date, b: Date): boolean { return a.toDateString() === b.toDateString() }
function minutesOfDay(iso: string): number { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() }

export default function PlanningWeekPage() {
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()))
  const [sheet, setSheet] = useState<{ event: CalEvent | null; draft: SheetDraft | null } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // Plage visible selon la vue
  const [rangeStart, rangeEnd] = useMemo<[Date, Date]>(() => {
    if (view === 'day') return [startOfDay(anchor), addDays(startOfDay(anchor), 1)]
    if (view === 'week') { const ms = mondayOf(anchor); return [ms, addDays(ms, 7)] }
    if (view === 'agenda') return [startOfDay(anchor), addDays(startOfDay(anchor), 30)]
    // month : grille 6 semaines depuis le lundi avant le 1er
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const gridStart = mondayOf(first)
    return [gridStart, addDays(gridStart, 42)]
  }, [view, anchor])

  const { calendars, events, refresh, toggleCalendar } = useAgenda(rangeStart.toISOString(), rangeEnd.toISOString())

  const go = (dir: -1 | 1) => {
    if (view === 'day') setAnchor(a => addDays(a, dir))
    else if (view === 'week') setAnchor(a => addDays(a, dir * 7))
    else if (view === 'agenda') setAnchor(a => addDays(a, dir * 30))
    else setAnchor(a => new Date(a.getFullYear(), a.getMonth() + dir, 1))
  }
  const today = () => setAnchor(startOfDay(new Date()))

  const title = useMemo(() => {
    if (view === 'month') return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
    if (view === 'day') return anchor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const ms = mondayOf(anchor); const me = addDays(ms, 6)
    return `${ms.getDate()} ${MONTHS[ms.getMonth()].slice(0, 4)}. – ${me.getDate()} ${MONTHS[me.getMonth()].slice(0, 4)}. ${me.getFullYear()}`
  }, [view, anchor])

  const openCreate = (start: Date, allDay = false) => {
    const end = new Date(start.getTime() + 3600000)
    setSheet({ event: null, draft: { start: start.toISOString(), end: end.toISOString(), allDay } })
  }

  const btn: React.CSSProperties = { padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ padding: 'max(16px, env(safe-area-inset-top)) 0 calc(env(safe-area-inset-bottom) + 90px)', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>Planning Week</h1>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>Agenda</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPanelOpen(p => !p)} style={btn} aria-label="Agendas">☰</button>
            <button onClick={() => openCreate(new Date(new Date().setMinutes(0, 0, 0)))} style={{ ...btn, background: 'var(--primary)', color: 'var(--on-primary,#fff)', border: 'none' }}>+ Créer</button>
          </div>
        </div>

        {/* Barre navigation + vues */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => go(-1)} style={{ ...btn, padding: '7px 11px' }}>‹</button>
            <button onClick={today} style={btn}>Aujourd'hui</button>
            <button onClick={() => go(1)} style={{ ...btn, padding: '7px 11px' }}>›</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginLeft: 6, textTransform: 'capitalize' }}>{title}</span>
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--bg-card2)', borderRadius: 9, padding: 3 }}>
            {(['day', 'week', 'month', 'agenda'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? 'var(--on-primary,#fff)' : 'var(--text-mid)' }}>
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Agenda'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau des couches */}
      {panelOpen && (
        <div style={{ margin: '0 16px 12px', padding: 14, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', margin: '0 0 10px' }}>Mes agendas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {calendars.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--text)' }}>
                <input type="checkbox" checked={c.visible} onChange={e => void toggleCalendar(c.id, e.target.checked)} />
                <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                {c.name}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <GoogleConnectButton onChange={refresh} />
          </div>
        </div>
      )}

      {/* Vues */}
      {view === 'agenda' ? (
        <AgendaView events={events} onOpen={ev => setSheet({ event: ev, draft: null })} rangeStart={rangeStart} rangeEnd={rangeEnd} />
      ) : view === 'month' ? (
        <MonthView anchor={anchor} events={events} onOpenDay={d => { setAnchor(startOfDay(d)); setView('day') }} onOpen={ev => setSheet({ event: ev, draft: null })} />
      ) : (
        <WeekView
          days={view === 'day' ? [startOfDay(anchor)] : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i))}
          events={events}
          onOpen={ev => setSheet({ event: ev, draft: null })}
          onCreate={openCreate}
          onMoved={refresh}
        />
      )}

      {sheet && (
        <EventSheet event={sheet.event} draft={sheet.draft} calendars={calendars} onClose={() => setSheet(null)} onSaved={refresh} />
      )}
    </div>
  )
}

// ── Vue Semaine / Jour (grille horaire) ─────────────────────────────────────
function WeekView({ days, events, onOpen, onCreate, onMoved }: {
  days: Date[]; events: CalEvent[]; onOpen: (e: CalEvent) => void; onCreate: (d: Date) => void; onMoved: () => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; ev: CalEvent } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // scroll initial vers ~7h
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H
  }, [])

  const timed = events.filter(e => !e.allDay)
  const allDay = events.filter(e => e.allDay)

  // Événements par jour
  const dayCol = (d: Date) => timed.filter(e => sameDay(new Date(e.start), d) || (new Date(e.start) < d && new Date(e.end) > d))

  const commitDrag = useCallback(async (clientX: number, clientY: number) => {
    if (!drag || !gridRef.current) { setDrag(null); return }
    const rect = gridRef.current.getBoundingClientRect()
    const colW = rect.width / days.length
    let dayIdx = Math.floor((clientX - rect.left) / colW)
    dayIdx = Math.max(0, Math.min(days.length - 1, dayIdx))
    const y = clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    let mins = Math.round((y / HOUR_H) * 60 / SNAP_MIN) * SNAP_MIN
    mins = Math.max(0, Math.min(24 * 60 - 15, mins))
    const newStart = new Date(days[dayIdx]); newStart.setHours(0, mins, 0, 0)
    const dur = drag.ev.durationMin ?? Math.max(15, (new Date(drag.ev.end).getTime() - new Date(drag.ev.start).getTime()) / 60000)
    try {
      if (drag.ev.source === 'session') await moveSession(drag.ev.rawId, newStart.toISOString(), dur)
      else if (drag.ev.source === 'event') await moveEvent(drag.ev.rawId, newStart.toISOString(), new Date(newStart.getTime() + dur * 60000).toISOString())
      window.dispatchEvent(new Event('thw:agenda-changed')); onMoved()
    } finally { setDrag(null) }
  }, [drag, days, onMoved])

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      {/* En-tête jours */}
      <div style={{ display: 'flex', paddingLeft: 46 }}>
        {days.map((d, i) => {
          const isToday = sameDay(d, new Date())
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderLeft: i ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>{DAY_NAMES[(d.getDay() + 6) % 7]}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', marginTop: 2, fontSize: 14, fontWeight: 700, background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? 'var(--on-primary,#fff)' : 'var(--text)' }}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* Bande all-day */}
      {allDay.length > 0 && (
        <div style={{ display: 'flex', paddingLeft: 46, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minHeight: 24, background: 'var(--bg-card2)' }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, padding: '3px 3px', borderLeft: i ? '1px solid var(--border)' : 'none', minWidth: 0 }}>
              {allDay.filter(e => new Date(e.start) <= addDays(d, 1) && new Date(e.end) >= d && (sameDay(new Date(e.start), d) || (new Date(e.start) < d && new Date(e.end) > d))).map(e => (
                <div key={e.id} onClick={() => onOpen(e)} title={e.title} style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', background: e.color, borderRadius: 5, padding: '2px 5px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{e.title}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Grille horaire scrollable */}
      <div ref={scrollRef} style={{ maxHeight: '62vh', overflowY: 'auto', position: 'relative' }}
        onPointerUp={drag ? (e => void commitDrag(e.clientX, e.clientY)) : undefined}
      >
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Colonne heures */}
          <div style={{ width: 46, flexShrink: 0 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ height: HOUR_H, position: 'relative' }}>
                <span style={{ position: 'absolute', top: -6, right: 6, fontSize: 10, color: 'var(--text-dim)' }}>{h ? `${h}h` : ''}</span>
              </div>
            ))}
          </div>
          {/* Colonnes jours */}
          <div ref={gridRef} style={{ flex: 1, display: 'flex', position: 'relative' }}>
            {/* lignes horaires */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ position: 'absolute', top: h * HOUR_H, left: 0, right: 0, height: 1, background: 'var(--border)' }} />
              ))}
            </div>
            {/* now-line */}
            {days.some(d => sameDay(d, new Date())) && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: (minutesOfDay(new Date().toISOString()) / 60) * HOUR_H, height: 2, background: '#ef4444', zIndex: 5, pointerEvents: 'none' }} />
            )}
            {days.map((d, di) => {
              const col = layoutOverlaps(dayCol(d), d)
              return (
                <div key={di} onClick={e => { if (e.target === e.currentTarget) { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const y = e.clientY - rect.top; const mins = Math.round((y / HOUR_H) * 60 / 30) * 30; const s = new Date(d); s.setHours(0, mins, 0, 0); onCreate(s) } }}
                  style={{ flex: 1, position: 'relative', borderLeft: di ? '1px solid var(--border)' : 'none', height: 24 * HOUR_H, minWidth: 0 }}>
                  {col.map(({ e, lane, lanes }) => {
                    const top = (minutesOfDay(e.start) / 60) * HOUR_H
                    const dur = e.durationMin ?? Math.max(20, (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000)
                    const h = Math.max(16, (dur / 60) * HOUR_H - 2)
                    const w = 100 / lanes
                    return (
                      <div key={e.id}
                        onClick={ev => { ev.stopPropagation(); onOpen(e) }}
                        onPointerDown={e.editable ? (() => setDrag({ id: e.id, ev: e })) : undefined}
                        title={`${e.title}${e.rpe ? ` · RPE ${e.rpe}` : ''}${e.durationMin ? ` · ${e.durationMin}min` : ''}${e.description ? `\n${e.description}` : ''}`}
                        style={{ position: 'absolute', top, left: `calc(${lane * w}% + 1px)`, width: `calc(${w}% - 2px)`, height: h, background: e.color, borderRadius: 6, padding: '2px 5px', color: '#fff', fontSize: 11, overflow: 'hidden', cursor: e.editable ? 'grab' : 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', opacity: drag?.id === e.id ? 0.5 : 1, zIndex: 2 }}>
                        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                        {h > 30 && <div style={{ fontSize: 10, opacity: 0.9 }}>{new Date(e.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{e.rpe ? ` · RPE ${e.rpe}` : ''}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Disposition des chevauchements : assigne lane/nb de lanes.
function layoutOverlaps(evs: CalEvent[], day: Date): { e: CalEvent; lane: number; lanes: number }[] {
  const items = [...evs].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  const res: { e: CalEvent; lane: number; lanes: number }[] = []
  let cluster: CalEvent[] = []
  let clusterEnd = 0
  const flush = () => {
    const lanesEnd: number[] = []
    const assign = cluster.map(e => {
      const s = Math.max(new Date(e.start).getTime(), startOfDay(day).getTime())
      let lane = lanesEnd.findIndex(end => end <= s)
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0) }
      lanesEnd[lane] = new Date(e.end).getTime()
      return { e, lane }
    })
    const lanes = Math.max(1, lanesEnd.length)
    for (const a of assign) res.push({ e: a.e, lane: a.lane, lanes })
    cluster = []; clusterEnd = 0
  }
  for (const e of items) {
    const s = new Date(e.start).getTime()
    if (cluster.length && s >= clusterEnd) flush()
    cluster.push(e); clusterEnd = Math.max(clusterEnd, new Date(e.end).getTime())
  }
  if (cluster.length) flush()
  return res
}

// ── Vue Mois ────────────────────────────────────────────────────────────────
function MonthView({ anchor, events, onOpenDay, onOpen }: { anchor: Date; events: CalEvent[]; onOpenDay: (d: Date) => void; onOpen: (e: CalEvent) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const gridStart = mondayOf(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const evByDay = (d: Date) => events.filter(e => sameDay(new Date(e.start), d) || (new Date(e.start) <= d && new Date(e.end) >= d))
  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
        {DAY_NAMES.map(d => <div key={d} style={{ padding: '6px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>{d}</div>)}
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === anchor.getMonth()
          const isToday = sameDay(d, new Date())
          const evs = evByDay(d).slice(0, 4)
          return (
            <div key={i} onClick={() => onOpenDay(d)} style={{ minHeight: 78, padding: 4, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: inMonth ? 'transparent' : 'var(--bg-card2)', cursor: 'pointer', overflow: 'hidden' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700, background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? 'var(--on-primary,#fff)' : inMonth ? 'var(--text)' : 'var(--text-dim)' }}>{d.getDate()}</div>
              {evs.map(e => (
                <div key={e.id} onClick={ev => { ev.stopPropagation(); onOpen(e) }} title={e.title} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 10.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vue Agenda (liste) ───────────────────────────────────────────────────────
function AgendaView({ events, onOpen, rangeStart, rangeEnd }: { events: CalEvent[]; onOpen: (e: CalEvent) => void; rangeStart: Date; rangeEnd: Date }) {
  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    for (const e of sorted) {
      const k = new Date(e.start).toDateString()
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return map
  }, [events])

  const days: Date[] = []
  for (let d = new Date(rangeStart); d < rangeEnd; d = addDays(d, 1)) if (byDay.has(d.toDateString())) days.push(new Date(d))

  if (days.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>Rien de prévu sur cette période.</div>

  return (
    <div style={{ padding: '4px 16px' }}>
      {days.map(d => (
        <div key={d.toDateString()} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 54, flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>{DAY_NAMES[(d.getDay() + 6) % 7]}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: sameDay(d, new Date()) ? 'var(--primary)' : 'var(--text)' }}>{d.getDate()}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(byDay.get(d.toDateString()) ?? []).map(e => (
              <div key={e.id} onClick={() => onOpen(e)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: e.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)', width: 76, flexShrink: 0 }}>{e.allDay ? 'Toute la journée' : new Date(e.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                {e.rpe != null && <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>RPE {e.rpe}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
