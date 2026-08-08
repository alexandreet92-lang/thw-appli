'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramFilters — un bouton « Filtres » qui ouvre une SURPAGE CENTRÉE
// (modale) avec les réglages IA + Prix. Le sport et la spécialité se
// choisissent dans le deck (cercles sur mobile / colonnes sur desktop),
// donc pas ici. applyProgramFilters filtre sur les 4 critères.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconAdjustmentsHorizontal, IconX } from '@tabler/icons-react'
import type { CoachProgram } from '@/lib/coach/programs'

export interface ProgFilters { sport: string; specialty: string; ai: 'all' | 'yes' | 'no'; price: 'all' | 'free' | '20' | '30' | '50' }
export const DEFAULT_FILTERS: ProgFilters = { sport: '', specialty: '', ai: 'all', price: 'all' }

export function applyProgramFilters(programs: CoachProgram[], f: ProgFilters): CoachProgram[] {
  return programs.filter(p => {
    if (f.sport && !p.sports.includes(f.sport)) return false
    if (f.specialty && p.specialty !== f.specialty) return false
    if (f.ai === 'yes' && !p.ai_enabled) return false
    if (f.ai === 'no' && p.ai_enabled) return false
    if (f.price === 'free' && p.price_cents !== 0) return false
    if (f.price === '20' && p.price_cents > 2000) return false
    if (f.price === '30' && p.price_cents > 3000) return false
    if (f.price === '50' && p.price_cents > 5000) return false
    return true
  })
}

const AI_OPTS: { k: ProgFilters['ai']; label: string }[] = [{ k: 'all', label: 'Tous' }, { k: 'yes', label: 'Avec IA' }, { k: 'no', label: 'Sans IA' }]
const PRICE_OPTS: { k: ProgFilters['price']; label: string }[] = [
  { k: 'all', label: 'Tous' }, { k: 'free', label: 'Gratuit' }, { k: '20', label: '≤ 20 €' }, { k: '30', label: '≤ 30 €' }, { k: '50', label: '≤ 50 €' },
]

export default function ProgramFilters({ programs, value, onChange }: {
  programs: CoachProgram[]; value: ProgFilters; onChange: (f: ProgFilters) => void
}) {
  const [open, setOpen] = useState(false)
  const hasPaid = programs.some(p => p.price_cents > 0)
  const hasAi = programs.some(p => p.ai_enabled)
  const activeCount = (value.ai !== 'all' ? 1 : 0) + (value.price !== 'all' ? 1 : 0)
  const set = (patch: Partial<ProgFilters>) => onChange({ ...value, ...patch })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  if (!hasPaid && !hasAi) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
          border: activeCount ? '1px solid var(--primary)' : '1px solid var(--border)', background: activeCount ? 'var(--primary-dim)' : 'var(--bg-card2)', color: activeCount ? 'var(--primary)' : 'var(--text-mid)' }}>
        <IconAdjustmentsHorizontal size={17} /> Filtres
        {activeCount > 0 && <span className="tnum" style={{ minWidth: 18, height: 18, borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{activeCount}</span>}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 14000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', animation: 'fBg 180ms ease' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(20px,5vw,28px)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', animation: 'fPop 220ms cubic-bezier(0.32,0.72,0,1)' }}>
            <style>{`@keyframes fBg{from{opacity:0}to{opacity:1}}@keyframes fPop{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:none}}`}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Filtres</span>
              <button onClick={() => setOpen(false)} aria-label="Fermer" style={{ width: 34, height: 34, borderRadius: 999, border: 'none', background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={18} /></button>
            </div>

            {hasAi && <Group label="Intelligence artificielle">
              {AI_OPTS.map(o => <Chip key={o.k} on={value.ai === o.k} onClick={() => set({ ai: o.k })}>{o.label}</Chip>)}
            </Group>}
            {hasPaid && <Group label="Prix">
              {PRICE_OPTS.map(o => <Chip key={o.k} on={value.price === o.k} onClick={() => set({ price: o.k })}>{o.label}</Chip>)}
            </Group>}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => onChange({ ...value, ai: 'all', price: 'all' })} style={{ flex: '0 0 auto', padding: '11px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Réinitialiser</button>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '11px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Voir les programmes</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '9px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{children}</button>
}
