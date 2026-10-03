'use client'
// ══════════════════════════════════════════════════════════════════════════
// Hôte des notifications push NATIVES (app iOS) — monté une fois (ClientShell).
//  • Au lancement / à la connexion : ré-enregistre le jeton APNs (s'il a été
//    accepté) → le serveur connaît toujours le bon appareil pour le bon compte.
//  • App au PREMIER PLAN : iOS n'affiche rien → bannière in-app façon iOS
//    (descend du haut, 5 s, toucher = ouvrir, glisser vers le haut = fermer).
//  • Toucher une notification (app fermée / en arrière-plan) : ouvre la page
//    indiquée par `url` dans le payload.
// No-op total sur le web.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { isNativeApp } from '@/lib/native/platform'
import { getPushPlugin, refreshNativeRegistration, type NativePushNotification } from '@/lib/push/native'
import { createClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/haptics'
import { useI18n } from '@/lib/i18n'

interface Banner { key: number; title: string; body: string; url: string | null }

const SHOW_MS = 5000

/** Chemin interne sûr à partir de `data.url` (relatif, ou absolu vers le même site). */
function safePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  try {
    const u = new URL(raw)
    const base = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_APP_URL || ''
    if (base && u.origin === new URL(base).origin) return `${u.pathname}${u.search}${u.hash}`
  } catch { /* URL invalide */ }
  return null
}

const CSS = `
.npb-wrap { position: fixed; left: 0; right: 0; top: 0; z-index: 10070; display: flex; justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 6px) 8px 0; pointer-events: none; }
.npb { pointer-events: auto; width: 100%; max-width: 420px; box-sizing: border-box; display: flex; gap: 11px; align-items: center;
  padding: 11px 14px 11px 11px; border: none; text-align: left; cursor: pointer; border-radius: var(--r-lg);
  background: color-mix(in srgb, var(--bg-elev) 86%, transparent); color: var(--text);
  -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6);
  box-shadow: var(--shadow-float); font-family: var(--font-body); touch-action: none;
  animation: npbIn 520ms cubic-bezier(.2,.9,.25,1) both; }
.npb.npb-out { animation: npbOut 260ms cubic-bezier(.4,0,1,1) both; }
.npb-icon { width: 38px; height: 38px; border-radius: var(--r-sm); flex-shrink: 0; object-fit: cover; display: block; background: var(--surface-card); }
.npb-txt { flex: 1; min-width: 0; }
.npb-head { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600; line-height: 1.25; }
.npb-time { font-size: 12px; font-weight: 500; color: var(--text-mid); flex-shrink: 0; }
.npb-body { margin-top: 1px; font-size: 13px; line-height: 1.35; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
@keyframes npbIn { 0% { opacity: 0; transform: translateY(-110%) scale(.96); } 60% { opacity: 1; transform: translateY(4px) scale(1.005); } 100% { opacity: 1; transform: none; } }
@keyframes npbOut { to { opacity: 0; transform: translateY(-120%); } }
@media (prefers-reduced-motion: reduce) {
  .npb { animation: npbFade 160ms linear both; } .npb.npb-out { animation: npbFadeOut 160ms linear both; }
}
@keyframes npbFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes npbFadeOut { to { opacity: 0; } }
`

export default function NativePushHost() {
  const { t } = useI18n()
  const nowLabel = t('push.now') === 'push.now' ? 'maintenant' : t('push.now')
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const [banner, setBanner] = useState<Banner | null>(null)
  const [leaving, setLeaving] = useState(false)
  const hideT = useRef<ReturnType<typeof setTimeout>>(undefined)
  const dragY = useRef<{ start: number; dy: number } | null>(null)
  const cardRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    clearTimeout(hideT.current)
    setLeaving(true)
    hideT.current = setTimeout(() => { setBanner(null); setLeaving(false) }, 260)
  }

  const open = (url: string | null) => {
    const path = safePath(url)
    if (path) routerRef.current.push(path)
  }

  useEffect(() => {
    if (!isNativeApp()) return
    let alive = true
    const handles: { remove: () => Promise<void> }[] = []

    void refreshNativeRegistration()
    const { data: authSub } = createClient().auth.onAuthStateChange((evt: string) => {
      if (evt === 'SIGNED_IN') void refreshNativeRegistration()
    })

    void (async () => {
      const p = await getPushPlugin()
      if (!p || !alive) return
      handles.push(await p.addListener('pushNotificationReceived', (n: NativePushNotification) => {
        const data = n.data ?? {}
        const url = typeof data.url === 'string' ? data.url : null
        clearTimeout(hideT.current)
        setLeaving(false)
        setBanner(b => ({ key: (b?.key ?? 0) + 1, title: n.title || 'Hybrid', body: n.body || '', url }))
        haptic('light')
        hideT.current = setTimeout(() => close(), SHOW_MS)
      }))
      handles.push(await p.addListener('pushNotificationActionPerformed', a => {
        const url = a.notification?.data?.url
        open(typeof url === 'string' ? url : null)
      }))
      try { await p.removeAllDeliveredNotifications?.() } catch { /* ignore */ }
      if (!alive) handles.forEach(h => { void h.remove() })
    })()

    return () => {
      alive = false
      authSub.subscription.unsubscribe()
      handles.forEach(h => { void h.remove().catch(() => {}) })
      clearTimeout(hideT.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!banner || typeof document === 'undefined') return null

  return createPortal(
    <div className="npb-wrap">
      <style>{CSS}</style>
      <button
        key={banner.key}
        ref={cardRef}
        type="button"
        data-no-fx
        className={`npb${leaving ? ' npb-out' : ''}`}
        role="status"
        aria-live="polite"
        onClick={() => { if (dragY.current && Math.abs(dragY.current.dy) > 6) return; close(); open(banner.url) }}
        onPointerDown={e => { dragY.current = { start: e.clientY, dy: 0 }; clearTimeout(hideT.current) }}
        onPointerMove={e => {
          if (!dragY.current) return
          const dy = Math.min(0, e.clientY - dragY.current.start)
          dragY.current.dy = dy
          if (cardRef.current) cardRef.current.style.transform = `translateY(${dy}px)`
        }}
        onPointerUp={() => {
          const d = dragY.current
          if (cardRef.current) cardRef.current.style.transform = ''
          if (d && d.dy < -24) close()
          else hideT.current = setTimeout(() => close(), SHOW_MS / 2)
          setTimeout(() => { dragY.current = null }, 0)
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="npb-icon" src="/logos/logo_4bras.png" alt="" aria-hidden />
        <span className="npb-txt">
          <span className="npb-head"><span>{banner.title}</span><span className="npb-time">{nowLabel}</span></span>
          {banner.body && <span className="npb-body">{banner.body}</span>}
        </span>
      </button>
    </div>,
    document.body,
  )
}
