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
import { IconX } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { RaceStage, StageSport, StageSession } from './types'
import ParcoursViewer from '@/components/gpx/ParcoursViewer'
import RaceDropZone from './RaceDropZone'
import { RACE_EDITOR_CSS } from './raceTheme'

interface ExistingFile { url: string; name: string; key: string }

interface Props {
  mode?: 'create' | 'edit'
  initialData?: RaceStage
  initialDate?: string
  onClose: () => void
  onDelete?: () => void
  onSave: (stage: Omit<RaceStage, 'id'>, dayFiles: { date: string; file: File }[]) => Promise<void>
}

const STAGE_SPORTS: { id: StageSport; label: string; color: string }[] = [
  { id:'run',   label:'Course à pied', color:'#f97316' },
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
const labelDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })

type DayProg = Record<string, { matin: StageSession[]; aprem: StageSession[] }>

export default function EventModal({ mode = 'create', initialData, initialDate, onClose, onDelete, onSave }: Props) {
  const supabase = createClient()
  const isEdit = mode === 'edit'
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

  const [parcoursNew, setParcoursNew] = useState<File[]>([])
  const [parcoursExisting, setParcoursExisting] = useState<ExistingFile[]>([])

  const days = getDaysBetween(startDate, endDate)

  // Charge les parcours existants (event_date sentinelle « parcours… »)
  useEffect(() => {
    if (!isEdit || !initialData?.id) return
    supabase.from('race_event_files').select('event_date, file_url, file_name').eq('event_id', initialData.id)
      .then(({ data }) => {
        if (!data) return
        const list = (data as { event_date: string; file_url: string; file_name: string }[])
          .filter(r => (r.event_date ?? '').startsWith('parcours') && isGpx(r.file_name))
          .map(r => ({ url: r.file_url, name: r.file_name, key: r.event_date }))
        setParcoursExisting(list)
      })
  }, [isEdit, initialData?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
          .filter(s => s.detail?.trim() || s.sport)
          .map(s => `${sportLabel(s.sport)} : ${s.detail || ''}`.trim())
          .join(' · ')
        return { date: d, content: summary, matin: dp.matin, aprem: dp.aprem }
      })
      const stamp = Date.now()
      const dayFiles = parcoursNew.filter(f => isGpx(f.name)).map((file, i) => ({ date: `parcours:${stamp}:${i}`, file }))
      await onSave(
        { name: name.trim(), startDate, endDate, description: desc || undefined, sports, dailyProgram },
        dayFiles,
      )
      onClose()
    } catch (e) { console.error('[EventModal save]', e) }
    finally { setSaving(false) }
  }

  const accent = sports.length ? sportColor(sports[0]) : '#5b6fff'

  return (
    <>
      <style>{RACE_EDITOR_CSS}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'raceScrimIn .2s ease' }} />
      <div className="race-ed" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 401, height: '94vh',
        background: 'var(--bg-card2)', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 50px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'raceSheetUp .34s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header sticky */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 className="ed-fr" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{isEdit ? 'Modifier le stage' : 'Ajouter un stage'}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} /></button>
        </div>

        {/* Corps scrollable — contenu centré */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Sports */}
            <div>
              <p style={LBL}>Sports</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {STAGE_SPORTS.map(s => {
                  const on = sports.includes(s.id)
                  return (
                    <button key={s.id} onClick={() => toggleSport(s.id)} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${on ? s.color : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: on ? `${s.color}1f` : 'var(--bg-card)', color: on ? s.color : 'var(--text-dim)' }}>{s.label}</button>
                  )
                })}
              </div>
            </div>

            {/* Nom + dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <div><p style={LBL}>Nom du stage</p><input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Stage Haute Montagne" /></div>
              <div><p style={LBL}>Début</p><input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><p style={LBL}>Fin</p><input type="date" style={INP} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            {days.length > 0 && <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '-8px 0 0' }}>Durée : <strong style={{ color: 'var(--text)' }}>{days.length} jour{days.length > 1 ? 's' : ''}</strong></p>}

            {/* Description */}
            <div><p style={LBL}>Description</p>
              <textarea rows={2} style={{ ...INP, resize: 'vertical' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Objectifs, contexte…" /></div>

            {/* Programme par jour : Matin / Après-midi */}
            {days.length > 0 && (
              <div>
                <p style={LBL}>Programme — Matin / Après-midi</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {days.map(d => {
                    const dp = program[d] ?? { matin: [], aprem: [] }
                    return (
                      <div key={d} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: 'var(--bg-card)' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px', textTransform: 'capitalize' }}>{labelDay(d)}</p>
                        {(['matin','aprem'] as const).map(slot => (
                          <div key={slot} style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{slot === 'matin' ? 'Matin' : 'Après-midi'}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {dp[slot].map((ses, i) => (
                                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <select value={ses.sport} onChange={e => updSession(d, slot, i, { sport: e.target.value as StageSport })} style={{ ...INP, width: 'auto', flex: 'none', minWidth: 130, padding: '8px 10px' }}>
                                    {sportOptions.map(sp => <option key={sp} value={sp}>{sportLabel(sp)}</option>)}
                                  </select>
                                  <input type="time" value={ses.time ?? ''} onChange={e => updSession(d, slot, i, { time: e.target.value })} style={{ ...INP, width: 'auto', flex: 'none', padding: '8px 10px' }} />
                                  <input value={ses.detail} onChange={e => updSession(d, slot, i, { detail: e.target.value })} placeholder="Détail de la séance…" style={{ ...INP, flex: 1, minWidth: 140, padding: '8px 10px' }} />
                                  <button onClick={() => rmSession(d, slot, i)} aria-label="Retirer" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}><IconX size={16} /></button>
                                </div>
                              ))}
                              <button onClick={() => addSession(d, slot)} style={{ alignSelf: 'flex-start', fontSize: 11.5, color: 'var(--text-dim)', background: 'var(--bg-card2)', border: '1px dashed var(--border-mid)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>
                                + Séance {slot === 'matin' ? 'du matin' : "de l'après-midi"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Parcours (multiples) */}
            <div>
              <p style={LBL}>Parcours</p>
              <RaceDropZone list={parcoursNew} setter={setParcoursNew} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {parcoursExisting.map(p => (
                  <div key={p.key}>
                    <p style={{ fontSize: 11.5, color: 'var(--text-mid)', margin: '0 0 4px' }}>📍 {p.name}</p>
                    <ParcoursViewer fileUrl={p.url} />
                  </div>
                ))}
                {parcoursNew.filter(f => isGpx(f.name)).map((f, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 11.5, color: 'var(--text-mid)', margin: '0 0 4px' }}>📍 {f.name}</p>
                    <ParcoursViewer file={f} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer sticky */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 900, alignItems: 'center' }}>
            {isEdit && onDelete && (confirmDelete ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ef4444' }}>Supprimer ce stage ?</span>
                <button onClick={onDelete} style={{ padding: '10px 16px', borderRadius: 999, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Confirmer</button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: '10px 14px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ padding: 12, borderRadius: 999, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Supprimer</button>
            ))}
            {!confirmDelete && (<>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
              <button onClick={handleSave} disabled={saving || !name.trim() || !startDate || !endDate} style={{ flex: 2, padding: 12, borderRadius: 999, background: accent, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: saving ? 'wait' : 'pointer', opacity: (!name.trim() || !startDate || !endDate) ? 0.5 : 1 }}>{saving ? '…' : isEdit ? 'Enregistrer' : 'Ajouter'}</button>
            </>)}
          </div>
        </div>
      </div>
    </>
  )
}
