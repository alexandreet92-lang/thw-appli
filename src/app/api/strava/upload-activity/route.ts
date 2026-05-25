import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/strava/tokens'
import { STRAVA_CONFIG } from '@/lib/strava/config'
import type { GPSPoint } from '@/hooks/useGPSTracking'

function generateGPX(points: GPSPoint[], name: string): string {
  const trkpts = points
    .map(p => {
      const ele = p.altitude != null ? `<ele>${p.altitude.toFixed(1)}</ele>` : ''
      return `    <trkpt lat="${p.lat}" lon="${p.lng}">${ele}<time>${new Date(p.timestamp).toISOString()}</time></trkpt>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="THW Coaching">\n  <trk><name>${name}</name><trkseg>\n${trkpts}\n  </trkseg></trk>\n</gpx>`
}

export async function POST(req: NextRequest) {
  const supabase = await createPublicClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Strava non connecté' }, { status: 403 })

  const { gpsPoints, name, sport, sessionId } = await req.json() as {
    gpsPoints: GPSPoint[]
    name: string
    sport: string
    sessionId: string
    duration: number
    distance: number
  }

  if (!gpsPoints?.length) return NextResponse.json({ error: 'Pas de points GPS' }, { status: 400 })

  const gpx = generateGPX(gpsPoints, name ?? 'Sortie vélo')

  const form = new FormData()
  form.append('activity_type', sport ?? 'Ride')
  form.append('name', name ?? 'Sortie vélo')
  form.append('data_type', 'gpx')
  form.append('file', new Blob([gpx], { type: 'application/gpx+xml' }), 'activity.gpx')

  const uploadRes = await fetch(`${STRAVA_CONFIG.apiBase}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}` },
    body: form,
  })

  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => ({}))
    return NextResponse.json({ error: body.message ?? 'Erreur Strava' }, { status: uploadRes.status })
  }

  const upload = await uploadRes.json() as { id: number; activity_id: number | null; error: string | null }

  if (upload.error) return NextResponse.json({ error: upload.error }, { status: 422 })

  // Poll up to 10 times (1s each) for activity_id
  let activityId = upload.activity_id
  for (let i = 0; i < 10 && !activityId; i++) {
    await new Promise(r => setTimeout(r, 1000))
    const poll = await fetch(`${STRAVA_CONFIG.apiBase}/uploads/${upload.id}`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (poll.ok) {
      const p = await poll.json() as { activity_id: number | null; error: string | null }
      if (p.error) break
      activityId = p.activity_id
    }
  }

  if (activityId && sessionId) {
    await supabase.from('workout_sessions')
      .update({ strava_activity_id: activityId })
      .eq('id', sessionId)
  }

  return NextResponse.json({ activityId: activityId ?? upload.id })
}
