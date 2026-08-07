'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Catalogue PUBLIC des programmes — accessible à tout le monde.
// Deck de cartes colorées par sport ; tap → surpage détail.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listPublishedPrograms, type CoachProgram } from '@/lib/coach/programs'
import { listPublishedCoaches, type CoachProfile } from '@/lib/coach/vitrine'
import ProgramDeck from '@/components/coach/ProgramDeck'
import ProgramFilters, { applyProgramFilters, DEFAULT_FILTERS, type ProgFilters } from '@/components/coach/ProgramFilters'
import ProgramDetailView from '@/components/coach/ProgramDetailView'
import SlideSheet from '@/components/ui/SlideSheet'

export default function ProgramsCatalog() {
  const [programs, setPrograms] = useState<CoachProgram[] | null>(null)
  const [coaches, setCoaches] = useState<Record<string, CoachProfile>>({})
  const [filters, setFilters] = useState<ProgFilters>(DEFAULT_FILTERS)
  const [open, setOpen] = useState<CoachProgram | null>(null)

  useEffect(() => {
    void listPublishedPrograms().then(setPrograms).catch(() => setPrograms([]))
    void listPublishedCoaches().then(list => {
      const m: Record<string, CoachProfile> = {}
      list.forEach(c => { m[c.coach_id] = c })
      setCoaches(m)
    }).catch(() => {})
  }, [])

  const filtered = applyProgramFilters(programs ?? [], filters)
  const openCoach = open ? coaches[open.coach_id] : null

  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Programmes</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 18px' }}>Filtre par sport, spécialité, IA ou prix, puis ajoute un programme à ton planning en un clic.</p>

      {programs && programs.length > 0 && <ProgramFilters programs={programs} value={filters} onChange={setFilters} />}

      {programs === null ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Aucun programme pour l&apos;instant</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '6px 0 0' }}>Reviens bientôt — les coachs publient leurs programmes.</p>
        </div>
      ) : (
        <ProgramDeck programs={filtered} onOpen={setOpen} />
      )}

      <p style={{ textAlign: 'center', marginTop: 26 }}>
        <Link href="/coaches" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>Trouver un coach →</Link>
      </p>

      <SlideSheet open={!!open} onClose={() => setOpen(null)} title="Programme">
        {open && <ProgramDetailView program={open} coachName={openCoach?.display_name} coachSlug={openCoach?.slug} />}
      </SlideSheet>
    </div>
  )
}

