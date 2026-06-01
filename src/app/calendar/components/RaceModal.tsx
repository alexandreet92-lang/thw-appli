'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Race, RaceLevel, RaceSport, RACE_CFG, SPORT_LABEL, SPORT_COLOR, SPORT_BG } from './types'
import SportFields from './SportFields'

interface Props {
  race?: Race
  initialDate?: string
  onClose: () => void
  onSave: (r: Omit<Race, 'id'>, files: File[], filesBike?: File[], filesRun?: File[]) => Promise<void>
}

const SPORTS: RaceSport[] = ['run','trail','bike','swim','hyrox','triathlon','rowing']
const LEVELS: RaceLevel[] = ['gty','main','important','secondary']

const INP = { width:'100%',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--input-bg)',color:'var(--text)',fontSize:12,outline:'none' }
const LBL = { fontSize:10,fontWeight:600 as const,textTransform:'uppercase' as const,letterSpacing:'0.06em',color:'var(--text-dim)',marginBottom:4,display:'block' as const }

export default function RaceModal({ race, initialDate, onClose, onSave }: Props) {
  const isEdit = !!race
  const [sport,   setSport]   = useState<RaceSport>(race?.sport ?? 'run')
  const [level,   setLevel]   = useState<RaceLevel>(race?.level ?? 'important')
  const [name,    setName]    = useState(race?.name ?? '')
  const [date,    setDate]    = useState(race?.date ?? initialDate ?? new Date().toISOString().split('T')[0])
  const [notes,   setNotes]   = useState(race?.notes ?? '')
  const [pd,      setPd]      = useState<Record<string,unknown>>(race?.performanceData ?? {})
  const [saving,  setSaving]  = useState(false)
  const [files,   setFiles]   = useState<File[]>([])
  const [filesBike, setFilesBike] = useState<File[]>([])
  const [filesRun,  setFilesRun]  = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileBikeRef = useRef<HTMLInputElement>(null)
  const fileRunRef  = useRef<HTMLInputElement>(null)

  async function handleSave() {
    if (!name.trim() || !date) return
    setSaving(true)
    try {
      await onSave(
        { name: name.trim(), sport, date, level, notes: notes || undefined,
          performanceData: pd, status: race?.status ?? 'upcoming',
          goalTime: (pd.goalTime as string) || (pd.triSwimTime ? '' : undefined),
          distance: (pd.distance as string) || (pd.rowDist as string) || undefined,
          runDistance: sport === 'run' ? (pd.runDist as string) : undefined,
        },
        files, filesBike, filesRun,
      )
      onClose()
    } catch (e) { console.error('[RaceModal save]', e) }
    finally { setSaving(false) }
  }

  function addFiles(list: FileList | null, setter: (f: File[]) => void, prev: File[]) {
    if (!list) return
    setter([...prev, ...Array.from(list)])
  }

  function DropZone({ label, list, setter, ref: fRef }: {
    label?: string; list: File[]; setter: (f: File[]) => void
    ref: React.RefObject<HTMLInputElement | null>
  }) {
    return (
      <div>
        {label && <p style={LBL}>{label}</p>}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files, setter, list) }}
          onClick={() => fRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#06B6D4' : 'var(--border)'}`,
            borderRadius: 10, padding: '14px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'rgba(6,182,212,0.05)' : 'var(--bg-card2)',
            transition: 'border-color 0.15s',
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>
            Glisser-déposer ou <span style={{ color:'#06B6D4' }}>Parcourir</span>
          </p>
          <input ref={fRef} type="file" multiple style={{ display:'none' }}
            onChange={e => addFiles(e.target.files, setter, list)} />
        </div>
        {list.length > 0 && (
          <div style={{ marginTop: 6, display:'flex', flexDirection:'column', gap:3 }}>
            {list.map((f, i) => (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 8px',borderRadius:6,background:'var(--bg-card2)' }}>
                <span style={{ flex:1,fontSize:11,color:'var(--text-mid)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{f.name}</span>
                <button onClick={() => setter(list.filter((_,j)=>j!==i))}
                  style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:12 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)',borderRadius:18,border:'1px solid var(--border-mid)',padding:24,maxWidth:600,width:'100%',maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:16 }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:0 }}>
            {isEdit ? 'Modifier la course' : 'Ajouter une course'}
          </h3>
          <button onClick={onClose} style={{ background:'var(--bg-card2)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'var(--text-dim)',fontSize:14 }}>✕</button>
        </div>

        {/* Sport */}
        <div>
          <p style={LBL}>Sport</p>
          <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
            {SPORTS.map(s => (
              <button key={s} onClick={() => { setSport(s); setPd({}) }}
                style={{ padding:'5px 10px',borderRadius:8,border:'1px solid',cursor:'pointer',fontSize:11,
                  borderColor:sport===s?SPORT_COLOR[s]:'var(--border)',
                  background:sport===s?SPORT_BG[s]:'var(--bg-card2)',
                  color:sport===s?SPORT_COLOR[s]:'var(--text-mid)' }}>
                {SPORT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Niveau */}
        <div>
          <p style={LBL}>Niveau</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
            {LEVELS.map(l => {
              const cfg = RACE_CFG[l]
              return (
                <button key={l} onClick={() => setLevel(l)}
                  style={{ padding:'8px 12px',borderRadius:9,border:'1px solid',cursor:'pointer',textAlign:'left',
                    borderColor:level===l?cfg.border:'var(--border)',
                    background:level===l?cfg.bg:'var(--bg-card2)' }}>
                  <p style={{ fontSize:12,fontWeight:600,margin:0,color:level===l?cfg.color:'var(--text)' }}>{cfg.label}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Nom + Date */}
        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:10 }}>
          <div>
            <p style={LBL}>Nom</p>
            <input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ironman Nice" />
          </div>
          <div>
            <p style={LBL}>Date</p>
            <input type="date" style={INP} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Sport-specific fields */}
        <SportFields sport={sport} pd={pd} setPd={setPd} />

        {/* Upload parcours */}
        <div>
          <p style={LBL}>Parcours</p>
          {sport === 'triathlon' ? (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <DropZone label="Parcours vélo" list={filesBike} setter={setFilesBike} ref={fileBikeRef} />
              <DropZone label="Parcours run"  list={filesRun}  setter={setFilesRun}  ref={fileRunRef} />
            </div>
          ) : (
            <DropZone list={files} setter={setFiles} ref={fileRef} />
          )}
        </div>

        {/* Notes */}
        <div>
          <p style={LBL}>Notes</p>
          <textarea
            rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Stratégie de course, préparation…"
            style={{ ...INP, resize:'vertical' as const }}
          />
        </div>

        {/* Boutons */}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1,padding:10,borderRadius:10,background:'var(--bg-card2)',border:'1px solid var(--border)',color:'var(--text-mid)',fontSize:12,cursor:'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            style={{ flex:2,padding:10,borderRadius:10,background:'linear-gradient(135deg,#06B6D4,#5b6fff)',border:'none',color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12,cursor:saving?'wait':'pointer',opacity:!name.trim()?0.5:1 }}>
            {saving ? '…' : isEdit ? 'Enregistrer' : '+ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
