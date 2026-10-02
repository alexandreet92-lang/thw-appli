'use client'
// ══════════════════════════════════════════════════════════════════
// Fil (façon Strava) — mes activités + celles des athlètes suivis qui
// autorisent la consultation (confidentialité gérée côté RPC activity_feed).
// Mobile : vue plein écran (en-tête rond retour / recherche d'athlètes),
// page gris chaud + cartes blanches : auteur, titre, statistiques, carte,
// bravos (👏) et commentaires. Clic = détail LECTURE SEULE (page training).
// Entrée en cascade, chargement continu en bas de liste, pression .97.
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, UserPlus, GraduationCap, MessageCircle, Check, Trophy, Users } from 'lucide-react'
import { ReadOnlyActivityDetail } from '@/components/activity/ReadOnlyActivityDetail'
import { PeopleSearchSheet } from './PeopleSearchSheet'
import { CommentsSheet } from './CommentsSheet'
import { staticRouteMapUrl } from '@/lib/staticMap'
import { getActivityFeed, getCombinedFeed, decodePolyline, polylineToSvgPath, sportFamily, sportMeta, type FeedActivity } from '@/lib/profile/activityShowcase'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { getFollowingIds, toggleFollow } from '@/lib/social/follows'
import { getEngagement, toggleKudos, type Engagement } from '@/lib/social/kudos'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import {
  CmStyles, CmHeader, CmRound, CmAvatar, CmPill, CmSkel, CmEmpty, FB, PAGE_BG, CARD_BG, SOFT_SHADOW, TNUM, stagger, useNarrowSafe, useImmersive,
} from '@/components/community/kit'

// Couleur du tracé sur l'image Mapbox (paramètre d'URL hexadécimal, pas un style).
const SPORT_HEX: Record<string, string> = { running: '22c55e', cycling: '3b82f6', swim: '0ea5e9', rowing: '8b5cf6', gym: 'f97316', hyrox: 'ef4444', other: '9ca3af' }

const fmtDur = (s: number | null) => { if (!s) return '—'; const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min` }
const fmtDist = (m: number | null) => m && m > 0 ? `${(Math.round(m / 100) / 10).toString().replace('.', ',')} km` : null
const fmtPace = (s: number | null) => { if (!s || s <= 0) return null; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km` }
type Tr = (key: string, vars?: Record<string, string | number>) => string
function relDate(iso: string, t: Tr): string {
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (days <= 0) return `${t('w4c.feed_today')} · ${time}`
  if (days === 1) return `${t('w4c.feed_yesterday')} · ${time}`
  if (days < 7) return t('w4c.feed_days_ago', { days })
  return `${d.getDate()} ${t(`w4c.month_${d.getMonth()}`)}`
}

