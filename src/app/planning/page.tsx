'use client'

import { useState, useRef } from 'react'

type DayIntensity = 'recovery' | 'low' | 'mid' | 'hard'
type SportType    = 'run' | 'bike' | 'swim' | 'hyrox' | 'gym'
type SessionStatus = 'planned' | 'done' | 'partial'

interface Session {
  id: string
  sport: SportType
  title: string
  time: string
  durationMin: number
  zone?: string
  tss?: number
  main?: boolean
  status: SessionStatus
  notes?: string
  // validation data
  distance?: string
  hrAvg?: string
  watts?: string
  npower?: string
  pace?: string
  elevation?: string
}

interface WeekDay {
  day: string
  date: string
  intensity: DayIntensity
  sessions: Session[]
}

// ── Utils ─────────────────────────────────────────
function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `0:${String(m).padStart(2, '0')}`
  return `${h}h${String(m).padStart(2, '0')}`
}

const SPORT_EMOJI: Record<SportType, string> = {
  run: '🏃', bike: '🚴', swim: '🏊', hyrox: '🏋️', gym: '💪',
}
const SPORT_LABEL: Record<SportType, string> = {
  run: 'Running', bike: 'Cyclisme', swim: 'Natation', hyrox: 'Hyrox', gym: 'Musculation',
}
const SPORT_COLORS: Record<SportType, { bg: string; border: string }> = {
  run:   { bg: 'rgba(0,200,224,0.12)',  border: '#00c8e0' },
  bike:  { bg: 'rgba(91,111,255,0.12)', border: '#5b6fff' },
  swim:  { bg: 'rgba(0,229,255,0.10)',  border: '#00e5ff' },
  hyrox: { bg: 'rgba(255,179,64,0.12)', border: '#ffb340' },
  gym:   { bg: 'rgba(255,95,95,0.10)',  border: '#ff5f5f' },
}
const INTENSITY_CONFIG: Record<DayIntensity, { label: string; color: string; bg: string; border: string; description: string }> = {
  recovery: { label: 'Récup', color: '#9ca3af', bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.25)', description: 'Journée sans séance ou très légère. Permet à l\'organisme de régénérer les fibres musculaires et consolider les adaptations.' },
  low:      { label: 'Low',   color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)',   description: 'Journée à faible intensité permettant de favoriser la récupération tout en continuant à stimuler l\'organisme sans générer de fatigue supplémentaire.' },
  mid:      { label: 'Mid',   color: '#ffb340', bg: 'rgba(255,179,64,0.10)',  border: 'rgba(255,179,64,0.25)',  description: 'Journée à intensité modérée, créant une fatigue contrôlée. Le temps de récupération varie selon le niveau et l\'état de forme.' },
  hard:     { label: 'Hard',  color: '#ff5f5f', bg: 'rgba(255,95,95,0.10)',   border: 'rgba(255,95,95,0.25)',   description: 'Journée à forte intensité générant un stress important. Nécessite généralement un ou plusieurs jours de récupération.' },
}
const INTENSITY_ORDER: DayIntensity[] = ['recovery', 'low', 'mid', 'hard']

