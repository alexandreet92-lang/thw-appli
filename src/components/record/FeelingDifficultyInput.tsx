'use client'
// Saisie du RESSENTI (/5) et de la DIFFICULTÉ / RPE (/10) via les jauges donut
// de la page training (arcs 3/4, chiffre central, couleur sémantique). Reprend
// FEELING/DIFFICULTY_THRESHOLDS et le visuel de GaugeArc (activities/page.tsx).
import { useI18n } from '@/lib/i18n'

const ARC_TOTAL = 217   // 3/4 de circonférence
const ARC_FULL = 289

const FEELING_THRESHOLDS = [
  { max: 1.5, color: '#ef4444', label: 'actp.feel_sad' },
  { max: 3,   color: '#eab308', label: 'actp.feel_normal' },
  { max: 4.5, color: '#10b981', label: 'actp.feel_good' },
  { max: 5,   color: '#06b6d4', label: 'actp.feel_amazing' },
]
const DIFFICULTY_THRESHOLDS = [
  { max: 3,   color: '#10b981', label: 'actp.diff_easy' },
  { max: 5,   color: '#84cc16', label: 'actp.diff_moderate' },
  { max: 6,   color: '#eab308', label: 'actp.diff_bit_hard' },
  { max: 7.5, color: '#f97316', label: 'actp.diff_hard' },
  { max: 9,   color: '#ef4444', label: 'actp.diff_very_hard' },
  { max: 10,  color: '#991b1b', label: 'actp.diff_terrible' },
]
const feelDesc = (v: number) => FEELING_THRESHOLDS.find(t => v <= t.max) ?? FEELING_THRESHOLDS[FEELING_THRESHOLDS.length - 1]
const diffDesc = (v: number) => DIFFICULTY_THRESHOLDS.find(t => v <= t.max) ?? DIFFICULTY_THRESHOLDS[DIFFICULTY_THRESHOLDS.length - 1]
const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toString().replace('.', ','))

function Gauge({ value, max, label, kind, onChange }: {
  value: number | null; max: number; label: string
  kind: 'feeling' | 'difficulty'; onChange: (v: number) => void
}) {
  const { t } = useI18n()
  const isSet = value != null
  const desc = isSet ? (kind === 'feeling' ? feelDesc(value) : diffDesc(value)) : null
  const ratio = isSet ? Math.max(0, Math.min(1, value / max)) : 0
  const filled = ratio * ARC_TOTAL
  const color = isSet && desc ? desc.color : 'var(--border)'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <svg width={96} height={96} viewBox="0 0 110 110">
          <circle cx={55} cy={55} r={46} stroke="var(--border)" strokeWidth={6} fill="none"
            strokeDasharray={`${ARC_TOTAL} ${ARC_FULL}`} transform="rotate(135 55 55)" strokeLinecap="round" />
          {isSet && (
            <circle cx={55} cy={55} r={46} stroke={color} strokeWidth={6} fill="none"
              strokeDasharray={`${filled} ${ARC_FULL}`} transform="rotate(135 55 55)" strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.3s ease, stroke 0.3s ease' }} />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: isSet ? 'var(--text)' : 'var(--text-dim)' }}>{isSet ? fmt(value) : '—'}</div>
          {isSet && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontWeight: 500 }}>{t('actp.out_of')} {max}</div>}
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isSet ? 'var(--text)' : 'var(--text-dim)', fontStyle: isSet ? 'normal' : 'italic', minHeight: 18 }}>
        {isSet && desc ? t(desc.label) : t('actp.not_set')}
      </div>
      <input type="range" min={0} max={max} step={0.5} value={value ?? max / 2}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color === 'var(--border)' ? 'var(--primary)' : color, cursor: 'pointer' }} />
    </div>
  )
}

export function FeelingDifficultyInput({ feeling, difficulty, onFeeling, onDifficulty }: {
  feeling: number | null; difficulty: number | null
  onFeeling: (v: number) => void; onDifficulty: (v: number) => void
}) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', gap: 12, background: 'var(--bg-card2)', borderRadius: 14, padding: '16px 12px' }}>
      <Gauge value={feeling}    max={5}  kind="feeling"    label={t('actp.feeling_upper')    || 'Ressenti'}  onChange={onFeeling} />
      <Gauge value={difficulty} max={10} kind="difficulty" label={t('actp.difficulty_upper') || 'Difficulté'} onChange={onDifficulty} />
    </div>
  )
}
