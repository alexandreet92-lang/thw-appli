'use client'
// ══════════════════════════════════════════════════════════════════════════
// Sur-page MEMBRES d'un salon (slide bas→haut, se ferme haut→bas). Membres
// EN LIGNE et HORS LIGNE bien séparés. Un tap sur un membre ouvre la sur-page
// profil (MemberProfileSheet).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { MemberProfileSheet } from './MemberProfileSheet'
import type { CommunityMemberInfo } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

export function MembersSheet({ title, members, onlineIds, onClose }: {
  title: string
  members: CommunityMemberInfo[]
  onlineIds: Set<string>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  const [closing, setClosing] = useState(false)
  const [selected, setSelected] = useState<CommunityMemberInfo | null>(null)

  useEffect(() => { setMounted(true); const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setClosing(true); setShown(false); setTimeout(onClose, 280) }

  const { online, offline } = useMemo(() => {
    const on: CommunityMemberInfo[] = [], off: CommunityMemberInfo[] = []
    for (const m of members) (onlineIds.has(m.userId) ? on : off).push(m)
    return { online: on, offline: off }
  }, [members, onlineIds])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 15100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={requestClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: shown && !closing ? 1 : 0, transition: 'opacity 0.26s ease' }} />
        <div role="dialog" aria-modal="true" style={{
          position: 'relative', width: '100%', maxWidth: 560,
          maxHeight: 'calc(100dvh - 40px)', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)', borderRadius: '22px 22px 0 0', border: '1px solid var(--border)', borderBottom: 'none',
          transform: shown && !closing ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.30s cubic-bezier(0.32,0.72,0,1)',
        }}>
          <div style={{ flexShrink: 0, padding: 'var(--space-3) var(--space-5) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 'var(--space-2)' }}>
              <span style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', paddingBottom: 'var(--space-2)' }}>
              <span style={{ fontFamily: FD, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('w1g.mem.members')}</span>
              <span style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)' }}>· {title}</span>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom, 0px))' }}>
            {online.length > 0 && (
              <Section label={`${t('w1g.mem.online')} — ${online.length}`}>
                {online.map(m => <MemberRow key={m.userId} m={m} online onClick={() => setSelected(m)} t={t} />)}
              </Section>
            )}
            {offline.length > 0 && (
              <Section label={`${t('w1g.mem.offline')} — ${offline.length}`}>
                {offline.map(m => <MemberRow key={m.userId} m={m} online={false} onClick={() => setSelected(m)} t={t} />)}
              </Section>
            )}
            {members.length === 0 && (
              <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 'var(--space-6)' }}>{t('w1g.mem.none')}</p>
            )}
          </div>
        </div>
      </div>

      {selected && <MemberProfileSheet member={selected} onClose={() => setSelected(null)} />}
    </>,
    document.body,
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <p style={{ margin: '0 0 var(--space-2)', padding: '0 var(--space-2)', fontFamily: FB, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  )
}

function MemberRow({ m, online, onClick, t }: { m: CommunityMemberInfo; online: boolean; onClick: () => void; t: (k: string) => string }) {
  const roleLabel = m.role === 'owner' ? t('w1g.roleCreator') : m.role === 'coach' ? t('w1g.roleCoach') : m.role === 'admin' ? t('w1g.roleMod') : null
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', padding: 'var(--space-2) var(--space-2)', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderRadius: 'var(--r-md)' }}>
      <span style={{ position: 'relative', flexShrink: 0 }}>
        <span style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-neutral)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', fontFamily: FB, fontWeight: 600, fontSize: 16, opacity: online ? 1 : 0.65 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.avatar ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.name.slice(0, 1).toUpperCase()}
        </span>
        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: online ? 'var(--sport-run)' : 'var(--text-dim)', boxShadow: '0 0 0 2px var(--bg-card)' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FB, fontSize: 14, fontWeight: 600, color: online ? 'var(--text)' : 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
      </span>
      {roleLabel && (
        <span style={{ flexShrink: 0, fontFamily: FB, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 'var(--r-sm)', color: 'var(--primary)', background: 'var(--primary-dim)' }}>{roleLabel}</span>
      )}
    </button>
  )
}
