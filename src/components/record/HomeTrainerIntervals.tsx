'use client'
import type { HTProgram } from '@/types/hometrainer'
import { getZoneColor, getZoneLabel } from '@/types/hometrainer'
import { useI18n } from '@/lib/i18n'

interface Props {
  program: HTProgram
  elapsedSec: number
  ftp: number
  isDark: boolean
}

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function HomeTrainerIntervals({ program, elapsedSec, ftp, isDark }: Props) {
  const { t } = useI18n()
  const text  = isDark ? '#FFF' : '#0A0A0A'
  const dim   = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const surf  = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'

  // Find current interval
  let cumulative = 0
  let curIdx = 0
  let elapsedInCur = elapsedSec
  for (let i = 0; i < program.intervals.length; i++) {
    const end = cumulative + program.intervals[i].duration
    if (elapsedSec < end || i === program.intervals.length - 1) {
      curIdx = i
      elapsedInCur = elapsedSec - cumulative
      break
    }
    cumulative = end
  }
  const cur = program.intervals[curIdx]
  const next = program.intervals[curIdx + 1]
  const remainingInCur = Math.max(0, cur.duration - elapsedInCur)
  const targetWatts = Math.round(ftp * cur.ftpPercent / 100)

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      {/* Progress bar */}
      <div style={{ width: '100%', height: 16, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
        {program.intervals.map((iv, i) => {
          const widthPct = (iv.duration / program.duration) * 100
          const isActive = i === curIdx
          const color = getZoneColor(iv.ftpPercent)
          const progress = isActive ? Math.min(1, elapsedInCur / iv.duration) : (i < curIdx ? 1 : 0)
          return (
            <div key={i} style={{ width: `${widthPct}%`, height: '100%', position: 'relative', background: `${color}30`, borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.15)' : 'none' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: color, transition: 'width 1s linear' }} />
              {isActive && <div style={{ position: 'absolute', inset: 0, border: `2px solid ${color}`, borderRadius: 2, pointerEvents: 'none' }} />}
            </div>
          )
        })}
      </div>

      {/* Current interval info */}
      <div style={{ background: surf, borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: getZoneColor(cur.ftpPercent), flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{getZoneLabel(cur.ftpPercent)}</p>
        </div>
        <p style={{ fontSize: 13, fontWeight: 500, color: text, margin: '0 0 10px' }}>{cur.name}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontSize: 11, color: dim, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('record.homeTrainerTarget')}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: getZoneColor(cur.ftpPercent), margin: 0, lineHeight: 1 }}>
              {targetWatts}w <span style={{ fontSize: 14, color: dim, fontWeight: 400 }}>({cur.ftpPercent}% FTP)</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: dim, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('record.homeTrainerRemaining')}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: text, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(remainingInCur)}</p>
          </div>
        </div>
      </div>

      {/* Next interval */}
      {next && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: surf, borderRadius: 12, opacity: 0.7 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: getZoneColor(next.ftpPercent), flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: text, margin: 0 }}>{t('record.homeTrainerNext')} {next.name}</p>
          <p style={{ fontSize: 13, color: dim, margin: '0 0 0 auto' }}>{Math.round(ftp * next.ftpPercent / 100)}w · {fmt(next.duration)}</p>
        </div>
      )}
    </div>
  )
}
