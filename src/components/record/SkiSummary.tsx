'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import SessionTraceMap from './SessionTraceMap'
import type { GPSPoint } from '@/hooks/useGPSTracking'

export interface SkiSnap {
  startedAtISO: string; endedAtISO: string; durationSec: number
  distM: number; elevGainM: number; elevLossM: number
  avgSpeedKmh: number; maxSpeedKmh: number; maxSpeedRunKmh: number
  avgSpeedRunKmh: number; totalRunSec: number; totalLiftSec: number
  runCount: number; totalRunDistM: number; maxAltM: number
  calories: number; gpsPts: GPSPoint[]; skiType: 'ski' | 'snowboard'
}

interface Props { snap: SkiSnap; isDark: boolean; onClose: () => void }

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function StatBox({ label, value, unit, isDark }: { label: string; value: string; unit?: string; isDark: boolean }) {
  const text = isDark ? '#FFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  return (
    <div style={{ padding:'14px 8px', textAlign:'center', borderRight:`1px solid ${sep}`, borderBottom:`1px solid ${sep}` }}>
      <p style={{ fontSize:10, color:dim, textTransform:'uppercase', letterSpacing:'1.2px', margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontSize:22, fontWeight:700, color:text, margin:0, lineHeight:1 }}>{value}</p>
      {unit && <p style={{ fontSize:11, color:dim, margin:'3px 0 0' }}>{unit}</p>}
    </div>
  )
}

export default function SkiSummary({ snap, isDark, onClose }: Props) {
  const { t } = useI18n()
  const [page, setPage] = useState(0)
  const bg   = isDark ? '#0A0A0A' : '#FFFFFF'
  const text = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim  = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep  = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10001, background:bg, display:'flex', flexDirection:'column', fontFamily:'DM Sans, sans-serif', paddingTop:'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${sep}`, flexShrink:0 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:18, fontWeight:700, color:text, margin:0, fontFamily:'Syne, sans-serif' }}>{t('record.skiSummaryTitle')}</p>
          <p style={{ fontSize:13, color:dim, margin:'2px 0 0' }}>{snap.skiType === 'ski' ? 'Ski' : 'Snowboard'} · {new Date(snap.startedAtISO).toLocaleDateString('fr-FR')}</p>
        </div>
        <button onClick={onClose} style={{ padding:'8px 20px', background:'linear-gradient(135deg,#06B6D4,#2563EB)', border:'none', borderRadius:12, color:'white', fontSize:14, fontWeight:600, cursor:'pointer' }}>{t('record.skiSummaryFinish')}</button>
      </div>

      {/* Page dots */}
      <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'10px 0', flexShrink:0 }}>
        {[0,1].map(i => <span key={i} onClick={() => setPage(i)} style={{ width:6, height:6, borderRadius:'50%', background: i===page ? '#06B6D4' : dim, cursor:'pointer', transition:'background 0.2s' }} />)}
      </div>

      <div style={{ flex:1, overflow:'hidden' }}>
        {/* Page 1 — Carte + stats principales */}
        {page === 0 && (
          <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
            <div style={{ flex:1, minHeight:0 }}>
              <SessionTraceMap points={snap.gpsPts} isDark={isDark} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flexShrink:0 }}>
              <StatBox isDark={isDark} label={t('record.skiDistance')} value={(snap.distM/1000).toFixed(2)} unit="km" />
              <StatBox isDark={isDark} label={t('record.skiDuration')} value={fmt(snap.durationSec)} />
              <StatBox isDark={isDark} label={t('record.skiElevLoss')} value={String(Math.round(snap.elevLossM))} unit="m" />
              <StatBox isDark={isDark} label={t('record.skiRuns')} value={String(snap.runCount)} />
            </div>
          </div>
        )}

        {/* Page 2 — Stats ski détaillées */}
        {page === 1 && (
          <div style={{ overflowY:'auto', height:'100%' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
              <StatBox isDark={isDark} label={t('record.skiMaxSpeedFull')} value={snap.maxSpeedRunKmh.toFixed(1)} unit="km/h" />
              <StatBox isDark={isDark} label={t('record.skiAvgRunSpeed')} value={snap.avgSpeedRunKmh.toFixed(1)} unit="km/h" />
              <StatBox isDark={isDark} label={t('record.skiElevLossTotal')} value={String(Math.round(snap.elevLossM))} unit="m" />
              <StatBox isDark={isDark} label={t('record.skiMaxAltitude')} value={String(snap.maxAltM)} unit="m" />
              <StatBox isDark={isDark} label={t('record.skiRunTime')} value={fmt(snap.totalRunSec)} />
              <StatBox isDark={isDark} label={t('record.skiLiftTime')} value={fmt(snap.totalLiftSec)} />
              <StatBox isDark={isDark} label={t('record.skiCalories')} value={String(snap.calories)} unit="kcal" />
              <StatBox isDark={isDark} label={t('record.skiElevGain')} value={String(snap.elevGainM)} unit="m" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
