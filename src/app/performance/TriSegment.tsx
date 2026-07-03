'use client'
// Un bloc de segment de la feuille de saisie Triathlon (DS neutre, tokens).
// Champ Temps + champs additionnels (children) + auto-calc en texte neutre +
// bouton « Lier une activité » (surpage) + puces de données réelles.
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { LinkActivitySheet } from './LinkActivitySheet'
import type { ActivityLite, Segment } from './triActivities'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 5, marginTop: 0,
}
export const triInp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-mid)',
  background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
}

export function TriSegment({ title, distLabel, dot, segment, time, setTime, timeLabel, auto, children, onLink, chips, linked }: {
  title: string
  distLabel?: string
  dot?: string
  segment?: Segment
  time: string
  setTime: (v: string) => void
  timeLabel?: string
  auto?: string | null
  children?: React.ReactNode
  onLink?: (a: ActivityLite) => void
  chips?: { label: string; value: string }[]
  linked?: boolean
}) {
  const { t } = useI18n()
  const [showLink, setShowLink] = useState(false)
  const timeLabelText = timeLabel ?? t('performance.timeHms')
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-mid)' }}>{title}</span>
        {distLabel && <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-dim)' }}>{distLabel}</span>}
        {segment && onLink && (
          <button onClick={() => setShowLink(true)}
            style={{ marginLeft: 'auto', padding: 0, border: 'none', background: 'transparent', color: linked ? 'var(--text-mid)' : 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {linked ? t('performance.activityLinked') : t('performance.linkActivity')}
          </button>
        )}
      </div>

      <p style={lbl}>{timeLabelText}</p>
      <input style={time && segment === 'run' ? { ...triInp, maxWidth: 200 } : triInp} value={time} onChange={e => setTime(e.target.value)} placeholder={t('performance.egTime')} />
      {auto && <div style={{ marginTop: 6 }}><span className="tnum" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mid)' }}>→ {auto}</span></div>}

      {children}

      {chips && chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', marginTop: 12 }}>
          {chips.map(c => (
            <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: 'var(--bg-elev)', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-mid)' }}>
              <span style={{ color: 'var(--text-dim)' }}>{c.label}</span>
              <span className="tnum" style={{ color: 'var(--text)' }}>{c.value}</span>
            </span>
          ))}
        </div>
      )}

      {showLink && segment && onLink && (
        <LinkActivitySheet segment={segment} onClose={() => setShowLink(false)} onLink={onLink} />
      )}
    </div>
  )
}
