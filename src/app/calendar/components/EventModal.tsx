'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RaceStage } from './types'

interface ExistingFile { file_url: string; file_name: string }

interface Props {
  mode?: 'create' | 'edit'
  initialData?: RaceStage
  initialDate?: string   // jour cliqué → pré-remplit la date de début
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

export default function EventModal({ mode = 'create', initialData, initialDate, onClose, onSave }: Props) {
  const supabase = createClient()
  const isEdit = mode === 'edit'
  const [name,      setName]      = useState(initialData?.name ?? '')
  const [startDate, setStartDate] = useState(initialData?.startDate ?? initialDate ?? '')
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

  const [dayFiles,    setDayFiles]    = useState<Record<string, File | null>>({})
  const [existingFiles, setExistingFiles] = useState<Record<string, ExistingFile | null>>({})
  const [excludedDays,  setExcludedDays]  = useState<Set<string>>(new Set())
  const dayFileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const days        = getDaysBetween(startDate, endDate)
  const visibleDays = days.filter(d => !excludedDays.has(d))

  // Pre-load existing files in edit mode
  useEffect(() => {
    if (!isEdit || !initialData?.id) return
    supabase
      .from('race_event_files')
      .select('event_date, file_url, file_name')
      .eq('event_id', initialData.id)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, ExistingFile> = {}
        for (const row of data as { event_date: string; file_url: string; file_name: string }[]) {
          map[row.event_date] = { file_url: row.file_url, file_name: row.file_name }
        }
        setExistingFiles(map)
      })
  }, [isEdit, initialData?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    // When date range changes, clear excluded days that are no longer in range
    setExcludedDays(prev => {
      const next = new Set<string>()
      prev.forEach(d => { if (days.includes(d)) next.add(d) })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  async function deleteDay(d: string) {
    // In edit mode: delete file record from DB immediately
    if (isEdit && initialData?.id) {
      await supabase
        .from('race_event_files')
        .delete()
        .eq('event_id', initialData.id)
        .eq('event_date', d)
    }
    setExcludedDays(prev => new Set([...prev, d]))
    setExistingFiles(prev => { const n = { ...prev }; delete n[d]; return n })
    setDayFiles(prev => { const n = { ...prev }; delete n[d]; return n })
  }

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    setSaving(true)
    try {
      const dailyProgram = visibleDays.map(d => ({ date: d, content: program[d] ?? '' }))
      const allDayFiles = Object.entries(dayFiles)
        .filter((entry): entry is [string, File] => entry[1] !== null && visibleDays.includes(entry[0]))
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

        {/* Programme par jour */}
        {visibleDays.length > 0 && (
          <div>
            <label style={LBL}>Programme par jour</label>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {visibleDays.map(d => {
                const existing = existingFiles[d]
                const newF     = dayFiles[d]
                return (
                  <div key={d} style={{ position:'relative',borderLeft:'2px solid var(--border)',paddingLeft:12 }}>
                    {/* Day header with delete button */}
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5 }}>
                      <p style={{ fontSize:11,fontWeight:600,color:'var(--text-mid)',margin:0,textTransform:'capitalize' }}>
                        {labelDay(d)}
                      </p>
                      <button
                        onClick={() => deleteDay(d)}
                        disabled={visibleDays.length <= 1}
                        title="Supprimer ce jour"
                        style={{
                          background:'none',border:'none',cursor:visibleDays.length<=1?'not-allowed':'pointer',
                          color:visibleDays.length<=1?'var(--text-dim)':'#ef4444',
                          fontSize:13,lineHeight:1,padding:'2px 4px',flexShrink:0,
                          opacity:visibleDays.length<=1?0.3:1,
                        }}
                      >×</button>
                    </div>

                    <textarea rows={2} style={{ ...INP, resize:'vertical' as const }}
                      value={program[d] ?? ''} placeholder="Programme de la journée…"
                      onChange={e => setProgram(prev => ({ ...prev, [d]: e.target.value }))} />

                    {/* Per-day file */}
                    <div style={{ marginTop:6 }}>
                      {newF ? (
                        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                          <span style={{ flex:1,fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                            {newF.name}
                          </span>
                          <button onClick={() => setDayFiles(prev => ({ ...prev, [d]: null }))}
                            style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:12,flexShrink:0 }}>✕</button>
                        </div>
                      ) : existing ? (
                        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
                          <span style={{ fontSize:11 }}>📎</span>
                          <span style={{ flex:1,fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                            {existing.file_name}
                          </span>
                          <button
                            onClick={() => dayFileRefs.current[d]?.click()}
                            style={{ background:'none',border:'none',color:'#3b82f6',cursor:'pointer',fontSize:10,flexShrink:0,whiteSpace:'nowrap' }}>
                            ↺ Remplacer
                          </button>
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
                )
              })}
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
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:saving?'wait':'pointer',opacity:(!name.trim()||!startDate||!endDate)?0.5:1 }}>
            {saving ? '…' : isEdit ? 'Enregistrer' : '+ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
