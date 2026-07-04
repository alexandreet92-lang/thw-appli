'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// /notifications — fil complet (table `notifications`). Marque tout
// comme lu à l'ouverture. Clic → route liée. Suppression par item.
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

interface Notif { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string }

function timeAgo(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return t('misc.justNow')
  if (m < 60) return t('misc.timeMin', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('misc.timeHour', { n: h })
  const d = Math.floor(h / 24)
  return d === 1 ? t('misc.yesterday') : t('misc.timeDay', { n: d })
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (!cancelled) { setNotifs([]); setLoading(false) }; return }
        const { data } = await sb.from('notifications')
          .select('id, type, title, body, link, read, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
        if (cancelled) return
        setNotifs((data ?? []) as Notif[]); setLoading(false)
        const unread = (data ?? []).filter((n: Notif) => !n.read).map((n: Notif) => n.id)
        if (unread.length > 0) await sb.from('notifications').update({ read: true }).in('id', unread)
      } catch { if (!cancelled) { setNotifs([]); setLoading(false) } }
    })()
    return () => { cancelled = true }
  }, [])

  async function remove(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id))
    try { const sb = createClient(); await sb.from('notifications').delete().eq('id', id) } catch { /* ignore */ }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-8) var(--space-5) 80px' }}>
      <h1 style={{ margin: '0 0 var(--space-6)', fontFamily: FD, fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>{t('misc.notificationsTitle')}</h1>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 64, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', animation: 'pulse 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : notifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-5)', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)' }}>
          <p style={{ margin: 0, fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)' }}>{t('misc.notifEmptyTitle')}</p>
          <p style={{ margin: 'var(--space-2) 0 0', fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>
            {t('misc.notifEmptyBody')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {notifs.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
              background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
              <button onClick={() => { if (n.link) router.push(n.link) }} style={{ flex: 1, minWidth: 0, textAlign: 'left',
                background: 'none', border: 'none', cursor: n.link ? 'pointer' : 'default', padding: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 3 }}>
                  <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 14.5, color: 'var(--text)' }}>{n.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at, t)}</span>
                </div>
                {n.body && <p style={{ margin: 0, fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>{n.body}</p>}
              </button>
              <button onClick={() => remove(n.id)} aria-label={t('misc.delete')} style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 2 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
