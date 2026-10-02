'use client'
import { formatSplit, calcSplit500, calcWatts, type RowingPiece } from '@/types/rowing'
import { rkScope, useAppDark, RkScreenIn, RkFab, RkFabSpacer, RkIco, RK_ICON, RkStatusPill, RkGrid, RkCell, RkSectionLabel, RkGroup, RkCta } from './kit/RecordKit'
import { useI18n } from '@/lib/i18n'

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
  const { t } = useI18n()
  const dark = useAppDark()
  const stats = [
    { label: t('record.rowingSummaryDistance'),       value: session.distanceM >= 1000 ? `${(session.distanceM/1000).toFixed(2)}` : `${session.distanceM}`, unit: session.distanceM >= 1000 ? 'km' : 'm' },
    { label: t('record.rowingSummaryDuration'),          value: fmt(session.durationSec), unit: '' },
    { label: t('record.rowingSummarySplit'),    value: formatSplit(session.split500Sec), unit: '/ 500m' },
    { label: t('record.rowingSummaryAvgPower'), value: session.avgWatts > 0 ? `${session.avgWatts}` : '--', unit: 'w' },
    { label: t('record.rowingSummaryCalories'),       value: `${session.calories}`, unit: 'kcal' },
    { label: t('record.rowingSummaryRpe'),            value: `${session.rpe}`, unit: '/ 10' },
  ]

  return (
    <RkScreenIn className={rkScope(dark)} style={{ position:'fixed', inset:0, zIndex:10005, background:'var(--surface-page)', color:'var(--text)', display:'flex', flexDirection:'column', fontFamily: 'var(--font-body)' }}>
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap: 8, padding:'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        <RkFab label="×" onClick={onClose}><RkIco d={RK_ICON.close} size={20} sw={2.2} /></RkFab>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <RkStatusPill dot="var(--sport-rowing)">{t('record.rowingSummaryTitle')}</RkStatusPill>
        </div>
        <RkFabSpacer />
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em', margin: '4px 4px 0' }}>{t('record.rowingSummarySport')}</h2>
        <div className="rk-card">
          <RkGrid>
            {stats.map(s => <RkCell key={s.label} label={s.label} value={s.value} unit={s.unit || undefined} size={30} />)}
          </RkGrid>
        </div>

        {session.pieces.length > 0 && (
          <>
            <RkSectionLabel>{t('record.rowingSummarySets')}</RkSectionLabel>
            <RkGroup>
              {session.pieces.map((p, i) => {
                const split = calcSplit500(p.durationSec, p.distanceM)
                const watts = calcWatts(split)
                return (
                  <div key={p.id} className="rk-row">
                    <span className="rk-num" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dim)', minWidth: 24, letterSpacing: 0 }}>{i + 1}</span>
                    <span className="rk-row-t"><b>{p.distanceM >= 1000 ? `${p.distanceM / 1000} km` : `${p.distanceM} m`}</b></span>
                    <span className="rk-num" style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0 }}>{formatSplit(split)}</span>
                    {watts > 0 && <span className="rk-num" style={{ fontSize: 14, color: 'var(--text-mid)', letterSpacing: 0 }}>{watts} W</span>}
                  </div>
                )
              })}
            </RkGroup>
          </>
        )}
      </div>

      <div style={{ padding:'10px 16px', paddingBottom:'max(env(safe-area-inset-bottom),16px)' }}>
        <RkCta variant="primary" onClick={onClose}>{t('record.rowingSummaryFinish')}</RkCta>
      </div>
    </RkScreenIn>
  )
}
