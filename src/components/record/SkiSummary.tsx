'use client'
import { useState } from 'react'
import { rkScope, RkPageDots } from './kit/RecordKit'
import { useI18n } from '@/lib/i18n'
import SessionTraceMap from './SessionTraceMap'
import type { GPSPoint } from '@/hooks/useGPSTracking'
import { currentLocale } from '@/lib/i18n'

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
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const sep = 'var(--border)'
  return (
    <div style={{ padding:'14px 8px', textAlign:'center', borderRight:`1px solid ${sep}`, borderBottom:`1px solid ${sep}` }}>
      <p style={{ fontSize:13, fontWeight:700, color:dim, margin:'0 0 4px' }}>{label}</p>
      <p className="rk-num" style={{ fontSize:26, fontWeight:800, color:text, margin:0, lineHeight:1.05 }}>{value}</p>
      {unit && <p style={{ fontSize:11, color:dim, margin:'3px 0 0' }}>{unit}</p>}
    </div>
  )
}

export default function SkiSummary({ snap, isDark, onClose }: Props) {
  const { t } = useI18n()
  const [page, setPage] = useState(0)
  const bg = 'var(--surface-page)'
  const text = 'var(--text)'
  const dim = 'var(--text-mid)'
  const sep = 'var(--border)'

  return (
    <div className={rkScope(isDark)} style={{ position: 'fixed', inset: 0, zIndex: 10001, background:bg, display:'flex', flexDirection:'column', fontFamily: 'var(--font-body)', paddingTop:'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${sep}`, flexShrink:0 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:18, fontWeight:700, color:text, margin:0, fontFamily: 'var(--font-display)' }}>{t('record.skiSummaryTitle')}</p>
          <p style={{ fontSize:13, color:dim, margin:'2px 0 0' }}>{snap.skiType === 'ski' ? 'Ski' : 'Snowboard'} · {new Date(snap.startedAtISO).toLocaleDateString(currentLocale())}</p>
        </div>
        <button onClick={onClose} className="rk-press" style={{ minHeight: 44, padding:'0 20px', background:'var(--primary)', border:'none', borderRadius: 'var(--r-pill)', color:'var(--on-primary)', fontSize:15, fontWeight:800, cursor:'pointer' }}>{t('record.skiSummaryFinish')}</button>
      </div>

      {/* Page dots */}
      <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'10px 0', flexShrink:0 }}>
        <RkPageDots count={2} index={page} onSelect={setPage} />
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
