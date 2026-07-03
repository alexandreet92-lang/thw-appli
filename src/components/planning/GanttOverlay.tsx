'use client'
// Surpage Gantt ÉDITABLE (createPortal, scale .92→1). Contient la frise éditable + « Créer un
// bloc » et des swatches couleur (un par sport). Ces contrôles n'existent QUE dans la surpage,
// jamais dans la frise lecture seule de la page.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BLOC_SPORT_KEYS, SPORT_LABELS, SPORT_COLORS } from '@/lib/constants/blocTypes'
import { upsertBloc, newBloc } from '@/app/planning/trainingBlocks'
import { FriseV1 } from './FriseV1'
import { useI18n } from '@/lib/i18n'

const T = 'var(--text)', DIM = 'var(--text-mid)' // surface/texte = tokens de thème

export function GanttOverlay({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const [token, setToken] = useState(0)
  useEffect(() => { const t = setTimeout(() => setShown(open), 10); return () => clearTimeout(t) }, [open])
  if (!open) return null

  function create(sport: string) { upsertBloc(newBloc(sport)); setToken(t => t + 1); onChanged() }

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, opacity: shown ? 1 : 0, transition: 'opacity .25s', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: 'min(900px,96vw)', maxHeight: '90vh', overflowY: 'auto', padding: '24px 26px', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,.6)', transform: shown ? 'scale(1)' : 'scale(0.92)', transition: 'transform .3s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, color: T }}>{t('planning.trainingPlanification')}</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-mid)' }}>✕</button>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 50 }}>
          <FriseV1 readOnly={false} reloadToken={token} onEdited={onChanged} />
        </div>

        {/* Créer un bloc + swatches couleur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: DIM }}>{t('planning.createBlocColon')}</span>
          {BLOC_SPORT_KEYS.map(s => (
            <button key={s} onClick={() => create(s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: T, cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: SPORT_COLORS[s] }} />{SPORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
