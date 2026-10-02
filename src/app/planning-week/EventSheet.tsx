'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { AgendaCalendar, CalEvent } from '@/lib/agenda/types'
import { DEFAULT_REMINDER_MIN, sportColor } from '@/lib/agenda/types'
import { createEvent, updateEvent, deleteEvent, createSessionLight, updateSessionLight } from '@/lib/agenda/data'
import { useI18n } from '@/lib/i18n'
import { MSheet, SheetHeader, Ico, Chevron, HAIRLINE, CARD_BG, PAGE_BG } from '@/components/ai/mobile/MobileKit'
import { useIsMobile, MSection, MField, MDot, MDangerRow, MConfirmDelete, MSeg, M_SCROLL, M_INP, M_TEXTAREA, M_GRID2, M_LBL } from '@/app/calendar/components/mobileForm'

// Sports proposés (cohérent avec l'app).
const SPORTS = ['running', 'cycling', 'swim', 'hyrox', 'gym', 'boxe', 'trail', 'rowing']
const REMINDERS: { v: number; label: string }[] = [
  { v: -1, label: 'Aucun' }, { v: 0, label: 'À l\'heure' }, { v: 10, label: '10 min avant' },
  { v: 30, label: '30 min avant' }, { v: 60, label: '1 h avant' }, { v: 1440, label: '1 jour avant' },
]

// Palette de 24 couleurs distinctes (style Google Agenda).
const COLOR_PALETTE = [
  '#7986CB', '#33B679', '#8E24AA', '#E67C73', '#F6BF26', '#F4511E',
  '#039BE5', '#616161', '#3F51B5', '#0B8043', '#D50000', '#06B6D4',
  '#22C55E', '#F97316', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6',
  '#EAB308', '#3B82F6', '#A855F7', '#10B981', '#F43F5E', '#64748B',
]

// Récurrence — helpers iCal.
const BYDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']       // indexé par getDay()
const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const WEEKDAY_INITIAL = ['D', 'L', 'M', 'M', 'J', 'V', 'S']          // cercles du modal (dim→sam)
type CustomUnit = 'jour' | 'semaine' | 'mois'
type CustomEnd = 'never' | 'on' | 'after'

