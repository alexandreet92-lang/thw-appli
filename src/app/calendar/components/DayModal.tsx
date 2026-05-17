'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RaceStage } from './types'
import GpxFullView from '@/components/gpx/GpxFullView'

interface DayFile { id: string; file_url: string; file_name: string }

interface Props {
  stage: RaceStage
  date: string  // YYYY-MM-DD
  onClose: () => void
  onSaved?: (date: string, content: string) => void  // notify parent of local state refresh
}

const INP = { width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }
const LBL = { fontSize:10,fontWeight:600 as const,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4,display:'block' as const }

function isGpxName(n: string) { return n.toLowerCase().endsWith('.gpx') }

function labelDay(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export default function DayModal({ stage, date, onClose, onSaved }: Props) {
  const supabase = createClient()
  const stageId  = stage.id

  // Guard: stageId must exist
  const hasId = !!stageId

  const [content,   setContent]   = useState(stage.dailyProgram.find(p => p.date === date)?.content ?? '')
  const [dayFile,   setDayFile]   = useState<DayFile | null>(null)
  const [newFile,   setNewFile]   = useState<File | null>(null)
  const [loadFile,  setLoadFile]  = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveMsg,   setSaveMsg]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Load from DB on mount: daily_program entry + file
  useEffect(() => {
    if (!hasId) { setLoadFile(false); return }

    console.log('[DayModal mount] fetching data for stageId:', stageId, 'date:', date)

    // Fetch daily_program from race_events (source of truth)
    supabase
      .from('race_events')
      .select('daily_program')
      .eq('id', stageId)
      .single()
      .then(({ data, error }) => {
        if (error) { console.error('[DayModal] fetch race_events error', error); return }
        const dp = (data as { daily_program: { date: string; content: string }[] } | null)?.daily_program ?? []
        const entry = dp.find(p => p.date === date)
        console.log('[DayModal] daily_program from DB:', dp, '→ entry for', date, ':', entry)
        if (entry) setContent(entry.content)
      })

    // Fetch file
    supabase
      .from('race_event_files')
      .select('id, file_url, file_name')
      .eq('event_id', stageId)
      .eq('event_date', date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('[DayModal] fetch race_event_files error', error); return }
        console.log('[DayModal] file from DB:', data)
        setDayFile(data as DayFile | null)
        setLoadFile(false)
      })
  }, [stageId, date]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!hasId) {
      setSaveStatus('error')
      setSaveMsg('Erreur : identifiant de l\'événement manquant.')
      return
    }
    setSaveStatus('saving')
    setSaveMsg('')

    try {
      // ── ÉTAPE 1 : fetch current daily_program, patch entry, UPDATE ──
      console.log('[DayModal save] step 1 — fetch daily_program for event', stageId)
      const { data: evData, error: evFetchErr } = await supabase
        .from('race_events')
        .select('daily_program')
        .eq('id', stageId)
        .single()

      if (evFetchErr || !evData) {
        console.error('[DayModal save] step 1 fetch error', evFetchErr)
        throw new Error('Impossible de récupérer l\'événement.')
      }

      const existing: { date: string; content: string }[] =
        (evData as { daily_program: { date: string; content: string }[] }).daily_program ?? []
      const updated = existing.some(p => p.date === date)
        ? existing.map(p => p.date === date ? { ...p, content } : p)
        : [...existing, { date, content }]

      console.log('[DayModal save] step 1 — updating daily_program', updated)
      const { error: updateErr } = await supabase
        .from('race_events')
        .update({ daily_program: updated })
        .eq('id', stageId)

      if (updateErr) {
        console.error('[DayModal save] step 1 UPDATE error', updateErr)
        throw new Error(`UPDATE daily_program échoué : ${updateErr.message}`)
      }
      console.log('[DayModal save] step 1 ✓ daily_program saved')

      // ── ÉTAPE 2 : file upload (if new file selected) ──
      if (newFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Utilisateur non authentifié.')

        console.log('[DayModal save] step 2 — uploading file', newFile.name)
        const path = `${user.id}/events/${stageId}/${date}/${newFile.name}`
        const { data: storData, error: storErr } = await supabase.storage
          .from('race-files').upload(path, newFile, { upsert: true })

        if (storErr || !storData) {
          console.error('[DayModal save] step 2 storage upload error', storErr)
          throw new Error(`Upload fichier échoué : ${storErr?.message ?? 'no data'}`)
        }

        const { data: urlData } = supabase.storage.from('race-files').getPublicUrl(path)
        const fileUrl = urlData.publicUrl
        console.log('[DayModal save] step 2 — file uploaded, url:', fileUrl)

        // Check if existing record
        const { data: existing2 } = await supabase
          .from('race_event_files')
          .select('id')
          .eq('event_id', stageId)
          .eq('event_date', date)
          .maybeSingle()

        if (existing2) {
          console.log('[DayModal save] step 2 — updating existing race_event_files row')
          const { error: updFileErr } = await supabase
            .from('race_event_files')
            .update({ file_url: fileUrl, file_name: newFile.name })
            .eq('event_id', stageId)
            .eq('event_date', date)
          if (updFileErr) {
            console.error('[DayModal save] step 2 UPDATE race_event_files error', updFileErr)
            throw new Error(`UPDATE race_event_files échoué : ${updFileErr.message}`)
          }
        } else {
          console.log('[DayModal save] step 2 — inserting new race_event_files row')
          const { error: insFileErr } = await supabase
            .from('race_event_files')
            .insert({ event_id: stageId, file_url: fileUrl, file_name: newFile.name, event_date: date })
          if (insFileErr) {
            console.error('[DayModal save] step 2 INSERT race_event_files error', insFileErr)
            throw new Error(`INSERT race_event_files échoué : ${insFileErr.message}`)
          }
        }

        // Update local display file
        setDayFile({ id: existing2?.id ?? '', file_url: fileUrl, file_name: newFile.name })
        setNewFile(null)
        console.log('[DayModal save] step 2 ✓ file saved')
      }

      // ── ÉTAPE 3 : success feedback ──
      setSaveStatus('success')
      setSaveMsg('Enregistré ✓')
      console.log('[DayModal save] ✓ all done')

      // Notify parent to refresh local state
      onSaved?.(date, content)

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[DayModal save] ✗ error:', msg)
      setSaveStatus('error')
      setSaveMsg(msg)
    }
  }

  const displayFile = newFile
    ? { url: URL.createObjectURL(newFile), name: newFile.name, isLocal: true }
    : dayFile
    ? { url: dayFile.file_url, name: dayFile.file_name, isLocal: false }
    : null

  const isSaving = saveStatus === 'saving'

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:560,width:'100%',maxHeight:'92vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:16 }}>

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

        {/* Guard: missing stageId */}
        {!hasId && (
          <div style={{ padding:'10px 14px',borderRadius:9,background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontSize:12 }}>
            Erreur : identifiant de l'événement introuvable. Fermez et réouvrez ce modal.
          </div>
        )}

        {/* GPX full view */}
        {!loadFile && displayFile && isGpxName(displayFile.name) && (
          <GpxFullView fileUrl={displayFile.url} height={300} />
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
            value={content} onChange={e => { setContent(e.target.value); if (saveStatus !== 'idle') setSaveStatus('idle') }}
            placeholder="Décrivez le programme de ce jour…" />
        </div>

        {/* Upload file */}
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
            onChange={e => { setNewFile(e.target.files?.[0] ?? null); setSaveStatus('idle'); e.target.value = '' }} />
        </div>

        {/* Status feedback */}
        {saveStatus === 'success' && (
          <div style={{ padding:'8px 12px',borderRadius:9,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e',fontSize:12,fontWeight:600 }}>
            {saveMsg}
          </div>
        )}
        {saveStatus === 'error' && (
          <div style={{ padding:'8px 12px',borderRadius:9,background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontSize:12 }}>
            {saveMsg}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasId}
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#00c8e0,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:isSaving?'wait':'pointer',opacity:!hasId?0.4:1 }}>
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
