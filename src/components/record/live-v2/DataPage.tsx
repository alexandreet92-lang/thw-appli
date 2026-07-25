'use client'
// ════════════════════════════════════════════════════════════════════
// DataPage — page 1 de l'écran live : héro + grille 2×3 (spec §3).
// Sans capteur BLE appairé (état actuel de l'app), le héro applique le
// FALLBACK obligatoire : VITESSE lissée 3 s (104 px), la tuile VITESSE reste
// VITESSE. Le mode puissance (heroSource 'power') est prévu pour plus tard.
// Avant démarrage : héro DURÉE 00:00:00 en dim + chips capteurs.
// ════════════════════════════════════════════════════════════════════
import { GPSStatus } from '@/hooks/useGPSTracking'
import { formatHMS, frNum } from './liveMachine'

export type HeroSource = 'power' | 'speed'

interface Props {
  started: boolean
  /** Valeurs estompées (pause / auto-pause). */
  dim: boolean
  durationSec: number
  distanceM: number
  /** Vitesse lissée 3 s (km/h). */
  speedKmh: number
  avgSpeedKmh: number
  elevGainM: number
  /** null tant qu'aucun capteur FC n'est appairé. */
  heartRate: number | null
  /** null tant qu'aucun capteur cadence n'est appairé. */
  cadence: number | null
  /** null tant qu'aucun capteur puissance n'est appairé. */
  powerW: number | null
  avgPowerW: number | null
  npW: number | null
  heroSource: HeroSource
  gpsStatus: GPSStatus
  gpsAccuracy: number | null
  dataSize: 'small' | 'normal' | 'large'
  onSensorChipTap: () => void
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

export default function DataPage({
  started, dim, durationSec, distanceM, speedKmh, avgSpeedKmh, elevGainM,
  heartRate, cadence, powerW, avgPowerW, npW, heroSource,
  gpsStatus, gpsAccuracy, dataSize, onSensorChipTap,
}: Props) {
  const f = SIZE_FACTOR[dataSize]
  const tileSize = Math.round(40 * f)

  const gpsOk = gpsStatus === GPSStatus.good || gpsStatus === GPSStatus.approximate
  const gpsChipLabel = gpsOk
    ? `GPS ±${Math.max(1, Math.round(gpsAccuracy ?? 0))} m`
    : 'GPS'

  const heroIsPower = heroSource === 'power' && powerW != null
  const shownSpeed = dim ? 0 : speedKmh

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'calc(env(safe-area-inset-top) + 64px)' }}>

      {/* Chips capteurs — avant démarrage uniquement */}
      {!started && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
          {/* GPS : vert selon la précision réelle */}
          <div style={{
            height: 28, padding: '0 13px', borderRadius: 14,
            background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 600, color: gpsOk ? 'var(--live-text-2)' : 'var(--live-label)',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: gpsOk ? 'var(--live-success)' : 'transparent',
              border: gpsOk ? 'none' : '1.5px solid var(--live-dim)',
            }} />
            <span className="lv2-num">{gpsChipLabel}</span>
          </div>
          {/* FC / Puissance : non appairés — tap = appairage (à venir) */}
          {(['FC', 'Puissance'] as const).map(lbl => (
            <button
              key={lbl}
              onClick={onSensorChipTap}
              style={{
                height: 28, padding: '0 13px', borderRadius: 14,
                background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
                display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--live-label)',
              }}
              aria-label={`${lbl} — non appairé`}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--live-dim)' }} />
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Héro */}
      <div style={{ textAlign: 'center', marginTop: started ? 44 : 40 }}>
        {!started ? (
          <>
            <div className="lv2-eyebrow">Durée</div>
            <div className="lv2-num" style={{ fontSize: Math.round(76 * f), fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em', marginTop: 26, color: 'var(--live-dim)' }}>
              00:00:00
            </div>
          </>
        ) : heroIsPower ? (
          <>
            <div className="lv2-eyebrow">Puissance · 3 s</div>
            <div className="lv2-num" style={{ fontSize: Math.round(112 * f), fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em', marginTop: 18, color: dim ? 'var(--live-dim)' : 'var(--live-text)' }}>
              {dim ? 0 : Math.round(powerW ?? 0)}
            </div>
            <div className="lv2-num" style={{ fontSize: 13, fontWeight: 500, marginTop: 10, color: dim ? 'var(--live-dim-sub)' : 'var(--live-text-2)' }}>
              moy {avgPowerW != null ? Math.round(avgPowerW) : '—'} W · NP {npW != null ? Math.round(npW) : '—'} W
            </div>
          </>
        ) : (
          <>
            <div className="lv2-eyebrow">Vitesse</div>
            <div className="lv2-num" style={{ fontSize: Math.round(104 * f), fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em', marginTop: 20, color: dim ? 'var(--live-dim)' : 'var(--live-text)' }}>
              {frNum(shownSpeed, 1)}
            </div>
            <div className="lv2-num" style={{ fontSize: 13, fontWeight: 500, marginTop: 10, color: dim ? 'var(--live-dim-sub)' : 'var(--live-text-2)' }}>
              km/h · moy {frNum(avgSpeedKmh, 1)}
            </div>
          </>
        )}
      </div>

      {/* Grille 2×3 — ordre gelé : DURÉE/DISTANCE · VITESSE/FC · D+/CADENCE */}
      <div className="lv2-grid" style={{ marginTop: started ? 40 : 48 }}>
        <div className="lv2-row">
          <Cell label="Durée" value={started ? formatHMS(durationSec) : '00:00'} dim={dim || !started} tileSize={tileSize} />
          <Cell label="Distance" value={started ? frNum(distanceM / 1000, 2) : '0,00'} unit="km" dim={dim || !started} tileSize={tileSize} />
        </div>
        <div className="lv2-row">
          <Cell label="Vitesse" value={frNum(started ? shownSpeed : 0, 1)} unit="km/h" dim={dim || !started} tileSize={tileSize} />
          <Cell label="FC" value={started && heartRate != null ? String(Math.round(heartRate)) : '—'} unit="bpm" dim={dim || !started} tileSize={tileSize} />
        </div>
        <div className="lv2-row">
          <Cell label="D+" value={String(Math.round(elevGainM))} unit="m" dim={dim || !started} tileSize={tileSize} />
          <Cell label="Cadence" value={started && cadence != null ? String(Math.round(dim ? 0 : cadence)) : '—'} unit="rpm" dim={dim || !started} tileSize={tileSize} />
        </div>
      </div>
    </div>
  )
}
