// CADENCES — résultats d'une campagne clôturée (server). Lecture via RLS (siennes).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResultsView, type Campagne, type Snapshot, type RawResult } from './ResultsView'

export const dynamic = 'force-dynamic'

export default async function ResultatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/cadences')

  const { data: camp } = await sb
    .from('cadences_campaigns')
    .select('id, scale_sex, age_at_start, age_band, body_weight_kg, started_on, completed_on, status')
    .eq('id', id)
    .maybeSingle()
  if (!camp) redirect('/cadences')
  if (camp.status === 'in_progress') redirect('/cadences/test')

  const [{ data: snaps }, { data: results }] = await Promise.all([
    sb.from('cadences_snapshots').select('age_mode, total_points, quality_scores, test_scores').eq('campaign_id', id),
    sb.from('cadences_results').select('test_slug, raw_value, status').eq('campaign_id', id),
  ])

  return (
    <ResultsView
      campagne={camp as Campagne}
      snapshots={(snaps ?? []) as Snapshot[]}
      results={(results ?? []) as RawResult[]}
    />
  )
}
