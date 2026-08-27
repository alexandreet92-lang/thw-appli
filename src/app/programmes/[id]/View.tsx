'use client'
export const dynamic = 'force-dynamic'

// Fiche PUBLIQUE d'un programme — /programmes/[id]. Réutilise ProgramDetailView.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { getProgram, type CoachProgram } from '@/lib/coach/programs'
import { getCoachBriefById, type CoachProfile } from '@/lib/coach/vitrine'
import ProgramDetailView from '@/components/coach/ProgramDetailView'

export default function ProgramDetailPage() {
  const { t } = useI18n()
  const id = String(useParams()?.id ?? '')
  const [p, setP] = useState<CoachProgram | null>(null)
  const [coach, setCoach] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      const prog = await getProgram(id).catch(() => null)
      if (!alive) return
      setP(prog); setLoading(false)
      if (prog) setCoach(await getCoachBriefById(prog.coach_id).catch(() => null))
    })()
    return () => { alive = false }
  }, [id])

  if (loading) return <div style={{ padding: 40, fontFamily: 'var(--font-body)', color: 'var(--text-dim)' }}>{t('w2h.common.loading')}</div>
  if (!p) return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: 40, boxSizing: 'border-box', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('w2h.program.notFound')}</p>
      <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '8px 0 18px' }}>{t('w2h.program.notFoundHint')}</p>
      <Link href="/programmes" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>{t('w2h.program.viewCatalog')}</Link>
    </div>
  )

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', boxSizing: 'border-box' }}>
        <Link href="/programmes" style={{ display: 'inline-block', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 8 }}>{t('w2h.program.backToProgrammes')}</Link>
      </div>
      <ProgramDetailView program={p} coachName={coach?.display_name} coachSlug={coach?.slug} />
    </div>
  )
}
