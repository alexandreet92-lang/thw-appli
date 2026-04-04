import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const sport    = searchParams.get('sport')     ?? undefined
  const provider = searchParams.get('provider')  ?? undefined
  const limit    = parseInt(searchParams.get('limit')  ?? '20')
  const offset   = parseInt(searchParams.get('offset') ?? '0')
  const from     = searchParams.get('from')      ?? undefined
  const to       = searchParams.get('to')        ?? undefined

  const db = createServiceClient()
  let q = db
    .from('activities')
    .select('id,sport_type,provider,title,started_at,distance_m,moving_time_s,elevation_gain_m,avg_pace_s_km,avg_watts,normalized_watts,tss,avg_hr,calories,suffer_score,is_race,race_name', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('flagged', false)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (sport)    q = q.eq('sport_type', sport)
  if (provider) q = q.eq('provider', provider)
  if (from)     q = q.gte('started_at', from)
  if (to)       q = q.lte('started_at', to)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ activities: data, total: count, limit, offset })
}
