// CADENCES — tableau de bord du test en cours (server). Saisie SITE uniquement.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TestDashboard, type Campagne, type ResultRow } from './TestDashboard'

export const dynamic = 'force-dynamic'

export default async function TestPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/cadences')

  const { data: campagne } = await sb
    .from('cadences_campaigns')
    .select('id, scale_sex, age_at_start, age_band, body_weight_kg, started_on, status')
    .eq('status', 'in_progress')
    .maybeSingle()
  if (!campagne) redirect('/cadences')

  const { data: results } = await sb
    .from('cadences_results')
    .select('test_slug, raw_value, raw_parts, variant, equipment, timing_method, pool_length_m, status, skip_reason')
    .eq('campaign_id', campagne.id)

  return (
    <TestDashboard
      campagne={campagne as Campagne}
      results={(results ?? []) as ResultRow[]}
    />
  )
}
