'use client'
// ══════════════════════════════════════════════════════════════════════════
// « Gérer l'espace » (owner/admin) : réglages de sécurité, modération des
// membres (exclure / bannir), demandes d'adhésion, signalements. Feuille du bas
// nouveau style : onglets segmentés, champs doux à unité intégrée, listes
// groupées, confirmations en double tap (plus de window.confirm).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { Trash2, Inbox, Flag, Users } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { SegTrack } from '@/components/ai/mobile/MobileKit'
import { listSpaceMembers, deleteSpace } from '@/lib/community/spaces'
import {
  getSpaceSettings, updateSpaceSettings, moderate, listReports, resolveReport,
  type CommunitySettings, type ReportInfo,
} from '@/lib/community/moderation'
import { listJoinRequests, type JoinRequestInfo } from '@/lib/community/discover'
import { CmSheet, CmPill, CmCard, CmField, CmChip, CmSwitch, CmUnitInput, CmAvatar, CmSkel, CmEmpty, CmToast, FB, stagger } from './kit'
import type { CommunityMemberInfo } from '@/types/community'

type Tab = 'settings' | 'members' | 'requests' | 'reports'

export function CommunityManageSheet({ spaceId, spaceName, onClose, onDeleted }: { spaceId: string; spaceName?: string; onClose: () => void; onDeleted?: () => void }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('settings')
  return (
    <CmSheet full onClose={onClose} title={t('w1g.manageSpace')} sub={spaceName} zIndex={15050}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, paddingBottom: 6, background: 'var(--surface-page)' }}>
        <SegTrack<Tab> value={tab} onChange={v => { haptic('light'); setTab(v) }} options={[
          { v: 'settings', l: t('w1g.tabSettings') }, { v: 'members', l: t('w1g.tabMembers') },
          { v: 'requests', l: t('w1g.tabRequests') }, { v: 'reports', l: t('w1g.tabReports') },
        ]} />
      </div>
      <div key={tab} className="cm-step-next">
        {tab === 'settings' && <SettingsTab spaceId={spaceId} onDeleted={onDeleted} />}
        {tab === 'members' && <MembersTab spaceId={spaceId} />}
        {tab === 'requests' && <RequestsTab spaceId={spaceId} />}
        {tab === 'reports' && <ReportsTab spaceId={spaceId} />}
      </div>
    </CmSheet>
  )
}

// ── Réglages ────────────────────────────────────────────────────────────────
function SettingsTab({ spaceId, onDeleted }: { spaceId: string; onDeleted?: () => void }) {
  const { t } = useI18n()
  const [s, setS] = useState<CommunitySettings | null>(null)
  const [words, setWords] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delErr, setDelErr] = useState<string | null>(null)

  useEffect(() => { void getSpaceSettings(spaceId).then(cfg => { if (cfg) { setS(cfg); setWords(cfg.blockedWords.join(', ')) } }) }, [spaceId])

  async function removeSpace() {
    if (deleting) return
    if (!confirmDel) { haptic('medium'); setConfirmDel(true); return }
    setDeleting(true); setDelErr(null)
    const ok = await deleteSpace(spaceId)
    setDeleting(false)
    if (ok) onDeleted?.()
    else setDelErr(t('w1g.deleteSpaceOwnerOnly'))
  }
  async function save() {
    if (!s) return
    setSaving(true); setDone(null)
    const next: CommunitySettings = { ...s, blockedWords: words.split(',').map(w => w.trim()).filter(Boolean) }
    const ok = await updateSpaceSettings(spaceId, next)
    setSaving(false); setDone(ok ? t('w1g.settingsSaved') : t('w1g.saveFailed'))
    if (ok) haptic('success')
  }

  if (!s) return <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>{[0, 1, 2, 3].map(i => <CmSkel key={i} h={70} r="var(--r-lg)" />)}</div>

  return (
    <div style={{ paddingBottom: 8 }}>
      <CmField label={t('w1g.spaceAccess')} hint={t('w1g.spaceAccessHint')}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['open', 'closed'] as const).map(p => (
            <CmChip key={p} active={s.joinPolicy === p} onClick={() => setS({ ...s, joinPolicy: p })}>{p === 'open' ? t('w1g.open') : t('w1g.closed')}</CmChip>
          ))}
        </div>
      </CmField>
      <CmField label={t('w1g.slowMode')} hint={t('w1g.slowModeHint')}>
        <CmUnitInput value={s.slowModeSec} unit="s" min={0} max={21600} onChange={v => setS({ ...s, slowModeSec: Number(v) || 0 })} />
      </CmField>
      <CmField label={t('w1g.maxCapacity')} hint={t('w1g.maxCapacityHint')}>
        <CmUnitInput value={s.maxMembers ?? ''} unit={t('cm.unitMembers')} min={1} placeholder={t('w1g.unlimited')} onChange={v => setS({ ...s, maxMembers: v ? Number(v) : null })} />
      </CmField>
      <CmField label={t('w1g.minAccountAge')} hint={t('w1g.minAccountAgeHint')}>
        <CmUnitInput value={s.minAccountAgeDays} unit={t('cm.unitDays')} min={0} max={3650} onChange={v => setS({ ...s, minAccountAgeDays: Number(v) || 0 })} />
      </CmField>
      <CmField label={t('w1g.blockedWords')} hint={t('w1g.blockedWordsHint')}>
        <input value={words} onChange={e => setWords(e.target.value)} placeholder={t('w1g.blockedWordsPlaceholder')} className="cm-input" />
      </CmField>
      <CmField label={t('w1g.spaceRules')} hint={t('w1g.spaceRulesHint')}>
        <textarea value={s.rulesText ?? ''} onChange={e => setS({ ...s, rulesText: e.target.value })} rows={4}
          placeholder={t('w1g.spaceRulesPlaceholder')} className="cm-input" style={{ resize: 'none', minHeight: 100 }} />
        <CmCard style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', minHeight: 56, boxSizing: 'border-box' }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 650, color: 'var(--text)', lineHeight: 1.35 }}>{t('w1g.requireRulesAccept')}</span>
          <CmSwitch on={s.requireRulesAccept} onChange={v => setS({ ...s, requireRulesAccept: v })} label={t('w1g.requireRulesAccept')} />
        </CmCard>
      </CmField>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {done && <CmToast text={done} onDone={() => setDone(null)} />}
        <CmPill variant="primary" full height={52} disabled={saving} onClick={() => void save()} style={{ fontSize: 16 }}>{saving ? t('w1g.saving') : t('w1g.saveSettings')}</CmPill>
      </div>

      {/* Zone danger — suppression du groupe (réservée au créateur via RLS) */}
      <CmField label={<span style={{ color: 'var(--danger)' }}>{t('w1g.dangerZone')}</span>} style={{ marginTop: 28 }}>
        <CmCard style={{ padding: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>{t('w1g.deleteSpaceHint')}</p>
          {delErr && <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>{delErr}</p>}
          <CmPill variant="danger" full disabled={deleting} onClick={() => void removeSpace()}>
            <Trash2 size={17} strokeWidth={2.2} />{deleting ? t('w1g.saving') : confirmDel ? t('cm.confirmDeleteSpace') : t('w1g.deleteSpace')}
          </CmPill>
        </CmCard>
      </CmField>
    </div>
  )
}

