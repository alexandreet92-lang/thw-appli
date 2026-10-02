'use client'
// ══════════════════════════════════════════════════════════════
// Carte « modifications à valider » (MOBILE) — maquette « a3-actions » :
// une seule carte qui liste les actions proposées par le coach en lignes
// (tuile d'icône teintée · titre · détail), puis Annuler / Appliquer les N.
// État « application » : bouton en cours + lignes qui se valident une à une.
// ══════════════════════════════════════════════════════════════

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { AimCard, AimIconTile, AimPill, AimStagger, AimStaggerItem, AimTag, AIM_EASE } from './kit'

export type ToolKind = 'add' | 'move' | 'edit' | 'delete' | 'week' | 'phases' | 'plan' | 'profile' | 'injury' | 'other'

export interface ToolRow {
  kind: ToolKind
  tint: string
  title: string
  sub: string
}

const ICON: Record<ToolKind, React.ReactNode> = {
  add:     <path d="M12 5v14M5 12h14" />,
  move:    <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  edit:    <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  delete:  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  week:    <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5" /></>,
  phases:  <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />,
  plan:    <path d="m12 3 1.9 5.8L20 10l-5 3.6L16.8 20 12 16.4 7.2 20 9 13.6 4 10l6.1-1.2Z" />,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  injury:  <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  other:   <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
}

export function ToolCallsCard({ rows, status, error, onApply, onCancel }: {
  rows: ToolRow[]
  status: 'idle' | 'applying' | 'success' | 'error'
  error: string | null
  onApply: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const n = rows.length
  const applying = status === 'applying'
  const done = status === 'success'
  return (
    <AimCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <span className="aimc-num" style={{ fontSize: 16, fontWeight: 800 }}>{n > 1 ? t('ai2.tools.count', { n }) : t('ai2.tools.countOne')}</span>
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: AIM_EASE }}>
              <AimTag tint="var(--success)">{t('ai2.tools.applied')}</AimTag>
            </motion.span>
          ) : (
            <motion.span key="pending" exit={{ opacity: 0 }} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{t('ai2.tools.pending')}</motion.span>
          )}
        </AnimatePresence>
      </div>

      <AimStagger>
        {rows.map((r, i) => (
          <AimStaggerItem key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
              <AimIconTile tint={r.tint}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON[r.kind]}</svg>
              </AimIconTile>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                {r.sub && <span style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.sub}</span>}
              </span>
              <AnimatePresence>
                {(done || applying) && (
                  <motion.span
                    key="st"
                    initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: done ? 1 : 0.5 }}
                    transition={{ duration: 0.3, ease: AIM_EASE, delay: done ? i * 0.08 : 0 }}
                    aria-hidden
                    style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: done ? 'var(--success)' : 'var(--surface-chip)', color: 'var(--on-primary)' }}
                  >
                    {done
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      : <span className="aimc-skel" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-dim)' }} />}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </AimStaggerItem>
        ))}
      </AimStagger>

      {status === 'error' && error && (
        <p role="alert" style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.4, color: 'var(--danger)' }}>{error}</p>
      )}

      {!done && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <AimPill onClick={onCancel} disabled={applying} flex={1}>{t('ai.cancel')}</AimPill>
          <AimPill variant="primary" onClick={onApply} disabled={applying} flex={2} hapticKind="success"
            style={applying ? { background: 'var(--primary)', color: 'var(--on-primary)', opacity: 0.8 } : undefined}>
            {applying
              ? <motion.span animate={reduce ? undefined : { opacity: [1, 0.55, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>{t('ai2.tools.applying')}</motion.span>
              : n > 1 ? t('ai2.tools.applyN', { n }) : t('ai2.tools.apply')}
          </AimPill>
        </div>
      )}
    </AimCard>
  )
}
