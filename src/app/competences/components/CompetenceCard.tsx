'use client'

import { AlertTriangle } from 'lucide-react'
import type { CompetenceWithUserState } from '@/types/competences'
import { useI18n } from '@/lib/i18n'
import { sportIcon, SPORT_LABELS, type SportFilter } from '../constants'
import { SHEET_CARD_SHADOW } from '@/components/ui/BottomSheet'

interface Props {
  competence: CompetenceWithUserState
  conflicts: CompetenceWithUserState[]   // compétences actives en conflit
  onToggle: () => void
  onOpenDetail: () => void
  compact?: boolean                       // mobile : masque "Voir le prompt"
}

const THUMB_SHADOW = '0 2px 6px rgba(0,0,0,0.18)' // design-allow-color — ombre du pouce d'interrupteur

/** Interrupteur iOS (51 × 31) — cible tactile 44 px. */
function MSwitch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{ width: 59, height: 44, margin: '-7px -4px -7px 0', padding: '6px 4px', border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
      <span style={{ display: 'block', position: 'relative', width: 51, height: 31, borderRadius: 'var(--r-pill)', background: on ? 'var(--primary)' : 'var(--toggle-off)', transition: 'background 180ms' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: '50%', background: 'var(--surface-card)',
          boxShadow: THUMB_SHADOW, transition: 'left 180ms cubic-bezier(0.32,0.72,0,1)' }} />
      </span>
    </button>
  )
}

export default function CompetenceCard({ competence, conflicts, onToggle, onOpenDetail, compact }: Props) {
  const { t } = useI18n()
  const active = competence.user_state?.active ?? false

  // Mobile (compact) : carte blanche radius 20 sans bordure, titre gras,
  // interrupteur iOS, puces sport grises, conflits en texte rouge + point.
  if (compact) {
    return (
      <div role="button" tabIndex={0} onClick={onOpenDetail}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail() } }}
        style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: '16px', cursor: 'pointer', boxShadow: SHEET_CARD_SHADOW, fontFamily: 'var(--font-body)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{competence.nom}</span>
          <MSwitch on={active} onClick={onToggle} label={active ? t('competences.deactivate') : t('competences.activate')} />
        </div>
        {competence.description_courte && (
          <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{competence.description_courte}</p>
        )}
        {competence.bullets?.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
            {competence.bullets.map((b, i) => (
              <li key={i} style={{ position: 'relative', paddingLeft: 14, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.55 }}>
                <span aria-hidden style={{ position: 'absolute', left: 2, top: '0.6em', width: 4, height: 4, borderRadius: '50%', background: 'var(--text-dim)' }} />
                {b}
              </li>
            ))}
          </ul>
        )}
        {(competence.sports.length > 0 || conflicts.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 }}>
            {competence.sports.map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--surface-chip)', borderRadius: 'var(--r-pill)', padding: '5px 11px' }}>
                {sportIcon(s as SportFilter, 13)}
                {t(SPORT_LABELS[s as SportFilter] ?? s)}
              </span>
            ))}
            {conflicts.map(c => (
              <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--danger)', padding: '5px 4px' }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)' }} />
                {t('competences.conflictTag', { nom: c.nom })}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={onOpenDetail}
      style={{
        background: 'var(--bg-card)',
        border: active ? '0.5px solid rgba(6,182,212,0.5)' : '0.5px solid var(--border)',
        borderRadius: 'var(--r-md)',
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
          aria-label={active ? t('competences.deactivate') : t('competences.activate')}
          style={{
            width: 32, height: 17, borderRadius: 'var(--r-sm)', flexShrink: 0,
            cursor: 'pointer', position: 'relative',
            background: active ? 'var(--primary)' : 'var(--toggle-off)',
            border: active ? 'none' : '1px solid rgba(0,0,0,0.05)',
            transition: 'background 180ms',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, left: active ? 17 : 2,
            width: 13, height: 13, borderRadius: '50%', background: '#fff',
            transition: 'left 180ms', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
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
            border: '0.5px solid rgba(6,182,212,0.25)', borderRadius: 'var(--r-sm)', padding: '2px 8px',
          }}>
            {sportIcon(s as SportFilter, 11)}
            {t(SPORT_LABELS[s as SportFilter] ?? s)}
          </span>
        ))}

        {conflicts.map(c => (
          <span key={c.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: 'rgba(239,68,68,0.85)',
            border: '0.5px solid rgba(239,68,68,0.35)', borderRadius: 'var(--r-sm)', padding: '2px 8px',
          }}>
            <AlertTriangle size={11} strokeWidth={1.8} />
            {t('competences.conflictTag', { nom: c.nom })}
          </span>
        ))}

        {!compact && (
          <button
            onClick={e => { e.stopPropagation(); onOpenDetail() }}
            style={{
              marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '2px 8px',
              background: 'transparent', cursor: 'pointer',
            }}
          >
            {t('competences.viewPrompt')}
          </button>
        )}
      </div>
    </div>
  )
}
