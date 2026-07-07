'use client'
// ══════════════════════════════════════════════════════════════════
// EventModal — éditeur de STAGE en sheet bas→haut PLEINE LARGEUR,
// même coquille que l'éditeur de course (RaceEditorSheet) : scrim, sheet
// animée, header sticky, corps scrollable centré, footer sticky.
// Logique métier inchangée : sports multi, durée auto, séances Matin/
// Après-midi structurées, parcours multiples (GPX), suppression, et push
// auto au planning géré côté page. Persistance JSONB daily_program.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { RaceStage, StageSport, StageSession, StageDayParcours } from './types'
import ParcoursViewer from '@/components/gpx/ParcoursViewer'
import { parseRouteFile } from '@/lib/parcours/parseRouteFile'
import { RACE_EDITOR_CSS } from './raceTheme'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

interface Props {
  mode?: 'create' | 'edit'
  initialData?: RaceStage
  initialDate?: string
  onClose: () => void
  onDelete?: () => void
  onSave: (stage: Omit<RaceStage, 'id'>, dayFiles: { date: string; file: File }[]) => Promise<void>
}

const STAGE_SPORTS: { id: StageSport; label: string; color: string }[] = [
  { id:'run',   label:'Running', color:'#22c55e' },
  { id:'trail', label:'Trail',         color:'#84cc16' },
  { id:'bike',  label:'Cyclisme',      color:'#3b82f6' },
  { id:'swim',  label:'Natation',      color:'#06b6d4' },
  { id:'hyrox', label:'Hyrox',         color:'#ec4899' },
  { id:'rowing',label:'Aviron',        color:'#14b8a6' },
  { id:'muscu', label:'Muscu',         color:'#8b5cf6' },
]
const sportLabel = (s: StageSport) => STAGE_SPORTS.find(x => x.id === s)?.label ?? s
const sportColor = (s: StageSport) => STAGE_SPORTS.find(x => x.id === s)?.color ?? 'var(--text-dim)'

const LBL: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }
const INP: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }
const isGpx = (n: string) => /\.(gpx|tcx|kml)$/i.test(n)

function getDaysBetween(start: string, end: string): string[] {
  if (!start || !end || start > end) return []
  const days: string[] = []
  const cur = new Date(start), fin = new Date(end)
  while (cur <= fin) { days.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1) }
  return days
}
const labelDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday:'long', day:'numeric', month:'long' })

type DayProg = Record<string, { matin: StageSession[]; aprem: StageSession[] }>

