'use client'
import { formatSplit, calcSplit500, calcWatts, type RowingPiece } from '@/types/rowing'

interface RowingSavedData {
  id: string | null
  durationSec: number
  distanceM: number
  split500Sec: number
  avgWatts: number
  calories: number
  rpe: number
  pieces: RowingPiece[]
}

interface Props {
  session: RowingSavedData
  onClose: () => void
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function RowingSummary({ session, onClose }: Props) {
  const stats = [
    { label: 'DISTANCE',       value: session.distanceM >= 1000 ? `${(session.distanceM/1000).toFixed(2)}` : `${session.distanceM}`, unit: session.distanceM >= 1000 ? 'km' : 'm' },
    { label: 'DURÉE',          value: fmt(session.durationSec), unit: '' },
    { label: 'SPLIT /500m',    value: formatSplit(session.split500Sec), unit: '/ 500m' },
    { label: 'PUISSANCE MOY.', value: session.avgWatts > 0 ? `${session.avgWatts}` : '--', unit: 'w' },
    { label: 'CALORIES',       value: `${session.calories}`, unit: 'kcal' },
    { label: 'RPE',            value: `${session.rpe}`, unit: '/ 10' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10005, background:'#0A0A0A', color:'#FFF', display:'flex', flexDirection:'column', fontFamily:'DM Sans, sans-serif', paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ flex:1, textAlign:'center', fontSize:16, fontWeight:700, fontFamily:'Syne, sans-serif' }}>Résumé séance</span>
        <button onClick={onClose} style={{ position:'absolute', right:16, background:'none', border:'none', color:'rgba(255,255,255,0.55)', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(6,182,212,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17c3-3 7-3 9 0s7 3 9 0"/><path d="M12 17V7"/><path d="M9 7h6"/>
            </svg>
          </div>
          <p style={{ fontSize:20, fontWeight:700, color:'#FFF', margin:0, fontFamily:'Syne, sans-serif' }}>Aviron</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(255,255,255,0.06)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding:'16px 12px', background:'#0A0A0A', textAlign:'center' }}>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.40)', textTransform:'uppercase', letterSpacing:'1.5px', margin:'0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize:28, fontWeight:700, color:'#FFF', margin:0, lineHeight:1 }}>{s.value}</p>
              {s.unit && <p style={{ fontSize:11, color:'rgba(255,255,255,0.40)', margin:'2px 0 0' }}>{s.unit}</p>}
            </div>
          ))}
        </div>

        {session.pieces.length > 0 && (
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.40)', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 10px' }}>Séries</p>
            {session.pieces.map((p, i) => {
              const split = calcSplit500(p.durationSec, p.distanceM)
              const watts = calcWatts(split)
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(255,255,255,0.04)', borderRadius:10, marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#06B6D4', minWidth:20 }}>#{i+1}</span>
                  <span style={{ fontSize:14, color:'#FFF', flex:1 }}>{p.distanceM >= 1000 ? `${p.distanceM/1000}km` : `${p.distanceM}m`}</span>
                  <span style={{ fontSize:13, color:'#06B6D4', fontWeight:600 }}>{formatSplit(split)}</span>
                  {watts > 0 && <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>{watts}w</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ padding:'16px', paddingBottom:'max(env(safe-area-inset-bottom),16px)', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onClose} style={{ width:'100%', height:52, borderRadius:16, background:'linear-gradient(135deg,#06B6D4,#2563EB)', border:'none', color:'#fff', fontSize:16, fontWeight:600, cursor:'pointer' }}>
          Terminer
        </button>
      </div>
    </div>
  )
}
