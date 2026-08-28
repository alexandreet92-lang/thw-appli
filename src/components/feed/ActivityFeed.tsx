'use client'
// ══════════════════════════════════════════════════════════════════
// Fil (façon Strava) — activités récentes des athlètes que l'on suit et qui
// autorisent la consultation (confidentialité gérée côté RPC activity_feed).
// Colonne centrale : grandes cartes (carte GPS + auteur + stats) → clic =
// détail LECTURE SEULE (exactement la page training, non éditable).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/shared/Sidebar'
import { ReadOnlyActivityDetail } from '@/components/activity/ReadOnlyActivityDetail'
import { PeopleSearchSheet } from './PeopleSearchSheet'
import { CommentsSheet } from './CommentsSheet'
import { staticRouteMapUrl } from '@/lib/staticMap'
import { getActivityFeed, getCombinedFeed, decodePolyline, polylineToSvgPath, sportFamily, sportMeta, type FeedActivity } from '@/lib/profile/activityShowcase'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { getFollowingIds, toggleFollow } from '@/lib/social/follows'
import { getEngagement, toggleKudos, type Engagement } from '@/lib/social/kudos'
import { useI18n } from '@/lib/i18n'

const SPORT_HEX: Record<string, string> = { running: '22c55e', cycling: '3b82f6', swim: '0ea5e9', rowing: '8b5cf6', gym: 'f97316', hyrox: 'ef4444', other: '9ca3af' }