export default function EventModal({ mode = 'create', initialData, initialDate, onClose, onDelete, onSave }: Props) {
  const { t } = useI18n()
  const supabase = createClient()
  const isEdit = mode === 'edit'
  // Portail sur <body> : échappe au contexte d'empilement du swipe/onglets
  // (sinon la sheet passe SOUS la barre d'onglets et le bouton Enregistrer
  // devient invisible).
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  // Masque la barre d'onglets du bas tant que l'éditeur est ouvert.
  useEffect(() => {
    document.body.classList.add('race-editor-open')
    return () => document.body.classList.remove('race-editor-open')
  }, [])
  const [name,      setName]      = useState(initialData?.name ?? '')
  const [startDate, setStartDate] = useState(initialData?.startDate ?? initialDate ?? '')
  const [endDate,   setEndDate]   = useState(initialData?.endDate ?? initialData?.startDate ?? initialDate ?? '')
  const [desc,      setDesc]      = useState(initialData?.description ?? '')
  const [sports,    setSports]    = useState<StageSport[]>(initialData?.sports ?? [])
  const [saving,    setSaving]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [program, setProgram] = useState<DayProg>(() => {
    const init: DayProg = {}
    for (const d of initialData?.dailyProgram ?? []) init[d.date] = { matin: d.matin ?? [], aprem: d.aprem ?? [] }
    return init
  })

  // Parcours PAR JOUR : fichier neuf, URL existante, et data parse (pour le planning).
  const [dayParcoursFile, setDayParcoursFile] = useState<Record<string, File | null>>({})
  const [dayParcoursUrl,  setDayParcoursUrl]  = useState<Record<string, { url: string; name: string }>>({})
  const [dayParcours,     setDayParcours]     = useState<Record<string, StageDayParcours | undefined>>(() => {
    const init: Record<string, StageDayParcours | undefined> = {}
    for (const d of initialData?.dailyProgram ?? []) if (d.parcours) init[d.date] = d.parcours
    return init
  })

  const days = getDaysBetween(startDate, endDate)

  // Charge les parcours existants par jour (event_date = date réelle YYYY-MM-DD).
  useEffect(() => {
    if (!isEdit || !initialData?.id) return
    supabase.from('race_event_files').select('event_date, file_url, file_name').eq('event_id', initialData.id)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, { url: string; name: string }> = {}
        for (const r of data as { event_date: string; file_url: string; file_name: string }[]) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(r.event_date ?? '') && isGpx(r.file_name)) {
            map[r.event_date] = { url: r.file_url, name: r.file_name }
          }
        }
        setDayParcoursUrl(map)
      })
  }, [isEdit, initialData?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sélection d'un parcours pour un jour : parse immédiat (aperçu + push planning).
  async function pickDayParcours(date: string, file: File) {
    setDayParcoursFile(prev => ({ ...prev, [date]: file }))
    const parsed = await parseRouteFile(file)
    if (parsed) setDayParcours(prev => ({ ...prev, [date]: { ...parsed, fileName: file.name } }))
  }
  function clearDayParcours(date: string) {
    setDayParcoursFile(prev => ({ ...prev, [date]: null }))
    setDayParcoursUrl(prev => { const n = { ...prev }; delete n[date]; return n })
    setDayParcours(prev => { const n = { ...prev }; delete n[date]; return n })
  }

  // Synchronise les clés de programme avec la plage de dates
  useEffect(() => {
    setProgram(prev => {
      const next: DayProg = {}
      days.forEach(d => { next[d] = prev[d] ?? { matin: [], aprem: [] } })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  function toggleSport(s: StageSport) {
    setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  const sportOptions = sports.length ? sports : STAGE_SPORTS.map(s => s.id)

  function addSession(date: string, slot: 'matin' | 'aprem') {
    setProgram(prev => {
      const day = prev[date] ?? { matin: [], aprem: [] }
      const ses: StageSession = { sport: sportOptions[0], detail: '', time: slot === 'matin' ? '09:00' : '15:00' }
      return { ...prev, [date]: { ...day, [slot]: [...day[slot], ses] } }
    })
  }
  function updSession(date: string, slot: 'matin' | 'aprem', i: number, patch: Partial<StageSession>) {
    setProgram(prev => {
      const day = prev[date]; if (!day) return prev
      const arr = day[slot].map((s, idx) => idx === i ? { ...s, ...patch } : s)
      return { ...prev, [date]: { ...day, [slot]: arr } }
    })
  }
  function rmSession(date: string, slot: 'matin' | 'aprem', i: number) {
    setProgram(prev => {
      const day = prev[date]; if (!day) return prev
      return { ...prev, [date]: { ...day, [slot]: day[slot].filter((_, idx) => idx !== i) } }
    })
  }

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    setSaving(true)
    try {
      const dailyProgram = days.map(d => {
        const dp = program[d] ?? { matin: [], aprem: [] }
        const summary = [...dp.matin, ...dp.aprem]
          .filter(s => s.title?.trim() || s.detail?.trim() || s.sport)
          .map(s => `${s.title?.trim() || sportLabel(s.sport)}${s.detail?.trim() ? ` : ${s.detail.trim()}` : ''}`)
          .join(' · ')
        return { date: d, content: summary, matin: dp.matin, aprem: dp.aprem, parcours: dayParcours[d] }
      })
      // Un parcours par jour : event_date = date réelle (stockage + relecture par jour).
      const dayFiles = days
        .filter(d => dayParcoursFile[d])
        .map(d => ({ date: d, file: dayParcoursFile[d] as File }))
      await onSave(
        { name: name.trim(), startDate, endDate, description: desc || undefined, sports, dailyProgram },
        dayFiles,
      )
      onClose()
    } catch (e) { console.error('[EventModal save]', e) }
    finally { setSaving(false) }
  }

  const accent = sports.length ? sportColor(sports[0]) : '#5b6fff'

  if (!mounted) return null

  return createPortal(
    <>
      <style>{RACE_EDITOR_CSS}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'raceScrimIn .2s ease' }} />
      <div className="race-ed" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, top: 'max(64px, calc(env(safe-area-inset-top, 0px) + 48px))', zIndex: 9999,
        background: 'var(--bg-card2)', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 50px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'raceSheetUp .34s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header sticky */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 className="ed-fr" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{isEdit ? t('calendar.editStage') : t('calendar.addStage')}</h3>
          <button onClick={onClose} aria-label={t('calendar.close')} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} /></button>
        </div>

        {/* Corps scrollable — contenu centré */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Sports */}
            <div>
              <p style={LBL}>{t('calendar.sports')}</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {STAGE_SPORTS.map(s => {
                  const on = sports.includes(s.id)
                  return (
                    <button key={s.id} onClick={() => toggleSport(s.id)} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${on ? s.color : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: on ? `${s.color}1f` : 'var(--bg-card)', color: on ? s.color : 'var(--text-dim)' }}>{s.label}</button>
                  )
                })}
              </div>
            </div>

            {/* Nom + dates — nom pleine largeur, dates côte à côte (lisible sur mobile) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><p style={LBL}>{t('calendar.stageName')}</p><input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder={t('calendar.stageNamePlaceholder')} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><p style={LBL}>{t('calendar.start')}</p><input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><p style={LBL}>{t('calendar.end')}</p><input type="date" style={INP} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
              </div>
            </div>
            {days.length > 0 && <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '-8px 0 0' }}>{t('calendar.duration')} : <strong style={{ color: 'var(--text)' }}>{days.length > 1 ? t('calendar.daysCountPlural', { n: days.length }) : t('calendar.daysCount', { n: days.length })}</strong></p>}

            {/* Description */}
            <div><p style={LBL}>{t('calendar.description')}</p>
              <textarea rows={2} style={{ ...INP, resize: 'vertical' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('calendar.stageDescPlaceholder')} /></div>

            {/* Programme par jour : Matin / Après-midi */}
            {days.length > 0 && (
              <div>
                <p style={LBL}>{t('calendar.programMorningAfternoon')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {days.map(d => {
                    const dp = program[d] ?? { matin: [], aprem: [] }
                    return (
                      <div key={d} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: 'var(--bg-card)' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px', textTransform: 'capitalize' }}>{labelDay(d)}</p>
                        {(['matin','aprem'] as const).map(slot => (
                          <div key={slot} style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{slot === 'matin' ? t('calendar.morning') : t('calendar.afternoon')}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {dp[slot].map((ses, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '9px 10px', borderRadius: 11, border: `1px solid ${sportColor(ses.sport)}33`, background: 'var(--bg-card2)' }}>
                                  {/* Ligne 1 : sport · heure · supprimer */}
                                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sportColor(ses.sport), flexShrink: 0 }} />
                                    <select value={ses.sport} onChange={e => updSession(d, slot, i, { sport: e.target.value as StageSport })} style={{ ...INP, flex: 1, minWidth: 0, padding: '8px 10px' }}>
                                      {sportOptions.map(sp => <option key={sp} value={sp}>{sportLabel(sp)}</option>)}
                                    </select>
                                    <input type="time" value={ses.time ?? ''} onChange={e => updSession(d, slot, i, { time: e.target.value })} style={{ ...INP, width: 118, flex: 'none', padding: '8px 10px' }} />
                                    <button onClick={() => rmSession(d, slot, i)} aria-label={t('calendar.remove')} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconX size={15} /></button>
                                  </div>
                                  {/* Ligne 2 : titre */}
                                  <input value={ses.title ?? ''} onChange={e => updSession(d, slot, i, { title: e.target.value })} placeholder={t('calendar.sessionTitlePlaceholder')} style={{ ...INP, padding: '8px 10px' }} />
                                  {/* Ligne 3 : détail */}
                                  <input value={ses.detail} onChange={e => updSession(d, slot, i, { detail: e.target.value })} placeholder={t('calendar.detailPlaceholder')} style={{ ...INP, padding: '8px 10px' }} />
                                </div>
                              ))}
                              <button onClick={() => addSession(d, slot)} style={{ alignSelf: 'flex-start', fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--bg-card2)', border: '1px dashed var(--border-mid)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>
                                {slot === 'matin' ? t('calendar.addMorningSession') : t('calendar.addAfternoonSession')}
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Parcours du jour */}
                        <div style={{ marginTop: 4 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{t('calendar.dayRoute')}</p>
                          {(dayParcoursFile[d] || dayParcoursUrl[d]) ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 11.5, color: 'var(--text-mid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  📍 {dayParcoursFile[d]?.name ?? dayParcoursUrl[d]?.name}
                                </span>
                                <button onClick={() => clearDayParcours(d)} aria-label={t('calendar.removeRoute')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}><IconX size={15} /></button>
                              </div>
                              {dayParcoursFile[d]
                                ? <ParcoursViewer file={dayParcoursFile[d] as File} />
                                : dayParcoursUrl[d] ? <ParcoursViewer fileUrl={dayParcoursUrl[d].url} /> : null}
                            </>
                          ) : (
                            <label style={{ display: 'block', textAlign: 'center', fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--bg-card2)', border: '1.5px dashed var(--border-mid)', borderRadius: 10, padding: 12, cursor: 'pointer' }}>
                              {t('calendar.importRoute')}
                              <input type="file" accept=".gpx,.tcx,.kml" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) void pickDayParcours(d, f); e.target.value = '' }} />
                            </label>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer sticky */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 900, alignItems: 'center' }}>
            {isEdit && onDelete && (confirmDelete ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ef4444' }}>{t('calendar.deleteStageConfirm')}</span>
                <button onClick={onDelete} style={{ padding: '10px 16px', borderRadius: 999, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('calendar.confirm')}</button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: '10px 14px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer' }}>{t('calendar.cancel')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ padding: 12, borderRadius: 999, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>{t('calendar.delete')}</button>
            ))}
            {!confirmDelete && (<>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('calendar.close')}</button>
              <button onClick={handleSave} disabled={saving || !name.trim() || !startDate || !endDate} style={{ flex: 2, padding: 12, borderRadius: 999, background: accent, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: saving ? 'wait' : 'pointer', opacity: (!name.trim() || !startDate || !endDate) ? 0.5 : 1 }}>{saving ? '…' : isEdit ? t('calendar.save') : t('calendar.add')}</button>
            </>)}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
