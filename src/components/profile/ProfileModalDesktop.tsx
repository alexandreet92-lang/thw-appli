'use client'
// ══════════════════════════════════════════════════════════════════
// ProfileModalDesktop — « Mon Profil » en SUR-PAGE centrée (façon Claude),
// par-dessus l'app assombrie. Desktop uniquement (hidden md:flex) — monté
// dans DesktopShell, ouvert au clic sur l'avatar ou via `thw:open-profile`.
// Réutilise ProfileContent (même liste + drill-down que le mobile).
// ══════════════════════════════════════════════════════════════════
import { Suspense, useEffect, useState } from 'react'
import { ProfileContent } from '@/app/profile/page'
import { useI18n } from '@/lib/i18n'

export function ProfileModalDesktop({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { if (open) setMounted(true) }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted && !open) return null

  return (
    <div
      className="hidden md:flex"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 12000,
        alignItems: 'center', justifyContent: 'center', padding: 28,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 'min(940px, 94vw)', height: 'min(86vh, 920px)',
          background: 'var(--bg)', borderRadius: 20, border: '1px solid var(--border-mid)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'scale(1)' : 'scale(0.97)', transition: 'transform 0.2s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <button
          onClick={onClose}
          aria-label={t('ai.close')}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-mid)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-dim)', textAlign: 'center' }}>{t('profile.loading')}</div>}>
            <ProfileContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
