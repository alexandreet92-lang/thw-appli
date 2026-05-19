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

interface PhysicalData {
  resting_hr: number | null
  max_hr:     number | null
  weight_kg:  number | null
  date:       string | null
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function PhysioSection() {
  const [physical, setPhysical] = useState<PhysicalData | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('health_data')
        .select('date, raw_data')
        .eq('user_id', user.id)
        .eq('data_type', 'physical')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return
          const rd = data.raw_data as Record<string, unknown> | null
          setPhysical({
            resting_hr: rd?.['resting_hr'] != null ? Number(rd['resting_hr']) : null,
            max_hr:     rd?.['max_hr']     != null ? Number(rd['max_hr'])     : null,
            weight_kg:  rd?.['weight_kg']  != null ? Number(rd['weight_kg'])  : null,
            date:       (data.date as string | null) ?? null,
          })
        })
    })
  }, [])

  const CARDS = [
    {
      id: 'rhr', Icon: IcoHeart, label: 'FC repos', sub: 'Fréquence cardiaque au repos',
      value: physical?.resting_hr != null ? `${physical.resting_hr}` : null,
      unit: 'bpm', device: 'Polar, Garmin ou Whoop',
      date: physical?.date ?? null,
    },
    {
      id: 'hrv', Icon: IcoPulse, label: 'HRV', sub: 'Variabilité cardiaque',
      value: null, unit: 'ms', device: 'Garmin, Whoop ou Oura',
      date: null,
    },
    {
      id: 'spo2', Icon: IcoDrop, label: 'SpO2', sub: 'Saturation en oxygène',
      value: null, unit: '%', device: 'Garmin ou Oura',
      date: null,
    },
    {
      id: 'temp', Icon: IcoTherm, label: 'Température', sub: 'Température corporelle nocturne',
      value: null, unit: '°C', device: 'Oura',
      date: null,
    },
  ]

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:24,boxShadow:'var(--shadow-card)' }}>
      <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:'0 0 4px' }}>Physiologie</p>
      <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,margin:'0 0 16px' }}>Données physiologiques</h2>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12 }}>
        {CARDS.map(({ id, Icon, label, sub, value, unit, device, date }) => (
          <div key={id} style={{
            padding:'20px 16px', borderRadius:12,
            background:'var(--bg-card2)', border:'1px solid #E5E7EB',
            display:'flex', flexDirection:'column' as const, alignItems:'center',
            gap:8, textAlign:'center' as const,
            transition:'box-shadow 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
          >
            <div style={{ color: value ? '#8B5CF6' : '#9CA3AF' }}><Icon /></div>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,margin:0,color: value ? 'var(--text)' : 'var(--text-dim)' }}>{label}</p>
            <p style={{ fontSize:10,color:'var(--text-dim)',margin:0,lineHeight:1.4 }}>{sub}</p>

            {value ? (
              <>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,margin:0,color:'#8B5CF6',lineHeight:1 }}>
                  {value}
                  <span style={{ fontSize:13,fontWeight:600,marginLeft:3 }}>{unit}</span>
                </p>
                {date && (
                  <span style={{ fontSize:9,color:'var(--text-dim)',fontStyle:'italic' }}>{fmtDate(date)}</span>
                )}
                <span style={{ padding:'3px 9px',borderRadius:20,background:'rgba(139,92,246,0.1)',border:'1px solid rgba(139,92,246,0.25)',fontSize:9,color:'#8B5CF6',lineHeight:1.5 }}>
                  Polar
                </span>
              </>
            ) : (
              <>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,margin:0,color:'var(--text-dim)' }}>—</p>
                <span style={{ padding:'3px 9px',borderRadius:20,background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:9,color:'var(--text-dim)',lineHeight:1.5 }}>
                  Bientôt — {device}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
