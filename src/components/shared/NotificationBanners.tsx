'use client'
// ══════════════════════════════════════════════════════════════════════════
// Bandeaux de notification — BUREAU UNIQUEMENT. Une bulle rectangulaire arrondie
// glisse depuis le haut-gauche vers la droite à chaque nouvelle notification
// (y compris les messages de groupe qui créent une notification). Désactivable
// dans Profil → Notifications (clé localStorage thw_notif_banners).
// Montée globalement par AppShell côté desktop. Sondage léger (pas de realtime
// requis). Respecte prefers-reduced-motion.
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'

export const NOTIF_BANNERS_KEY = 'thw_notif_banners'

interface Banner { id: string; title: string; body: string; link: string | null }

function enabled(): boolean {
  try { return localStorage.getItem(NOTIF_BANNERS_KEY) !== '0' } catch { return true }
}

export function NotificationBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [mounted, setMounted] = useState(false)
  const seen = useRef<Set<string>>(new Set())
  const since = useRef<string>(new Date().toISOString())   // n'affiche que le NOUVEAU
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let stop = false
    let uid: string | null = null
    const sb = createClient()

    const dismiss = (id: string) => {
      setBanners(b => b.filter(x => x.id !== id))
      const tm = timers.current[id]; if (tm) { clearTimeout(tm); delete timers.current[id] }
    }

    const poll = async () => {
      if (stop || !uid || !enabled() || document.hidden) return
      try {
        const { data } = await sb.from('notifications')
          .select('id, title, body, link, created_at')
          .eq('user_id', uid)
          .gt('created_at', since.current)
          .order('created_at', { ascending: true })
          .limit(5)
        const rows = (data ?? []) as { id: string; title: string | null; body: string | null; link: string | null; created_at: string }[]
        for (const r of rows) {
          since.current = r.created_at
          if (seen.current.has(r.id)) continue
          seen.current.add(r.id)
          const b: Banner = { id: r.id, title: r.title || 'Notification', body: (r.body || '').slice(0, 140), link: r.link }
          setBanners(prev => [...prev.slice(-3), b])
          timers.current[r.id] = setTimeout(() => dismiss(r.id), 6000)
        }
      } catch { /* réseau : on retentera au prochain tick */ }
    }

    void (async () => {
      const u = await getCurrentUser()
      if (stop) return
      uid = u?.id ?? null
      if (!uid) return
      void poll()
    })()
    const iv = setInterval(poll, 12000)
    const onVis = () => { if (!document.hidden) void poll() }
    document.addEventListener('visibilitychange', onVis)
    return () => { stop = true; clearInterval(iv); document.removeEventListener('visibilitychange', onVis); Object.values(timers.current).forEach(clearTimeout) }
  }, [])

  if (!mounted || banners.length === 0) return null

  const node = (
    <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 4000, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none', maxWidth: 'min(360px, calc(100vw - 32px))' }}>
      <style>{`
        @keyframes nbSlideIn { from { opacity: 0; transform: translateX(-112%); } to { opacity: 1; transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .nb-card { animation: none !important; } }
      `}</style>
      {banners.map(b => (
        <div key={b.id} className="nb-card" role="status"
          onClick={() => { const tm = timers.current[b.id]; if (tm) clearTimeout(tm); setBanners(x => x.filter(y => y.id !== b.id)); if (b.link) window.location.href = b.link }}
          style={{
            pointerEvents: 'auto', cursor: b.link ? 'pointer' : 'default',
            background: 'var(--bg-elev, var(--bg-card))', border: '1px solid var(--border)',
            borderRadius: 14, boxShadow: 'var(--shadow-card, 0 8px 30px rgba(0,0,0,0.18))',
            padding: '11px 13px', display: 'flex', gap: 10, alignItems: 'flex-start',
            animation: 'nbSlideIn .32s cubic-bezier(0.22,0.61,0.36,1) both',
          }}>
          <span aria-hidden style={{ marginTop: 1, width: 20, height: 20, flexShrink: 0, borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--primary)', background: 'var(--primary-dim, rgba(6,182,212,0.12))' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" /></svg>
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
            {b.body && <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.body}</div>}
          </div>
          <button onClick={e => { e.stopPropagation(); const tm = timers.current[b.id]; if (tm) clearTimeout(tm); setBanners(x => x.filter(y => y.id !== b.id)) }}
            aria-label="Fermer" style={{ flexShrink: 0, width: 20, height: 20, border: 'none', borderRadius: '50%', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  )
  return createPortal(node, document.body)
}
