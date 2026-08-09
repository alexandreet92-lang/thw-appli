'use client'
// ══════════════════════════════════════════════════════════════════
// Fil (façon Strava) — activités récentes des athlètes que l'on suit et qui
// autorisent la consultation (confidentialité gérée côté RPC activity_feed).
// Colonne centrale : grandes cartes (carte GPS + auteur + stats) → clic =
// détail LECTURE SEULE (exactement la page training, non éditable).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import SlideSheet from '@/components/ui/SlideSheet'
import { Avatar } from '@/components/shared/Sidebar'
import { ActivityDetailView } from '@/components/profile/ActivityShowcase'
import { staticRouteMapUrl } from '@/lib/staticMap'
import { getActivityFeed, decodePolyline, polylineToSvgPath, sportFamily, sportMeta, type FeedActivity } from '@/lib/profile/activityShowcase'

const SPORT_HEX: Record<string, string> = { running: '22c55e', cycling: '3b82f6', swim: '0ea5e9', rowing: '8b5cf6', gym: 'f97316', hyrox: 'ef4444', other: '9ca3af' }
const MONTH = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

const fmtDur = (s: number | null) => { if (!s) return '—'; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }
const fmtDist = (m: number | null) => m && m > 0 ? `${Math.round(m / 100) / 10} km` : null
const fmtPace = (s: number | null) => { if (!s || s <= 0) return null; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km` }
function relDate(iso: string): string {
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`
  return `${d.getDate()} ${MONTH[d.getMonth()]}`
}

export default function ActivityFeed() {
  const [items, setItems] = useState<FeedActivity[] | null>(null)
  const [detail, setDetail] = useState<FeedActivity | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { let off = false; void getActivityFeed().then(rows => { if (!off) { setItems(rows); if (rows.length < 40) setDone(true) } }); return () => { off = true } }, [])

  const loadMore = async () => {
    if (!items || items.length === 0 || loadingMore || done) return
    setLoadingMore(true)
    const last = items[items.length - 1]
    const more = await getActivityFeed(last.started_at)
    setItems([...items, ...more])
    if (more.length < 40) setDone(true)
    setLoadingMore(false)
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '4px clamp(12px,4vw,20px) 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '8px 0 2px' }}>Fil</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '0 0 20px' }}>Les dernières activités des athlètes que tu suis.</p>

      {items === null && <p style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>Chargement du fil…</p>}

      {items !== null && items.length === 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '28px 22px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Ton fil est vide pour l’instant</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>Suis d’autres athlètes depuis la communauté — leurs activités (publiques ou réservées aux abonnés) apparaîtront ici.</p>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((a, i) => <FeedCard key={`${a.id}-${i}`} a={a} onOpen={() => setDetail(a)} />)}
          {!done && (
            <button onClick={() => void loadMore()} disabled={loadingMore}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: loadingMore ? 'default' : 'pointer' }}>
              {loadingMore ? 'Chargement…' : 'Voir plus'}
            </button>
          )}
        </div>
      )}

      {/* Détail LECTURE SEULE — même vue que la page training */}
      <SlideSheet open={!!detail} onClose={() => setDetail(null)} title="Activité">
        {detail && <ActivityDetailView a={detail} />}
      </SlideSheet>
    </div>
  )
}

function FeedCard({ a, onOpen }: { a: FeedActivity; onOpen: () => void }) {
  const fam = sportFamily(a.sport)
  const meta = sportMeta(fam)
  const pts = decodePolyline(a.polyline).map(([lat, lng]) => ({ lat, lng }))
  const mapUrl = staticRouteMapUrl(pts, { width: 620, height: 280, color: SPORT_HEX[fam] ?? '9ca3af', pins: false })
  const path = polylineToSvgPath(a.polyline, 320, 150)
  const stats: { label: string; value: string }[] = []
  const dist = fmtDist(a.distance_m); if (dist) stats.push({ label: 'Distance', value: dist })
  if (a.seconds) stats.push({ label: 'Durée', value: fmtDur(a.seconds) })
  if (a.elevation_gain_m) stats.push({ label: 'D+', value: `${Math.round(a.elevation_gain_m)} m` })
  else { const p = fmtPace(a.avg_pace_s_km) ?? (a.avg_watts ? `${Math.round(a.avg_watts)} W` : null); if (p) stats.push({ label: fam === 'cycling' ? 'Watts' : 'Allure', value: p }) }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      {/* Auteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px' }}>
        <Avatar url={a.author_avatar} name={a.author_name} size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.author_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-dim)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
            <span>{a.is_race ? 'Compétition' : meta.label}</span>
            <span>·</span>
            <span className="tnum">{relDate(a.started_at)}</span>
          </div>
        </div>
      </div>

      {/* Carte / titre / stats — clic = détail lecture seule */}
      <button onClick={onOpen} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '2.2 / 1', background: path ? meta.color : 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {mapUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mapUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : path
              ? <svg viewBox="0 0 320 150" style={{ width: '100%', height: '100%' }}><path d={path} fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>
              : <span style={{ width: 12, height: 12, borderRadius: '50%', background: meta.color }} />}
        </div>
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {stats.map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>{s.label}</div>
                <div className="tnum" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </button>
    </div>
  )
}
