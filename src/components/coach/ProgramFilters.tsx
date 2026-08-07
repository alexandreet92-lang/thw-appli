'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramFilters — filtres du catalogue sous forme de MENUS DÉROULANTS
// (sport, IA, prix) qui s'ouvrent avec une animation vers le haut. Évite le mur
// de boutons. Sur mobile, l'option « Tous les sports » est masquée (on ne peut
// pas mélanger les sports — un sport à la fois).
// Composant contrôlé : l'état vit dans la page ; applyProgramFilters filtre.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import type { CoachProgram } from '@/lib/coach/programs'
import { useNarrow } from '@/lib/hooks/useNarrow'

const SPORT_LABEL: Record<string, string> = { running: 'Course', cycling: 'Vélo', swim: 'Natation', gym: 'Renforcement', hyrox: 'Hyrox', trail: 'Trail', triathlon: 'Triathlon', rowing: 'Aviron' }

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

interface Opt { value: string; label: string }

export default function ProgramFilters({ programs, value, onChange }: {
  programs: CoachProgram[]; value: ProgFilters; onChange: (f: ProgFilters) => void
}) {
  const narrow = useNarrow()
  const sports = Array.from(new Set(programs.flatMap(p => p.sports)))
  const hasPaid = programs.some(p => p.price_cents > 0)
  const set = (patch: Partial<ProgFilters>) => onChange({ ...value, ...patch })

  // Sur mobile : jamais « tous les sports » (un sport à la fois) → défaut = 1er sport.
  useEffect(() => {
    if (narrow && !value.sport && sports.length > 0) set({ sport: sports[0], specialty: '' })
    if (!narrow && value.sport && !sports.includes(value.sport)) set({ sport: '' })
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const sportOpts: Opt[] = [
    ...(narrow ? [] : [{ value: '', label: 'Tous les sports' }]),
    ...sports.map(s => ({ value: s, label: SPORT_LABEL[s] ?? s })),
  ]
  const specialties = value.sport ? Array.from(new Set(programs.filter(p => p.sports.includes(value.sport) && p.specialty).map(p => p.specialty as string))) : []
  const aiOpts: Opt[] = [{ value: 'all', label: 'IA : tous' }, { value: 'yes', label: 'Avec IA' }, { value: 'no', label: 'Sans IA' }]
  const priceOpts: Opt[] = [{ value: 'all', label: 'Tous les prix' }, { value: 'free', label: 'Gratuit' }, { value: '20', label: '≤ 20 €' }, { value: '30', label: '≤ 30 €' }, { value: '50', label: '≤ 50 €' }]

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
      {sportOpts.length > 1 && <Dropdown label="Sport" value={value.sport} options={sportOpts} onSelect={v => set({ sport: v, specialty: '' })} />}
      {specialties.length > 0 && <Dropdown label="Spécialité" value={value.specialty} options={[{ value: '', label: 'Toutes' }, ...specialties.map(s => ({ value: s, label: s }))]} onSelect={v => set({ specialty: v })} />}
      <Dropdown label="IA" value={value.ai} options={aiOpts} onSelect={v => set({ ai: v as ProgFilters['ai'] })} />
      {hasPaid && <Dropdown label="Prix" value={value.price} options={priceOpts} onSelect={v => set({ price: v as ProgFilters['price'] })} />}
    </div>
  )
}

function Dropdown({ label, value, options, onSelect }: { label: string; value: string; options: Opt[]; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const current = options.find(o => o.value === value) ?? options[0]
  const active = value !== '' && value !== 'all'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
          border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
          background: active ? 'var(--primary-dim)' : 'var(--bg-card2)', color: active ? 'var(--primary)' : 'var(--text-mid)' }}>
        <span style={{ opacity: 0.7, fontWeight: 600, fontSize: 11.5 }}>{label}</span>
        {current.label}
        <IconChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60, minWidth: 180,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 6,
          boxShadow: '0 12px 32px rgba(0,0,0,0.20)', display: 'flex', flexDirection: 'column', gap: 2,
          animation: 'ddUp 180ms cubic-bezier(0.32,0.72,0,1)', transformOrigin: 'top',
        }}>
          <style>{`@keyframes ddUp { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
          {options.map(o => {
            const on = o.value === value
            return (
              <button key={o.value} onClick={() => { onSelect(o.value); setOpen(false) }}
                style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: on ? 700 : 500,
                  background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text)' }}>
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