// ── Membres ─────────────────────────────────────────────────────────────────
function MembersTab({ spaceId }: { spaceId: string }) {
  const { t } = useI18n()
  const [members, setMembers] = useState<CommunityMemberInfo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; action: 'kick' | 'ban' } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const reload = () => { void listSpaceMembers(spaceId).then(setMembers) }
  useEffect(reload, [spaceId])

  async function act(userId: string, action: 'kick' | 'ban') {
    if (!confirm || confirm.id !== userId || confirm.action !== action) { haptic('medium'); setConfirm({ id: userId, action }); return }
    setBusy(userId); setErr(null); setConfirm(null)
    const r = await moderate(spaceId, action, { targetUserId: userId })
    setBusy(null)
    if (r.ok) { haptic('success'); reload() } else setErr(r.error ?? t('w1g.actionFailed'))
  }

  if (!members) return <ListSkeleton />
  if (members.length === 0) return <CmEmpty icon={<Users size={26} strokeWidth={2} />} title={t('w1g.mem.none')} />
  return (
    <div style={{ marginTop: 12 }}>
      {err && <p style={{ margin: '0 4px 10px', fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>{err}</p>}
      <CmCard style={{ overflow: 'hidden' }}>
        {members.map((m, i) => (
          <div key={m.userId} className="cm-in" style={{ ...stagger(i, 0, 22), display: 'flex', alignItems: 'center', gap: 12, minHeight: 62, padding: '10px 14px 10px 16px', borderTop: i ? '1px solid var(--border)' : 'none', fontFamily: FB }}>
            <CmAvatar name={m.name} url={m.avatar} seed={m.userId} size={38} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)' }}>{m.role === 'owner' ? t('w1g.roleOwner') : m.role === 'admin' ? t('w1g.roleAdmin') : m.role === 'coach' ? t('w1g.roleCoach') : t('w1g.roleMember')}</span>
            </span>
            {m.role !== 'owner' && (
              <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <MiniBtn tone="chip" disabled={busy === m.userId} onClick={() => void act(m.userId, 'kick')}>{confirm?.id === m.userId && confirm.action === 'kick' ? t('cm.confirmQ') : t('w1g.kick')}</MiniBtn>
                <MiniBtn tone="danger" disabled={busy === m.userId} onClick={() => void act(m.userId, 'ban')}>{confirm?.id === m.userId && confirm.action === 'ban' ? t('cm.confirmQ') : t('w1g.ban')}</MiniBtn>
              </span>
            )}
          </div>
        ))}
      </CmCard>
    </div>
  )
}

