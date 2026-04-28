import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/strava/tokens'

// GET /api/strava/connected
// Lightweight check: returns { connected: boolean }
// Uses service-side token lookup — avoids RLS issues with client-side queries
export async function GET() {
  const supabase = await createPublicClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  return NextResponse.json({ connected: token !== null })
}
