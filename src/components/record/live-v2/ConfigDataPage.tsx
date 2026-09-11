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

function Cell({ label, value, unit, dim, tileSize }: {
  label: string; value: string; unit?: string; dim: boolean; tileSize: number
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

interface Props {
  page: DataPage
  ctx: FieldCtx
  dataSize: 'small' | 'normal' | 'large'
  gpsStatus: GPSStatus
  gpsAccuracy: number | null
  onSensorChipTap: () => void
}

export default function ConfigDataPage({ page, ctx, dataSize, gpsStatus, gpsAccuracy, onSensorChipTap }: Props) {
  const { t } = useI18n()
  const f = SIZE_FACTOR[dataSize]
  const tileSize = Math.round(40 * f)
  const { started, dim } = ctx

  const gpsOk = gpsStatus === GPSStatus.good || gpsStatus === GPSStatus.approximate
  const gpsChipLabel = gpsOk ? `GPS ±${Math.max(1, Math.round(gpsAccuracy ?? 0))} m` : 'GPS'

  const heroId = page.bigFieldId && page.fields.includes(page.bigFieldId) ? page.bigFieldId : page.fields[0]
  const gridIds = page.fields.filter(id => id !== heroId)
  const heroField = heroId ? fieldById(heroId) : undefined
  const heroLabel = heroField?.labelKey ? t(heroField.labelKey) : heroField?.label ?? ''
  const hero = heroId ? fieldDisplay(heroId, ctx) : { value: '—' }

  const labelOf = (id: string) => { const ff = fieldById(id); return ff?.labelKey ? t(ff.labelKey) : ff?.label ?? id }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'calc(env(safe-area-inset-top) + 64px)' }}>
      {/* Chips capteurs — avant démarrage */}
      {!started && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6 }}>
          <div style={{
            height: 28, padding: '0 13px', borderRadius: 14,
            background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 600, color: gpsOk ? 'var(--live-text-2)' : 'var(--live-label)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: gpsOk ? 'var(--live-success)' : 'transparent', border: gpsOk ? 'none' : '1.5px solid var(--live-dim)' }} />
            <span className="lv2-num">{gpsChipLabel}</span>
          </div>
          {([['FC', 'w4a.hr'], ['Puissance', 'w4a.power']] as const).map(([id, k]) => (
            <button
              key={id} onClick={onSensorChipTap}
              style={{
                height: 28, padding: '0 13px', borderRadius: 14, cursor: 'pointer',
                background: 'var(--live-surface)', border: '1px solid var(--live-hairline-2)',
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 12, fontWeight: 600, color: 'var(--live-label)',
              }}
              aria-label={t('w4a.sensor_unpaired', { name: t(k) })}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid var(--live-dim)' }} />
              {t(k)}
            </button>
          ))}
        </div>
      )}

      {/* Héro (bigFieldId) */}
      {heroId && (
        <div style={{ textAlign: 'center', marginTop: started ? 42 : 40 }}>
          <div className="lv2-eyebrow">{heroLabel}</div>
          <div className="lv2-num" style={{
            fontSize: Math.round((heroId === 'duration' ? 76 : 104) * f), fontWeight: 800, lineHeight: 1,
            letterSpacing: '-0.01em', marginTop: 18,
            color: (dim || !started) ? 'var(--live-dim)' : 'var(--live-text)',
          }}>
            {!started && heroId === 'duration' ? '00:00:00' : hero.value}
          </div>
          {hero.unit && <div className="lv2-num" style={{ fontSize: 13, fontWeight: 600, marginTop: 8, color: 'var(--live-text-2)' }}>{hero.unit}</div>}
        </div>
      )}

      {/* Grille des autres champs (2 colonnes) */}
      <div className="lv2-grid" style={{ marginTop: started ? 34 : 42 }}>
        {Array.from({ length: Math.ceil(gridIds.length / 2) }).map((_, r) => (
          <div className="lv2-row" key={r}>
            {gridIds.slice(r * 2, r * 2 + 2).map(id => {
              const d = fieldDisplay(id, ctx)
              return <Cell key={id} label={labelOf(id)} value={started ? d.value : (d.unit ? '—' : d.value)} unit={d.unit} dim={dim || !started} tileSize={tileSize} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
