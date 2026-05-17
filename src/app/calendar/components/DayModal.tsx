'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RaceStage } from './types'
import GpxRouteMap from '@/components/gpx/GpxRouteMap'

interface DayFile { id: string; file_url: string; file_name: string }

interface Props {
  stage: RaceStage
  date: string  // YYYY-MM-DD
  onClose: () => void
  onSave: (date: string, content: string, file?: File) => Promise<void>
}

const INP = { width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }
const LBL = { fontSize:10,fontWeight:600 as const,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4,display:'block' as const }

function isGpxName(n: string) { return n.toLowerCase().endsWith('.gpx') }

function labelDay(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function DayModal({ stage, date, onClose, onSave }: Props) {
  const supabase = createClient()
  const initContent = stage.dailyProgram.find(p => p.date === date)?.content ?? ''
  const [content,  setContent]  = useState(initContent)
  const [dayFile,  setDayFile]  = useState<DayFile | null>(null)
  const [newFile,  setNewFile]  = useState<File | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [loadFile, setLoadFile] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('race_event_files')
      .select('id, file_url, file_name')
      .eq('event_id', stage.id)
      .eq('event_date', date)
      .maybeSingle()
      .then(({ data }) => { setDayFile(data as DayFile | null); setLoadFile(false) })
  }, [stage.id, date]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    try { await onSave(date, content, newFile ?? undefined) }
    catch (e) { console.error('[DayModal save]', e) }
    finally { setSaving(false) }
  }

  // Resolve what to display: new file (local) takes priority over existing remote
  const displayFile = newFile
    ? { url: URL.createObjectURL(newFile), name: newFile.name, isLocal: true }
    : dayFile
    ? { url: dayFile.file_url, name: dayFile.file_name, isLocal: false }
    : null

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:520,width:'100%',maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:16 }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12 }}>
          <div>
            <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#3b82f6',margin:'0 0 3px' }}>
              {stage.name}
            </p>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0,textTransform:'capitalize' }}>
              {labelDay(date)}
            </h3>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'var(--text-dim)',fontSize:14,flexShrink:0 }}>✕</button>
        </div>

        {/* GPX map */}
        {!loadFile && displayFile && isGpxName(displayFile.name) && (
          <GpxRouteMap fileUrl={displayFile.url} height={200} />
        )}

        {/* Other file */}
        {!loadFile && displayFile && !isGpxName(displayFile.name) && (
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:9,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
            <span style={{ fontSize:16 }}>📄</span>
            <span style={{ flex:1,fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{displayFile.name}</span>
            {!displayFile.isLocal && (
              <a href={displayFile.url} download={displayFile.name} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:10,color:'#3b82f6',textDecoration:'none',whiteSpace:'nowrap' }}>
                Télécharger
              </a>
            )}
          </div>
        )}

        {/* Programme */}
        <div>
          <label style={LBL}>Programme de la journée</label>
          <textarea rows={5} style={{ ...INP, resize:'vertical' as const }}
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="Décrivez le programme de ce jour…" />
        </div>

        {/* Upload / replace file */}
        <div>
          <label style={LBL}>Fichier du jour (GPX, PDF, image…)</label>
          {newFile ? (
            <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:8,background:'var(--bg-card2)',border:'1px solid var(--border)' }}>
              <span style={{ flex:1,fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{newFile.name}</span>
              <button onClick={() => setNewFile(null)} style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:13 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={{
              width:'100%',padding:'8px 12px',borderRadius:8,
              border:'1px dashed var(--border)',background:'var(--bg-card2)',
              color:'var(--text-dim)',fontSize:11,cursor:'pointer',
            }}>
              {dayFile ? '↺ Remplacer le fichier' : '+ Ajouter un fichier'}
            </button>
          )}
          <input ref={fileRef} type="file" style={{ display:'none' }}
            onChange={e => { setNewFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        </div>

        {/* Buttons */}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>
            Fermer
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:saving?'wait':'pointer' }}>
            {saving ? '…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
