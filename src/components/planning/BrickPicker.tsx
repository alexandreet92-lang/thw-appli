'use client'
// ══════════════════════════════════════════════════════════════════
// BrickPicker — sur-page d'ENCHAÎNEMENT vélo → course à pied.
// S'ouvre au clic sur « Brick Run » dans l'éditeur d'une séance vélo.
// Deux options :
//   1. RELIER une course déjà planifiée le même jour (elle devient la
//      course d'enchaînement — une flèche la relie au vélo dans la grille).
//   2. CRÉER une nouvelle course d'enchaînement (interface classique).
// Rendu en portal, au-dessus de l'éditeur (pointerEvents actifs).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconPlus, IconArrowDown } from '@tabler/icons-react'
import { formatHM, type Session } from '@/app/planning/page'
import { SportIcon } from '@/components/icons/SportIcon'
import { useI18n } from '@/lib/i18n'

export function BrickPicker({ runs, accent, onPick, onCreate, onClose }: {
  runs: Session[]
  accent: string
  onPick: (run: Session) => void
  onCreate: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || typeof document === 'undefined') return null

  const card: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
    border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)',
  }

  const node = (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 5000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
      animation: 'brkFade .16s ease-out forwards',
    }}>
      <style>{`@keyframes brkFade{from{opacity:0}to{opacity:1}}@keyframes brkIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(460px, 100%)', maxHeight: '82vh', overflowY: 'auto',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18,
        padding: 20, boxShadow: 'var(--shadow-card)', animation: 'brkIn .2s ease-out forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: accent }}>
            <SportIcon sport="bike" size={20} /><IconArrowDown size={15} /><SportIcon sport="run" size={20} />
          </span>
          <h3 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
            {t('w4c.brick_title')}
          </h3>
          <button onClick={onClose} aria-label={t('w4c.brick_close_aria')} style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.45 }}>
          {t('w4c.brick_description')}
        </p>

        {runs.length > 0 && (
          <>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', display: 'block', marginBottom: 8 }}>
              {t('w4c.brick_runs_today')}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {runs.map(r => (
                <button key={r.id} onClick={() => onPick(r)} style={card}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
                  <SportIcon sport={r.sport} size={26} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatHM(r.durationMin)}{r.time ? ` · ${r.time}` : ''}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{t('w4c.brick_link')} →</span>
                </button>
              ))}
            </div>
          </>
        )}

        <button onClick={onCreate} style={{ ...card, borderStyle: 'dashed', justifyContent: 'center', color: accent, fontWeight: 700, fontSize: 13 }}>
          <IconPlus size={17} /> {t('w4c.brick_create_new')}
        </button>
      </div>
    </div>
  )
  return createPortal(node, document.body)
}
