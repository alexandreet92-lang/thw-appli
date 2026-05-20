'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// SVG icons monochromes
const IcoPulse = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 12 6 12 8 5 10 19 12 12 14 15 16 12 22 12" />
  </svg>
)
const IcoHeart = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)
const IcoDrop = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
)
const IcoTherm = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
)

interface PhysicalPoint { date: string; resting_hr: number | null; max_hr: number | null }

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Resting HR line chart
function RhrChart({ points }: { points: { date: string; rhr: number }[] }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])
  if (points.length < 2) return null

  const W = 260, H = 50
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const vals = sorted.map(p => p.rhr)
  const minV = Math.min(...vals) - 3
  const maxV = Math.max(...vals) + 3
  const avg7 = vals.slice(-7).reduce((s, v) => s + v, 0) / Math.min(vals.length, 7)

  const pts = sorted.map((_, i) => ({
    x: (i / (sorted.length - 1)) * W,
    y: H - ((vals[i] - minV) / (maxV - minV)) * H,
  }))

  // Moving avg (7-day)
  const maPts = sorted.map((_, i) => {
    const window = vals.slice(Math.max(0, i - 6), i + 1)
    const ma = window.reduce((s, v) => s + v, 0) / window.length
    return { x: pts[i].x, y: H - ((ma - minV) / (maxV - minV)) * H }
  })
  const maPath = maPts.map((p, i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const linePath = pts.map((p, i) => `${i===0?'M':'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const pathLen = W * 1.2

  return (
    <svg viewBox={`0 0 ${W} ${H+12}`} style={{ width:'100%',height:'auto',display:'block',marginTop:6 }}>
      {/* MA line (dashed) */}
      {animated && <path d={maPath} fill="none" stroke="#EF4444" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />}
      {/* Main line */}
      <path d={linePath} fill="none" stroke="#EF4444" strokeWidth={2} strokeLinecap="round"
        strokeDasharray={pathLen} strokeDashoffset={animated ? 0 : pathLen}
        style={{ transition:'stroke-dashoffset 1.2s ease-out' }} />
      {pts.map((p, i) => {
        const isAlert = vals[i] > avg7 + 5
        return <circle key={i} cx={p.x} cy={p.y} r={isAlert ? 4 : 2.5}
          fill={isAlert ? '#EF4444' : '#EF4444'} opacity={isAlert ? 1 : 0.6}
          stroke={isAlert ? '#fff' : 'none'} strokeWidth={1} />
      })}
      {sorted.map((p, i) => i % Math.max(1, Math.floor(sorted.length / 4)) === 0 && (
        <text key={i} x={pts[i].x} y={H+10} fill="var(--text-dim)" fontSize={6} textAnchor="middle">{p.date.slice(5)}</text>
      ))}
    </svg>
  )
}

export default function PhysioSection() {
  const [physHistory, setPhysHistory] = useState<PhysicalPoint[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      // Source 1 : health_data(data_type='physical')
      const { data: hdData } = await sb
        .from('health_data')
        .select('date, hr_resting, raw_data')
        .eq('user_id', user.id)
        .eq('data_type', 'physical')
        .order('date', { ascending: false })
        .limit(30)

      console.log('[PhysioSection] health_data physical:', hdData)

      // Source 2 : metrics_daily (écrit par syncPolarPhysical)
      const { data: mdData } = await sb
        .from('metrics_daily')
        .select('date, resting_hr')
        .eq('user_id', user.id)
        .not('resting_hr', 'is', null)
        .order('date', { ascending: false })
        .limit(30)

      console.log('[PhysioSection] metrics_daily:', mdData)

      // Fusionner par date, health_data prioritaire
      const byDate = new Map<string, PhysicalPoint>()

      // Ajouter metrics_daily en base (priorité basse)
      for (const row of (mdData ?? [])) {
        const d = row.date as string
        if (d) byDate.set(d, { date: d, resting_hr: Number(row.resting_hr), max_hr: null })
      }

      // Écraser avec health_data (priorité haute)
      for (const row of (hdData ?? [])) {
        const rd = row.raw_data as Record<string, unknown> | null
        const d  = row.date as string ?? ''
        if (!d) continue
        // hr_resting colonne directe > raw_data.resting_hr > existant metrics_daily
        const rhr = row.hr_resting != null
          ? Number(row.hr_resting)
          : rd?.['resting_hr'] != null ? Number(rd['resting_hr']) : (byDate.get(d)?.resting_hr ?? null)
        const mhr = rd?.['max_hr'] != null ? Number(rd['max_hr']) : null
        byDate.set(d, { date: d, resting_hr: rhr, max_hr: mhr })
      }

      const merged = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
      console.log('[PhysioSection] merged final:', merged)
      setPhysHistory(merged)
    })
  }, [])

  const latest = physHistory[0] ?? null
  const rhrSeries = physHistory.filter(p => p.resting_hr != null).map(p => ({ date: p.date, rhr: p.resting_hr! }))

  const rhrValue = latest?.resting_hr != null ? `${latest.resting_hr}` : null

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Physiologie</p>
      <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'0 0 16px' }}>Données physiologiques</h2>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12 }}>

        {/* FC repos — Polar data */}
        <div style={{ padding:'20px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid #E5E7EB',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:6,textAlign:'center' as const,transition:'box-shadow 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}>
          <div style={{ color: rhrValue ? '#EF4444' : '#9CA3AF' }}><IcoHeart /></div>
          <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0,color: rhrValue ? 'var(--text)' : 'var(--text-dim)' }}>FC repos</p>
          <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,lineHeight:1.4 }}>Fréquence cardiaque au repos</p>
          {rhrValue ? (
            <>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,margin:0,color:'#EF4444',lineHeight:1 }}>
                {rhrValue}<span style={{ fontSize:13,fontWeight:600,marginLeft:3 }}>bpm</span>
              </p>
              {latest?.date && <span style={{ fontSize:9,color:'var(--text-dim)',fontStyle:'italic' }}>{fmtDate(latest.date)}</span>}
              {rhrSeries.length >= 2 && (
                <div style={{ width:'100%' }}>
                  <RhrChart points={rhrSeries} />
                  <p style={{ fontSize:8,color:'var(--text-dim)',margin:'2px 0 0' }}>
                    {rhrSeries.length} mesures · moy. mobile 7j en pointillé
                  </p>
                </div>
              )}
              <span style={{ padding:'3px 9px',borderRadius:20,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',fontSize:9,color:'#EF4444',lineHeight:1.5 }}>Polar</span>
            </>
          ) : (
            <>
              <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,margin:0,color:'var(--text-dim)' }}>—</p>
              <span style={{ padding:'3px 9px',borderRadius:20,background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:9,color:'var(--text-dim)',lineHeight:1.5 }}>Bientôt — Polar, Garmin ou Whoop</span>
            </>
          )}
        </div>

        {/* HRV */}
        {[
          { id:'hrv',  Icon: IcoPulse, label:'HRV',         sub:'Variabilité cardiaque',           device:'Garmin, Whoop ou Oura' },
          { id:'spo2', Icon: IcoDrop,  label:'SpO2',        sub:'Saturation en oxygène',           device:'Garmin ou Oura' },
          { id:'temp', Icon: IcoTherm, label:'Température', sub:'Température corporelle nocturne', device:'Oura' },
        ].map(({ id, Icon, label, sub, device }) => (
          <div key={id} style={{ padding:'20px 16px',borderRadius:12,background:'var(--bg-card2)',border:'1px solid #E5E7EB',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:8,textAlign:'center' as const,transition:'box-shadow 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}>
            <div style={{ color:'#9CA3AF' }}><Icon /></div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0,color:'var(--text-dim)' }}>{label}</p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,lineHeight:1.4 }}>{sub}</p>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,margin:0,color:'var(--text-dim)' }}>—</p>
            <span style={{ padding:'3px 9px',borderRadius:20,background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:9,color:'var(--text-dim)',lineHeight:1.5 }}>
              Bientôt — {device}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