const fmtDur = (s: number | null) => { if (!s) return '—'; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }
const fmtDist = (m: number | null) => m && m > 0 ? `${Math.round(m / 100) / 10} km` : null
const fmtPace = (s: number | null) => { if (!s || s <= 0) return null; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km` }
function relDate(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days <= 0) return t('w4c.feed_today')
  if (days === 1) return t('w4c.feed_yesterday')
  if (days < 7) return t('w4c.feed_days_ago', { days })
  return `${d.getDate()} ${t(`w4c.month_${d.getMonth()}`)}`
}

export default function ActivityFeed() {
  const { t } = useI18n()
  const [items, setItems] = useState<FeedActivity[] | null>(null)
  const [detail, setDetail] = useState<FeedActivity | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [done, setDone] = useState(false)
  const [meId, setMeId] = useState<string | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [eng, setEng] = useState<Record<string, Engagement>>({})
  const [commentsFor, setCommentsFor] = useState<string | null>(null)

  const loadEngagement = (rows: FeedActivity[]) => {
    const ids = rows.map(r => r.id)
    if (ids.length) void getEngagement(ids).then(m => setEng(prev => ({ ...prev, ...m })))
  }

  useEffect(() => {
    let off = false
    void getCurrentUser().then(u => { if (!off) setMeId(u?.id ?? null) })
    void getFollowingIds().then(s => { if (!off) setFollowing(s) })
    void getCombinedFeed(40).then(rows => { if (!off) { setItems(rows); if (rows.length < 40) setDone(true); loadEngagement(rows) } })
    return () => { off = true }
  }, [])

  async function onKudos(id: string) {
    const cur = eng[id]?.mine ?? false
    const now = await toggleKudos(id, cur).catch(() => cur)
    setEng(prev => { const e = prev[id] ?? { kudos: 0, mine: false, comments: 0 }; return { ...prev, [id]: { ...e, mine: now, kudos: Math.max(0, e.kudos + (now ? 1 : -1)) } } })
  }

  // « Voir plus » pagine le fil des abonnements (mes activités sont déjà toutes chargées).
  const loadMore = async () => {
    if (!items || items.length === 0 || loadingMore || done) return
    setLoadingMore(true)
    const last = items[items.length - 1]
    const more = await getActivityFeed(last.started_at)
    const seen = new Set(items.map(i => i.id))
    const fresh = more.filter(m => !seen.has(m.id))
    setItems([...items, ...fresh])
    loadEngagement(fresh)
    if (more.length < 40) setDone(true)
    setLoadingMore(false)
  }

  async function onToggleFollow(id: string) {
    const now = await toggleFollow(id, following.has(id)).catch(() => following.has(id))
    setFollowing(prev => { const n = new Set(prev); now ? n.add(id) : n.delete(id); return n })
  }

  const btn = (bg: string, color: string): React.CSSProperties => ({ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 'var(--r-md)', border: 'none', background: bg, color, fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' })

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '4px clamp(12px,4vw,20px) 80px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '8px 0 2px' }}>{t('w4c.feed_discover')}</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '0 0 16px' }}>{t('w4c.feed_subtitle')}</p>

      {/* Actions : trouver des athlètes / un coach */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setPeopleOpen(true)} style={btn('var(--bg-card2)', 'var(--text)')}>
          <span aria-hidden>＋</span> {t('w4c.feed_find_athletes')}
        </button>
        <Link href="/coaches" style={btn('var(--primary)', 'var(--on-primary)')}>{t('w4c.feed_find_coach')}</Link>
      </div>

      {items === null && <p style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>{t('w4c.feed_loading')}</p>}

      {items !== null && items.length === 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '28px 22px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{t('w4c.feed_empty_title')}</div>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>{t('w4c.feed_empty_body')}</p>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((a, i) => (
            <FeedCard key={`${a.id}-${i}`} a={a} onOpen={() => setDetail(a)}
              canFollow={!!meId && a.author_id !== meId} isFollowing={following.has(a.author_id)} onToggleFollow={() => void onToggleFollow(a.author_id)}
              eng={eng[a.id]} onKudos={() => void onKudos(a.id)} onComments={() => setCommentsFor(a.id)} />
          ))}
          {!done && (
            <button onClick={() => void loadMore()} disabled={loadingMore}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: loadingMore ? 'default' : 'pointer' }}>
              {loadingMore ? t('w4c.feed_loading') : t('w4c.feed_see_more')}
            </button>
          )}
        </div>
      )}

      {peopleOpen && <PeopleSearchSheet onClose={() => setPeopleOpen(false)} />}
      {commentsFor && <CommentsSheet activityId={commentsFor} onClose={() => setCommentsFor(null)} onCount={n => setEng(prev => ({ ...prev, [commentsFor]: { ...(prev[commentsFor] ?? { kudos: 0, mine: false, comments: 0 }), comments: n } }))} />}
      {/* Détail LECTURE SEULE — EXACTEMENT la page training (plein écran) */}
      {detail && <ReadOnlyActivityDetail id={detail.id} onClose={() => setDetail(null)} />}
    </div>
  )
}

function FeedCard({ a, onOpen, canFollow, isFollowing, onToggleFollow, eng, onKudos, onComments }: { a: FeedActivity; onOpen: () => void; canFollow: boolean; isFollowing: boolean; onToggleFollow: () => void; eng?: Engagement; onKudos: () => void; onComments: () => void }) {
  const { t } = useI18n()
  const fam = sportFamily(a.sport)
  const meta = sportMeta(fam)
  const pts = decodePolyline(a.polyline).map(([lat, lng]) => ({ lat, lng }))
  const mapUrl = staticRouteMapUrl(pts, { width: 620, height: 280, color: SPORT_HEX[fam] ?? '9ca3af', pins: false })
  const path = polylineToSvgPath(a.polyline, 320, 150)
  const stats: { label: string; value: string }[] = []
  const dist = fmtDist(a.distance_m); if (dist) stats.push({ label: t('w4c.feed_stat_distance'), value: dist })
  if (a.seconds) stats.push({ label: t('w4c.feed_stat_duration'), value: fmtDur(a.seconds) })
  const pace = fmtPace(a.avg_pace_s_km); if (pace && fam !== 'cycling') stats.push({ label: t('w4c.feed_stat_pace'), value: pace })
  if (a.avg_watts && fam === 'cycling') stats.push({ label: 'Watts', value: `${Math.round(a.avg_watts)} W` })
  if (a.elevation_gain_m) stats.push({ label: 'D+', value: `${Math.round(a.elevation_gain_m)} m` })

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      {/* Auteur — clic sur avatar/nom = profil public (interconnexion) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px' }}>
        <Link href={`/u/${a.author_id}`} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, flex: 1, textDecoration: 'none' }}>
          <Avatar url={a.author_avatar} name={a.author_name} size={40} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.author_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-dim)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
              <span>{a.is_race ? t('w4c.feed_race') : meta.label}</span>
              <span>·</span>
              <span className="tnum">{relDate(a.started_at, t)}</span>
            </div>
          </div>
        </Link>
        {canFollow && (
          <button onClick={onToggleFollow}
            style={{ flexShrink: 0, padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
              border: isFollowing ? '1px solid var(--border-mid)' : 'none', background: isFollowing ? 'transparent' : 'var(--primary)', color: isFollowing ? 'var(--text-mid)' : 'var(--on-primary)' }}>
            {isFollowing ? t('w4c.feed_following') : t('w4c.feed_follow')}
          </button>
        )}
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

      {/* Engagement : kudos 👏 + commentaires */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 8px', borderTop: '1px solid var(--border)' }}>
        <button onClick={onKudos}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: eng?.mine ? 'var(--primary)' : 'var(--text-mid)' }}>
          <span style={{ fontSize: 16, filter: eng?.mine ? 'none' : 'grayscale(1)', opacity: eng?.mine ? 1 : 0.7 }}>👏</span>
          <span className="tnum">{eng?.kudos ?? 0}</span>
        </button>
        <button onClick={onComments}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 'var(--r-md)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span className="tnum">{eng?.comments ?? 0}</span>
        </button>
      </div>
    </div>
  )
}
