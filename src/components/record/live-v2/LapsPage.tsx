'use client'
// ════════════════════════════════════════════════════════════════════
// LapsPage — page 3 de l'écran live : héro durée du lap courant, grille 2×2
// (WATTS LAP / FC LAP / CADENCE / ALTITUDE) et HISTORIQUE des laps (3 lignes
// visibles puis scroll, plus récent en haut). Spec §3 page 3.
// Sans capteurs BLE : watts / FC / cadence = « — » ; altitude = GPS réel.
// ════════════════════════════════════════════════════════════════════
import { useI18n } from '@/lib/i18n'
import type { SessionLap } from '@/types/session'
import { formatHMS, frNum } from './liveMachine'
import { distFactor, altFactor, getUnitLabel, type LiveUnits } from '../units'

interface Props {
  started: boolean
  dim: boolean
  lapNumber: number
  lapSec: number
  totalSec: number
  distanceM: number
  altitudeM: number | null
  /** Laps terminés, ordre chronologique (le rendu inverse : plus récent en haut). */
  laps: SessionLap[]
  dataSize: 'small' | 'normal' | 'large'
  units?: LiveUnits
}

const SIZE_FACTOR: Record<Props['dataSize'], number> = { small: 0.88, normal: 1, large: 1.12 }

function Cell({ label, value, unit, dim, tileSize }: {
  label: string
  value: string
  unit?: string
  dim: boolean
  tileSize: number
}) {
  return (
    <div className={dim ? 'lv2-cell lv2-dim' : 'lv2-cell'}>
      <div className="lv2-eyebrow">{label}</div>
      <div className="lv2-v">
        <span className="lv2-n lv2-num" style={{ fontSize: tileSize }}>{value}</span>
        {unit && <span className="lv2-u">{unit}</span>}
      </div>
    </div>
  )
}

export default function LapsPage({
  started, dim, lapNumber, lapSec, totalSec, distanceM, altitudeM, laps, dataSize, units,
}: Props) {
  const { t } = useI18n()
  const f = SIZE_FACTOR[dataSize]
  const tileSize = Math.round(40 * f)
  const newestFirst = [...laps].reverse()
  const df = distFactor(units)
  const af = altFactor(units)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'calc(env(safe-area-inset-top) + 64px)' }}>

      {/* Héro : durée du lap courant */}
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div className="lv2-eyebrow" style={{ color: started && !dim ? 'var(--live-label)' : 'var(--live-dim)' }}>
          {started ? t('w4a.lap_hero_duration', { n: lapNumber }) : t('w4a.lap_n', { n: 1 })}
        </div>
        <div className="lv2-num" style={{ fontSize: Math.round(88 * f), fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em', marginTop: 22, color: started && !dim ? 'var(--live-text)' : 'var(--live-dim)' }}>
          {started ? formatHMS(lapSec) : '00:00'}
        </div>
        <div className="lv2-num" style={{ fontSize: 13, fontWeight: 500, marginTop: 10, color: dim ? 'var(--live-dim-sub)' : 'var(--live-text-2)' }}>
          {started
            ? t('w4a.lap_total', { time: formatHMS(totalSec), dist: frNum((distanceM / 1000) * df, 2), unit: getUnitLabel('km', units) })
            : t('w4a.lap_start_hint')}
        </div>
      </div>

      {/* Grille 2×2 : WATTS LAP / FC LAP / CADENCE / ALTITUDE */}
      <div className="lv2-grid" style={{ marginTop: 36 }}>
        <div className="lv2-row">
          <Cell label={t('w4a.watts_lap')} value="—" unit="W" dim={dim || !started} tileSize={tileSize} />
          <Cell label={t('w4a.hr_lap')} value="—" unit="bpm" dim={dim || !started} tileSize={tileSize} />
        </div>
        <div className="lv2-row">
          <Cell label={t('w4a.cadence')} value="—" unit="rpm" dim={dim || !started} tileSize={tileSize} />
          <Cell label={t('w4a.altitude')} value={altitudeM != null ? String(Math.round(altitudeM * af)) : '—'} unit={getUnitLabel('m', units)} dim={false} tileSize={tileSize} />
        </div>
      </div>

      {/* Historique des laps */}
      <div style={{ margin: '26px 28px 0', minHeight: 0 }}>
        <div className="lv2-eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>{t('w4a.previous_laps')}</div>
        {newestFirst.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--live-label)', padding: '8px 0' }}>{t('w4a.no_lap_done')}</div>
        ) : (
          <div style={{ maxHeight: 3 * 40, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
            {newestFirst.map((l, i) => (
              <div
                key={l.number}
                className="lv2-num"
                style={{
                  display: 'grid', gridTemplateColumns: '66px 1fr 1fr 1fr', alignItems: 'center',
                  height: 40, fontSize: 13.5,
                  borderTop: i > 0 ? '1px solid var(--live-hairline)' : 'none',
                }}
              >
                <b style={{ fontWeight: 700 }}>{t('w4a.lap_n', { n: l.number })}</b>
                <span style={{ color: 'var(--live-text-2)', fontWeight: 600, textAlign: 'center' }}>{formatHMS(l.duration)}</span>
                <span style={{ color: 'var(--live-text-2)', fontWeight: 600, textAlign: 'center' }}>—</span>
                <span style={{ color: 'var(--live-text-2)', fontWeight: 600, textAlign: 'center' }}>—</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
