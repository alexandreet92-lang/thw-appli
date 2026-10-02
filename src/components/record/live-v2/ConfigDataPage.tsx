'use client'
// ════════════════════════════════════════════════════════════════════
// ConfigDataPage — page de données PILOTÉE PAR LA CONFIG (spec §3). Rend les
// champs choisis dans les réglages « Pages de données » : un champ héro
// (bigFieldId) + une grille 2 colonnes pour les autres. Les champs capteurs
// (FC / puissance / cadence) et itinéraire affichent « — » tant qu'aucune
// source n'est branchée (jamais de valeur inventée). Ajouter / réordonner /
// modifier une page dans les réglages se voit DIRECTEMENT ici.
// ════════════════════════════════════════════════════════════════════
import { useI18n } from '@/lib/i18n'
import { GPSStatus } from '@/hooks/useGPSTracking'
import { fieldById, type DataPage } from '@/types/cycling'
import { formatHMS, frNum } from './liveMachine'
import { distFactor, altFactor, getUnitLabel, type LiveUnits } from '../units'
import { RkGrid, RkCell } from '../kit/RecordKit'

export interface FieldCtx {
  started: boolean
  dim: boolean
  durationSec: number
  distanceM: number
  speedKmh: number
  avgSpeedKmh: number
  maxSpeedKmh: number
  elevGainM: number
  altitudeM: number | null
  gradient: number
  lapSec: number
  lapDistM: number
  /** Fréquence cardiaque live (capteur BLE) — null si non connecté. */
  hr: number | null
  /** Puissance live (capteur BLE) — null si non connecté. */
  power: number | null
  units?: LiveUnits
}

/** Libellé d'unité (km/m/km/h via réglages ; brut sinon). */
function unitLabel(raw: string | undefined, units?: LiveUnits): string | undefined {
  if (!raw) return undefined
  switch (raw) {
    case 'km': return getUnitLabel('km', units)
    case 'm': return getUnitLabel('m', units)
    case 'km/h': return getUnitLabel('km/h', units)
    case 'w': return 'W'
    default: return raw
  }
}

/** Valeur formatée d'un champ selon le contexte live. */
function fieldDisplay(id: string, ctx: FieldCtx): { value: string; unit?: string } {
  const df = distFactor(ctx.units)
  const af = altFactor(ctx.units)
  const f = fieldById(id)
  const naUnit = unitLabel(f?.unit, ctx.units)
  const na = { value: '—', unit: naUnit }
  switch (id) {
    case 'duration':
    case 'moving_time':
      return { value: ctx.started ? formatHMS(ctx.durationSec) : '00:00' }
    case 'lap_duration':
      return { value: ctx.started ? formatHMS(ctx.lapSec) : '00:00' }
    case 'distance':
      return { value: ctx.started ? frNum((ctx.distanceM / 1000) * df, 2) : '0,00', unit: getUnitLabel('km', ctx.units) }
    case 'lap_distance':
      return { value: frNum((ctx.lapDistM / 1000) * df, 2), unit: getUnitLabel('km', ctx.units) }
    case 'speed':
      return { value: frNum((ctx.dim ? 0 : ctx.speedKmh) * df, 1), unit: getUnitLabel('km/h', ctx.units) }
    case 'avg_speed':
      return { value: frNum(ctx.avgSpeedKmh * df, 1), unit: getUnitLabel('km/h', ctx.units) }
    case 'max_speed':
      return { value: frNum(ctx.maxSpeedKmh * df, 1), unit: getUnitLabel('km/h', ctx.units) }
    case 'lap_speed':
      return { value: frNum((ctx.lapSec > 0 ? (ctx.lapDistM / ctx.lapSec) * 3.6 : 0) * df, 1), unit: getUnitLabel('km/h', ctx.units) }
    case 'elevation_gain':
      return { value: String(Math.round(ctx.elevGainM * af)), unit: getUnitLabel('m', ctx.units) }
    case 'altitude':
      return { value: ctx.altitudeM != null ? String(Math.round(ctx.altitudeM * af)) : '—', unit: getUnitLabel('m', ctx.units) }
    case 'gradient':
      return { value: ctx.started ? frNum(ctx.gradient, 1) : '—', unit: '%' }
    case 'calories':
      return { value: ctx.started ? String(Math.round((ctx.durationSec / 3600) * 600)) : '0', unit: 'kcal' }
    case 'hr':
      return { value: ctx.hr != null ? String(Math.round(ctx.hr)) : '—', unit: 'bpm' }
    case 'power':
      return { value: ctx.power != null ? String(Math.round(ctx.power)) : '—', unit: 'W' }
    default:
      // Champs capteurs (FC/puissance/cadence) et itinéraire : pas de source.
      return na
  }
}

