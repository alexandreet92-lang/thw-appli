'use client'
// Bottom sheet de filtre à facettes (portail sur document.body).
// Facettes : mode · muscle (par région) · équipement · difficulté · flags.
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import {
  MODE_LABEL, MODE_ORDER, MUSCLE_LABEL, MUSCLES_PAR_REGION, REGION_LABEL, REGION_ORDER,
  EQUIP_LABEL, EQUIP_ORDER,
} from '@/data/exercices'
import type { FiltreState } from './useExerciceFilter'

interface Props {
  filtre: FiltreState
  nbResultats: number
  toggleMode: (m: FiltreState['modes'][number]) => void
  toggleMuscle: (m: FiltreState['muscles'][number]) => void
  toggleEquip: (e: FiltreState['equipement'][number]) => void
  setDifficulteMax: (v: number) => void
  toggleFlag: (k: 'unilateral' | 'aEncadrer' | 'avecFiche') => void
  reset: () => void
  onClose: () => void
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 12px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: active ? 600 : 500,
      background: active ? 'var(--primary-dim)' : 'var(--bg-card2)',
      color: active ? 'var(--primary)' : 'var(--text-mid)', transition: 'background .15s, color .15s',
    }}>{label}</button>
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

export function FiltreSheet(p: Props) {
  const { filtre: f } = p
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={p.onClose} />
      <div style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 12px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Filtrer</h3>
          <button onClick={p.onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}>
            <IconX size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 20px 8px', flex: 1 }}>
          <Bloc titre="Qualité / mode">
            {MODE_ORDER.map(m => <Chip key={m} active={f.modes.includes(m)} label={MODE_LABEL[m]} onClick={() => p.toggleMode(m)} />)}
          </Bloc>

          <Bloc titre="Muscle">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
              {REGION_ORDER.map(r => (
                <div key={r}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', margin: '0 0 6px' }}>{REGION_LABEL[r]}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    {MUSCLES_PAR_REGION[r].map(m => <Chip key={m} active={f.muscles.includes(m)} label={MUSCLE_LABEL[m]} onClick={() => p.toggleMuscle(m)} />)}
                  </div>
                </div>
              ))}
            </div>
          </Bloc>

          <Bloc titre="Équipement">
            {EQUIP_ORDER.map(eq => <Chip key={eq} active={f.equipement.includes(eq)} label={EQUIP_LABEL[eq]} onClick={() => p.toggleEquip(eq)} />)}
          </Bloc>

          <Bloc titre={`Difficulté technique — max ${f.difficulteMax}${f.difficulteMax === 10 ? ' (toutes)' : ''}`}>
            <input type="range" min={1} max={10} step={1} value={f.difficulteMax}
              onChange={e => p.setDifficulteMax(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--primary)' }} />
          </Bloc>

          <Bloc titre="Filtres">
            <Chip active={f.unilateral} label="Unilatéral" onClick={() => p.toggleFlag('unilateral')} />
            <Chip active={f.aEncadrer} label="À encadrer" onClick={() => p.toggleFlag('aEncadrer')} />
            <Chip active={f.avecFiche} label="Avec fiche" onClick={() => p.toggleFlag('avecFiche')} />
          </Bloc>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={p.reset} style={{ padding: '11px 16px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
            background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}>
            Effacer
          </button>
          <button onClick={p.onClose} style={{ flex: 1, padding: '11px 16px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
            background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>
            Voir {p.nbResultats} exercice{p.nbResultats > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
