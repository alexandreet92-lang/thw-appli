'use client'
// Surpage Notifications — overlay centré ouvert par la cloche du header. Affiche
// le fil de notifications de l'utilisateur (table `notifications`), marque tout
// comme lu à l'ouverture. createPortal + tokens de thème. Clic fond/✕ = fermeture.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const FD = 'var(--font-display)'

// Compteur de notifications non lues — se rafraîchit quand `signal` change
// (on passe l'état d'ouverture de l'overlay : à la fermeture, le compte retombe).
export function useUnreadNotifCount(signal: unknown): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (!cancelled) setCount(0); return }
        const { count: c } = await sb
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
        if (!cancelled) setCount(c ?? 0)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [signal])
  return count
}

interface Notif {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'hier' : `il y a ${d} j`
}

export function NotificationsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { const t = setTimeout(() => setShown(open), 10); return () => clearTimeout(t) }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { if (!cancelled) { setNotifs([]); setLoading(false) }; return }
        const { data } = await sb
          .from('notifications')
          .select('id, type, title, body, link, read, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        if (cancelled) return
        setNotifs((data ?? []) as Notif[])
        setLoading(false)
        // Marque tout comme lu (en base) une fois affiché
        const unread = (data ?? []).filter((n: Notif) => !n.read).map((n: Notif) => n.id)
        if (unread.length > 0) await sb.from('notifications').update({ read: true }).in('id', unread)
      } catch {
        if (!cancelled) { setNotifs([]); setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, opacity: shown ? 1 : 0, transition: 'opacity .25s', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: 'min(480px, 94vw)', maxHeight: '80vh', overflowY: 'auto', padding: '24px 26px', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,.18)', transform: shown ? 'scale(1)' : 'scale(0.92)', transition: 'transform .3s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 18, color: 'var(--text)' }}>Notifications</span>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-mid)' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-mid)', fontSize: 14 }}>Chargement…</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ margin: 0, fontFamily: FD, fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>Rien de neuf pour l&apos;instant</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>Tes alertes (séances, nutrition, objectifs) apparaîtront ici.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifs.map(n => (
              <button
                key={n.id}
                onClick={() => { if (n.link) { onClose(); router.push(n.link) } }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: n.link ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : 'rgba(6,182,212,0.06)',
                  border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#06B6D4', flexShrink: 0 }} />}
                  <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{n.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>{n.body}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