export default function ActivityFeed() {
  const { t } = useI18n()
  const router = useRouter()
  const narrowState = useNarrowSafe()
  const narrow = narrowState === true
  const [items, setItems] = useState<FeedActivity[] | null>(null)
  const [detail, setDetail] = useState<FeedActivity | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [done, setDone] = useState(false)
  const [meId, setMeId] = useState<string | null>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [eng, setEng] = useState<Record<string, Engagement>>({})
  const [commentsFor, setCommentsFor] = useState<string | null>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Vue plein écran sur mobile : le fil porte son propre en-tête (chrome masqué).
  useImmersive(narrow)

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
    haptic(cur ? 'light' : 'success')
    // Optimiste, puis valeur serveur.
    setEng(prev => { const e = prev[id] ?? { kudos: 0, mine: false, comments: 0 }; return { ...prev, [id]: { ...e, mine: !cur, kudos: Math.max(0, e.kudos + (cur ? -1 : 1)) } } })
    const now = await toggleKudos(id, cur).catch(() => cur)
    if (now === cur) setEng(prev => { const e = prev[id] ?? { kudos: 0, mine: false, comments: 0 }; return { ...prev, [id]: { ...e, mine: now, kudos: Math.max(0, e.kudos + (now ? 1 : -1)) } } })
  }

  // Pagination du fil des abonnements (mes activités sont déjà toutes chargées).
  const loadMore = useCallback(async () => {
    if (!items || items.length === 0 || loadingMore || done) return
    setLoadingMore(true)
    const last = items[items.length - 1]
    const more = await getActivityFeed(last.started_at)
    const seen = new Set(items.map(i => i.id))
    const fresh = more.filter(m => !seen.has(m.id))
    setItems([...items, ...fresh])
    loadEngagement(fresh)
    if (more.length < 40 || fresh.length === 0) setDone(true)
    setLoadingMore(false)
  }, [items, loadingMore, done])

  // Chargement continu : la sentinelle de bas de liste déclenche la page suivante.
  useEffect(() => {
    const el = sentinel.current
    if (!el || done) return
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) void loadMore() }, { root: narrow ? scrollRef.current : null, rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore, done, narrow, items?.length])

  async function onToggleFollow(id: string) {
    const was = following.has(id)
    haptic(was ? 'light' : 'success')
    setFollowing(prev => { const n = new Set(prev); if (was) n.delete(id); else n.add(id); return n })
    const now = await toggleFollow(id, was).catch(() => was)
    setFollowing(prev => { const n = new Set(prev); if (now) n.add(id); else n.delete(id); return n })
  }
  function goBack() {
    haptic('light')
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  const actions = (
    <div className="cm-in" style={{ display: 'flex', gap: 10, margin: narrow ? '2px 0 16px' : '0 0 20px' }}>
      <CmPill variant="white" onClick={() => setPeopleOpen(true)} style={{ flex: 1 }}><UserPlus size={17} strokeWidth={2.2} />{t('w4c.feed_find_athletes')}</CmPill>
      <Link href="/coaches" className="cm-press" style={{ flex: 1, minHeight: 44, borderRadius: 'var(--r-pill)', background: CARD_BG, boxShadow: SOFT_SHADOW, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FB, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
        <GraduationCap size={17} strokeWidth={2.2} />{t('w4c.feed_find_coach')}
      </Link>
    </div>
  )

  const list = (
    <>
      {items === null && <FeedSkeleton />}
      {items !== null && items.length === 0 && (
        <CmEmpty icon={<Users size={28} strokeWidth={1.8} />} title={t('w4c.feed_empty_title')} body={t('w4c.feed_empty_body')}
          action={<CmPill variant="primary" onClick={() => setPeopleOpen(true)}><UserPlus size={17} strokeWidth={2.2} />{t('w4c.feed_find_athletes')}</CmPill>} />
      )}
      {items !== null && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((a, i) => (
            <FeedCard key={`${a.id}-${i}`} a={a} index={i} onOpen={() => { haptic('light'); setDetail(a) }}
              canFollow={!!meId && a.author_id !== meId} isFollowing={following.has(a.author_id)} onToggleFollow={() => void onToggleFollow(a.author_id)}
              eng={eng[a.id]} onKudos={() => void onKudos(a.id)} onComments={() => { haptic('light'); setCommentsFor(a.id) }} />
          ))}
          {!done && (
            <div ref={sentinel}>
              {loadingMore ? <CmSkel h={260} r="var(--r-lg)" /> : (
                <CmPill variant="white" full onClick={() => void loadMore()}>{t('w4c.feed_see_more')}</CmPill>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )

  const overlays = (
    <>
      {peopleOpen && <PeopleSearchSheet onClose={() => setPeopleOpen(false)} />}
      {commentsFor && <CommentsSheet activityId={commentsFor} onClose={() => setCommentsFor(null)} onCount={n => setEng(prev => ({ ...prev, [commentsFor]: { ...(prev[commentsFor] ?? { kudos: 0, mine: false, comments: 0 }), comments: n } }))} />}
      {/* Détail LECTURE SEULE — EXACTEMENT la page training (plein écran) */}
      {detail && <ReadOnlyActivityDetail id={detail.id} onClose={() => setDetail(null)} />}
    </>
  )

  // Avant montage (rendu serveur) : squelette neutre, sans choix de mise en page.
  if (narrowState === null) {
    return <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px' }}><CmStyles /><FeedSkeleton /></div>
  }

  if (narrow) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 3, background: PAGE_BG, display: 'flex', flexDirection: 'column', fontFamily: FB }}>
        <CmStyles />
        <CmHeader
          left={<CmRound onClick={goBack} label={t('w1g.back')}><ChevronLeft size={22} strokeWidth={2.2} /></CmRound>}
          title={t('w4c.feed_discover')}
          right={<CmRound onClick={() => setPeopleOpen(true)} label={t('w4c.feed_find_athletes')}><UserPlus size={20} strokeWidth={2.2} /></CmRound>}
        />
        <div ref={scrollRef} className="cm-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px calc(28px + env(safe-area-inset-bottom))' }}>
          <p className="cm-in" style={{ margin: '0 4px 14px', fontSize: 14.5, color: 'var(--text-mid)' }}>{t('w4c.feed_subtitle')}</p>
          {actions}
          {list}
        </div>
        {overlays}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 16px 80px', fontFamily: FB }}>
      <CmStyles />
      <div style={{ background: PAGE_BG, borderRadius: 'calc(var(--r-lg) + 6px)', padding: '22px 18px 26px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '0 4px 2px' }}>{t('w4c.feed_discover')}</h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-mid)', margin: '0 4px 18px' }}>{t('w4c.feed_subtitle')}</p>
        {actions}
        {list}
      </div>
      {overlays}
    </div>
  )
}

function FeedCard({ a, index, onOpen, canFollow, isFollowing, onToggleFollow, eng, onKudos, onComments }: {
  a: FeedActivity; index: number; onOpen: () => void; canFollow: boolean; isFollowing: boolean; onToggleFollow: () => void
  eng?: Engagement; onKudos: () => void; onComments: () => void
}) {
  const { t } = useI18n()
  const [popN, setPopN] = useState(0)
  const fam = sportFamily(a.sport)
  const meta = sportMeta(fam)
  const pts = decodePolyline(a.polyline).map(([lat, lng]) => ({ lat, lng }))
  const mapUrl = staticRouteMapUrl(pts, { width: 640, height: 320, color: SPORT_HEX[fam] ?? '9ca3af', pins: false })
  const path = polylineToSvgPath(a.polyline, 320, 150)
  const stats: { label: string; value: string }[] = []
  const dist = fmtDist(a.distance_m); if (dist) stats.push({ label: t('w4c.feed_stat_distance'), value: dist })
  if (a.seconds) stats.push({ label: t('w4c.feed_stat_duration'), value: fmtDur(a.seconds) })
  const pace = fmtPace(a.avg_pace_s_km); if (pace && fam !== 'cycling') stats.push({ label: t('w4c.feed_stat_pace'), value: pace })
  if (a.avg_watts && fam === 'cycling') stats.push({ label: 'Watts', value: `${Math.round(a.avg_watts)} W` })
  if (a.elevation_gain_m) stats.push({ label: 'D+', value: `${Math.round(a.elevation_gain_m)} m` })
  const mine = !!eng?.mine

  return (
    <article className="cm-in" style={{ ...stagger(index % 8), background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, overflow: 'hidden' }}>
      {/* Auteur — clic sur avatar/nom = profil public (interconnexion) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 10px 16px' }}>
        <Link href={`/u/${a.author_id}`} className="cm-press" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, textDecoration: 'none' }}>
          <CmAvatar name={a.author_name} url={a.author_avatar} seed={a.author_id} size={44} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.author_name}</div>
            <div style={{ ...TNUM, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
              <span>{a.is_race ? t('w4c.feed_race') : meta.label}</span>
              <span aria-hidden>·</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{relDate(a.started_at, t)}</span>
            </div>
          </div>
        </Link>
        {canFollow && (
          <button type="button" onClick={onToggleFollow} className="cm-btn cm-press"
            style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 'var(--r-pill)', fontFamily: FB, fontSize: 13.5, fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: 5,
              background: isFollowing ? 'var(--surface-chip)' : 'var(--primary)', color: isFollowing ? 'var(--text-mid)' : 'var(--on-primary)' }}>
            {isFollowing && <Check size={14} strokeWidth={2.8} />}{isFollowing ? t('w4c.feed_following') : t('w4c.feed_follow')}
          </button>
        )}
      </div>

      {/* Titre / stats / carte — clic = détail lecture seule */}
      <button type="button" onClick={onOpen} className="cm-btn" style={{ display: 'block', width: '100%', textAlign: 'left', fontFamily: FB }}>
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {a.is_race && <Trophy size={17} strokeWidth={2.2} color="var(--primary)" style={{ flexShrink: 0 }} />}
            <span style={{ fontSize: 18.5, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
          </div>
          {stats.length > 0 && (
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 10 }}>
              {stats.map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-mid)' }}>{s.label}</div>
                  <div style={{ ...TNUM, fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {(mapUrl || path) && (
          <div className="cm-press" style={{ position: 'relative', width: '100%', aspectRatio: '2 / 1', background: `color-mix(in srgb, ${meta.color} 10%, var(--surface-chip))`, overflow: 'hidden' }}>
            {mapUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={mapUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <svg viewBox="0 0 320 150" style={{ width: '100%', height: '100%', display: 'block' }}><path d={path ?? ''} fill="none" stroke={meta.color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>}
          </div>
        )}
      </button>

      {/* Engagement : bravos 👏 + commentaires */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px 8px' }}>
        <button type="button" onClick={() => { setPopN(n => n + 1); onKudos() }} aria-pressed={mine} className="cm-btn cm-press"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 12px', borderRadius: 'var(--r-pill)', fontFamily: FB, fontSize: 14.5, fontWeight: 750,
            background: mine ? 'var(--primary-dim)' : 'transparent', color: mine ? 'var(--primary)' : 'var(--text-mid)' }}>
          <span key={popN} className={popN ? 'cm-pop' : undefined} style={{ display: 'inline-block', fontSize: 19, filter: mine ? 'none' : 'grayscale(1)', opacity: mine ? 1 : 0.75 }}>👏</span>
          <span style={TNUM}>{eng?.kudos ?? 0}</span>
        </button>
        <button type="button" onClick={onComments} className="cm-btn cm-press"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 12px', borderRadius: 'var(--r-pill)', fontFamily: FB, fontSize: 14.5, fontWeight: 750, color: 'var(--text-mid)' }}>
          <MessageCircle size={19} strokeWidth={2} />
          <span style={TNUM}>{eng?.comments ?? 0}</span>
        </button>
      </div>
    </article>
  )
}

function FeedSkeleton() {
  return (
    <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
            <CmSkel h={44} w={44} r="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}><CmSkel h={14} w="40%" /><CmSkel h={12} w="60%" /></div>
          </div>
          <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}><CmSkel h={18} w="65%" /><CmSkel h={30} w="80%" /></div>
          <CmSkel h={170} r="0" />
        </div>
      ))}
    </div>
  )
}