// ── Initial data ──────────────────────────────────
const INITIAL_WEEK: WeekDay[] = [
  { day: 'Lun', date: '18', intensity: 'mid',
    sessions: [{ id: 's1', sport: 'swim', title: 'Natation Tech', time: '06:00', durationMin: 55, zone: 'Z2', tss: 45, status: 'done', main: false }] },
  { day: 'Mar', date: '19', intensity: 'hard',
    sessions: [{ id: 's2', sport: 'bike', title: 'Sweet Spot', time: '17:30', durationMin: 105, zone: 'Z3-Z4', tss: 122, status: 'done', main: true }] },
  { day: 'Mer', date: '20', intensity: 'low',
    sessions: [{ id: 's3', sport: 'run', title: 'Endurance Z2', time: '06:30', durationMin: 70, zone: 'Z2', tss: 68, status: 'planned', main: false }] },
  { day: 'Jeu', date: '21', intensity: 'hard',
    sessions: [{ id: 's4', sport: 'hyrox', title: 'Hyrox Sim', time: '18:00', durationMin: 65, tss: 88, status: 'planned', main: true }] },
  { day: 'Ven', date: '22', intensity: 'mid',
    sessions: [
      { id: 's5', sport: 'swim', title: '6×100m', time: '06:00', durationMin: 60, zone: 'Z3', tss: 55, status: 'planned', main: false },
      { id: 's6', sport: 'run',  title: 'Tempo Z3', time: '17:00', durationMin: 60, zone: 'Z3', tss: 65, status: 'planned', main: true },
    ] },
  { day: 'Sam', date: '23', intensity: 'mid',
    sessions: [{ id: 's7', sport: 'bike', title: 'Long Z2', time: '08:00', durationMin: 180, zone: 'Z2', tss: 120, status: 'planned', main: true }] },
  { day: 'Dim', date: '24', intensity: 'recovery',
    sessions: [{ id: 's8', sport: 'run', title: 'Récup Z1', time: '10:00', durationMin: 40, zone: 'Z1', tss: 25, status: 'planned', main: false }] },
]

// ── Modal intensité ───────────────────────────────
function IntensityModal({ intensity, onClose }: { intensity: DayIntensity; onClose: () => void }) {
  const cfg = INTENSITY_CONFIG[intensity]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-mid)', padding: 28, maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ padding: '4px 12px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>{cfg.label}</span>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>Journée {cfg.label}</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7, margin: '0 0 20px' }}>{cfg.description}</p>
        <button onClick={onClose} style={{ width: '100%', padding: 11, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', borderRadius: 11, color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Compris</button>
      </div>
    </div>
  )
}

