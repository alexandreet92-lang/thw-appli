'use client'
import { useRef, useState } from 'react'
import type { FinishedSession } from '@/types/session'
import { useStravaConnection } from '@/hooks/useStravaConnection'
import { useCyclingSettings } from '@/hooks/useCyclingSettings'
import { FONT_OPTIONS } from '@/types/cycling'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import SessionSummaryPage1 from './SessionSummaryPage1'
import SessionSummaryPage2 from './SessionSummaryPage2'

interface Props {
  session: FinishedSession
  isDark: boolean
  onClose: () => void
}

function getTheme(isDark: boolean) {
  return {
    bg:        isDark ? '#0A0A0A' : '#FFFFFF',
    text:      isDark ? '#FFFFFF' : '#0A0A0A',
    dim:       isDark ? 'rgba(255,255,255,0.45)' : '#8C8C8C',
    separator: isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8',
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function SessionSummary(props: Props) {
  return (
    <ToastProvider>
      <SessionSummaryInner {...props} />
    </ToastProvider>
  )
}

function SessionSummaryInner({ session, isDark, onClose }: Props) {
  const t = getTheme(isDark)
  const { showToast } = useToast()
  const { stravaConnected } = useStravaConnection()
  const { settings } = useCyclingSettings()
  const dataFontFamily = (FONT_OPTIONS.find(f => f.id === (settings.display.dataFont ?? 'system')) ?? FONT_OPTIONS[0]).fontFamily

  const [pageIndex, setPageIndex] = useState(0)
  const [uploadingStrava, setUploadingStrava] = useState(false)

  const touchRef = useRef<{ x: number; t: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, t: Date.now() }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dt = Date.now() - touchRef.current.t
    touchRef.current = null
    if (dt > 500 || Math.abs(dx) < 40) return
    if (dx < 0) setPageIndex(1)
    else setPageIndex(0)
  }

  const uploadToStrava = async () => {
    if (!session.id) { showToast('Session non sauvegardée'); return }
    setUploadingStrava(true)
    try {
      const res = await fetch('/api/strava/upload-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          gpsPoints: session.gps_points,
          duration: session.duration_seconds,
          distance: session.distance_m,
          sport: 'Ride',
          name: `Sortie vélo · ${formatDate(session.started_at)}`,
        }),
      })
      if (res.ok) {
        showToast('Activité uploadée sur Strava ✓')
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error ?? 'Erreur upload Strava')
      }
    } catch {
      showToast('Erreur réseau')
    } finally {
      setUploadingStrava(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10005,
      background: t.bg, color: t.text,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: `1px solid ${t.separator}`, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: 13, color: t.dim, margin: 0 }}>
            {formatDate(session.started_at)} · {formatTime(session.started_at)}
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text, margin: '2px 0 0', fontFamily: 'Syne, sans-serif' }}>
            Sortie vélo
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {stravaConnected && (
            <button
              onClick={uploadingStrava ? undefined : uploadToStrava}
              disabled={uploadingStrava}
              style={{
                height: 36, paddingInline: 14, borderRadius: 10,
                background: uploadingStrava ? 'rgba(252,76,2,0.5)' : '#FC4C02',
                border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: uploadingStrava ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <svg width="12" height="14" viewBox="0 0 14 16" fill="none">
                <path d="M5 9.5L8.5 2l3.5 7.5H9L8.5 8 8 9.5H5z" fill="white"/>
                <path d="M0 9.5L3.5 2 5 5.5 3.5 9.5H0z" fill="rgba(255,255,255,0.6)"/>
              </svg>
              {uploadingStrava ? '…' : 'Strava'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: t.separator, border: 'none',
              color: t.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Pages */}
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{
          display: 'flex', width: '200%', height: '100%',
          transform: `translateX(${-pageIndex * 50}%)`,
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ width: '50%', height: '100%', overflowY: 'auto' }}>
            <SessionSummaryPage1 session={session} theme={t} isDark={isDark} dataFontFamily={dataFontFamily} />
          </div>
          <div style={{ width: '50%', height: '100%', overflowY: 'auto' }}>
            <SessionSummaryPage2 session={session} theme={t} dataFontFamily={dataFontFamily} />
          </div>
        </div>
      </div>

      {/* Page dots */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8,
        padding: '12px 0', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        flexShrink: 0,
      }}>
        {[0, 1].map(i => (
          <button
            key={i}
            onClick={() => setPageIndex(i)}
            style={{
              width: i === pageIndex ? 20 : 6, height: 6, borderRadius: 3,
              background: i === pageIndex ? '#06B6D4' : t.dim,
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'all 250ms',
            }}
          />
        ))}
      </div>
    </div>
  )
}
