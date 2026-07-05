'use client'
import { Race, RACE_CFG, daysUntil } from './types'
import { useI18n } from '@/lib/i18n'
import { currentLocale } from '@/lib/i18n'

interface Props {
  races: Race[]
  onEdit: (race: Race) => void
}

export default function NextRaceBar({ races, onEdit }: Props) {
  const { t } = useI18n()
  const next = races
    .filter(r => daysUntil(r.date) > 0 && r.status !== 'completed')
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))[0]

  if (!next) return null

  const cfg  = RACE_CFG[next.level]
  const days = daysUntil(next.date)
  const dateLabel = new Date(next.date).toLocaleDateString(currentLocale(), {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const sub = next.distance || next.goal || next.runDistance || ''

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 13, padding: 14, boxShadow: 'var(--shadow-card)',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const,
    }}>
      {/* Jours restants */}
      <div style={{
        width: 54, height: 54, borderRadius: 12,
        background: cfg.bg, border: `2px solid ${cfg.border}`,
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800,
          color: next.level === 'gty' ? '#fff' : cfg.color, lineHeight: 1,
        }}>
          {days}
        </span>
        <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>{t('calendar.days')}</span>
      </div>

      {/* Infos course */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>
          {next.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '2px 0' }}>{dateLabel}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-mid)', margin: 0 }}>{sub}</p>}
      </div>

      {/* Bouton modifier */}
      <button
        onClick={() => onEdit(next)}
        style={{
          padding: '6px 14px', borderRadius: 8, background: 'var(--bg-card2)',
          border: '1px solid var(--border)', color: 'var(--text-mid)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
        }}
      >
        {t('calendar.edit')}
      </button>
    </div>
  )
}