const SIZE_FACTOR: Record<'small' | 'normal' | 'large', number> = { small: 0.88, normal: 1, large: 1.12 }

interface Props {
  page: DataPage
  ctx: FieldCtx
  dataSize: 'small' | 'normal' | 'large'
  gpsStatus: GPSStatus
  gpsAccuracy: number | null
  /** Capteurs BLE appairés (puces d'état avant départ). */
  hrDevice?: string | null
  powerDevice?: string | null
  onSensorChipTap: () => void
}

export default function ConfigDataPage({ page, ctx, dataSize, gpsStatus, gpsAccuracy, hrDevice, powerDevice, onSensorChipTap }: Props) {
  const { t } = useI18n()
  const f = SIZE_FACTOR[dataSize]
  const { started, dim } = ctx

  const gpsOk = gpsStatus === GPSStatus.good || gpsStatus === GPSStatus.approximate
  const gpsChipLabel = gpsOk ? `GPS ±${Math.max(1, Math.round(gpsAccuracy ?? 0))} m` : 'GPS'

  const heroId = page.bigFieldId && page.fields.includes(page.bigFieldId) ? page.bigFieldId : page.fields[0]
  const gridIds = page.fields.filter(id => id !== heroId)
  const heroField = heroId ? fieldById(heroId) : undefined
  const heroLabel = heroField?.labelKey ? t(heroField.labelKey) : heroField?.label ?? ''
  const hero = heroId ? fieldDisplay(heroId, ctx) : { value: '—' }
  // Héro plus compact quand la valeur est longue (h:mm:ss) pour tenir sur une ligne.
  const heroLen = (!started && heroId === 'duration' ? '00:00:00' : hero.value).length
  const heroSize = Math.round((heroLen >= 7 ? 64 : heroLen >= 5 ? 76 : 88) * f)
  const cellSize = Math.round((gridIds.length > 6 ? 32 : 38) * f)

  const labelOf = (id: string) => { const ff = fieldById(id); return ff?.labelKey ? t(ff.labelKey) : ff?.label ?? id }

  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain',
      padding: 'calc(env(safe-area-inset-top) + 64px) 16px calc(env(safe-area-inset-bottom) + 200px)',
    }}>
      {/* Puces capteurs — avant démarrage */}
      {!started && (
        <div className="rk-chips" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <span className="rk-chip" data-off={gpsOk ? undefined : '1'} style={{ cursor: 'default', background: 'var(--surface-card)' }}>
            <span className="rk-dot" style={{ background: gpsOk ? 'var(--success)' : 'var(--text-dim)' }} />
            <span className="rk-num" style={{ letterSpacing: 0 }}>{gpsChipLabel}</span>
          </span>
          {([['hr', 'w4a.hr', hrDevice], ['power', 'w4a.power', powerDevice]] as const).map(([id, k, dev]) => (
            <button
              key={id} type="button" onClick={onSensorChipTap} className="rk-chip rk-press" data-off={dev ? undefined : '1'}
              style={{ background: 'var(--surface-card)' }}
              aria-label={dev ? t(k) : t('w4a.sensor_unpaired', { name: t(k) })}
            >
              <span className="rk-dot" style={{ background: dev ? 'var(--success)' : 'var(--text-dim)' }} />
              {t(k)}
            </button>
          ))}
        </div>
      )}

      {/* Carte : héro (bigFieldId) + grille à filets des autres champs */}
      <div className={dim || !started ? 'rk-card rk-dim' : 'rk-card'} style={{ transition: 'opacity 300ms ease' }}>
        {heroId && (
          <div className="rk-hero">
            <div className="rk-label">{heroLabel}</div>
            <div className="rk-hero-v rk-num" style={{ fontSize: heroSize }}>
              {!started && heroId === 'duration' ? '00:00:00' : hero.value}
              {hero.unit && <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 6, letterSpacing: 0 }}>{hero.unit}</span>}
            </div>
          </div>
        )}
        {gridIds.length > 0 && (
          <RkGrid>
            {gridIds.map(id => {
              const d = fieldDisplay(id, ctx)
              return <RkCell key={id} label={labelOf(id)} value={started ? d.value : (d.unit ? '—' : d.value)} unit={d.unit} size={cellSize} />
            })}
          </RkGrid>
        )}
      </div>
    </div>
  )
}
