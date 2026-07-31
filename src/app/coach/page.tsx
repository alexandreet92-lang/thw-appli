'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// DASHBOARD COACH — centre de pilotage. « Qui a besoin de toi aujourd'hui »
// (alertes), charge du roster, prochaines échéances, messages, accès rapides.
// S'appuie sur getRoster (signaux temps réel via la RLS coach).
// ══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getRoster, type RosterAthlete, type Forme } from '@/lib/coach/roster'
import { listPendingInvites } from '@/lib/coach/relationships'

const STC: Record<Forme, string> = { ok: '#22C55E', warn: '#F59E0B', injured: '#EF4444', inactive: '#94A3B8' }
const STLABEL: Record<Forme, string> = { ok: 'En forme', warn: 'Attention', injured: 'Blessé', inactive: 'Inactif' }
const BODY = 'var(--font-body)'
const DISP = 'var(--font-display)'
const num: React.CSSProperties = { fontFamily: BODY, fontVariantNumeric: 'tabular-nums' }
const card: React.CSSProperties = { borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)' }
const initials = (n: string) => n.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
const ORDER: Record<Forme, number> = { injured: 0, inactive: 1, warn: 2, ok: 3 }

export default function CoachDashboard() {
  const router = useRouter()
  const [roster, setRoster] = useState<RosterAthlete[]>([])
  const [pending, setPending] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [r, p] = await Promise.all([getRoster(), listPendingInvites().catch(() => [])])
        if (cancelled) return
        setRoster(r); setPending(p.length)
      } catch { /* silencieux */ } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const total = roster.length
  const active = roster.filter(a => a.lastDays <= 7).length
  const alert = roster.filter(a => a.status !== 'ok').length
  const unread = roster.reduce((s, a) => s + a.unread, 0)
  const tssRoster = roster.reduce((s, a) => s + a.tss7, 0)
  const priority = [...roster].filter(a => a.status !== 'ok').sort((x, y) => ORDER[x.status] - ORDER[y.status])
  const races = roster.filter(a => a.race).map(a => ({ a, race: a.race! })).sort((x, y) => x.race.days - y.race.days).slice(0, 6)

  const avatar = (a: RosterAthlete, size = 40) => (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, fontSize: size * 0.34, position: 'relative', fontFamily: DISP }}>
      {a.avatar
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : initials(a.name)}
      <span style={{ position: 'absolute', right: -1, bottom: -1, width: size * 0.3, height: size * 0.3, borderRadius: '50%', background: STC[a.status], border: '2.5px solid var(--bg-card)' }} />
    </span>
  )

  const tile = (v: React.ReactNode, l: string, accent = 'var(--text)') => (
    <div style={{ ...card, padding: '14px 16px', flex: 1, minWidth: 130 }}>
      <div style={{ ...num, fontWeight: 700, fontSize: 26, lineHeight: 1, color: accent }}>{v}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>{l}</div>
    </div>
  )

  const QUICK: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: '/coach/athletes', label: 'Athlètes', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01" /> },
    { href: '/coach/library', label: 'Bibliothèque', icon: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /> },
    { href: '/coach/messages', label: 'Messages', icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
    { href: '/coach/studio', label: 'Studio', icon: <><circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M7 6.6 10.6 16.4M17 6.6 13.4 16.4" /></> },
  ]

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: BODY }}>
      <h1 style={{ fontFamily: DISP, fontWeight: 600, fontSize: 28, margin: 0, color: 'var(--text)' }}>Tableau de bord</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '3px 0 0' }}>Qui a besoin de toi aujourd’hui — ton roster en un coup d’œil.</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, margin: '20px 0' }}>
        {tile(loading ? '—' : total, 'athlète' + (total > 1 ? 's' : ''), 'var(--primary)')}
        {tile(loading ? '—' : active, 'actif' + (active > 1 ? 's' : '') + ' (7 j)')}
        {tile(loading ? '—' : alert, 'en alerte', alert > 0 ? '#F59E0B' : 'var(--text)')}
        {tile(loading ? '—' : unread, 'message' + (unread > 1 ? 's' : '') + ' non lu' + (unread > 1 ? 's' : ''), unread > 0 ? 'var(--primary)' : 'var(--text)')}
        {tile(loading ? '—' : Math.round(tssRoster), 'charge roster (TSS · 7 j)')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* À suivre en priorité */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            À suivre en priorité {priority.length > 0 && <span style={{ ...num, fontSize: 11.5, color: 'var(--text-mid)', background: 'var(--bg-alt)', borderRadius: 6, padding: '1px 7px' }}>{priority.length}</span>}
          </div>
          {loading ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</div>
            : priority.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Tout le monde est au vert.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {priority.map((a, i) => (
                  <Link key={a.id} href={`/coach/athlete/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                    {avatar(a, 38)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 1 }}><b style={{ color: STC[a.status] }}>{STLABEL[a.status]}</b>{a.reason ? ` — ${a.reason}` : ''}</div>
                    </div>
                    {a.unread > 0 && <span style={{ ...num, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 9, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{a.unread}</span>}
                  </Link>
                ))}
              </div>
            )}
        </div>

        {/* Prochaines échéances */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Prochaines échéances</div>
          {loading ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</div>
            : races.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune course programmée dans le roster.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {races.map(({ a, race }, i) => (
                  <Link key={a.id + race.name} href={`/coach/athlete/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ ...num, fontSize: 16, fontWeight: 800, color: race.days <= 14 ? '#ef4444' : 'var(--primary)', width: 50, flexShrink: 0 }}>J-{race.days}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{race.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{a.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Invitations en attente */}
      {pending > 0 && (
        <div style={{ ...card, padding: '14px 16px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...num, fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{pending}</span>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--text-mid)' }}>invitation{pending > 1 ? 's' : ''} en attente d’acceptation</div>
          <button onClick={() => router.push('/coach/athletes')} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>Gérer</button>
        </div>
      )}

      {/* Accès rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 16 }}>
        {QUICK.map(q => (
          <Link key={q.href} href={q.href} style={{ ...card, padding: '16px', display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: 'var(--text)' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{q.icon}</svg>
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
