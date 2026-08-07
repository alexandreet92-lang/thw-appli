'use client'
// ══════════════════════════════════════════════════════════════════════════
// Briques d'UI partagées entre la vue plein écran et la bulle flottante :
// tuiles vidéo (attach/detach LiveKit), icônes, bouton rond de contrôle.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, type ReactNode } from 'react'
import type { Tile, VideoTrackT } from './types'

const FB = 'var(--font-body)'

export function useAttachedVideo(video: VideoTrackT | null, mirror: boolean) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !video) return
    video.attach(el)
    el.style.transform = mirror ? 'scaleX(-1)' : ''
    return () => { try { video.detach(el) } catch { /* déjà détaché */ } }
  }, [video, mirror])
  return ref
}

export function VideoStage({ tile }: { tile: Tile }) {
  const ref = useAttachedVideo(tile.video, false)
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface-neutral)' }}>
      <video ref={ref} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'var(--bg-alt)' }} />
      <span style={{ position: 'absolute', left: 'var(--space-3)', bottom: 'var(--space-3)', padding: '3px 10px', borderRadius: 'var(--r-pill)', background: 'var(--danger)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 11.5, fontWeight: 600 }}>
        Écran · {tile.isLocal ? 'Toi' : tile.name}
      </span>
    </div>
  )
}

export function PersonTile({ tile, compact }: { tile: Tile; compact?: boolean }) {
  const ref = useAttachedVideo(tile.video, tile.isLocal)
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: compact ? '1 / 1' : '4 / 3', borderRadius: 'var(--r-md)', overflow: 'hidden',
      background: 'var(--surface-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: tile.speaking ? 'inset 0 0 0 3px var(--primary)' : 'none', transition: 'box-shadow 120ms ease',
    }}>
      {tile.video
        ? <video ref={ref} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ width: compact ? 34 : 56, height: compact ? 34 : 56, borderRadius: '50%', background: 'var(--bg-card)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FB, fontWeight: 600, fontSize: compact ? 15 : 22 }}>{tile.name.slice(0, 1).toUpperCase()}</span>}
      {!compact && (
        <span style={{ position: 'absolute', left: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'var(--bg-card)', maxWidth: 'calc(100% - 16px)' }}>
          {!tile.micOn && <span style={{ color: 'var(--danger)', display: 'flex' }}><MicOffIcon size={12} /></span>}
          <span style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tile.isLocal ? 'Toi' : tile.name}</span>
        </span>
      )}
      {compact && !tile.micOn && (
        <span style={{ position: 'absolute', right: 4, bottom: 4, width: 18, height: 18, borderRadius: '50%', background: 'var(--danger)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MicOffIcon size={10} /></span>
      )}
    </div>
  )
}

export function RoundBtn({ children, on, active, label, onClick, size = 46 }: { children: ReactNode; on: boolean; active?: boolean; label: string; onClick: () => void; size?: number }) {
  const bg = active ? (on ? 'var(--primary)' : 'var(--surface-neutral)') : (on ? 'var(--surface-neutral)' : 'var(--danger-soft)')
  const fg = active ? (on ? 'var(--on-primary)' : 'var(--text)') : (on ? 'var(--text)' : 'var(--danger)')
  return (
    <button onClick={onClick} aria-label={label} title={label}
      style={{ width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg }}>
      {children}
    </button>
  )
}

// ── Icônes ──────────────────────────────────────────────────────────────────
export function VoiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}
export function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10a7 7 0 0 1-14 0" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
export function MicOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
export function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}
export function CameraOffIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
export function ScreenIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
export function PhoneDownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.53.51 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72" /><line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  )
}
export function ExpandIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}
export function MinimizeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v6H3M21 15h-6v6M9 9 3 3M21 21l-6-6" />
    </svg>
  )
}