// ── Modal séance (voir / modifier / valider) ──────
function SessionDetailModal({ session, onClose, onSave, onValidate, onDelete }: {
  session: Session
  onClose: () => void
  onSave: (s: Session) => void
  onValidate: (s: Session) => void
  onDelete: (id: string) => void
}) {
  const [tab, setTab]   = useState<'detail' | 'validate'>('detail')
  const [form, setForm] = useState({ ...session })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-mid)', padding: 24, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: SPORT_COLORS[session.sport].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{SPORT_EMOJI[session.sport]}</div>
            <div>
              <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>{session.title}</p>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>{session.time} · {formatDuration(session.durationMin)}{session.tss ? ` · ${session.tss} TSS` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 9, padding: '5px 9px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {(['detail', 'validate'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid', borderColor: tab === t ? '#00c8e0' : 'var(--border)', background: tab === t ? 'rgba(0,200,224,0.10)' : 'var(--bg-card2)', color: tab === t ? '#00c8e0' : 'var(--text-mid)', fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              {t === 'detail' ? '✏️ Modifier' : '✅ Valider la séance'}
            </button>
          ))}
        </div>

        {tab === 'detail' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[
                { key: 'title',       label: 'Titre' },
                { key: 'time',        label: 'Heure' },
                { key: 'durationMin', label: 'Durée (min)' },
                { key: 'zone',        label: 'Zone' },
                { key: 'tss',         label: 'TSS' },
              ].map((f) => (
                <div key={f.key}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>{f.label}</p>
                  <input
                    value={(form as any)[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>Notes</p>
              <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none', resize: 'none' as const }}/>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => onDelete(session.id)} style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(255,95,95,0.10)', border: '1px solid rgba(255,95,95,0.25)', color: '#ff5f5f', fontSize: 13, cursor: 'pointer' }}>Supprimer</button>
              <button onClick={() => onSave(form)} style={{ flex: 1, padding: 11, borderRadius: 11, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Sauvegarder</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              {[
                { key: 'distance',  label: 'Distance',         placeholder: '10km' },
                { key: 'hrAvg',     label: 'FC moyenne',       placeholder: '158bpm' },
                { key: 'pace',      label: 'Allure moyenne',   placeholder: "4'32/km" },
                { key: 'watts',     label: 'Watts moyens',     placeholder: '240W' },
                { key: 'npower',    label: 'Watts normalisés', placeholder: '247W' },
                { key: 'elevation', label: 'Dénivelé',         placeholder: '450m' },
              ].map((f) => (
                <div key={f.key}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>{f.label}</p>
                  <input
                    value={(form as any)[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none' }}
                  />
                </div>
              ))}
            </div>
            <button onClick={() => onValidate(form)} style={{ width: '100%', padding: 13, borderRadius: 11, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ✓ Confirmer la séance
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal ajout séance ────────────────────────────
function AddSessionModal({ dayIndex, onClose, onAdd }: {
  dayIndex: number
  onClose: () => void
  onAdd: (dayIndex: number, session: Session) => void
}) {
  const [sport, setSport] = useState<SportType>('run')
  const [title, setTitle]         = useState('')
  const [time, setTime]           = useState('09:00')
  const [durationMin, setDuration] = useState('60')
  const [zone, setZone]           = useState('')
  const [tss, setTss]             = useState('')
  const [notes, setNotes]         = useState('')

  function handleAdd() {
    const s: Session = {
      id: `s_${Date.now()}`,
      sport, title: title || `${SPORT_LABEL[sport]}`,
      time, durationMin: parseInt(durationMin) || 60,
      zone: zone || undefined, tss: tss ? parseInt(tss) : undefined,
      status: 'planned', notes: notes || undefined,
    }
    onAdd(dayIndex, s)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-mid)', padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700, margin: 0 }}>Ajouter une séance</h3>
          <button onClick={onClose} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 9, padding: '5px 9px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16 }}>✕</button>
        </div>

        {/* Sport */}
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', marginBottom: 8 }}>Sport</p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const, marginBottom: 16 }}>
          {(Object.keys(SPORT_LABEL) as SportType[]).map((s) => (
            <button key={s} onClick={() => setSport(s)} style={{ padding: '7px 13px', borderRadius: 9, border: '1px solid', borderColor: sport === s ? '#00c8e0' : 'var(--border)', background: sport === s ? 'rgba(0,200,224,0.10)' : 'var(--bg-card2)', color: sport === s ? '#00c8e0' : 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, cursor: 'pointer' }}>
              {SPORT_EMOJI[s]} {SPORT_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Titre',       val: title,       set: setTitle,    placeholder: 'Ex: Tempo 3×10min' },
            { label: 'Heure',       val: time,        set: setTime,     placeholder: '17:00' },
            { label: 'Durée (min)', val: durationMin, set: setDuration, placeholder: '60' },
            { label: 'Zone',        val: zone,        set: setZone,     placeholder: 'Z2, Z3...' },
            { label: 'TSS estimé',  val: tss,         set: setTss,      placeholder: '65' },
          ].map((f) => (
            <div key={f.label}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>{f.label}</p>
              <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none' }}/>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5 }}>Notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Consignes, objectifs…" style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, outline: 'none', resize: 'none' as const }}/>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 11, background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontFamily: 'DM Sans,sans-serif', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleAdd} style={{ flex: 2, padding: 11, borderRadius: 11, background: 'linear-gradient(135deg,#00c8e0,#5b6fff)', border: 'none', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + Ajouter au planning
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════
export default function PlanningPage() {
  const [week, setWeek]                     = useState<WeekDay[]>(INITIAL_WEEK)
  const [intensityModal, setIntensityModal] = useState<DayIntensity | null>(null)
  const [addModal, setAddModal]             = useState<number | null>(null)
  const [detailModal, setDetailModal]       = useState<Session | null>(null)

  // Drag & drop refs
  const dragSession = useRef<{ sessionId: string; fromDay: number } | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // ── Actions séances ──────────────────────────────
  function addSession(dayIdx: number, session: Session) {
    setWeek((prev) => prev.map((d, i) => i === dayIdx ? { ...d, sessions: [...d.sessions, session] } : d))
  }

  function saveSession(updated: Session) {
    setWeek((prev) => prev.map((d) => ({
      ...d,
      sessions: d.sessions.map((s) => s.id === updated.id ? { ...updated, durationMin: parseInt(String(updated.durationMin)) || 60 } : s),
    })))
    setDetailModal(null)
  }

  function validateSession(updated: Session) {
    setWeek((prev) => prev.map((d) => ({
      ...d,
      sessions: d.sessions.map((s) => s.id === updated.id ? { ...updated, status: 'done' } : s),
    })))
    setDetailModal(null)
  }

  function deleteSession(id: string) {
    setWeek((prev) => prev.map((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })))
    setDetailModal(null)
  }

  function changeIntensity(dayIdx: number) {
    setWeek((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d
      const cur = INTENSITY_ORDER.indexOf(d.intensity)
      const next = INTENSITY_ORDER[(cur + 1) % INTENSITY_ORDER.length]
      return { ...d, intensity: next }
    }))
  }

  // ── Drag & drop ──────────────────────────────────
  function onDragStart(sessionId: string, fromDay: number) {
    dragSession.current = { sessionId, fromDay }
  }

  function onDrop(toDay: number) {
    if (!dragSession.current) return
    const { sessionId, fromDay } = dragSession.current
    if (fromDay === toDay) { dragSession.current = null; setDragOver(null); return }

    setWeek((prev) => {
      const session = prev[fromDay].sessions.find((s) => s.id === sessionId)
      if (!session) return prev
      return prev.map((d, i) => {
        if (i === fromDay) return { ...d, sessions: d.sessions.filter((s) => s.id !== sessionId) }
        if (i === toDay)   return { ...d, sessions: [...d.sessions, session] }
        return d
      })
    })
    dragSession.current = null
    setDragOver(null)
  }

  // Touch drag (mobile)
  const touchSession = useRef<string | null>(null)
  const touchFromDay = useRef<number | null>(null)

  function onTouchStartSession(sessionId: string, dayIdx: number) {
    touchSession.current = sessionId
    touchFromDay.current = dayIdx
  }

  function getDayIndexFromTouch(clientY: number, clientX: number): number | null {
    const elements = document.elementsFromPoint(clientX, clientY)
    for (const el of elements) {
      const dayEl = (el as HTMLElement).closest('[data-day-index]')
      if (dayEl) return parseInt((dayEl as HTMLElement).dataset.dayIndex || '-1')
    }
    return null
  }

  function onTouchEndSession(e: React.TouchEvent) {
    const touch = e.changedTouches[0]
    const toDay = getDayIndexFromTouch(touch.clientY, touch.clientX)
    if (toDay !== null && touchSession.current !== null && touchFromDay.current !== null && toDay !== touchFromDay.current) {
      const sessionId = touchSession.current
      const fromDay   = touchFromDay.current
      setWeek((prev) => {
        const session = prev[fromDay].sessions.find((s) => s.id === sessionId)
        if (!session) return prev
        return prev.map((d, i) => {
          if (i === fromDay) return { ...d, sessions: d.sessions.filter((s) => s.id !== sessionId) }
          if (i === toDay)   return { ...d, sessions: [...d.sessions, session] }
          return d
        })
      })
    }
    touchSession.current = null
    touchFromDay.current = null
  }

  // ── Stats ────────────────────────────────────────
  const allSessions = week.flatMap((d) => d.sessions)
  const totalMin    = allSessions.reduce((s, x) => s + x.durationMin, 0)
  const totalH      = totalMin / 60
  const totalTSS    = allSessions.reduce((s, x) => s + (x.tss || 0), 0)
  const counts      = week.reduce((acc, d) => { acc[d.intensity] = (acc[d.intensity] || 0) + 1; return acc }, {} as Record<DayIntensity, number>)

  const sportH: Record<SportType, number> = { run: 0, bike: 0, swim: 0, hyrox: 0, gym: 0 }
  allSessions.forEach((s) => { sportH[s.sport] += s.durationMin / 60 })
  const sportEntries = (Object.entries(sportH) as [SportType, number][]).filter(([, h]) => h > 0)
  const sportColors  = ['#5b6fff', '#00c8e0', '#00e5ff', '#ffb340', '#ff5f5f']

  return (
    <div style={{ padding: '24px 28px', maxWidth: '100%' }}>

      {/* Modals */}
      {intensityModal && <IntensityModal intensity={intensityModal} onClose={() => setIntensityModal(null)} />}
      {addModal !== null && <AddSessionModal dayIndex={addModal} onClose={() => setAddModal(null)} onAdd={addSession} />}
      {detailModal && <SessionDetailModal session={detailModal} onClose={() => setDetailModal(null)} onSave={saveSession} onValidate={validateSession} onDelete={deleteSession} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>Planning</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '5px 0 0' }}>Semaine 12 — 18 au 24 mars · Bloc construction</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>← Préc.</button>
          <button style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Suiv. →</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }} className="md:grid-cols-4">

        {/* Volume anneau */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
            <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="30" cy="30" r="24" fill="none" stroke="var(--border)" strokeWidth="7"/>
              {sportEntries.map(([sport, h], i) => {
                const pct  = h / totalH
                const circ = 2 * Math.PI * 24
                const prev = sportEntries.slice(0, i).reduce((s, [, v]) => s + v / totalH, 0)
                return <circle key={sport} cx="30" cy="30" r="24" fill="none" stroke={sportColors[i % sportColors.length]} strokeWidth="7" strokeLinecap="butt" strokeDasharray={`${pct * circ} ${circ}`} strokeDashoffset={-prev * circ} opacity={0.8}/>
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 11, color: '#00c8e0' }}>{totalH.toFixed(1)}h</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 4px' }}>Volume</p>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 700, color: '#00c8e0', margin: 0 }}>{formatDuration(totalMin)}</p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>{totalTSS} TSS</p>
          </div>
        </div>

        {/* Équilibre */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 10px' }}>Équilibre semaine</p>
          <div style={{ display: 'flex', gap: 3, height: 7, borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
            {(INTENSITY_ORDER as DayIntensity[]).filter((k) => counts[k] > 0).map((k) => (
              <div key={k} style={{ flex: counts[k], background: INTENSITY_CONFIG[k].color, opacity: 0.7 }}/>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {(INTENSITY_ORDER as DayIntensity[]).filter((k) => counts[k] > 0).map((k) => (
              <span key={k} style={{ padding: '2px 8px', borderRadius: 20, background: INTENSITY_CONFIG[k].bg, border: `1px solid ${INTENSITY_CONFIG[k].border}`, color: INTENSITY_CONFIG[k].color, fontSize: 10, fontWeight: 700 }}>
                {counts[k]} {INTENSITY_CONFIG[k].label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 8px' }}>Séances</p>
          <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 700, color: '#ffb340', margin: 0 }}>{allSessions.length}<span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>cette sem.</span></p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 8px' }}>TSS prévu</p>
          <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 700, color: '#5b6fff', margin: 0 }}>{totalTSS}<span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>pts</span></p>
        </div>
      </div>

      {/* ── GRILLE DESKTOP ── */}
      <div className="hidden md:block" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)', overflowX: 'auto' }}>
        <div style={{ minWidth: 660 }}>
          {/* Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7,1fr)', gap: 6, marginBottom: 10 }}>
            <div/>
            {week.map((d, dayIdx) => {
              const cfg = INTENSITY_CONFIG[d.intensity]
              return (
                <div key={d.day} style={{ textAlign: 'center' as const }}>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: '0 0 2px', fontWeight: 500 }}>{d.day}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>{d.date}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                    <button onClick={() => setIntensityModal(d.intensity)} style={{ padding: '2px 7px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      {cfg.label}
                    </button>
                    <button onClick={() => changeIntensity(dayIdx)} style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>+</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Drop zones par jour */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7,1fr)', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 4 }}>
              <span style={{ fontSize: 10, fontFamily: 'DM Mono,monospace', color: 'var(--text-dim)' }}>▼</span>
            </div>
            {week.map((d, dayIdx) => (
              <div
                key={d.day}
                data-day-index={dayIdx}
                onDragOver={(e) => { e.preventDefault(); setDragOver(dayIdx) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => onDrop(dayIdx)}
                style={{
                  minHeight: 120, borderRadius: 10, padding: 4,
                  background: dragOver === dayIdx ? 'rgba(0,200,224,0.06)' : 'var(--bg-card2)',
                  border: `1px solid ${dragOver === dayIdx ? 'rgba(0,200,224,0.3)' : 'var(--border)'}`,
                  transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                {d.sessions.map((s) => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => onDragStart(s.id, dayIdx)}
                    onClick={() => setDetailModal(s)}
                    style={{
                      borderRadius: 7, padding: '5px 7px',
                      background: SPORT_COLORS[s.sport].bg,
                      borderLeft: `2px solid ${SPORT_COLORS[s.sport].border}`,
                      cursor: 'grab', position: 'relative',
                      opacity: s.status === 'done' ? 0.7 : 1,
                    }}
                  >
                    {s.status === 'done' && (
                      <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, background: '#00c8e0', color: '#fff', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>✓</span>
                    )}
                    <p style={{ fontSize: 10, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {SPORT_EMOJI[s.sport]} {s.title}
                    </p>
                    <p style={{ fontSize: 9, opacity: 0.7, margin: '2px 0 0', fontFamily: 'DM Mono,monospace' }}>
                      {s.time} · {formatDuration(s.durationMin)}
                    </p>
                    {s.zone && <p style={{ fontSize: 9, opacity: 0.65, margin: '1px 0 0' }}>{s.zone}</p>}
                  </div>
                ))}
                {/* + Ajouter */}
                <button
                  onClick={() => setAddModal(dayIdx)}
                  style={{ marginTop: 'auto', padding: '4px', borderRadius: 6, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', width: '100%' }}
                >
                  + 
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE : liste ── */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {week.map((d, dayIdx) => {
          const cfg = INTENSITY_CONFIG[d.intensity]
          return (
            <div
              key={d.day}
              data-day-index={dayIdx}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow-card)' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: d.sessions.length ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'center' as const, minWidth: 36 }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 }}>{d.day}</p>
                    <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: 0 }}>{d.date}</p>
                  </div>
                  <button onClick={() => setIntensityModal(d.intensity)} style={{ padding: '3px 10px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {cfg.label}
                  </button>
                  <button onClick={() => changeIntensity(dayIdx)} style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                </div>
                <button onClick={() => setAddModal(dayIdx)} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(0,200,224,0.08)', border: '1px solid rgba(0,200,224,0.2)', color: '#00c8e0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  + Ajouter
                </button>
              </div>

              {d.sessions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setDetailModal(s)}
                      onTouchStart={() => onTouchStartSession(s.id, dayIdx)}
                      onTouchEnd={onTouchEndSession}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: SPORT_COLORS[s.sport].bg, borderLeft: `3px solid ${SPORT_COLORS[s.sport].border}`, cursor: 'pointer', position: 'relative', opacity: s.status === 'done' ? 0.75 : 1 }}
                    >
                      {s.status === 'done' && (
                        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, background: '#00c8e0', color: '#fff', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>✓ Validée</span>
                      )}
                      <span style={{ fontSize: 18 }}>{SPORT_EMOJI[s.sport]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: s.main ? 600 : 400, margin: 0 }}>
                          {s.title}
                          {s.main && <span style={{ fontSize: 9, marginLeft: 5, padding: '1px 5px', borderRadius: 4, background: SPORT_COLORS[s.sport].border, color: '#fff' }}>PRINCIPALE</span>}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0 0' }}>
                          {s.time} · {formatDuration(s.durationMin)}{s.zone ? ` · ${s.zone}` : ''}{s.tss ? ` · ${s.tss} TSS` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {d.sessions.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, fontStyle: 'italic' as const }}>Jour de repos</p>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
