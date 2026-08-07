'use client'
// ══════════════════════════════════════════════════════════════════
// ProgramFilters — barre de filtres du catalogue de programmes :
//   1. Sport            2. Spécialité (selon le sport)
//   3. IA (avec / sans) 4. Prix (gratuit / ≤ 20 / 30 / 50 €)
// Composant contrôlé : l'état vit dans la page ; applyProgramFilters filtre.
// ══════════════════════════════════════════════════════════════════
import type { CoachProgram } from '@/lib/coach/programs'

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

export default function ProgramFilters({ programs, value, onChange }: {
  programs: CoachProgram[]; value: ProgFilters; onChange: (f: ProgFilters) => void
}) {
  const sports = Array.from(new Set(programs.flatMap(p => p.sports)))
  const specialties = value.sport
    ? Array.from(new Set(programs.filter(p => p.sports.includes(value.sport) && p.specialty).map(p => p.specialty as string)))
    : []
  const hasPaid = programs.some(p => p.price_cents > 0)
  const hasAiMix = programs.some(p => p.ai_enabled) && programs.some(p => !p.ai_enabled)
  const set = (patch: Partial<ProgFilters>) => onChange({ ...value, ...patch })

  const PRICE_OPTS: { k: ProgFilters['price']; label: string }[] = [
    { k: 'all', label: 'Tous prix' }, { k: 'free', label: 'Gratuit' },
    { k: '20', label: '≤ 20 €' }, { k: '30', label: '≤ 30 €' }, { k: '50', label: '≤ 50 €' },
  ]

  if (sports.length <= 1 && !hasPaid && !hasAiMix) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {/* Sport */}
      {sports.length > 1 && (
        <Row>
          <Chip on={value.sport === ''} onClick={() => set({ sport: '', specialty: '' })}>Tous les sports</Chip>
          {sports.map(s => <Chip key={s} on={value.sport === s} onClick={() => set({ sport: s, specialty: '' })}>{SPORT_LABEL[s] ?? s}</Chip>)}
        </Row>
      )}
      {/* Spécialité */}
      {specialties.length > 0 && (
        <Row>
          <Sub on={value.specialty === ''} onClick={() => set({ specialty: '' })}>Toutes spécialités</Sub>
          {specialties.map(s => <Sub key={s} on={value.specialty === s} onClick={() => set({ specialty: s })}>{s}</Sub>)}
        </Row>
      )}
      {/* IA + Prix */}
      {(hasAiMix || hasPaid) && (
        <Row>
          {hasAiMix && <>
            <Sub on={value.ai === 'all'} onClick={() => set({ ai: 'all' })}>IA : tous</Sub>
            <Sub on={value.ai === 'yes'} onClick={() => set({ ai: 'yes' })}>Avec IA</Sub>
            <Sub on={value.ai === 'no'} onClick={() => set({ ai: 'no' })}>Sans IA</Sub>
          </>}
          {hasAiMix && hasPaid && <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', margin: '0 2px' }} />}
          {hasPaid && PRICE_OPTS.map(o => <Sub key={o.k} on={value.price === o.k} onClick={() => set({ price: o.k })}>{o.label}</Sub>)}
        </Row>
      )}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{children}</button>
}
function Sub({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: 999, border: on ? '1px solid var(--primary)' : '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, background: 'transparent', color: on ? 'var(--primary)' : 'var(--text-dim)' }}>{children}</button>
}
