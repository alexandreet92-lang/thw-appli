'use client'
import { useState, useRef, useEffect } from 'react'
import { RaceStage } from './types'

interface Props {
  onClose: () => void
  onSave: (stage: Omit<RaceStage, 'id'>, files: File[]) => Promise<void>
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

export default function EventModal({ onClose, onSave }: Props) {
  const [name,      setName]      = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [desc,      setDesc]      = useState('')
  const [program,   setProgram]   = useState<Record<string,string>>({})
  const [files,     setFiles]     = useState<File[]>([])
  const [dragOver,  setDragOver]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const days = getDaysBetween(startDate, endDate)

  useEffect(() => {
    setProgram(prev => {
      const next: Record<string,string> = {}
      days.forEach(d => { next[d] = prev[d] ?? '' })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles(prev => [...prev, ...Array.from(list)])
  }

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    setSaving(true)
    try {
      const dailyProgram = days.map(d => ({ date: d, content: program[d] ?? '' }))
      await onSave({ name: name.trim(), startDate, endDate, description: desc || undefined, dailyProgram }, files)
      onClose()
    } catch (e) { console.error('[EventModal save]', e) }
    finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:560,width:'100%',maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:16 }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0 }}>Ajouter un événement</h3>
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
        {days.length > 0 && (
          <div>
            <label style={LBL}>Programme par jour</label>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {days.map(d => (
                <div key={d}>
                  <p style={{ fontSize:11,fontWeight:600,color:'var(--text-mid)',margin:'0 0 3px',textTransform:'capitalize' }}>
                    {labelDay(d)}
                  </p>
                  <textarea rows={2} style={{ ...INP, resize:'vertical' as const }}
                    value={program[d] ?? ''} placeholder="Programme de la journée…"
                    onChange={e => setProgram(prev => ({ ...prev, [d]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload fichiers */}
        <div>
          <label style={LBL}>Fichiers</label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#3b82f6' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(59,130,246,0.06)' : 'var(--bg-card2)',
              transition: 'border-color 0.15s',
            }}
          >
            <p style={{ fontSize:11,color:'var(--text-dim)',margin:0 }}>
              Glisser-déposer ou <span style={{ color:'#3b82f6' }}>Parcourir</span>
            </p>
            <input ref={fileRef} type="file" multiple style={{ display:'none' }}
              onChange={e => addFiles(e.target.files)} />
          </div>
          {files.length > 0 && (
            <div style={{ marginTop:6,display:'flex',flexDirection:'column',gap:3 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,background:'var(--bg-card2)' }}>
                  <span style={{ flex:1,fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{f.name}</span>
                  <button onClick={() => setFiles(p => p.filter((_,j)=>j!==i))}
                    style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:12 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Boutons */}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !startDate || !endDate}
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:saving?'wait':'pointer',opacity:(!name.trim()||!startDate||!endDate)?0.5:1 }}>
            {saving ? '…' : '+ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
