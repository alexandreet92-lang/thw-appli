'use client'
// ══════════════════════════════════════════════════════════════════
// EventModal — éditeur de STAGE (bloc d'entraînement multi-jours).
// - Sports multi-sélection (sans triathlon, avec muscu)
// - Durée auto via dates début/fin
// - Par jour : séances structurées Matin / Après-midi (sport + détail + heure)
// - Plusieurs parcours libres (GPX) avec carte + profil (ParcoursViewer)
// - Supprimer + confirmation
// Données persistées dans le JSONB daily_program (zéro migration) ; parcours
// dans race_event_files (event_date sentinelle « parcours:… »).
// ══════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RaceStage, StageSport, StageSession } from './types'
import ParcoursViewer from '@/components/gpx/ParcoursViewer'

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

const INP = { width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }
const LBL = { fontSize:10,fontWeight:600 as const,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4,display:'block' as const }
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
  const parcoursRef = useRef<HTMLInputElement>(null)

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
      const dayFiles = parcoursNew.map((file, i) => ({ date: `parcours:${stamp}:${i}`, file }))
      await onSave(
        { name: name.trim(), startDate, endDate, description: desc || undefined, sports, dailyProgram },
        dayFiles,
      )
      onClose()
    } catch (e) { console.error('[EventModal save]', e) }
    finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:620,width:'100%',maxHeight:'92vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:16 }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0 }}>{isEdit ? 'Modifier le stage' : 'Ajouter un stage'}</h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>

        {/* Nom */}
        <div>
          <label style={LBL}>Nom du stage</label>
          <input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Stage Haute Montagne" />
        </div>

        {/* Sports multi */}
        <div>
          <label style={LBL}>Sports</label>
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
            {STAGE_SPORTS.map(s => {
              const on = sports.includes(s.id)
              return (
                <button key={s.id} onClick={() => toggleSport(s.id)}
                  style={{ padding:'6px 12px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',
                    border:`1px solid ${on ? s.color : 'var(--border)'}`,
                    background: on ? `${s.color}1f` : 'transparent', color: on ? s.color : 'var(--text-dim)' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dates → durée auto */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div><label style={LBL}>Date de début</label><input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div><label style={LBL}>Date de fin</label><input type="date" style={INP} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>
        {days.length > 0 && <p style={{ fontSize:11,color:'var(--text-dim)',margin:'-6px 0 0' }}>Durée : <strong style={{ color:'var(--text)' }}>{days.length} jour{days.length > 1 ? 's' : ''}</strong></p>}

        {/* Description */}
        <div>
          <label style={LBL}>Description</label>
          <textarea rows={2} style={{ ...INP, resize:'vertical' as const }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Objectifs, contexte…" />
        </div>

        {/* Programme par jour : Matin / Après-midi */}
        {days.length > 0 && (
          <div>
            <label style={LBL}>Programme — Matin / Après-midi</label>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              {days.map(d => {
                const dp = program[d] ?? { matin: [], aprem: [] }
                return (
                  <div key={d} style={{ borderLeft:'2px solid var(--border)',paddingLeft:12 }}>
                    <p style={{ fontSize:11,fontWeight:700,color:'var(--text-mid)',margin:'0 0 8px',textTransform:'capitalize' }}>{labelDay(d)}</p>
                    {(['matin','aprem'] as const).map(slot => (
                      <div key={slot} style={{ marginBottom:10 }}>
                        <p style={{ fontSize:10,fontWeight:600,color:'var(--text-dim)',margin:'0 0 5px' }}>{slot === 'matin' ? 'Matin' : 'Après-midi'}</p>
                        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                          {dp[slot].map((ses, i) => (
                            <div key={i} style={{ display:'flex',gap:6,alignItems:'center',flexWrap:'wrap' }}>
                              <select value={ses.sport} onChange={e => updSession(d, slot, i, { sport: e.target.value as StageSport })}
                                style={{ ...INP, width:'auto',flex:'none',minWidth:120 }}>
                                {sportOptions.map(sp => <option key={sp} value={sp}>{sportLabel(sp)}</option>)}
                              </select>
                              <input type="time" value={ses.time ?? ''} onChange={e => updSession(d, slot, i, { time: e.target.value })}
                                style={{ ...INP, width:'auto',flex:'none' }} />
                              <input value={ses.detail} onChange={e => updSession(d, slot, i, { detail: e.target.value })}
                                placeholder="Détail de la séance…" style={{ ...INP, flex:1,minWidth:120 }} />
                              <button onClick={() => rmSession(d, slot, i)} style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:15,lineHeight:1,padding:'2px 4px',flexShrink:0 }}>×</button>
                            </div>
                          ))}
                          <button onClick={() => addSession(d, slot)} style={{ alignSelf:'flex-start',fontSize:10,color:'var(--text-dim)',background:'var(--bg-card2)',border:'1px dashed var(--border)',borderRadius:7,padding:'5px 10px',cursor:'pointer' }}>
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
          <label style={LBL}>Parcours</label>
          <button onClick={() => parcoursRef.current?.click()} style={{ fontSize:11,color:'var(--text-mid)',background:'var(--bg-card2)',border:'1px dashed var(--border)',borderRadius:8,padding:'7px 12px',cursor:'pointer' }}>
            + Importer un parcours (GPX)
          </button>
          <input ref={parcoursRef} type="file" accept=".gpx,.tcx,.kml" style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f && isGpx(f.name)) setParcoursNew(prev => [...prev, f]); if (e.target) e.target.value = '' }} />
          <div style={{ display:'flex',flexDirection:'column',gap:10,marginTop:10 }}>
            {parcoursExisting.map(p => (
              <div key={p.key}>
                <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
                  <span style={{ fontSize:11,color:'var(--text-mid)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>📍 {p.name}</span>
                </div>
                <ParcoursViewer fileUrl={p.url} />
              </div>
            ))}
            {parcoursNew.map((f, i) => (
              <div key={i}>
                <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
                  <span style={{ fontSize:11,color:'var(--text-mid)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>📍 {f.name}</span>
                  <button onClick={() => setParcoursNew(prev => prev.filter((_, idx) => idx !== i))} style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:13 }}>✕</button>
                </div>
                <ParcoursViewer file={f} />
              </div>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          {isEdit && onDelete && (confirmDelete ? (
            <div style={{ display:'flex',gap:6,alignItems:'center',flex:1,flexWrap:'wrap' }}>
              <span style={{ fontSize:12,fontWeight:600,color:'#ef4444' }}>Supprimer ce stage ?</span>
              <button onClick={onDelete} style={{ padding:'9px 14px',borderRadius:10,background:'#ef4444',border:'none',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer' }}>Confirmer</button>
              <button onClick={() => setConfirmDelete(false)} style={{ padding:'9px 12px',borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Annuler</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{ padding:'10px 14px',borderRadius:10,background:'transparent',border:'1px solid #ef4444',color:'#ef4444',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0 }}>Supprimer</button>
          ))}
          {!confirmDelete && (<>
            <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>Fermer</button>
            <button onClick={handleSave} disabled={saving || !name.trim() || !startDate || !endDate}
              style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:saving?'wait':'pointer',opacity:(!name.trim()||!startDate||!endDate)?0.5:1 }}>
              {saving ? '…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </>)}
        </div>
      </div>
    </div>
  )
}