function rruleParts(rrule: string): Record<string, string> {
  return Object.fromEntries(rrule.split(';').filter(Boolean).map(p => p.split('=')) as [string, string][])
}
// Résumé lisible d'une règle personnalisée (pour l'option sélectionnée).
function summarizeRRule(rrule: string): string {
  const p = rruleParts(rrule)
  const n = Math.max(1, parseInt(p.INTERVAL ?? '1', 10) || 1)
  const unit = p.FREQ === 'DAILY' ? 'jour' : p.FREQ === 'MONTHLY' ? 'mois' : 'semaine'
  let s = n > 1 ? `Tou(te)s les ${n} ${unit}${unit === 'mois' ? '' : 's'}` : `Chaque ${unit}`
  if (p.FREQ === 'WEEKLY' && p.BYDAY) {
    const days = p.BYDAY.split(',').map(c => WEEKDAY_LONG[BYDAY_CODES.indexOf(c)]).filter(Boolean)
    if (days.length) s += ` (${days.join(', ')})`
  }
  if (p.COUNT) s += `, ${p.COUNT}×`
  else if (p.UNTIL) s += `, jusqu'au ${p.UNTIL.slice(6, 8)}/${p.UNTIL.slice(4, 6)}/${p.UNTIL.slice(0, 4)}`
  return s
}

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
  const { t } = useI18n()
  const isMobile = useIsMobile()
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
  // Bleu par défaut (demande produit). On garde la couleur existante en édition
  // et la couleur du sport pour une séance.
  const [color, setColor] = useState<string>(() =>
    event?.color
    ?? (event?.source === 'session' ? sportColor(event?.sport) : undefined)
    ?? '#3B82F6'
  )
  const [busy, setBusy] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)   // palette repliée par défaut
  const [recOpen, setRecOpen] = useState(false)           // menu récurrence custom
  const [confirmDel, setConfirmDel] = useState(false)     // confirmation suppression

  // ── Récurrence personnalisée (modal) ──
  const eventDow = new Date(dateStr + 'T00:00:00').getDay()
  const [customOpen, setCustomOpen] = useState(false)
  const [cInterval, setCInterval] = useState(1)
  const [cUnit, setCUnit] = useState<CustomUnit>('semaine')
  const [cDays, setCDays] = useState<number[]>([eventDow])
  const [cEnd, setCEnd] = useState<CustomEnd>('never')
  const [cUntil, setCUntil] = useState<string>(() => { const d = new Date(initStart); d.setMonth(d.getMonth() + 3); return d.toISOString().slice(0, 10) })
  const [cCount, setCCount] = useState<number>(13)

  const recurrencePresets = [
    { v: '', label: 'Une seule fois' },
    { v: 'FREQ=DAILY', label: 'Tous les jours' },
    { v: `FREQ=WEEKLY;BYDAY=${BYDAY_CODES[eventDow]}`, label: `Toutes les semaines le ${WEEKDAY_LONG[eventDow]}` },
    { v: 'FREQ=MONTHLY', label: 'Tous les mois' },
    { v: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Tous les jours de la semaine (lun. à ven.)' },
  ]
  const isCustomActive = rrule !== '' && !recurrencePresets.some(p => p.v === rrule)
  const currentRecLabel = isCustomActive ? summarizeRRule(rrule) : (recurrencePresets.find(p => p.v === rrule)?.label ?? 'Une seule fois')

  function openCustomModal() {
    // Préremplit depuis la règle courante si elle est déjà personnalisée.
    const p = rruleParts(rrule)
    if (p.FREQ) {
      setCUnit(p.FREQ === 'DAILY' ? 'jour' : p.FREQ === 'MONTHLY' ? 'mois' : 'semaine')
      setCInterval(Math.max(1, parseInt(p.INTERVAL ?? '1', 10) || 1))
      setCDays(p.BYDAY ? p.BYDAY.split(',').map(c => BYDAY_CODES.indexOf(c)).filter(i => i >= 0) : [eventDow])
      if (p.COUNT) { setCEnd('after'); setCCount(Math.max(1, parseInt(p.COUNT, 10) || 1)) }
      else if (p.UNTIL) { setCEnd('on'); setCUntil(`${p.UNTIL.slice(0, 4)}-${p.UNTIL.slice(4, 6)}-${p.UNTIL.slice(6, 8)}`) }
      else setCEnd('never')
    } else {
      setCUnit('semaine'); setCInterval(1); setCDays([eventDow]); setCEnd('never')
    }
    setCustomOpen(true)
  }

  function applyCustom() {
    const freq = cUnit === 'jour' ? 'DAILY' : cUnit === 'semaine' ? 'WEEKLY' : 'MONTHLY'
    let s = `FREQ=${freq}`
    if (cInterval > 1) s += `;INTERVAL=${cInterval}`
    if (freq === 'WEEKLY' && cDays.length) s += `;BYDAY=${[...cDays].sort((a, b) => a - b).map(d => BYDAY_CODES[d]).join(',')}`
    if (cEnd === 'on') s += `;UNTIL=${cUntil.replace(/-/g, '')}`
    else if (cEnd === 'after') s += `;COUNT=${Math.max(1, cCount)}`
    setRrule(s); setCustomOpen(false)
  }

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
          await updateSessionLight(event.rawId, { title: title || sport, sport, rpe: rpe ? Number(rpe) : null, description: desc, reminderMin: reminder, color })
        } else {
          await createSessionLight({ title: title || sport, sport, start, durationMin, rpe: rpe ? Number(rpe) : null, description: desc, reminderMin: reminder, color })
        }
      } else {
        if (editing && event) {
          await updateEvent(event.rawId, { title, description: desc, start, end, allDay, calendarId, reminderMin: reminder, rrule: rrule || null, color })
        } else {
          await createEvent({ title, description: desc, start, end, allDay, calendarId, reminderMin: reminder, rrule: rrule || null, color })
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

  // ══ MOBILE (≤ 767 px) : feuilles « cartes » (MSheet) — Annuler · titre ·
  // Créer/Enregistrer, corps gris, réglages en liste groupée, champs pleins
  // doux. Mêmes états, mêmes handlers que le rendu desktop.
  if (isMobile) {
    const Z = 18500
    const rowBase: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '0 16px', boxSizing: 'border-box', border: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text)', textAlign: 'left' }
    const rowLbl: React.CSSProperties = { flex: 1, minWidth: 0, fontWeight: 500 }
    const rowVal: React.CSSProperties = { maxWidth: '58%', fontSize: 16, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
    // Sélecteur natif invisible couvrant toute la ligne : un tap n'importe où ouvre la roue iOS.
    const rowSelect: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16, border: 'none', appearance: 'none', WebkitAppearance: 'none' }
    const sw = (on: boolean, onToggle: () => void, label: string) => (
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle}
        style={{ width: 51, height: 31, borderRadius: 'var(--r-pill)', border: 'none', padding: 2, cursor: 'pointer', flexShrink: 0, background: on ? 'var(--primary)' : 'var(--surface-bar)', transition: 'background .2s ease', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
        <span style={{ width: 27, height: 27, borderRadius: '50%', background: 'var(--surface-card)', boxShadow: 'var(--shadow-capsule)' }} />
      </button>
    )
    const checkIco = <span style={{ color: 'var(--primary)', display: 'flex' }}><Ico d={<path d="M20 6 9 17l-5-5" />} size={20} sw={2.6} /></span>

    if (readOnly) return (
      <MSheet open onClose={onClose} full={false} label={event!.title} zIndex={Z}>
        <SheetHeader leftLabel="Fermer" onLeft={onClose} title={event!.title} />
        <div style={{ ...M_SCROLL, flex: 'none', maxHeight: '70dvh' }}>
          <div style={{ padding: '0 4px' }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', overflowWrap: 'anywhere' }}>{event!.title}</h2>
            <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '4px 0 0', textTransform: 'capitalize' }}>
              {new Date(event!.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {event!.sport ? ` · ${event!.sport}` : ''}{event!.meta?.type ? ` · ${event!.meta.type}` : ''}
            </p>
          </div>
          {event!.description && <MSection><p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{event!.description}</p></MSection>}
        </div>
      </MSheet>
    )

    const sheetTitle = editing ? t('pe4.agenda.editTitle') : t('pe4.agenda.newTitle')
    return (
      <>
        <MSheet open onClose={onClose} label={sheetTitle} zIndex={Z}>
          <SheetHeader leftLabel="Annuler" onLeft={onClose} title={sheetTitle}
            rightLabel={busy ? '…' : editing ? 'Enregistrer' : 'Créer'} onRight={() => void save()} rightDisabled={busy} />
          <div style={M_SCROLL}>
            {/* Type (création uniquement) : segmenté gris + pouce blanc */}
            {!editing && (
              <MSeg<'event' | 'session'> value={kind} onChange={setKind}
                options={[{ v: 'event', l: 'Événement' }, { v: 'session', l: 'Séance' }]} />
            )}

            <MSection>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <MField label="Titre">
                  <input style={{ ...M_INP, fontWeight: 700 }} value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'session' ? 'Ex. Sortie longue' : 'Ex. Rendez-vous kiné'} autoFocus />
                </MField>
                {kind === 'session' && (
                  <MField label="Sport">
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}><MDot color={sportColor(sport)} /></span>
                      <select style={{ ...M_INP, paddingLeft: 32 }} value={sport} onChange={e => setSport(e.target.value)}>
                        {SPORTS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                      </select>
                    </div>
                  </MField>
                )}
              </div>
            </MSection>

            <MSection>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <MField label="Date"><input type="date" style={M_INP} value={dateStr} onChange={e => setDateStr(e.target.value)} /></MField>
                {!allDay && (
                  <div style={M_GRID2}>
                    <MField label="Début"><input type="time" style={M_INP} value={startT} onChange={e => setStartT(e.target.value)} /></MField>
                    <MField label="Fin"><input type="time" style={M_INP} value={endT} onChange={e => setEndT(e.target.value)} /></MField>
                  </div>
                )}
                {kind === 'event' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
                    <span style={{ flex: 1, fontSize: 16, color: 'var(--text)' }}>Toute la journée</span>
                    {sw(allDay, () => setAllDay(v => !v), 'Toute la journée')}
                  </div>
                )}
                {kind === 'session' && (
                  <MField label="RPE (ressenti /10)">
                    <input type="number" inputMode="decimal" min={1} max={10} step={0.5} style={M_INP} value={rpe} onChange={e => setRpe(e.target.value)} placeholder="—" />
                  </MField>
                )}
              </div>
            </MSection>

            {/* Réglages : liste groupée (filets) — valeur grise à droite */}
            <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              {kind === 'event' && calendars.length > 0 && (
                <div style={{ ...rowBase, position: 'relative' }}>
                  <span style={rowLbl}>Agenda</span>
                  <span style={rowVal}>{calendars.find(c => c.id === calendarId)?.name ?? '—'}</span>
                  <Chevron />
                  <select aria-label="Agenda" style={rowSelect} value={calendarId} onChange={e => setCalendarId(e.target.value)}>
                    {calendars.filter(c => c.kind === 'personal' || c.kind === 'google').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ ...rowBase, position: 'relative', borderTop: kind === 'event' && calendars.length > 0 ? HAIRLINE : 'none' }}>
                <span style={rowLbl}>Rappel</span>
                <span style={rowVal}>{REMINDERS.find(r => r.v === reminder)?.label ?? '—'}</span>
                <Chevron />
                <select aria-label="Rappel" style={rowSelect} value={reminder} onChange={e => setReminder(Number(e.target.value))}>
                  {REMINDERS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                </select>
              </div>
              {kind === 'event' && (
                <button type="button" onClick={() => setRecOpen(true)} style={{ ...rowBase, borderTop: HAIRLINE, cursor: 'pointer' }}>
                  <span style={rowLbl}>Répétition</span>
                  <span style={rowVal}>{currentRecLabel}</span>
                  <Chevron />
                </button>
              )}
              <button type="button" onClick={() => setPaletteOpen(o => !o)} aria-expanded={paletteOpen} style={{ ...rowBase, borderTop: HAIRLINE, cursor: 'pointer' }}>
                <span style={rowLbl}>Couleur</span>
                <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ display: 'flex', transform: paletteOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }}><Chevron /></span>
              </button>
              {paletteOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, padding: '4px 16px 16px' }}>
                  {COLOR_PALETTE.map(c => {
                    const on = color.toLowerCase() === c.toLowerCase()
                    return (
                      <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={on} onClick={() => { setColor(c); setPaletteOpen(false) }}
                        style={{ width: '100%', aspectRatio: '1', minHeight: 40, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', padding: 0, boxShadow: on ? '0 0 0 3px var(--surface-card), 0 0 0 5px var(--text)' : 'none' }} />
                    )
                  })}
                </div>
              )}
            </div>

            <MSection label="Description">
              <textarea style={M_TEXTAREA} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Notes…" />
            </MSection>

            {/* Détail séance : blocs (lecture) + lien éditeur complet */}
            {isSession && (
              <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                {Array.isArray(event?.blocks) && (event!.blocks as unknown[]).length > 0 && (
                  <div style={{ padding: '14px 16px' }}>
                    <span style={M_LBL}>Blocs d'intensité</span>
                    <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: 0 }}>{(event!.blocks as unknown[]).length} bloc(s) — édition détaillée sur Planning sports.</p>
                  </div>
                )}
                <Link href="/planning" style={{ ...rowBase, borderTop: Array.isArray(event?.blocks) && (event!.blocks as unknown[]).length > 0 ? HAIRLINE : 'none', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  <span style={rowLbl}>Détailler la séance (blocs) sur Planning sports</span>
                  <Chevron />
                </Link>
              </div>
            )}

            {editing && (event!.source === 'event' || event!.source === 'google') && (
              <MDangerRow label="Supprimer" onClick={() => setConfirmDel(true)} disabled={busy} />
            )}
          </div>
        </MSheet>

        {/* Répétition : feuille de choix (coche cyan) */}
        <MSheet open={recOpen} onClose={() => setRecOpen(false)} full={false} label="Répétition" zIndex={Z + 100}>
          <SheetHeader leftLabel="Annuler" onLeft={() => setRecOpen(false)} title="Répétition" />
          <div style={{ background: PAGE_BG, padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              {recurrencePresets.map((r, i) => {
                const on = !isCustomActive && rrule === r.v
                return (
                  <button key={r.v || 'once'} type="button" onClick={() => { setRrule(r.v); setRecOpen(false) }}
                    style={{ ...rowBase, borderTop: i === 0 ? 'none' : HAIRLINE, cursor: 'pointer', fontWeight: on ? 700 : 500 }}>
                    <span style={rowLbl}>{r.label}</span>{on && checkIco}
                  </button>
                )
              })}
              {isCustomActive && (
                <button type="button" onClick={() => { openCustomModal(); setRecOpen(false) }} style={{ ...rowBase, borderTop: HAIRLINE, cursor: 'pointer', fontWeight: 700 }}>
                  <span style={rowLbl}>{summarizeRRule(rrule)}</span>{checkIco}
                </button>
              )}
            </div>
            <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <button type="button" onClick={() => { openCustomModal(); setRecOpen(false) }} style={{ ...rowBase, cursor: 'pointer', fontWeight: 600 }}>
                <span style={rowLbl}>Personnaliser…</span><Chevron />
              </button>
            </div>
          </div>
        </MSheet>

        {/* Récurrence personnalisée (style Google Agenda) */}
        <MSheet open={customOpen} onClose={() => setCustomOpen(false)} full={false} label="Récurrence personnalisée" zIndex={Z + 200}>
          <SheetHeader leftLabel="Annuler" onLeft={() => setCustomOpen(false)} title="Récurrence personnalisée" rightLabel="Terminé" onRight={applyCustom} />
          <div style={{ ...M_SCROLL, flex: 'none', maxHeight: '72dvh' }}>
            <MSection>
              <span style={M_LBL}>Répéter tou(te)s les</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" inputMode="numeric" min={1} value={cInterval} onChange={e => setCInterval(Math.max(1, Number(e.target.value) || 1))}
                  style={{ ...M_INP, width: 72, flex: 'none', textAlign: 'center', padding: '0 8px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <MSeg<CustomUnit> value={cUnit} onChange={setCUnit} options={[{ v: 'jour', l: 'jour(s)' }, { v: 'semaine', l: 'semaine(s)' }, { v: 'mois', l: 'mois' }]} />
                </div>
              </div>
            </MSection>
            {cUnit === 'semaine' && (
              <MSection label="Répéter le">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                  {WEEKDAY_INITIAL.map((w, i) => {
                    const on = cDays.includes(i)
                    return (
                      <button key={i} type="button" aria-pressed={on} aria-label={WEEKDAY_LONG[i]} onClick={() => setCDays(d => on ? d.filter(x => x !== i) : [...d, i])}
                        style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', padding: 0,
                          background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--surface-card)' : 'var(--text-mid)' }}>{w}</button>
                    )
                  })}
                </div>
              </MSection>
            )}
            <MSection label="Se termine" bare>
              <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <button type="button" onClick={() => setCEnd('never')} style={{ ...rowBase, cursor: 'pointer' }}>
                  <span style={rowLbl}>Jamais</span>{cEnd === 'never' && checkIco}
                </button>
                <div role="button" tabIndex={0} onClick={() => setCEnd('on')} onKeyDown={e => { if (e.key === 'Enter') setCEnd('on') }} style={{ ...rowBase, borderTop: HAIRLINE, cursor: 'pointer' }}>
                  <span style={{ ...rowLbl, flex: 'none', width: 48 }}>Le</span>
                  <input type="date" value={cUntil} onClick={() => setCEnd('on')} onChange={e => { setCUntil(e.target.value); setCEnd('on') }}
                    style={{ ...M_INP, flex: 1, minHeight: 40, opacity: cEnd === 'on' ? 1 : 0.5 }} />
                  <span style={{ width: 20, display: 'flex' }}>{cEnd === 'on' && checkIco}</span>
                </div>
                <div role="button" tabIndex={0} onClick={() => setCEnd('after')} onKeyDown={e => { if (e.key === 'Enter') setCEnd('after') }} style={{ ...rowBase, borderTop: HAIRLINE, cursor: 'pointer' }}>
                  <span style={{ ...rowLbl, flex: 'none', width: 48 }}>Après</span>
                  <input type="number" inputMode="numeric" min={1} value={cCount} onClick={() => setCEnd('after')} onChange={e => { setCCount(Math.max(1, Number(e.target.value) || 1)); setCEnd('after') }}
                    style={{ ...M_INP, width: 72, flex: 'none', minHeight: 40, textAlign: 'center', padding: '0 8px', opacity: cEnd === 'after' ? 1 : 0.5 }} />
                  <span style={{ flex: 1, fontSize: 16, color: 'var(--text-mid)' }}>occurrences</span>
                  <span style={{ width: 20, display: 'flex' }}>{cEnd === 'after' && checkIco}</span>
                </div>
              </div>
            </MSection>
          </div>
        </MSheet>

        {/* Confirmation de suppression (toujours demandée) */}
        <MSheet open={confirmDel} onClose={() => setConfirmDel(false)} full={false} label="Supprimer cet événement ?" zIndex={Z + 300}>
          <div style={{ background: PAGE_BG, padding: '12px 16px calc(24px + env(safe-area-inset-bottom))' }}>
            <MConfirmDelete
              question={<><strong style={{ display: 'block', color: 'var(--text)', fontSize: 16, marginBottom: 4 }}>Supprimer cet événement ?</strong>Cette action est définitive et ne peut pas être annulée.</>}
              confirmLabel="Supprimer" cancelLabel="Annuler" busy={busy}
              onConfirm={() => { setConfirmDel(false); void remove() }} onCancel={() => setConfirmDel(false)} />
          </div>
        </MSheet>
      </>
    )
  }

  const field: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', margin: '0 0 5px' }

  return (
    <div className="agw-sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex' }}>
      <style>{`
        .agw-sheet-overlay { align-items: center; justify-content: center; padding: 16px; }
        .agw-sheet { width: min(460px,96vw); max-height: 90vh; border-radius: 18px; animation: agwPop .16s ease; }
        .agw-grab { display: none; }
        @keyframes agwPop { from { opacity:0; transform: scale(.97) } to { opacity:1; transform: scale(1) } }
        @media (max-width: 767px) {
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
              <button onClick={onClose} style={{ marginTop: 18, width: '100%', padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
            </>
          ) : (
            <>
              {/* Sélecteur type (création uniquement) */}
              {!editing && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', padding: 3 }}>
                  {(['event', 'session'] as const).map(k => (
                    <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: kind === k ? 'var(--primary)' : 'transparent', color: kind === k ? 'var(--on-primary,#fff)' : 'var(--text-mid)' }}>{k === 'event' ? 'Événement' : 'Séance'}</button>
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

              <div style={{ marginBottom: 12 }}>
                <p style={label}>Rappel</p>
                <select style={field} value={reminder} onChange={e => setReminder(Number(e.target.value))}>
                  {REMINDERS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                </select>
              </div>

              {kind === 'event' && (
                <div style={{ marginBottom: 12, position: 'relative' }}>
                  <p style={label}>Répétition</p>
                  {/* Menu déroulant custom (le <select> natif ne s'ouvrait pas de
                      façon fiable en thème sombre / dans l'overlay). */}
                  <button type="button" onClick={() => setRecOpen(o => !o)}
                    style={{ ...field, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentRecLabel}</span>
                    <span style={{ marginLeft: 8, transition: 'transform .15s', transform: recOpen ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)', flexShrink: 0 }}>▾</span>
                  </button>
                  {recOpen && (
                    <>
                      <div onClick={() => setRecOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow)', overflow: 'hidden', padding: 4 }}>
                        {recurrencePresets.map(r => {
                          const on = !isCustomActive && rrule === r.v
                          return (
                            <button key={r.v || 'once'} type="button"
                              onClick={() => { setRrule(r.v); setRecOpen(false) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit',
                                background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text)', fontWeight: on ? 700 : 500 }}>
                              <span style={{ width: 16, flexShrink: 0 }}>{on ? '✓' : ''}</span>{r.label}
                            </button>
                          )
                        })}
                        {isCustomActive && (
                          <button type="button" onClick={() => { openCustomModal(); setRecOpen(false) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit', background: 'var(--primary-dim)', color: 'var(--primary)', fontWeight: 700 }}>
                            <span style={{ width: 16, flexShrink: 0 }}>✓</span>{summarizeRRule(rrule)}
                          </button>
                        )}
                        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                        <button type="button" onClick={() => { openCustomModal(); setRecOpen(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit', background: 'transparent', color: 'var(--text-mid)', fontWeight: 600 }}>
                          <span style={{ width: 16, flexShrink: 0 }}>⚙</span>Personnaliser…
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <p style={label}>Couleur</p>
                {/* Repliée : pastille courante + bouton pour dérouler la palette. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: '0 0 0 2px var(--bg-card), 0 0 0 3px var(--border)' }} />
                  <button type="button" onClick={() => setPaletteOpen(o => !o)}
                    style={{ padding: '7px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {paletteOpen ? 'Fermer' : 'Autres couleurs'}
                  </button>
                </div>
                {paletteOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 8, marginTop: 10 }}>
                    {COLOR_PALETTE.map(c => {
                      const on = color.toLowerCase() === c.toLowerCase()
                      return (
                        <button key={c} type="button" aria-label={`Couleur ${c}`} onClick={() => { setColor(c); setPaletteOpen(false) }}
                          style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', padding: 0, boxShadow: on ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--text)' : 'none' }} />
                      )
                    })}
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
                    <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border)', marginBottom: 10 }}>
                      <p style={{ ...label, marginBottom: 6 }}>Blocs d'intensité</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-mid)', margin: 0 }}>{(event!.blocks as unknown[]).length} bloc(s) — édition détaillée sur Planning sports.</p>
                    </div>
                  )}
                  <Link href="/planning" style={{ display: 'block', textAlign: 'center', padding: 11, borderRadius: 'var(--r-md)', border: '1px solid var(--primary)', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>
                    Détailler la séance (blocs) sur Planning sports →
                  </Link>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {editing && (event!.source === 'event' || event!.source === 'google') && (
                  <button onClick={() => setConfirmDel(true)} disabled={busy} style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
                )}
                <button onClick={onClose} disabled={busy} style={{ flex: 1, padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={save} disabled={busy} style={{ flex: 1, padding: 12, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary,#fff)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : editing ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation de suppression (toujours demandée) */}
      {confirmDel && (
        <div onClick={e => { if (e.target === e.currentTarget) setConfirmDel(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 620, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: 'min(360px,96vw)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)', padding: '20px 22px', boxSizing: 'border-box' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>Supprimer cet événement ?</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>Cette action est définitive et ne peut pas être annulée.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmDel(false)} disabled={busy} style={{ padding: '10px 16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => { setConfirmDel(false); void remove() }} disabled={busy} style={{ padding: '10px 18px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{busy ? '…' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal récurrence personnalisée (style Google Agenda) */}
      {customOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setCustomOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: 'min(400px,96vw)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)', padding: '20px 22px', boxSizing: 'border-box' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, margin: '0 0 18px', color: 'var(--text)' }}>Récurrence personnalisée</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>Répéter tou(te)s les</span>
              <input type="number" min={1} value={cInterval} onChange={e => setCInterval(Math.max(1, Number(e.target.value) || 1))}
                style={{ ...field, width: 64, padding: '8px 10px' }} />
              <select value={cUnit} onChange={e => setCUnit(e.target.value as CustomUnit)} style={{ ...field, width: 130, padding: '8px 10px' }}>
                <option value="jour">jour(s)</option>
                <option value="semaine">semaine(s)</option>
                <option value="mois">mois</option>
              </select>
            </div>

            {cUnit === 'semaine' && (
              <div style={{ marginBottom: 16 }}>
                <p style={label}>Répéter le</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {WEEKDAY_INITIAL.map((w, i) => {
                    const on = cDays.includes(i)
                    return (
                      <button key={i} type="button" onClick={() => setCDays(d => on ? d.filter(x => x !== i) : [...d, i])}
                        style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{w}</button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <p style={label}>Se termine</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="radio" name="cend" checked={cEnd === 'never'} onChange={() => setCEnd('never')} /> Jamais
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="radio" name="cend" checked={cEnd === 'on'} onChange={() => setCEnd('on')} />
                  <span style={{ width: 40 }}>Le</span>
                  <input type="date" value={cUntil} onClick={() => setCEnd('on')} onChange={e => { setCUntil(e.target.value); setCEnd('on') }}
                    style={{ ...field, flex: 1, padding: '8px 10px', opacity: cEnd === 'on' ? 1 : 0.5 }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="radio" name="cend" checked={cEnd === 'after'} onChange={() => setCEnd('after')} />
                  <span style={{ width: 40 }}>Après</span>
                  <input type="number" min={1} value={cCount} onClick={() => setCEnd('after')} onChange={e => { setCCount(Math.max(1, Number(e.target.value) || 1)); setCEnd('after') }}
                    style={{ ...field, width: 72, padding: '8px 10px', opacity: cEnd === 'after' ? 1 : 0.5 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>occurrences</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setCustomOpen(false)} style={{ padding: '10px 16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={applyCustom} style={{ padding: '10px 18px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Terminé</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
