'use client'
// Bottom sheet de filtre Running (portail sur document.body, coulisse bas↔haut).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import { useI18n } from '@/lib/i18n'
import {
  FILIERE_ORDER, FILIERE_LABEL, BUCKET_ORDER, BUCKET_SHORT, PHASE_ORDER,
} from '@/data/seances/running'
import type { RunFiltreState } from './useRunFilter'

interface Props {
  open: boolean
  filtre: RunFiltreState
  nbResultats: number
  toggleFiliere: (x: RunFiltreState['filieres'][number]) => void
  toggleDistance: (x: RunFiltreState['distances'][number]) => void
  togglePhase: (x: string) => void
  setDureeMax: (v: number) => void
  setRpeMax: (v: number) => void
  reset: () => void
  onClose: () => void
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '7px 12px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: active ? 600 : 500,
      background: active ? 'var(--primary-dim)' : 'var(--bg-card2)', color: active ? 'var(--primary)' : 'var(--text-mid)' }}>{label}</button>
  )
}
function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }}>{titre}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>{children}</div>
    </div>
  )
}

export function RunFiltreSheet(p: Props) {
  const { t } = useI18n()
  const { filtre: f } = p
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', pointerEvents: p.open ? 'auto' : 'none' }}>
      <AnimatePresence>
        {p.open && (
          <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} onClick={p.onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
        )}
        {p.open && (
          <motion.div key="panel"
            initial={reduce ? { opacity: 0 } : { y: '100%' }} animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }} transition={{ duration: reduce ? 0.12 : 0.34, ease: [0.32, 0.72, 0, 1] }}
            style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
              maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 12px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('session.filtrer')}</h3>
              <button onClick={p.onClose} aria-label={t('session.fermer')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}>
                <IconX size={20} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 20px 8px', flex: 1 }}>
              <Bloc titre={t('session.filiere')}>
                {FILIERE_ORDER.map(x => <Chip key={x} active={f.filieres.includes(x)} label={FILIERE_LABEL[x]} onClick={() => p.toggleFiliere(x)} />)}
              </Bloc>
              <Bloc titre={t('session.distanceCible')}>
                {BUCKET_ORDER.map(x => <Chip key={x} active={f.distances.includes(x)} label={BUCKET_SHORT[x]} onClick={() => p.toggleDistance(x)} />)}
              </Bloc>
              <Bloc titre={t('session.phase')}>
                {PHASE_ORDER.map(x => <Chip key={x} active={f.phases.includes(x)} label={x} onClick={() => p.togglePhase(x)} />)}
              </Bloc>
              <Bloc titre={f.dureeMax >= 180 ? t('session.dureeMaxToutes') : t('session.dureeMaxN', { n: f.dureeMax })}>
                <input type="range" min={20} max={180} step={5} value={f.dureeMax}
                  onChange={e => p.setDureeMax(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              </Bloc>
              <Bloc titre={f.rpeMax >= 10 ? t('session.rpeMaxTous') : t('session.rpeMaxN', { n: f.rpeMax })}>
                <input type="range" min={1} max={10} step={1} value={f.rpeMax}
                  onChange={e => p.setRpeMax(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              </Bloc>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button onClick={p.reset} style={{ padding: '11px 16px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>{t('session.effacer')}</button>
              <button onClick={p.onClose} style={{ flex: 1, padding: '11px 16px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>
                {t('session.voirNSeances', { n: p.nbResultats, s: p.nbResultats > 1 ? 's' : '' })}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
