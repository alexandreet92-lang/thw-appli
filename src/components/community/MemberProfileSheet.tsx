'use client'
// ══════════════════════════════════════════════════════════════════════════
// Feuille PROFIL d'un membre (maquette mock8 c3) : gros avatar, nom, statut
// (athlète / coach · rôle dans le groupe · ancienneté), 3 tuiles chiffrées
// (activités de l'année, abonnés, abonnements — données réelles), bio,
// ancienneté compte / groupe, « Suivre » (pilule cyan) et « Voir le profil »
// (page publique /u/[id], règle d'interconnexion).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Phone, ArrowUpRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { getMemberProfile, type MemberProfileDetail } from '@/lib/community/members'
import { toggleFollow, getSocialCounts, type SocialCounts } from '@/lib/social/follows'
import { getProfileActivityShowcase } from '@/lib/profile/activityShowcase'
import { myId } from '@/lib/community/shared'
import { isNativeApp } from '@/lib/native/platform'
import { CmSheet, CmAvatar, CmPill, CmSkel, RolePill, TNUM, FB, stagger } from './kit'
import type { CommunityMemberInfo } from '@/types/community'

type Tr = (k: string, v?: Record<string, string | number>) => string
function since(iso: string | null | undefined, t: Tr): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const months = Math.max(0, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    if (months < 1) return t('cm.lessThanMonth')
    if (months < 12) return t('cm.nMonths', { n: months })
    const y = Math.floor(months / 12), m = months % 12
    return m ? t('cm.nYearsMonths', { y, m }) : t('cm.nYears', { n: y })
  } catch { return '—' }
}

export function MemberProfileSheet({ member, online, onClose }: { member: CommunityMemberInfo; online?: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [detail, setDetail] = useState<MemberProfileDetail | null>(null)
  const [counts, setCounts] = useState<SocialCounts | null>(null)
  const [ytd, setYtd] = useState<number | null | undefined>(undefined)
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [soon, setSoon] = useState(false)
  const [me, setMe] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void myId().then(id => { if (alive) setMe(id) })
    void getMemberProfile(member.userId).then(d => { if (alive) { setDetail(d); setFollowing(!!d?.following) } })
    void getSocialCounts(member.userId).then(c => { if (alive) setCounts(c) }).catch(() => { if (alive) setCounts({ followers: 0, following: 0, coached: 0 }) })
    void getProfileActivityShowcase(member.userId).then(s => { if (alive) setYtd(s && s.can_view ? s.ytd_count : null) }).catch(() => { if (alive) setYtd(null) })
    return () => { alive = false }
  }, [member.userId])

  async function onToggleFollow() {
    if (busy) return
    setBusy(true)
    try {
      const now = await toggleFollow(member.userId, following)
      setFollowing(now)
      setCounts(c => c ? { ...c, followers: Math.max(0, c.followers + (now ? 1 : -1)) } : c)
      haptic(now ? 'success' : 'light')
    } catch { /* ignore */ }
    setBusy(false)
  }

  const name = detail?.name || member.name
  const avatar = detail?.avatar || member.avatar
  const status = detail ? (detail.isCoach ? t('w1g.mem.coach') : t('w1g.mem.athlete')) : null
  const isMe = me === member.userId
  const year = new Date().getFullYear()
  const tiles: { label: string; value: number | null | undefined }[] = [
    { label: t('w1j.statActivitiesYear', { year }), value: ytd },
    { label: t('w1j.statFollowers'), value: counts?.followers },
    { label: t('w1j.statFollowing'), value: counts?.following },
  ]

  return (
    <CmSheet onClose={onClose} hideHeader surface="card" zIndex={15200} label={name}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 12, fontFamily: FB }}>
        <span className="cm-in" style={{ position: 'relative', lineHeight: 0 }}>
          <CmAvatar name={name} url={avatar} seed={member.userId} size={96} />
          {online && <span style={{ position: 'absolute', right: 4, bottom: 4, width: 18, height: 18, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px var(--surface-card)' }} />}
        </span>
        <div className="cm-in" style={{ ...stagger(1), marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', maxWidth: '100%' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <RolePill role={member.role} />
        </div>
        <div className="cm-in" style={{ ...stagger(2), marginTop: 4, fontSize: 15, color: 'var(--text-mid)', minHeight: 20 }}>
          {status ? [status, member.joinedAt ? t('cm.memberSince', { d: since(member.joinedAt, t) }) : null].filter(Boolean).join(' · ') : <CmSkel h={14} w={180} />}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
        {tiles.map((tile, i) => (
          <div key={tile.label} className="cm-in" style={{ ...stagger(i + 3), background: 'var(--surface-chip)', borderRadius: 'var(--r-lg)', padding: '12px 12px 14px', minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tile.label}</div>
            <div style={{ ...TNUM, marginTop: 4, fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
              {tile.value === undefined ? <CmSkel h={26} w={44} /> : tile.value === null ? '—' : tile.value.toLocaleString('fr-FR')}
            </div>
          </div>
        ))}
      </div>

      {detail?.bio && (
        <p className="cm-in" style={{ ...stagger(6), margin: '18px 2px 0', fontSize: 15.5, color: 'var(--text-mid)', lineHeight: 1.5, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{detail.bio}</p>
      )}

      <div className="cm-in" style={{ ...stagger(7), marginTop: 16, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)', overflow: 'hidden' }}>
        {[[t('w1g.mem.sinceApp'), since(detail?.accountCreatedAt, t)], [t('w1g.mem.sinceGroup'), since(member.joinedAt, t)]].map(([l, v], i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, padding: '0 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 14.5, color: 'var(--text-mid)' }}>{l}</span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="cm-in" style={{ ...stagger(8), display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {!isMe && (
          <CmPill variant={following ? 'chip' : 'primary'} full height={52} disabled={busy} onClick={() => void onToggleFollow()} style={{ fontSize: 16 }}>
            {following ? <><Check size={18} strokeWidth={2.6} />{t('w1j.followingState')}</> : t('w1j.follow')}
          </CmPill>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/u/${member.userId}`} className="cm-press" onClick={() => haptic('light')}
            style={{ flex: 1, minHeight: 52, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FB, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            {t('cm.viewProfile')}<ArrowUpRight size={17} strokeWidth={2.4} />
          </Link>
          {/* Appel : web uniquement (masqué dans l'app iOS native — App Store 2.1). */}
          {!isMe && !isNativeApp() && (
            <button type="button" onClick={() => setSoon(true)} aria-label={t('w1g.mem.call')} title={t('w1g.mem.call')} className="cm-btn cm-press"
              style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone size={19} strokeWidth={2} />
            </button>
          )}
        </div>
        {soon && <p className="cm-in" style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--text-mid)' }}>{t('w1g.mem.soon')}</p>}
      </div>
    </CmSheet>
  )
}
