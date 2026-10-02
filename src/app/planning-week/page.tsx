'use client'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useAgenda } from './useAgenda'
import { EventSheet, type SheetDraft } from './EventSheet'
import { GoogleConnectButton } from './GoogleConnect'
import { moveEvent, moveSession } from '@/lib/agenda/data'
import type { CalEvent } from '@/lib/agenda/types'
import { useNarrow } from '@/lib/hooks/useNarrow'

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
function isoWeek(d: Date): number { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7) }
function minutesOfDay(iso: string): number { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() }

export default function PlanningWeekPage() {
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()))
  const [sheet, setSheet] = useState<{ event: CalEvent | null; draft: SheetDraft | null } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  // Mobile, vue Mois : jour sélectionné (sa liste s'affiche sous la grille).
  const [selDay, setSelDay] = useState<Date | null>(null)
  const narrow = useNarrow(720)
  const isMobile = useNarrow(767)
  const px = narrow ? 16 : 32   // padding horizontal de contenu (DESIGN_SYSTEM §3)

  // Sur mobile, la vue par défaut est « Mois » (façon Google Agenda). Appliqué
  // une seule fois au premier passage en mode mobile pour ne pas forcer ensuite.
  const didInitView = useRef(false)
  useEffect(() => {
    if (didInitView.current) return
    if (isMobile) { setView('month'); didInitView.current = true }
  }, [isMobile])

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

  const openCreate = (start: Date, end?: Date | null, allDay = false) => {
    const e = end ?? new Date(start.getTime() + 3600000)
    setSheet({ event: null, draft: { start: start.toISOString(), end: e.toISOString(), allDay } })
  }

  // ── MOBILE : cartes façon Strava (maquette validée) ──
  if (isMobile) {
    const kindLabel: Record<string, string> = { training: 'Entraînement', races: 'Course', objectives: 'Objectif', personal: 'Perso', google: 'Google' }
    const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const evRow = (e: CalEvent, i: number, n: number) => {
      const dur = e.durationMin ?? (e.allDay ? null : Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000))
      const durTxt = dur ? (dur >= 60 ? `${Math.floor(dur / 60)} h${dur % 60 ? ` ${String(dur % 60).padStart(2, '0')}` : ''}` : `${dur} min`) : null
      const calName = calendars.find(c => c.id === (e.meta as { calendarId?: string } | null)?.calendarId)?.name
      const meta = [durTxt, e.rpe != null ? `RPE ${e.rpe}` : null, calName ?? kindLabel[e.calendarKind] ?? null].filter(Boolean).join(' · ')
      return (
        <button key={e.id} type="button" onClick={() => setSheet({ event: e, draft: null })}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer',
            padding: i === 0 ? '0 0 11px' : i === n - 1 ? '11px 0 0' : '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--dash-line, var(--border))' }}>
          <span className="tnum" style={{ width: 48, flexShrink: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{e.allDay ? 'Jour' : fmtTime(e.start)}</span>
          <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: e.color, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{e.title}</span>
            {meta && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{meta}</span>}
          </span>
        </button>
      )
    }
    const card = (children: React.ReactNode, pad = '16px 18px') => <div style={{ background: 'var(--dash-card, var(--bg-card))', borderRadius: 'var(--r-lg)', padding: pad }}>{children}</div>
    const dayEvents = (d: Date) => events.filter(e => sameDay(new Date(e.start), d) || (new Date(e.start) < d && new Date(e.end) > addDays(d, 0) && e.allDay)).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    const sub = view === 'day' ? (sameDay(anchor, new Date()) ? "Aujourd'hui" : '') : view === 'week' ? `Semaine ${isoWeek(mondayOf(anchor))}` : view === 'agenda' ? 'Les 30 prochains jours' : ''
    const mTitle = view === 'day'
      ? anchor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : view === 'week' ? (() => { const ms = mondayOf(anchor); const me = addDays(ms, 6); const f = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); return `${f(ms)} – ${f(me)}` })()
      : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
    const navBtn = (dir: -1 | 1) => (
      <button type="button" aria-label={dir < 0 ? 'Précédent' : 'Suivant'} onClick={() => go(dir)} className="thw-press"
        style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--dash-card, var(--bg-card))', color: 'var(--text)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={dir < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
      </button>
    )
    const create = (
      <button type="button" onClick={() => { const b = view === 'day' ? new Date(anchor) : new Date(); b.setHours(new Date().getHours() + 1, 0, 0, 0); openCreate(b) }} className="thw-press"
        style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+ Créer</button>
    )
    const empty = (txt: string) => <p style={{ margin: 0, fontSize: 15, color: 'var(--text-dim)' }}>{txt}</p>

    let body: React.ReactNode = null
    if (view === 'day') {
      const evs = dayEvents(anchor)
      body = card(<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Ma journée</span>
          <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{evs.length} élément{evs.length > 1 ? 's' : ''}</span>
        </div>
        {evs.length ? evs.map((e, i) => evRow(e, i, evs.length)) : empty('Rien de prévu ce jour-là.')}
      </>)
    } else if (view === 'week') {
      body = <div style={{ background: 'var(--dash-card, var(--bg-card))', borderRadius: 'var(--r-lg)', padding: '6px 0', overflow: 'hidden' }}>
        <WeekView compact days={Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i))} events={events}
          onOpen={ev => setSheet({ event: ev, draft: null })} onCreate={openCreate} onMoved={refresh} px={6} />
      </div>
    } else if (view === 'month') {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      const gridStart = mondayOf(first)
      const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
      const rows = cells.slice(35).every(d => d.getMonth() !== anchor.getMonth()) ? cells.slice(0, 35) : cells
      const sel = selDay ?? startOfDay(new Date())
      const selEvs = dayEvents(sel)
      body = <>
        {card(
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', textAlign: 'center' }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', paddingBottom: 6 }}>{d}</div>)}
            {rows.map((d, i) => {
              const inMonth = d.getMonth() === anchor.getMonth()
              const isToday = sameDay(d, new Date()); const isSel = sameDay(d, sel)
              const evs = dayEvents(d)
              return (
                <button key={i} type="button" onClick={() => setSelDay(startOfDay(d))}
                  style={{ border: 'none', background: 'none', padding: '4px 0 0', height: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', borderTop: '1px solid var(--dash-line, var(--border))', minWidth: 0 }}>
                  <span className="tnum" style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700,
                    background: isToday ? 'var(--text)' : 'transparent', color: isToday ? 'var(--bg)' : inMonth ? 'var(--text)' : 'var(--text-dim)',
                    boxShadow: isSel && !isToday ? '0 0 0 2px var(--primary)' : 'none' }}>{d.getDate()}</span>
                  <span style={{ display: 'flex', gap: 3 }}>{evs.slice(0, 3).map(e => <i key={e.id} style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, display: 'block' }} />)}</span>
                </button>
              )
            })}
          </div>, '12px 10px')}
        {card(<>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{sel.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
            <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{selEvs.length} élément{selEvs.length > 1 ? 's' : ''}</span>
          </div>
          {selEvs.length ? selEvs.map((e, i) => evRow(e, i, selEvs.length)) : empty('Rien de prévu ce jour-là.')}
        </>)}
      </>
    } else {
      const days: Date[] = []
      for (let d = new Date(rangeStart); d < rangeEnd; d = addDays(d, 1)) if (dayEvents(d).length) days.push(new Date(d))
      const now = startOfDay(new Date())
      const label = (d: Date) => sameDay(d, now) ? `Aujourd’hui · ${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}`
        : sameDay(d, addDays(now, 1)) ? `Demain · ${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}`
        : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
      body = days.length ? days.map(d => { const evs = dayEvents(d); return (
        <div key={d.toDateString()} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-mid)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 4px' }}>{label(d)}</span>
          {card(evs.map((e, i) => evRow(e, i, evs.length)))}
        </div>) }) : card(empty('Rien de prévu sur cette période.'))
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {navBtn(-1)}
          <button type="button" onClick={today} style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0, textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mTitle.charAt(0).toUpperCase() + mTitle.slice(1)}</span>
            {sub && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)' }}>{sub}</span>}
          </button>
          {navBtn(1)}
        </div>
        <div role="tablist" style={{ display: 'flex', background: 'var(--dash-chip, var(--bg-card2))', borderRadius: 'var(--r-pill)', padding: 3 }}>
          {(['day', 'week', 'month', 'agenda'] as View[]).map(v => (
            <button key={v} role="tab" aria-selected={view === v} type="button" onClick={() => setView(v)}
              style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '8px 0', fontSize: 14, fontWeight: view === v ? 700 : 600,
                background: view === v ? 'var(--dash-card, var(--bg-elev))' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text-mid)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.10)' : 'none' }}>
              {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Agenda'}
            </button>
          ))}
        </div>
        {body}
        {create}
        {/* Mes agendas (couches + Google) — visible directement, plus de menu caché */}
        {card(<>
          <p style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Mes agendas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {calendars.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 15, color: 'var(--text)' }}>
                <input type="checkbox" checked={c.visible} onChange={e => void toggleCalendar(c.id, e.target.checked)} style={{ width: 18, height: 18, accentColor: c.color }} />
                <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                {c.name}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 12 }}><GoogleConnectButton onChange={refresh} /></div>
        </>)}
        {sheet && <EventSheet event={sheet.event} draft={sheet.draft} calendars={calendars} onClose={() => setSheet(null)} onSaved={refresh} />}
      </div>
    )
  }

  const btn: React.CSSProperties = { padding: '7px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ padding: 'max(16px, env(safe-area-inset-top)) 0 calc(env(safe-area-inset-bottom) + 90px)', width: '100%', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ padding: `0 ${px}px 12px` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>Planning Week</h1>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>Agenda</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {narrow && <button onClick={() => setPanelOpen(p => !p)} style={btn} aria-label="Agendas">☰</button>}
            <button onClick={() => openCreate(new Date(new Date().setMinutes(0, 0, 0)))} style={{ ...btn, background: 'var(--primary)', color: 'var(--on-primary)', border: 'none' }}>+ Créer</button>
          </div>
        </div>

        {/* Barre navigation + vues */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && view === 'day' && (
              <button onClick={() => setView('month')} style={{ ...btn, padding: '7px 11px', fontWeight: 700 }} aria-label="Retour au mois">‹ Mois</button>
            )}
            <button onClick={() => go(-1)} style={{ ...btn, padding: '7px 11px' }}>‹</button>
            <button onClick={today} style={btn}>Aujourd'hui</button>
            <button onClick={() => go(1)} style={{ ...btn, padding: '7px 11px' }}>›</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginLeft: 6, textTransform: 'capitalize' }}>{title}</span>
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', padding: 3 }}>
            {(['day', 'week', 'month', 'agenda'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? 'var(--on-primary)' : 'var(--text-mid)' }}>
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Agenda'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau des couches */}
      {panelOpen && (
        <div style={{ margin: `0 ${px}px 12px`, padding: 14, borderRadius: 'var(--r-md)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {!isMobile && <MiniCalendar anchor={anchor} onPick={d => setAnchor(startOfDay(d))} />}
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

      {/* Vues — sur desktop, mini-calendrier + agendas en colonne de gauche
          (façon Google Agenda) ; sur mobile, colonne unique (le panneau ☰
          donne accès aux agendas). */}
      <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
        {!narrow && (
          <aside style={{ width: 236, flexShrink: 0, padding: `0 0 0 ${px}px`, boxSizing: 'border-box' }}>
            <MiniCalendar anchor={anchor} onPick={d => setAnchor(startOfDay(d))} />
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', margin: '0 0 10px' }}>Mes agendas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {calendars.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5, color: 'var(--text)' }}>
                  <input type="checkbox" checked={c.visible} onChange={e => void toggleCalendar(c.id, e.target.checked)} />
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                  {c.name}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <GoogleConnectButton onChange={refresh} />
            </div>
          </aside>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === 'agenda' ? (
            <AgendaView events={events} onOpen={ev => setSheet({ event: ev, draft: null })} rangeStart={rangeStart} rangeEnd={rangeEnd} px={px} />
          ) : view === 'month' ? (
            <MonthView anchor={anchor} events={events} onOpenDay={d => { setAnchor(startOfDay(d)); setView('day') }} onOpen={ev => setSheet({ event: ev, draft: null })} px={px} mobile={isMobile} />
          ) : (
            <WeekView
              days={view === 'day' ? [startOfDay(anchor)] : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i))}
              events={events}
              onOpen={ev => setSheet({ event: ev, draft: null })}
              onCreate={openCreate}
              onMoved={refresh}
              px={px}
            />
          )}
        </div>
      </div>

      {sheet && (
        <EventSheet event={sheet.event} draft={sheet.draft} calendars={calendars} onClose={() => setSheet(null)} onSaved={refresh} />
      )}
    </div>
  )
}

// ── Vue Semaine / Jour (grille horaire) ─────────────────────────────────────
const HOUR_GUTTER = 52          // largeur colonne des heures
function WeekView({ days, events, onOpen, onCreate, onMoved, px, compact }: {
  days: Date[]; events: CalEvent[]; onOpen: (e: CalEvent) => void; onCreate: (start: Date, end?: Date) => void; onMoved: () => void; px: number
  /** Mobile : colonnes étroites → blocs de couleur SANS texte (jamais de texte coupé), heures courtes. */
  compact?: boolean
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; ev: CalEvent } | null>(null)
  const [createDrag, setCreateDrag] = useState<{ dayIdx: number; aMin: number; bMin: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // scroll initial vers ~7h
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H
  }, [])

  const timed = events.filter(e => !e.allDay)
  const allDay = events.filter(e => e.allDay)

  // Événements par jour
  const dayCol = (d: Date) => timed.filter(e => sameDay(new Date(e.start), d) || (new Date(e.start) < d && new Date(e.end) > d))

  // Minutes depuis minuit à partir d'une position Y (snap 15 min).
  const yToMin = useCallback((clientY: number, snap = SNAP_MIN): number => {
    const rect = gridRef.current?.getBoundingClientRect()
    const y = clientY - (rect?.top ?? 0) + (scrollRef.current?.scrollTop ?? 0)
    const mins = Math.round((y / HOUR_H) * 60 / snap) * snap
    return Math.max(0, Math.min(24 * 60, mins))
  }, [])

  const onCreateMove = useCallback((e: React.PointerEvent) => {
    setCreateDrag(cd => cd ? { ...cd, bMin: yToMin(e.clientY) } : cd)
  }, [yToMin])

  const onCreateUp = useCallback(() => {
    setCreateDrag(cd => {
      if (cd) {
        let s = Math.min(cd.aMin, cd.bMin)
        let en = Math.max(cd.aMin, cd.bMin)
        if (en - s < SNAP_MIN) en = s + 60 // simple clic → 1 h
        s = Math.max(0, Math.min(24 * 60 - SNAP_MIN, s))
        en = Math.min(24 * 60, Math.max(s + SNAP_MIN, en))
        const start = new Date(days[cd.dayIdx]); start.setHours(0, s, 0, 0)
        const end = new Date(days[cd.dayIdx]); end.setHours(0, en, 0, 0)
        onCreate(start, end)
      }
      return null
    })
  }, [days, onCreate])

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
    <div style={{ padding: `0 ${px}px`, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ borderTop: '1px solid var(--border)', width: '100%' }}>
        {/* Grille horaire scrollable — l'en-tête des jours est DANS le conteneur
            scrollable (sticky) : ainsi l'en-tête et les colonnes partagent la
            même largeur, y compris quand la barre de défilement apparaît
            (sinon décalage ~15px = bug d'alignement du jour actuel). */}
        <div ref={scrollRef} style={{ maxHeight: '72vh', overflowY: 'auto', position: 'relative', userSelect: createDrag ? 'none' : undefined }}
          onPointerMove={createDrag ? onCreateMove : undefined}
          onPointerUp={createDrag ? (() => onCreateUp()) : (drag ? (e => void commitDrag(e.clientX, e.clientY)) : undefined)}
        >
          {/* En-tête jours (sticky) */}
          <div style={{ display: 'flex', paddingLeft: compact ? 30 : HOUR_GUTTER, position: 'sticky', top: 0, zIndex: 6, background: compact ? 'var(--dash-card, var(--bg))' : 'var(--bg)' }}>
            {days.map((d, i) => {
              const isToday = sameDay(d, new Date())
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderLeft: i && !compact ? '1px solid var(--border)' : 'none', background: compact ? 'var(--dash-card, var(--bg))' : isToday ? 'var(--primary-dim)' : 'var(--bg)', minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: isToday ? (compact ? 'var(--text)' : 'var(--primary)') : 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{compact ? DAY_NAMES[(d.getDay() + 6) % 7].slice(0, 1) : DAY_NAMES[(d.getDay() + 6) % 7]}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: compact ? 26 : 30, height: compact ? 26 : 30, borderRadius: '50%', marginTop: 3, fontSize: compact ? 13 : 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: isToday ? (compact ? 'var(--text)' : 'var(--primary)') : 'transparent', color: isToday ? (compact ? 'var(--bg)' : 'var(--on-primary)') : 'var(--text)' }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Bande all-day */}
          {allDay.length > 0 && (
            <div style={{ display: 'flex', paddingLeft: compact ? 30 : HOUR_GUTTER, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minHeight: 24, background: 'var(--bg-card2)' }}>
              {days.map((d, i) => (
                <div key={i} style={{ flex: 1, padding: '3px 3px', borderLeft: i ? '1px solid var(--border)' : 'none', minWidth: 0 }}>
                  {allDay.filter(e => new Date(e.start) <= addDays(d, 1) && new Date(e.end) >= d && (sameDay(new Date(e.start), d) || (new Date(e.start) < d && new Date(e.end) > d))).map(e => (
                    <div key={e.id} onClick={() => onOpen(e)} title={e.title} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--on-primary)', background: e.color, borderRadius: 'var(--r-sm)', padding: '2px 5px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', minHeight: compact ? 10 : undefined }}>{compact ? '' : e.title}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', position: 'relative' }}>
            {/* Colonne heures */}
            <div style={{ width: compact ? 30 : HOUR_GUTTER, flexShrink: 0 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ height: HOUR_H, position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -7, right: compact ? 4 : 8, fontSize: 10, fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)' }}>{h ? (compact ? `${h}h` : `${String(h).padStart(2, '0')}:00`) : ''}</span>
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
                <div style={{ position: 'absolute', left: 0, right: 0, top: (minutesOfDay(new Date().toISOString()) / 60) * HOUR_H, height: 2, background: 'var(--danger)', zIndex: 5, pointerEvents: 'none' }} />
              )}
              {days.map((d, di) => {
                const col = layoutOverlaps(dayCol(d), d)
                const isToday = sameDay(d, new Date())
                return (
                  <div key={di}
                    onPointerDown={e => { if (!compact && e.target === e.currentTarget && e.button === 0) { const m = yToMin(e.clientY); setCreateDrag({ dayIdx: di, aMin: m, bMin: m }) } }}
                    style={{ flex: 1, position: 'relative', borderLeft: di ? '1px solid var(--border)' : 'none', height: 24 * HOUR_H, minWidth: 0, background: isToday && !compact ? 'var(--primary-dim)' : 'transparent', touchAction: compact ? 'pan-y' : 'none' }}>
                    {/* Bloc provisoire (drag-to-create) */}
                    {createDrag && createDrag.dayIdx === di && (() => {
                      const s = Math.min(createDrag.aMin, createDrag.bMin)
                      const en = Math.max(createDrag.aMin, createDrag.bMin)
                      return <div style={{ position: 'absolute', top: (s / 60) * HOUR_H, left: 2, right: 2, height: Math.max(4, ((en - s) / 60) * HOUR_H), background: 'var(--primary-dim)', border: '1px solid var(--primary)', borderRadius: 'var(--r-sm)', zIndex: 3, pointerEvents: 'none' }} />
                    })()}
                    {col.map(({ e, lane, lanes }) => {
                      const top = (minutesOfDay(e.start) / 60) * HOUR_H
                      const dur = e.durationMin ?? Math.max(20, (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000)
                      const h = Math.max(16, (dur / 60) * HOUR_H - 2)
                      const w = 100 / lanes
                      return (
                        <div key={e.id}
                          onClick={ev => { ev.stopPropagation(); onOpen(e) }}
                          onPointerDown={e.editable && !compact ? (() => setDrag({ id: e.id, ev: e })) : undefined}
                          title={`${e.title}${e.rpe ? ` · RPE ${e.rpe}` : ''}${e.durationMin ? ` · ${e.durationMin}min` : ''}${e.description ? `\n${e.description}` : ''}`}
                          style={{ position: 'absolute', top, left: `calc(${lane * w}% + 1px)`, width: `calc(${w}% - 2px)`, height: h, background: e.color, borderRadius: 'var(--r-sm)', padding: '2px 6px', color: 'var(--on-primary)', fontSize: 11, overflow: 'hidden', cursor: e.editable && !compact ? 'grab' : 'pointer', boxShadow: compact ? 'none' : 'var(--shadow-card)', opacity: drag?.id === e.id ? 0.5 : 1, zIndex: 2, touchAction: e.editable && !compact ? 'none' : 'auto' }}>
                          {!compact && <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>}
                          {!compact && h > 30 && <div style={{ fontSize: 10, opacity: 0.9, fontVariantNumeric: 'tabular-nums' }}>{new Date(e.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{e.rpe ? ` · RPE ${e.rpe}` : ''}</div>}
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

// ── Mini-calendrier (sidebar) ────────────────────────────────────────────────
const miniNav: React.CSSProperties = { width: 24, height: 24, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }
function MiniCalendar({ anchor, onPick }: { anchor: Date; onPick: (d: Date) => void }) {
  const [month, setMonth] = useState<Date>(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  useEffect(() => { setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1)) }, [anchor])
  const gridStart = mondayOf(new Date(month.getFullYear(), month.getMonth(), 1))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const now = new Date()
  const initials = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={miniNav} aria-label="Mois précédent">‹</button>
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={miniNav} aria-label="Mois suivant">›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {initials.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--text-dim)', padding: '2px 0' }}>{w}</div>)}
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth()
          const isToday = sameDay(d, now)
          const isSel = sameDay(d, anchor)
          return (
            <button key={i} onClick={() => onPick(d)}
              style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: isSel && !isToday ? '1px solid var(--primary)' : '1px solid transparent', cursor: 'pointer', fontSize: 11, fontWeight: isToday || isSel ? 700 : 500, fontVariantNumeric: 'tabular-nums', background: isToday ? 'var(--primary)' : isSel ? 'var(--primary-dim)' : 'transparent', color: isToday ? 'var(--on-primary)' : inMonth ? 'var(--text)' : 'var(--text-dim)', padding: 0 }}>{d.getDate()}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── Vue Mois ────────────────────────────────────────────────────────────────
function MonthView({ anchor, events, onOpenDay, onOpen, px, mobile }: { anchor: Date; events: CalEvent[]; onOpenDay: (d: Date) => void; onOpen: (e: CalEvent) => void; px: number; mobile?: boolean }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const gridStart = mondayOf(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const evByDay = (d: Date) => events.filter(e => sameDay(new Date(e.start), d) || (new Date(e.start) <= d && new Date(e.end) >= d))
  const headers = mobile ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : DAY_NAMES
  const maxShown = mobile ? 4 : 4
  return (
    <div style={{ padding: `0 ${px}px`, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
        {headers.map((d, i) => <div key={i} style={{ padding: mobile ? '6px 2px' : '8px 4px', textAlign: 'center', fontSize: mobile ? 10 : 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>{d}</div>)}
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === anchor.getMonth()
          const isToday = sameDay(d, new Date())
          const dayEvents = evByDay(d)
          const evs = dayEvents.slice(0, maxShown)
          const extra = dayEvents.length - evs.length
          return (
            <div key={i} onClick={() => onOpenDay(d)} style={{ minHeight: mobile ? 60 : 96, padding: mobile ? 3 : 5, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: inMonth ? 'transparent' : 'var(--bg-card2)', cursor: 'pointer', overflow: 'hidden', minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: mobile ? 20 : 22, height: mobile ? 20 : 22, borderRadius: '50%', fontSize: mobile ? 11 : 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? 'var(--on-primary)' : inMonth ? 'var(--text)' : 'var(--text-dim)' }}>{d.getDate()}</div>
              {mobile ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, marginTop: 3 }}>
                  {evs.map(e => <span key={e.id} title={e.title} style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0 }} />)}
                  {extra > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', lineHeight: 1 }}>+{extra}</span>}
                </div>
              ) : (
                evs.map(e => (
                  <div key={e.id} onClick={ev => { ev.stopPropagation(); onOpen(e) }} title={e.title} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 10.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vue Agenda (liste) ───────────────────────────────────────────────────────
function AgendaView({ events, onOpen, rangeStart, rangeEnd, px }: { events: CalEvent[]; onOpen: (e: CalEvent) => void; rangeStart: Date; rangeEnd: Date; px: number }) {
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
    <div style={{ padding: `4px ${px}px`, width: '100%', boxSizing: 'border-box' }}>
      {days.map(d => (
        <div key={d.toDateString()} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 54, flexShrink: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>{DAY_NAMES[(d.getDay() + 6) % 7]}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: sameDay(d, new Date()) ? 'var(--primary)' : 'var(--text)' }}>{d.getDate()}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(byDay.get(d.toDateString()) ?? []).map(e => (
              <div key={e.id} onClick={() => onOpen(e)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
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
