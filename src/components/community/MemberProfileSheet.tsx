'use client'
// ══════════════════════════════════════════════════════════════════════════
// Sur-page PROFIL d'un membre (slide bas→haut, se ferme haut→bas). Bio, statut
// athlète/coach, ancienneté du COMPTE + ancienneté DANS LE GROUPE, et actions
// (Ajouter en ami = suivre ; Message / Appeler branchés dans un 2e temps).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { getMemberProfile, type MemberProfileDetail } from '@/lib/community/members'
import { toggleFollow } from '@/lib/social/follows'
import type { CommunityMemberInfo } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function since(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const months = Math.max(0, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    if (months < 1) return "moins d'un mois"
    if (months < 12) return `${months} mois`
    const y = Math.floor(months / 12), m = months % 12
    return m ? `${y} an${y > 1 ? 's' : ''} ${m} mois` : `${y} an${y > 1 ? 's' : ''}`
  } catch { return '—' }
}

export function MemberProfileSheet({ member, onClose }: { member: CommunityMemberInfo; onClose: () => void }) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [detail, setDetail] = useState<MemberProfileDetail | null>(null)
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [soon, setSoon] = useState(false)

  useEffect(() => { setMounted(true); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  useEffect(() => {
    let alive = true
    void getMemberProfile(member.userId).then(d => { if (alive) { setDetail(d); setFollowing(!!d?.following) } })
    return () => { alive = false }
  }, [member.userId])

  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }

  async function onToggleFollow() {
    if (busy) return
    setBusy(true)
    const ok = await toggleFollow(member.userId, following)
    if (ok) setFollowing(f => !f)
    setBusy(false)
  }

  if (!mounted || typeof document === 'undefined') return null

  const statusLabel = detail?.isCoach ? t('w1g.mem.coach') : t('w1g.mem.athlete')

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 15200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: 560,
        maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto',
        background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--border)', borderBottom: 'none',
        transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        padding: 'var(--space-4) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 'var(--space-3)' }}>
          <span style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
        </div>

        {/* Avatar + nom + statut */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <span style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', fontFamily: FB, fontWeight: 700, fontSize: 30 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {detail?.avatar || member.avatar ? <img src={(detail?.avatar || member.avatar) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.name.slice(0, 1).toUpperCase()}
          </span>
          <span style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{detail?.name || member.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 12px', borderRadius: 'var(--r-pill)', background: 'var(--primary-dim)', color: 'var(--primary)', fontFamily: FB, fontSize: 12, fontWeight: 700 }}>
            {statusLabel}
          </span>
        </div>

        {/* Actions : Ajouter en ami (suivre) / Message / Appeler */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <button onClick={() => void onToggleFollow()} disabled={busy}
            style={{ flex: 1, height: 42, borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 13.5, fontWeight: 700,
              background: following ? 'var(--surface-neutral)' : 'var(--primary)', color: following ? 'var(--text)' : 'var(--on-primary)' }}>
            {following ? t('w1g.mem.friendAdded') : t('w1g.mem.addFriend')}
          </button>
          <button onClick={() => { try { window.dispatchEvent(new CustomEvent('thw:community-dm', { detail: { userId: member.userId } })) } catch { /* ignore */ } requestClose() }} aria-label={t('w1g.mem.message')} title={t('w1g.mem.message')}
            style={{ width: 46, height: 42, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </button>
          <button onClick={() => setSoon(true)} aria-label={t('w1g.mem.call')} title={t('w1g.mem.call')}
            style={{ width: 46, height: 42, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          </button>
        </div>
        {soon && <p style={{ margin: '0 0 var(--space-4)', textAlign: 'center', fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>{t('w1g.mem.soon')}</p>}

        {/* Bio */}
        {detail?.bio && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ margin: '0 0 4px', fontFamily: FB, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{t('profile.bio')}</p>
            <p style={{ margin: 0, fontFamily: FB, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{detail.bio}</p>
          </div>
        )}

        {/* Ancienneté : compte app + ce groupe (bien séparés) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Row label={t('w1g.mem.sinceApp')} value={since(detail?.accountCreatedAt)} />
          <Row label={t('w1g.mem.sinceGroup')} value={since(member.joinedAt)} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
      <span style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)' }}>{label}</span>
      <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}
