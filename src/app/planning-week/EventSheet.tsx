'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { AgendaCalendar, CalEvent } from '@/lib/agenda/types'
import { DEFAULT_REMINDER_MIN } from '@/lib/agenda/types'
import { createEvent, updateEvent, deleteEvent, createSessionLight, updateSessionLight } from '@/lib/agenda/data'

// Sports proposés (cohérent avec l'app).
const SPORTS = ['running', 'cycling', 'swim', 'hyrox', 'gym', 'boxe', 'trail', 'rowing']
const REMINDERS: { v: number; label: string }[] = [
  { v: -1, label: 'Aucun' }, { v: 0, label: 'À l\'heure' }, { v: 10, label: '10 min avant' },
  { v: 30, label: '30 min avant' }, { v: 60, label: '1 h avant' }, { v: 1440, label: '1 jour avant' },
]
const RRULES: { v: string; label: string }[] = [
  { v: '', label: 'Ne pas répéter' }, { v: 'FREQ=DAILY', label: 'Tous les jours' },
  { v: 'FREQ=WEEKLY', label: 'Toutes les semaines' }, { v: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'En semaine (lun→ven)' },
  { v: 'FREQ=MONTHLY', label: 'Tous les mois' },
]

function toDateInput(iso: string): string { return new Date(iso).toISOString().slice(0, 10) }
function toTimeInput(iso: string): string { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
function combine(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T00:00:00'); d.setHours(h || 0, m || 0, 0, 0); return d.toISOString()
}

export interface SheetDraft { start: string; end: string; allDay?: boolean }

export function EventSheet({ event, draft, calendars, onClose, onSaved }: {
  event: CalEvent | null
  draft: SheetDraft | null
  calendars: AgendaCalendar[]
  onClose: () => void
  onSaved: () => void
}) {
  const editing = !!event
  const readOnly = !!event && !event.editable && event.source !== 'session'
  const isSession = event?.source === 'session' || (!event && false)

  // 'event' | 'session' pour la création
  const [kind, setKind] = useState<'event' | 'session'>(event?.source === 'session' ? 'session' : 'event')
  const initStart = event?.start ?? draft?.start ?? new Date().toISOString()
  const initEnd = event?.end ?? draft?.end ?? new Date(Date.now() + 3600000).toISOString()

  const [title, setTitle] = useState(event?.title ?? '')
  const [sport, setSport] = useState(event?.sport ?? 'running')
  const [desc, setDesc] = useState(event?.description ?? '')
  const [dateStr, setDateStr] = useState(toDateInput(initStart))
  const [startT, setStartT] = useState(toTimeInput(initStart))
  const [endT, setEndT] = useState(toTimeInput(initEnd))
  const [allDay, setAllDay] = useState(event?.allDay ?? draft?.allDay ?? false)
  const [rpe, setRpe] = useState<string>(event?.rpe != null ? String(event.rpe) : '')
  const [calendarId, setCalendarId] = useState<string>((event?.meta?.calendarId as string) ?? calendars.find(c => c.kind === 'personal')?.id ?? '')
  const [reminder, setReminder] = useState<number>(event?.reminderMin ?? DEFAULT_REMINDER_MIN)
  const [rrule, setRrule] = useState<string>(event?.rrule ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // durée séance = end-start en minutes
  }, [])

  const durationMin = Math.max(15, Math.round((new Date(combine(dateStr, endT)).getTime() - new Date(combine(dateStr, startT)).getTime()) / 60000))

  async function save() {
    setBusy(true)
    try {
      const start = allDay ? combine(dateStr, '00:00') : combine(dateStr, startT)
      const end = allDay ? combine(dateStr, '23:59') : combine(dateStr, endT)
      if (kind === 'session') {
        if (editing && event) {
          await updateSessionLight(event.rawId, { title: title || sport, sport, rpe: rpe ? Number(rpe) : null, description: desc, reminderMin: reminder })
        } else {
          await createSessionLight({ title: title || sport, sport, start, durationMin, rpe: rpe ? Number(rpe) : null, description: desc, reminderMin: reminder })
        }
      } else {
        if (editing && event) {
          await updateEvent(event.rawId, { title, description: desc, start, end, allDay, calendarId, reminderMin: reminder, rrule: rrule || null })
        } else {
          await createEvent({ title, description: desc, start, end, allDay, calendarId, reminderMin: reminder, rrule: rrule || null })
        }
      }
      window.dispatchEvent(new Event('thw:agenda-changed'))
      onSaved(); onClose()
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!event) return
    setBusy(true)
    try {
      if (event.source === 'event' || event.source === 'google') await deleteEvent(event.rawId)
      window.dispatchEvent(new Event('thw:agenda-changed'))
      onSaved(); onClose()
    } finally { setBusy(false) }
  }

  const field: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', margin: '0 0 5px' }

  return (
    <div className="agw-sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex' }}>
      <style>{`
        .agw-sheet-overlay { align-items: center; justify-content: center; padding: 16px; }
        .agw-sheet { width: min(460px,96vw); max-height: 90vh; border-radius: 18px; animation: agwPop .16s ease; }
        .agw-grab { display: none; }
        @keyframes agwPop { from { opacity:0; transform: scale(.97) } to { opacity:1; transform: scale(1) } }
        @media (max-width: 640px) {
          .agw-sheet-overlay { align-items: flex-end; padding: 0; }
          .agw-sheet { width: 100%; max-width: 100%; border-radius: 22px 22px 0 0; animation: agwUp .3s cubic-bezier(0.32,0.72,0,1); }
          .agw-grab { display: block; width: 40px; height: 4px; border-radius: 999px; background: var(--border-mid); margin: 8px auto 4px; }
        }
        @keyframes agwUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
      <div className="agw-sheet" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', overflowY: 'auto', boxShadow: 'var(--shadow)', boxSizing: 'border-box' }}>
        <div className="agw-grab" />
        <div style={{ padding: '18px 20px 22px' }}>
          {/* Détail lecture seule (course / objectif) */}
          {readOnly ? (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>{event!.title}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 14px' }}>
                {new Date(event!.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {event!.sport ? ` · ${event!.sport}` : ''}{event!.meta?.type ? ` · ${event!.meta.type}` : ''}
              </p>
              {event!.description && <p style={{ fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{event!.description}</p>}
              <button onClick={onClose} style={{ marginTop: 18, width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
            </>
          ) : (
            <>
              {/* Sélecteur type (création uniquement) */}
              {!editing && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-card2)', borderRadius: 10, padding: 3 }}>
                  {(['event', 'session'] as const).map(k => (
                    <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: kind === k ? 'var(--primary)' : 'transparent', color: kind === k ? 'var(--on-primary,#fff)' : 'var(--text-mid)' }}>{k === 'event' ? 'Événement' : 'Séance'}</button>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <p style={label}>Titre</p>
                <input style={field} value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'session' ? 'Ex. Sortie longue' : 'Ex. Rendez-vous kiné'} autoFocus />
              </div>

              {kind === 'session' && (
                <div style={{ marginBottom: 12 }}>
                  <p style={label}>Sport</p>
                  <select style={field} value={sport} onChange={e => setSport(e.target.value)}>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={label}>Date</p>
                  <input type="date" style={field} value={dateStr} onChange={e => setDateStr(e.target.value)} />
                </div>
                {!allDay && (<>
                  <div style={{ width: 96 }}>
                    <p style={label}>Début</p>
                    <input type="time" style={field} value={startT} onChange={e => setStartT(e.target.value)} />
                  </div>
                  <div style={{ width: 96 }}>
                    <p style={label}>Fin</p>
                    <input type="time" style={field} value={endT} onChange={e => setEndT(e.target.value)} />
                  </div>
                </>)}
              </div>

              {kind === 'event' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13.5, color: 'var(--text-mid)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> Toute la journée
                </label>
              )}

              {kind === 'session' && (
                <div style={{ marginBottom: 12 }}>
                  <p style={label}>RPE (ressenti /10)</p>
                  <input type="number" min={1} max={10} step={0.5} style={field} value={rpe} onChange={e => setRpe(e.target.value)} placeholder="—" />
                </div>
              )}

              {kind === 'event' && calendars.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={label}>Agenda</p>
                  <select style={field} value={calendarId} onChange={e => setCalendarId(e.target.value)}>
                    {calendars.filter(c => c.kind === 'personal' || c.kind === 'google').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={label}>Rappel</p>
                  <select style={field} value={reminder} onChange={e => setReminder(Number(e.target.value))}>
                    {REMINDERS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                  </select>
                </div>
                {kind === 'event' && (
                  <div style={{ flex: 1 }}>
                    <p style={label}>Répétition</p>
                    <select style={field} value={rrule} onChange={e => setRrule(e.target.value)}>
                      {RRULES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <p style={label}>Description</p>
                <textarea style={{ ...field, minHeight: 60, resize: 'vertical' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Notes…" />
              </div>

              {/* Détail séance : blocs (lecture) + lien éditeur complet */}
              {isSession && (
                <div style={{ marginBottom: 14 }}>
                  {Array.isArray(event?.blocks) && (event!.blocks as unknown[]).length > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-card2)', border: '1px solid var(--border)', marginBottom: 10 }}>
                      <p style={{ ...label, marginBottom: 6 }}>Blocs d'intensité</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: 0 }}>{(event!.blocks as unknown[]).length} bloc(s) — édition détaillée sur Planning sports.</p>
                    </div>
                  )}
                  <Link href="/planning" style={{ display: 'block', textAlign: 'center', padding: 11, borderRadius: 11, border: '1px solid var(--primary)', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>
                    Détailler la séance (blocs) sur Planning sports →
                  </Link>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {editing && (event!.source === 'event' || event!.source === 'google') && (
                  <button onClick={remove} disabled={busy} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
                )}
                <button onClick={onClose} disabled={busy} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={save} disabled={busy} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary,#fff)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : editing ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
