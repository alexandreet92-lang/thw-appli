'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import type { Segment } from '@/types/segment'
import { useI18n } from '@/lib/i18n'
import SegmentLeaderboard from './SegmentLeaderboard'
import SegmentHistory from './SegmentHistory'

interface Props {
  segmentId: string
  onClose: () => void
  isDark: boolean
}

function fmt(s: number) {
  if (s < 1000) return `${Math.round(s)} m`
  return `${(s / 1000).toFixed(2)} km`
}

export default function SegmentDetail({ segmentId, onClose, isDark }: Props) {
  const { t } = useI18n()
  const [segment, setSegment] = useState<Segment | null>(null)
  const [tab, setTab] = useState<'leaderboard' | 'history'>('leaderboard')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    createClient()
      .from('segments')
      .select('*')
      .eq('id', segmentId)
      .maybeSingle()
      .then(({ data }) => setSegment(data as Segment))
  }, [segmentId])

  const bg = isDark ? '#0A0A0A' : '#fff'
  const text = isDark ? '#fff' : '#0A0A0A'
  const dim = isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C'
  const sep = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const btnBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'

  if (!mounted) return null

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      background: bg, color: text,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
      animation: 'sdSlide 280ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes sdSlide{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${sep}`, gap: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: btnBg, border: 'none', color: text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{segment?.name ?? '…'}</p>
          {segment && (
            <p style={{ fontSize: 11, color: dim, margin: '1px 0 0' }}>
              {fmt(segment.distance_m)} · {segment.sport === 'cycling' ? t('shared.sportCycling') : segment.sport === 'running' ? t('shared.sportRunning') : segment.sport === 'trail' ? t('shared.sportTrail') : segment.sport}
            </p>
          )}
        </div>
      </div>

      {/* Segment info card */}
      {segment && (
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${sep}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { l: t('shared.distance'), v: fmt(segment.distance_m) },
              { l: 'D+', v: `${Math.round(segment.elevation_gain_m)} m` },
              { l: t('shared.visibility'), v: segment.is_public ? t('shared.public') : t('shared.private') },
            ].map(({ l, v }) => (
              <div key={l} style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{l}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: text, margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${sep}`, flexShrink: 0 }}>
        {(['leaderboard', 'history'] as const).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            style={{ flex: 1, height: 44, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === tabKey ? '#06B6D4' : dim, fontFamily: 'DM Sans, sans-serif', borderBottom: `2px solid ${tab === tabKey ? '#06B6D4' : 'transparent'}`, transition: 'all 200ms' }}
          >
            {tabKey === 'leaderboard' ? t('shared.leaderboard') : t('shared.myHistory')}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'leaderboard' ? (
          <SegmentLeaderboard segmentId={segmentId} isDark={isDark} />
        ) : (
          <SegmentHistory segmentId={segmentId} isDark={isDark} />
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
