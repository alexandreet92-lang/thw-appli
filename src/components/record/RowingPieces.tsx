'use client'
import { useState } from 'react'
import { formatSplit, calcSplit500, calcWatts, type RowingPiece } from '@/types/rowing'

interface Props {
  pieces: RowingPiece[]
  onChange: (pieces: RowingPiece[]) => void
  practiceType: string
  isDark: boolean
}

const PRESETS = [
  { label: '8×500m',  count: 8,  dist: 500 },
  { label: '4×1000m', count: 4,  dist: 1000 },
  { label: '2×2000m', count: 2,  dist: 2000 },
]

function newPiece(dist: number): RowingPiece {
  return { id: `p_${Date.now()}_${Math.random()}`, distanceM: dist, durationSec: 0, restSec: 60 }
}

function fmtTotal(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2,'0')}`
}

export default function RowingPieces({ pieces, onChange, practiceType, isDark }: Props) {
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB'
  const ACCENT = '#06B6D4'
  const step = practiceType === 'indoor' ? 500 : 100

  const [durStrs, setDurStrs] = useState<Record<string, string>>({})

  const getDurStr = (p: RowingPiece) => durStrs[p.id] ?? (p.durationSec > 0 ? `${Math.floor(p.durationSec/60)}:${String(p.durationSec%60).padStart(2,'0')}` : '')
  const commitDur = (id: string, raw: string) => {
    const [mStr, sStr] = raw.split(':')
    const m = parseInt(mStr ?? '0') || 0
    const s = parseInt(sStr ?? '0') || 0
    const sec = m * 60 + s
    onChange(pieces.map(p => p.id === id ? { ...p, durationSec: sec } : p))
    setDurStrs(prev => ({ ...prev, [id]: raw }))
  }

  const addPiece = () => onChange([...pieces, newPiece(step)])
  const removePiece = (id: string) => onChange(pieces.filter(p => p.id !== id))
  const updatePiece = (id: string, patch: Partial<RowingPiece>) => onChange(pieces.map(p => p.id === id ? { ...p, ...patch } : p))
  const applyPreset = (count: number, dist: number) => onChange(Array.from({ length: count }, () => newPiece(dist)))

  const totalDist = pieces.reduce((s, p) => s + p.distanceM, 0)
  const totalDur = pieces.reduce((s, p) => s + p.durationSec, 0)
  const totalSplit = calcSplit500(totalDur, totalDist)
  const avgWatts = calcWatts(totalSplit)

  const inputStyle = (w?: number): React.CSSProperties => ({
    background:'none', border:`1px solid ${border}`, borderRadius:8, padding:'6px 8px',
    fontSize:14, color:text, outline:'none', fontFamily:'DM Sans, sans-serif', width: w ? w : undefined,
  })

  return (
    <div>
      {pieces.length === 0 && (
        <div style={{ marginBottom:12 }}>
          <p style={{ fontSize:11, color:dim, margin:'0 0 8px', fontWeight:600 }}>SUGGESTIONS</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {PRESETS.map(pr => (
              <button key={pr.label} onClick={() => applyPreset(pr.count, pr.dist)}
                style={{ padding:'5px 12px', borderRadius:16, background:'none', border:`1px solid ${border}`, color:dim, fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
                {pr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
        {pieces.map((p, idx) => {
          const split = calcSplit500(p.durationSec, p.distanceM)
          const watts = calcWatts(split)
          return (
            <div key={p.id} style={{ background:cardBg, border:`1px solid ${border}`, borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:ACCENT }}>Série {idx+1}</span>
                <button onClick={() => removePiece(p.id)} style={{ background:'none', border:'none', cursor:'pointer', color:dim, fontSize:18, lineHeight:1, padding:'0 4px' }}>×</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <p style={{ fontSize:11, color:dim, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Distance</p>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <input type="number" value={p.distanceM} step={step} min={step}
                      onChange={e => updatePiece(p.id, { distanceM: parseInt(e.target.value) || step })}
                      style={{ ...inputStyle(70) }} />
                    <span style={{ fontSize:12, color:dim }}>m</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:11, color:dim, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Temps (MM:SS)</p>
                  <input value={getDurStr(p)} placeholder="0:00"
                    onChange={e => setDurStrs(prev => ({ ...prev, [p.id]: e.target.value }))}
                    onBlur={e => commitDur(p.id, e.target.value)}
                    style={{ ...inputStyle(80) }} />
                </div>
                <div>
                  <p style={{ fontSize:11, color:dim, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Split /500m</p>
                  <p style={{ fontSize:15, fontWeight:600, color:ACCENT, margin:0 }}>{formatSplit(split)}</p>
                </div>
                <div>
                  <p style={{ fontSize:11, color:dim, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Puissance</p>
                  <p style={{ fontSize:15, fontWeight:600, color:text, margin:0 }}>{watts > 0 ? `${watts} w` : '--'}</p>
                </div>
              </div>
              <div style={{ marginTop:8 }}>
                <p style={{ fontSize:11, color:dim, margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Repos (sec)</p>
                <input type="number" value={p.restSec} step={10} min={0}
                  onChange={e => updatePiece(p.id, { restSec: parseInt(e.target.value) || 0 })}
                  style={{ ...inputStyle(70) }} />
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={addPiece} style={{ width:'100%', padding:'12px', borderRadius:12, background:'none', border:`1.5px dashed ${border}`, color:ACCENT, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
        + Ajouter une série
      </button>

      {pieces.length > 0 && totalDur > 0 && (
        <div style={{ marginTop:12, padding:'10px 14px', background:`rgba(6,182,212,0.06)`, borderRadius:10, border:`1px solid rgba(6,182,212,0.15)` }}>
          <p style={{ margin:0, fontSize:13, color:text, fontWeight:500 }}>
            Total : <span style={{ color:ACCENT, fontWeight:700 }}>{totalDist >= 1000 ? `${(totalDist/1000).toFixed(1)}km` : `${totalDist}m`}</span>
            {' · '}{fmtTotal(totalDur)}
            {avgWatts > 0 && <>{' · '}{avgWatts}w moy.</>}
          </p>
        </div>
      )}
    </div>
  )
}
