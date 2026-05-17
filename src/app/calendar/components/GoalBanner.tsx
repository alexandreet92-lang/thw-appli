'use client'
import { Race, daysUntil } from './types'

interface Props { gty: Race | undefined }

export default function GoalBanner({ gty }: Props) {
  if (!gty) {
    return (
      <div style={{
        padding: '16px 24px', borderRadius: 14, background: '#111827',
        border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontStyle: 'italic' }}>
          Aucun objectif principal défini
        </p>
      </div>
    )
  }

  const days = Math.max(0, daysUntil(gty.date))

  return (
    <div style={{
      padding: '18px 24px', borderRadius: 14, background: '#111827',
      border: '1px solid #374151', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase' as const, color: '#9CA3AF', margin: '0 0 5px',
        }}>
          Goal of the Year
        </p>
        <p style={{
          fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800,
          color: '#fff', margin: '0 0 4px', lineHeight: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>
          {gty.name}
        </p>
        {gty.goalTime && (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            Objectif : {gty.goalTime}
          </p>
        )}
        {gty.distance && !gty.goalTime && (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            {gty.distance}
          </p>
        )}
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <p style={{
          fontFamily: 'Syne, sans-serif', fontSize: 38, fontWeight: 800,
          color: '#fff', margin: 0, lineHeight: 1,
        }}>
          {days}
        </p>
        <p style={{ fontSize: 10, color: '#9CA3AF', margin: '4px 0 0' }}>
          {days === 0 ? "C'est aujourd'hui !" : 'jours restants'}
        </p>
      </div>
    </div>
  )
}
