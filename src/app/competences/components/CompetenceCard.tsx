'use client'

import { AlertTriangle } from 'lucide-react'
import type { CompetenceWithUserState } from '@/types/competences'
import { sportIcon, SPORT_LABELS, type SportFilter } from '../constants'

interface Props {
  competence: CompetenceWithUserState
  conflicts: CompetenceWithUserState[]   // compétences actives en conflit
  onToggle: () => void
  onOpenDetail: () => void
  compact?: boolean                       // mobile : masque "Voir le prompt"
}

export default function CompetenceCard({ competence, conflicts, onToggle, onOpenDetail, compact }: Props) {
  const active = competence.user_state?.active ?? false

  return (
    <div
      onClick={onOpenDetail}
      style={{
        background: 'var(--bg-card)',
        border: active ? '0.5px solid rgba(6,182,212,0.5)' : '0.5px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(6,182,212,0.3)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.35 }}>
          {competence.nom}
        </span>
        {/* Toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggle() }}
          aria-label={active ? 'Désactiver' : 'Activer'}
          style={{
            width: 32, height: 17, borderRadius: 9, flexShrink: 0,
            border: 'none', cursor: 'pointer', position: 'relative',
            background: active ? '#06B6D4' : 'var(--border)',
            transition: 'background 180ms',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, left: active ? 17 : 2,
            width: 13, height: 13, borderRadius: '50%', background: '#fff',
            transition: 'left 180ms', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
          }} />
        </button>
      </div>

      {/* Description courte */}
      {competence.description_courte && (
        <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>
          {competence.description_courte}
        </p>
      )}

      {/* Bullets */}
      {competence.bullets?.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
          {competence.bullets.map((b, i) => (
            <li key={i} style={{ position: 'relative', paddingLeft: 12, fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--text-dim)' }}>—</span>
              {b}
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 10 }}>
        {competence.sports.map(s => (
          <span key={s} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: 'rgba(6,182,212,0.85)',
            border: '0.5px solid rgba(6,182,212,0.25)', borderRadius: 5, padding: '2px 8px',
          }}>
            {sportIcon(s as SportFilter, 11)}
            {SPORT_LABELS[s as SportFilter] ?? s}
          </span>
        ))}

        {conflicts.map(c => (
          <span key={c.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: 'rgba(239,68,68,0.85)',
            border: '0.5px solid rgba(239,68,68,0.35)', borderRadius: 5, padding: '2px 8px',
          }}>
            <AlertTriangle size={11} strokeWidth={1.8} />
            Conflit : {c.nom}
          </span>
        ))}

        {!compact && (
          <button
            onClick={e => { e.stopPropagation(); onOpenDetail() }}
            style={{
              marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)',
              border: '0.5px solid var(--border)', borderRadius: 5, padding: '2px 8px',
              background: 'transparent', cursor: 'pointer',
            }}
          >
            Voir le prompt
          </button>
        )}
      </div>
    </div>
  )
}
