'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Effort {
  id: string
  user_id: string
  duration_seconds: number
  started_at: string
}

interface Props {
  segmentId: string
  isDark: boolean
}

function fmt(s: number) {
  if (s < 3600) {
    const m = Math.floor(s / 60), sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return `${h}h${String(m).padStart(2, '0')}`
}

export default function SegmentLeaderboard({ segmentId, isDark }: Props) {
  const [efforts, setEfforts] = useState<Effort[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.auth.getUser(),
      sb.from('segment_efforts')
        .select('id, user_id, duration_seconds, started_at')
        .eq('segment_id', segmentId)
        .order('duration_seconds', { ascending: true })
        .limit(20),
    ]).then(([{ data: userData }, { data: effortData }]) => {
      setMyId(userData.user?.id ?? null)
      setEfforts((effortData as Effort[]) ?? [])
      setLoading(false)
    })
  }, [segmentId])

  const text = isDark ? '#fff' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const surface = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'
  const gold = '#F59E0B', silver = '#9CA3AF', bronze = '#B45309'
  const medals = [gold, silver, bronze]

  if (loading) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: dim, fontFamily: 'DM Sans, sans-serif' }}>
      Chargement…
    </div>
  )

  if (!efforts.length) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <p style={{ fontSize: 15, color: dim, margin: 0 }}>Aucun effort enregistré</p>
      <p style={{ fontSize: 13, color: dim, margin: '6px 0 0', opacity: 0.7 }}>Sois le premier à parcourir ce segment !</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {efforts.map((e, i) => {
        const isMe = e.user_id === myId
        const medal = medals[i] ?? null
        return (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: isMe ? (isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.05)') : 'transparent', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'}` }}>
            <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
              {medal ? (
                <span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
              ) : (
                <span style={{ fontSize: 13, color: dim, fontWeight: 600 }}>{i + 1}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: isMe ? 600 : 400, color: isMe ? '#06B6D4' : text, margin: 0 }}>
                {isMe ? 'Moi' : `Athlète ${e.user_id.slice(0, 6)}`}
              </p>
              <p style={{ fontSize: 11, color: dim, margin: '2px 0 0' }}>
                {new Date(e.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: medal ? medal : text, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(e.duration_seconds)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
