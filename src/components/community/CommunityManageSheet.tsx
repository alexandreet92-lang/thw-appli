'use client'
// ══════════════════════════════════════════════════════════════════════════
// Panneau « Gérer l'espace » (owner/admin) : réglages de sécurité, modération des
// membres (exclure / bannir), et traitement des signalements. Inspiré des
// Server Settings de Discord, sobre (Design System).
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { listSpaceMembers } from '@/lib/community/spaces'
import {
  getSpaceSettings, updateSpaceSettings, moderate, listReports, resolveReport,
  type CommunitySettings, type ReportInfo,
} from '@/lib/community/moderation'
import { listJoinRequests, type JoinRequestInfo } from '@/lib/community/discover'
import type { CommunityMemberInfo } from '@/types/community'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
type Tab = 'settings' | 'members' | 'requests' | 'reports'

export function CommunityManageSheet({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('settings')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!mounted) return null

  const sheet = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(2px)', zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderTopLeftRadius: 'var(--r-lg)', borderTopRightRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)', animation: 'scale-in 0.22s ease' }}>
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-5) 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border-mid)', margin: '0 auto var(--space-4)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: 0, flex: 1 }}>Gérer l&apos;espace</h2>
            <button onClick={onClose} aria-label="Fermer" style={{ width: 28, height: 28, border: 'none', borderRadius: '50%', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            {([['settings', 'Réglages'], ['members', 'Membres'], ['requests', 'Demandes'], ['reports', 'Signalements']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ flex: 1, height: 34, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 600, background: tab === k ? 'var(--surface-neutral)' : 'transparent', color: tab === k ? 'var(--text)' : 'var(--text-mid)' }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-4) var(--space-5) var(--space-8)' }}>
          {tab === 'settings' && <SettingsTab spaceId={spaceId} />}
          {tab === 'members' && <MembersTab spaceId={spaceId} />}
          {tab === 'requests' && <RequestsTab spaceId={spaceId} />}
          {tab === 'reports' && <ReportsTab spaceId={spaceId} />}
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}

// ── Réglages ────────────────────────────────────────────────────────────────
function SettingsTab({ spaceId }: { spaceId: string }) {
  const [s, setS] = useState<CommunitySettings | null>(null)
  const [words, setWords] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => { void getSpaceSettings(spaceId).then(cfg => { if (cfg) { setS(cfg); setWords(cfg.blockedWords.join(', ')) } }) }, [spaceId])
  if (!s) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Chargement…</p>

  async function save() {
    if (!s) return
    setSaving(true); setDone(null)
    const next: CommunitySettings = { ...s, blockedWords: words.split(',').map(w => w.trim()).filter(Boolean) }
    const ok = await updateSpaceSettings(spaceId, next)
    setSaving(false); setDone(ok ? 'Réglages enregistrés.' : 'Enregistrement impossible.')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Field label="Accès à l'espace" hint="« Fermé » empêche toute nouvelle inscription spontanée (seule la modération ajoute des membres).">
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['open', 'closed'] as const).map(p => (
            <button key={p} type="button" onClick={() => setS({ ...s, joinPolicy: p })}
              style={pill(s.joinPolicy === p)}>{p === 'open' ? 'Ouvert' : 'Fermé'}</button>
          ))}
        </div>
      </Field>
      <Field label="Mode lent (secondes entre deux messages)" hint="0 = désactivé. La modération n'y est pas soumise.">
        <input type="number" min={0} max={21600} value={s.slowModeSec}
          onChange={e => setS({ ...s, slowModeSec: Number(e.target.value) || 0 })} style={input} />
      </Field>
      <Field label="Capacité maximale (membres)" hint="Vide = illimité. Bloque les inscriptions au-delà.">
        <input type="number" min={1} value={s.maxMembers ?? ''} placeholder="illimité"
          onChange={e => setS({ ...s, maxMembers: e.target.value ? Number(e.target.value) : null })} style={input} />
      </Field>
      <Field label="Ancienneté de compte minimale (jours)" hint="Anti-raid. 0 = aucune condition.">
        <input type="number" min={0} max={3650} value={s.minAccountAgeDays}
          onChange={e => setS({ ...s, minAccountAgeDays: Number(e.target.value) || 0 })} style={input} />
      </Field>
      <Field label="Mots interdits (séparés par des virgules)" hint="Un message contenant l'un de ces termes est refusé (modération exemptée).">
        <input value={words} onChange={e => setWords(e.target.value)} placeholder="spam, pub, …" style={input} />
      </Field>
      <Field label="Règles de l'espace" hint="Affichées aux membres ; l'acceptation peut être exigée avant de participer.">
        <textarea value={s.rulesText ?? ''} onChange={e => setS({ ...s, rulesText: e.target.value })} rows={3}
          placeholder="1. Respect… 2. Pas de spam… 3. Pas de contenu dangereux…"
          style={{ ...input, resize: 'vertical', minHeight: 64 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', cursor: 'pointer' }}>
          <input type="checkbox" checked={s.requireRulesAccept} onChange={e => setS({ ...s, requireRulesAccept: e.target.checked })} />
          Exiger l&apos;acceptation des règles avant de publier
        </label>
      </Field>
      {done && <p style={{ margin: 0, fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)' }}>{done}</p>}
      <button onClick={() => void save()} disabled={saving}
        style={{ height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
      </button>
    </div>
  )
}

// ── Membres ─────────────────────────────────────────────────────────────────
function MembersTab({ spaceId }: { spaceId: string }) {
  const [members, setMembers] = useState<CommunityMemberInfo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const reload = () => { void listSpaceMembers(spaceId).then(setMembers) }
  useEffect(reload, [spaceId])

  async function act(userId: string, action: 'kick' | 'ban') {
    if (typeof window !== 'undefined' && !window.confirm(action === 'ban' ? 'Bannir ce membre ?' : 'Exclure ce membre ?')) return
    setBusy(userId); setErr(null)
    const r = await moderate(spaceId, action, { targetUserId: userId })
    setBusy(null)
    if (r.ok) reload(); else setErr(r.error ?? 'Action impossible.')
  }

  if (!members) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Chargement…</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {err && <p style={{ margin: 0, fontFamily: FB, fontSize: 12.5, color: 'var(--danger)' }}>{err}</p>}
      {members.map(m => (
        <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)' }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-neutral)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontFamily: FB, fontWeight: 600, fontSize: 13 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {m.avatar ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.name.slice(0, 1).toUpperCase()}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
            <span style={{ display: 'block', fontFamily: FB, fontSize: 11, color: 'var(--text-dim)' }}>{m.role === 'owner' ? 'Propriétaire' : m.role === 'admin' ? 'Admin' : m.role === 'coach' ? 'Coach' : 'Membre'}</span>
          </span>
          {m.role !== 'owner' && (
            <>
              <button onClick={() => void act(m.userId, 'kick')} disabled={busy === m.userId}
                style={miniBtn('var(--surface-neutral)', 'var(--text-mid)')}>Exclure</button>
              <button onClick={() => void act(m.userId, 'ban')} disabled={busy === m.userId}
                style={miniBtn('var(--danger-soft)', 'var(--danger)')}>Bannir</button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Demandes d'adhésion ─────────────────────────────────────────────────────
function RequestsTab({ spaceId }: { spaceId: string }) {
  const [reqs, setReqs] = useState<JoinRequestInfo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const reload = () => { void listJoinRequests(spaceId).then(setReqs) }
  useEffect(reload, [spaceId])

  async function act(userId: string, action: 'approve_request' | 'reject_request') {
    setBusy(userId)
    await moderate(spaceId, action, { targetUserId: userId })
    setBusy(null); reload()
  }

  if (!reqs) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Chargement…</p>
  if (reqs.length === 0) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Aucune demande en attente.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {reqs.map(r => (
        <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)' }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-neutral)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontFamily: FB, fontWeight: 600, fontSize: 13 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.avatar ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.name.slice(0, 1).toUpperCase()}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <button onClick={() => void act(r.userId, 'approve_request')} disabled={busy === r.userId} style={miniBtn('var(--primary)', 'var(--on-primary)')}>Accepter</button>
          <button onClick={() => void act(r.userId, 'reject_request')} disabled={busy === r.userId} style={miniBtn('var(--surface-neutral)', 'var(--text-mid)')}>Refuser</button>
        </div>
      ))}
    </div>
  )
}

// ── Signalements ────────────────────────────────────────────────────────────
function ReportsTab({ spaceId }: { spaceId: string }) {
  const [reports, setReports] = useState<ReportInfo[] | null>(null)
  const reload = () => { void listReports(spaceId).then(setReports) }
  useEffect(reload, [spaceId])

  async function resolve(id: string, status: 'resolved' | 'dismissed') {
    await resolveReport(id, status); reload()
  }

  async function del(r: ReportInfo) {
    if (!r.messageId) return
    if (typeof window !== 'undefined' && !window.confirm('Supprimer le message signalé ?')) return
    await moderate(spaceId, 'delete_message', { messageId: r.messageId })
    await resolveReport(r.id, 'resolved'); reload()
  }

  if (!reports) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Chargement…</p>
  if (reports.length === 0) return <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)' }}>Aucun signalement en attente.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {reports.map(r => (
        <div key={r.id} style={{ padding: 'var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)' }}>
          <p style={{ margin: '0 0 var(--space-2)', fontFamily: FB, fontSize: 13, color: 'var(--text)' }}>{r.reason}</p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {r.messageId && <button onClick={() => void del(r)} style={miniBtn('var(--danger-soft)', 'var(--danger)')}>Supprimer le message</button>}
            <button onClick={() => void resolve(r.id, 'resolved')} style={miniBtn('var(--surface-neutral)', 'var(--text)')}>Traité</button>
            <button onClick={() => void resolve(r.id, 'dismissed')} style={miniBtn('transparent', 'var(--text-mid)')}>Ignorer</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Bits ────────────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: FB, fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <p style={{ margin: '4px 0 0', fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  )
}
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 40, background: 'var(--input-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', padding: '0 var(--space-3)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', outline: 'none',
}
function pill(active: boolean): React.CSSProperties {
  return { flex: 1, height: 36, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: FB, fontSize: 12.5, fontWeight: 600, background: active ? 'var(--primary-dim)' : 'var(--surface-neutral)', color: active ? 'var(--primary)' : 'var(--text-mid)' }
}
function miniBtn(bg: string, fg: string): React.CSSProperties {
  return { height: 30, padding: '0 var(--space-3)', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: FB, fontSize: 12, fontWeight: 600, background: bg, color: fg }
}
