'use client'
// ══════════════════════════════════════════════════════════════════
// Profil public d'un athlète (/u/<id>). En-tête (avatar, nom, @username,
// bio, sports, compteurs sociaux, bouton Suivre) + showcase d'activités
// (façon Strava) filtré par la confidentialité via la RPC. Interconnexion :
// clic sur une activité → détail lecture seule ; ?activity=<id> ouvre
// directement une activité (deep-link depuis une notification sociale).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { Avatar } from '@/components/shared/Sidebar'
import { ReadOnlyActivityDetail } from '@/components/activity/ReadOnlyActivityDetail'
import ActivityShowcase from '@/components/profile/ActivityShowcase'
import { getProfileActivityShowcase, type ActivityShowcaseData } from '@/lib/profile/activityShowcase'
import { getSocialCounts, amIFollowing, toggleFollow, type SocialCounts } from '@/lib/social/follows'
import { useI18n } from '@/lib/i18n'

interface PublicProfile {
  id: string
  name: string
  username: string | null
  avatar: string | null
  bio: string | null
  sports: string[]
}

const SPORT_LABEL: Record<string, string> = {
  running: 'Course', run: 'Course', trail: 'Trail', cycling: 'Vélo', bike: 'Vélo',
  swim: 'Natation', swimming: 'Natation', rowing: 'Aviron', gym: 'Renfo', strength: 'Renfo',
  hyrox: 'Hyrox', boxe: 'Boxe', triathlon: 'Triathlon', hybrid: 'Hybride', yoga: 'Yoga',
}
const sportLabel = (s: string) => SPORT_LABEL[s] ?? (s ? s[0].toUpperCase() + s.slice(1) : s)

export default function PublicProfileView({ userId }: { userId: string }) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [counts, setCounts] = useState<SocialCounts>({ followers: 0, following: 0, coached: 0 })
  const [showcase, setShowcase] = useState<ActivityShowcaseData | null>(null)
  const [isSelf, setIsSelf] = useState(false)
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const sb = createClient()
      const me = await getCurrentUser()
      const self = !!me && me.id === userId
      const [{ data: p }, c, sc, fol] = await Promise.all([
        sb.from('profiles').select('id, full_name, preferred_name, first_name, username, avatar_url, bio, sports').eq('id', userId).maybeSingle(),
        getSocialCounts(userId).catch(() => ({ followers: 0, following: 0, coached: 0 })),
        getProfileActivityShowcase(userId).catch(() => null),
        self ? Promise.resolve(false) : amIFollowing(userId).catch(() => false),
      ])
      if (!alive) return
      if (!p) { setNotFound(true); setLoading(false); return }
      const row = p as Record<string, unknown>
      const s = (v: unknown) => (typeof v === 'string' ? v : null)
      setProfile({
        id: userId,
        name: s(row.preferred_name) || s(row.full_name) || s(row.first_name) || s(row.username) || t('w1j.athlete'),
        username: s(row.username),
        avatar: s(row.avatar_url),
        bio: s(row.bio),
        sports: Array.isArray(row.sports) ? (row.sports as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      })
      setCounts(c); setShowcase(sc); setIsSelf(self); setFollowing(fol)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [userId])

  // Deep-link ?activity=<id> → ouvre directement le détail (lecture seule).
  useEffect(() => {
    try {
      const a = new URLSearchParams(window.location.search).get('activity')
      if (a) setDetailId(a)
    } catch { /* pas de deep-link */ }
  }, [])

  async function onToggleFollow() {
    if (busy || isSelf) return
    setBusy(true)
    const prev = following
    setFollowing(!prev)
    setCounts(c => ({ ...c, followers: c.followers + (prev ? -1 : 1) }))
    try { await toggleFollow(userId, prev) }
    catch { setFollowing(prev); setCounts(c => ({ ...c, followers: c.followers + (prev ? 1 : -1) })) }
    finally { setBusy(false) }
  }

  if (loading) {
    return <div style={wrap}><p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('w1j.loading')}</p></div>
  }
  if (notFound || !profile) {
    return (
      <div style={wrap}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '32px 22px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{t('w1j.athleteNotFound')}</p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 16px' }}>{t('w1j.profileUnavailable')}</p>
          <Link href="/feed" style={pill('var(--bg-card2)', 'var(--primary)')}>{t('w1j.backToFeed')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      {/* En-tête profil */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,26px)', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar url={profile.avatar} name={profile.name} size={72} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,5vw,26px)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.15 }}>{profile.name}</h1>
            {profile.username && <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>@{profile.username}</p>}
          </div>
          {isSelf ? (
            <Link href="/profile" style={pill('var(--bg-card2)', 'var(--primary)')}>{t('w1j.editMyProfile')}</Link>
          ) : (
            <button onClick={onToggleFollow} disabled={busy}
              style={pill(following ? 'var(--bg-card2)' : 'var(--primary)', following ? 'var(--text-mid)' : 'var(--on-primary)')}>
              {following ? t('w1j.followingState') : t('w1j.follow')}
            </button>
          )}
        </div>

        {profile.bio && <p style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.55, margin: '14px 0 0' }}>{profile.bio}</p>}

        {profile.sports.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
            {profile.sports.map(s => (
              <span key={s} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--bg-card2)', borderRadius: 999, padding: '5px 12px' }}>{sportLabel(s)}</span>
            ))}
          </div>
        )}

        {/* Compteurs sociaux */}
        <div style={{ display: 'flex', gap: 24, marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <Stat n={counts.followers} label={counts.followers > 1 ? t('w1j.followersPlural') : t('w1j.followerSingular')} />
          <Stat n={counts.following} label={t('w1j.followingCount')} />
          {counts.coached > 0 && <Stat n={counts.coached} label={counts.coached > 1 ? t('w1j.coachedAthletesPlural') : t('w1j.coachedAthleteSingular')} />}
        </div>
      </div>

      {/* Showcase d'activités (confidentialité respectée par la RPC) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,26px)' }}>
        {showcase
          ? <ActivityShowcase data={showcase} isOwner={isSelf} />
          : <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>{t('w1j.activitiesUnavailable')}</p>}
      </div>

      {detailId && <ReadOnlyActivityDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

const wrap: React.CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '4px clamp(12px,4vw,20px) 80px' }
function pill(bg: string, color: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 18px', borderRadius: 999, border: 'none', background: bg, color, fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }
}
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span className="tnum" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}
