'use client'
// Bottom sheet de filtre Vélo (portail, coulisse bas↔haut).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import { SUPPORT_LABEL, VELO_PHASE_ORDER } from '@/data/seances/velo'
import { ZONE_LABEL } from './VeloProfil'
import type { VeloFiltreState } from './useVeloFilter'
import type { Zone, Cadence, Terrain, Support } from '@/data/seances/velo'

const ZONES: Zone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7']
const CADENCES: { v: Cadence; l: string }[] = [{ v: 'basse', l: 'Basse' }, { v: 'haute', l: 'Haute' }]
const TERRAINS: { v: Terrain; l: string }[] = [{ v: 'plat', l: 'Plat' }, { v: 'cote', l: 'Côte' }]
const SUPPORTS: Support[] = ['route', 'home-trainer']

interface Props {
  open: boolean
  filtre: VeloFiltreState
  nbResultats: number
  toggleZone: (z: Zone) => void
  toggleCadence: (c: Cadence) => void
  toggleTerrain: (t: Terrain) => void
  toggleSupport: (s: Support) => void
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

export function VeloFiltreSheet(p: Props) {
  const { filtre: f } = p
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
                {ZONES.map(z => <Chip key={z} active={f.zones.includes(z)} label={`${z} · ${ZONE_LABEL[z]}`} onClick={() => p.toggleZone(z)} />)}
              </Bloc>
              <Bloc titre="Cadence">
                {CADENCES.map(c => <Chip key={c.v} active={f.cadences.includes(c.v)} label={c.l} onClick={() => p.toggleCadence(c.v)} />)}
              </Bloc>
              <Bloc titre="Terrain">
                {TERRAINS.map(t => <Chip key={t.v} active={f.terrains.includes(t.v)} label={t.l} onClick={() => p.toggleTerrain(t.v)} />)}
              </Bloc>
              <Bloc titre="Support">
                {SUPPORTS.map(s => <Chip key={s} active={f.supports.includes(s)} label={SUPPORT_LABEL[s]} onClick={() => p.toggleSupport(s)} />)}
              </Bloc>
              <Bloc titre="Phase">
                {VELO_PHASE_ORDER.map(ph => <Chip key={ph} active={f.phases.includes(ph)} label={ph} onClick={() => p.togglePhase(ph)} />)}
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
