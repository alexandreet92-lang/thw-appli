'use client'
import { useState, useRef, useEffect } from 'react'
import { RaceStage } from './types'

interface Props {
  mode?: 'create' | 'edit'
  initialData?: RaceStage
  onClose: () => void
  onSave: (stage: Omit<RaceStage, 'id'>, dayFiles: { date: string; file: File }[]) => Promise<void>
}

const INP = { width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }
const LBL = { fontSize:10,fontWeight:600 as const,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4,display:'block' as const }

function getDaysBetween(start: string, end: string): string[] {
  if (!start || !end || start > end) return []
  const days: string[] = []
  const cur = new Date(start)
  const fin = new Date(end)
  while (cur <= fin) {
    days.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function labelDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
}

export default function EventModal({ mode = 'create', initialData, onClose, onSave }: Props) {
  const isEdit = mode === 'edit'
  const [name,      setName]      = useState(initialData?.name ?? '')
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '')
  const [endDate,   setEndDate]   = useState(initialData?.endDate ?? '')
  const [desc,      setDesc]      = useState(initialData?.description ?? '')
  const [saving,    setSaving]    = useState(false)

  const [program, setProgram] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    if (initialData?.dailyProgram) {
      for (const { date, content } of initialData.dailyProgram) init[date] = content
    }
    return init
  })

  // Per-day file state: one file per day (null = none selected)
  const [dayFiles, setDayFiles] = useState<Record<string, File | null>>({})
  const dayFileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const days = getDaysBetween(startDate, endDate)

  // Sync program keys when date range changes
  useEffect(() => {
    setProgram(prev => {
      const next: Record<string, string> = {}
      days.forEach(d => { next[d] = prev[d] ?? '' })
      return next
    })
    setDayFiles(prev => {
      const next: Record<string, File | null> = {}
      days.forEach(d => { next[d] = prev[d] ?? null })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    setSaving(true)
    try {
      const dailyProgram = days.map(d => ({ date: d, content: program[d] ?? '' }))
      const allDayFiles = Object.entries(dayFiles)
        .filter((entry): entry is [string, File] => entry[1] !== null)
        .map(([date, file]) => ({ date, file }))
      await onSave(
        { name: name.trim(), startDate, endDate, description: desc || undefined, dailyProgram },
        allDayFiles,
      )
      onClose()
    } catch (e) { console.error('[EventModal save]', e) }
    finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:560,width:'100%',maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:16 }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0 }}>
            {isEdit ? 'Modifier l\'événement' : 'Ajouter un événement'}
          </h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>

        {/* Nom */}
        <div>
          <label style={LBL}>Nom</label>
          <input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Stage Haute Montagne" />
        </div>

        {/* Dates */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
          <div>
            <label style={LBL}>Date de début</label>
            <input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={LBL}>Date de fin</label>
            <input type="date" style={INP} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={LBL}>Description</label>
          <textarea rows={2} style={{ ...INP, resize:'vertical' as const }} value={desc}
            onChange={e => setDesc(e.target.value)} placeholder="Objectifs, contexte…" />
        </div>

        {/* Programme par jour — avec upload par jour */}
        {days.length > 0 && (
          <div>
            <label style={LBL}>Programme par jour</label>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {days.map(d => (
                <div key={d} style={{ borderLeft:'2px solid var(--border)',paddingLeft:12 }}>
                  <p style={{ fontSize:11,fontWeight:600,color:'var(--text-mid)',margin:'0 0 5px',textTransform:'capitalize' }}>
                    {labelDay(d)}
                  </p>
                  <textarea rows={2} style={{ ...INP, resize:'vertical' as const }}
                    value={program[d] ?? ''} placeholder="Programme de la journée…"
                    onChange={e => setProgram(prev => ({ ...prev, [d]: e.target.value }))} />

                  {/* Per-day file upload */}
                  <div style={{ marginTop:6 }}>
                    {dayFiles[d] ? (
                      <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                        <span style={{ flex:1,fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                          {dayFiles[d]!.name}
                        </span>
                        <button onClick={() => setDayFiles(prev => ({ ...prev, [d]: null }))}
                          style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:12,flexShrink:0 }}>✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => dayFileRefs.current[d]?.click()}
                        style={{ fontSize:10,color:'var(--text-dim)',background:'var(--bg-card2)',border:'1px dashed var(--border)',borderRadius:7,padding:'5px 10px',cursor:'pointer',width:'100%' }}>
                        + Fichier du jour (GPX, PDF, image…)
                      </button>
                    )}
                    <input
                      ref={el => { dayFileRefs.current[d] = el }}
                      type="file"
                      style={{ display:'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) setDayFiles(prev => ({ ...prev, [d]: file }))
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boutons */}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !startDate || !endDate}
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:saving?'wait':'pointer',opacity:(!name.trim()||!startDate||!endDate)?0.5:1 }}>
            {saving ? '…' : isEdit ? 'Enregistrer' : '+ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