// ── Demandes d'adhésion ─────────────────────────────────────────────────────
function RequestsTab({ spaceId }: { spaceId: string }) {
  const { t } = useI18n()
  const [reqs, setReqs] = useState<JoinRequestInfo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const reload = () => { void listJoinRequests(spaceId).then(setReqs) }
  useEffect(reload, [spaceId])

  async function act(userId: string, action: 'approve_request' | 'reject_request') {
    setBusy(userId)
    await moderate(spaceId, action, { targetUserId: userId })
    haptic(action === 'approve_request' ? 'success' : 'light')
    setBusy(null); reload()
  }

  if (!reqs) return <ListSkeleton />
  if (reqs.length === 0) return <CmEmpty icon={<Inbox size={26} strokeWidth={2} />} title={t('w1g.noPendingRequests')} />
  return (
    <CmCard style={{ overflow: 'hidden', marginTop: 12 }}>
      {reqs.map((r, i) => (
        <div key={r.userId} className="cm-in" style={{ ...stagger(i, 0, 22), display: 'flex', alignItems: 'center', gap: 12, minHeight: 62, padding: '10px 14px 10px 16px', borderTop: i ? '1px solid var(--border)' : 'none', fontFamily: FB }}>
          <CmAvatar name={r.name} url={r.avatar} seed={r.userId} size={38} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <MiniBtn tone="primary" disabled={busy === r.userId} onClick={() => void act(r.userId, 'approve_request')}>{t('w1g.accept')}</MiniBtn>
          <MiniBtn tone="chip" disabled={busy === r.userId} onClick={() => void act(r.userId, 'reject_request')}>{t('w1g.reject')}</MiniBtn>
        </div>
      ))}
    </CmCard>
  )
}

// ── Signalements ────────────────────────────────────────────────────────────
function ReportsTab({ spaceId }: { spaceId: string }) {
  const { t } = useI18n()
  const [reports, setReports] = useState<ReportInfo[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const reload = () => { void listReports(spaceId).then(setReports) }
  useEffect(reload, [spaceId])

  async function resolve(id: string, status: 'resolved' | 'dismissed') {
    haptic('light')
    await resolveReport(id, status); reload()
  }
  async function del(r: ReportInfo) {
    if (!r.messageId) return
    if (confirmDel !== r.id) { haptic('medium'); setConfirmDel(r.id); return }
    setConfirmDel(null)
    await moderate(spaceId, 'delete_message', { messageId: r.messageId })
    await resolveReport(r.id, 'resolved'); haptic('success'); reload()
  }

  if (!reports) return <ListSkeleton />
  if (reports.length === 0) return <CmEmpty icon={<Flag size={26} strokeWidth={2} />} title={t('w1g.noPendingReports')} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      {reports.map((r, i) => (
        <CmCard key={r.id} className="cm-in" style={{ ...stagger(i), padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--danger-soft)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Flag size={16} strokeWidth={2.2} /></span>
            <p style={{ margin: 0, flex: 1, fontSize: 15, color: 'var(--text)', lineHeight: 1.45 }}>{r.reason}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {r.messageId && <MiniBtn tone="danger" onClick={() => void del(r)}>{confirmDel === r.id ? t('cm.confirmQ') : t('w1g.deleteMessage')}</MiniBtn>}
            <MiniBtn tone="chip" onClick={() => void resolve(r.id, 'resolved')}>{t('w1g.resolved')}</MiniBtn>
            <MiniBtn tone="ghost" onClick={() => void resolve(r.id, 'dismissed')}>{t('w1g.dismiss')}</MiniBtn>
          </div>
        </CmCard>
      ))}
    </div>
  )
}

// ── Bits ────────────────────────────────────────────────────────────────────
function MiniBtn({ children, onClick, tone, disabled }: { children: React.ReactNode; onClick: () => void; tone: 'primary' | 'chip' | 'danger' | 'ghost'; disabled?: boolean }) {
  const c = tone === 'primary' ? { background: 'var(--primary)', color: 'var(--on-primary)' }
    : tone === 'danger' ? { background: 'var(--danger-soft)', color: 'var(--danger)' }
      : tone === 'ghost' ? { background: 'transparent', color: 'var(--text-mid)' }
        : { background: 'var(--surface-chip)', color: 'var(--text)' }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="cm-btn cm-press"
      style={{ height: 36, padding: '0 13px', borderRadius: 'var(--r-pill)', fontFamily: FB, fontSize: 13.5, fontWeight: 750, whiteSpace: 'nowrap', flexShrink: 0, opacity: disabled ? 0.5 : 1, ...c }}>
      {children}
    </button>
  )
}
function ListSkeleton() {
  return (
    <CmCard style={{ padding: '6px 16px', marginTop: 12 }}>
      {[0, 1, 2, 3].map(i => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 0' }}><CmSkel h={38} w={38} r="50%" /><CmSkel h={14} w="45%" /></div>)}
    </CmCard>
  )
}
