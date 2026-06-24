'use client'
// Bottom sheet de filtre endurance (portail, coulisse bas↔haut). Facettes
// dérivées des données : zone · support · phase + durée · RPE.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import type { Zone } from '@/data/seances/common'
import { ZONE_LABEL } from './EnduranceProfil'
import type { EnduranceFiltreState } from './useEnduranceFilter'

export const SUPPORT_LABEL: Record<string, string> = {
  erg: 'Erg', bateau: 'Bateau', piscine: 'Piscine', 'eau-libre': 'Eau libre',
  sentier: 'Sentier', tapis: 'Tapis', stairmaster: 'Stairmaster',
}

interface Options { zones: Zone[]; supports: string[]; phases: string[] }
interface Props {
  open: boolean
  filtre: EnduranceFiltreState
  options: Options
  nbResultats: number
  toggleZone: (z: Zone) => void
  toggleSupport: (s: string) => void
  togglePhase: (p: string) => void
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
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 var(--space-3)' }}>{titre}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>{children}</div>
    </div>
  )
}

export function EnduranceFiltreSheet(p: Props) {
  const { filtre: f, options: o } = p
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: p.open ? 'auto' : 'none' }}>
      <AnimatePresence>
        {p.open && (
          <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={p.onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
        )}
        {p.open && (
          <motion.div key="panel" initial={reduce ? { opacity: 0 } : { y: '100%' }} animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }} transition={{ duration: reduce ? 0.12 : 0.34, ease: [0.32, 0.72, 0, 1] }}
            style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 12px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Filtrer</h3>
              <button onClick={p.onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}><IconX size={20} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 20px 8px', flex: 1 }}>
              <Bloc titre="Zone">
                {o.zones.map(z => <Chip key={z} active={f.zones.includes(z)} label={`${z} · ${ZONE_LABEL[z]}`} onClick={() => p.toggleZone(z)} />)}
              </Bloc>
              {o.supports.length > 1 && (
                <Bloc titre="Support">
                  {o.supports.map(s => <Chip key={s} active={f.supports.includes(s)} label={SUPPORT_LABEL[s] ?? s} onClick={() => p.toggleSupport(s)} />)}
                </Bloc>
              )}
              <Bloc titre="Phase">
                {o.phases.map(ph => <Chip key={ph} active={f.phases.includes(ph)} label={ph} onClick={() => p.togglePhase(ph)} />)}
              </Bloc>
              <Bloc titre={`Durée max — ${f.dureeMax >= 360 ? 'toutes' : `${f.dureeMax} min`}`}>
                <input type="range" min={30} max={360} step={15} value={f.dureeMax} onChange={e => p.setDureeMax(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              </Bloc>
              <Bloc titre={`RPE max — ${f.rpeMax >= 10 ? 'tous' : f.rpeMax}`}>
                <input type="range" min={1} max={10} step={1} value={f.rpeMax} onChange={e => p.setRpeMax(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              </Bloc>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button onClick={p.reset} style={{ padding: '11px 16px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>Effacer</button>
              <button onClick={p.onClose} style={{ flex: 1, padding: '11px 16px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>
                Voir {p.nbResultats} séance{p.nbResultats > 1 ? 's' : ''}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
