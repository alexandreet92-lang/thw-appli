'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// ESPACE COACH — Phase 1 : entrée de la seconde interface.
// Le coach invite ses athlètes (code), l'athlète accepte (consentement),
// et le coach voit son roster. Côté athlète : « Mes coachs » (accepter /
// révoquer). Les fiches 360° et le pilotage arrivent en phase 2.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  createInvite, acceptInvite, revokeLink,
  listMyAthletes, listPendingInvites, listMyCoaches,
  type AthleteSummary, type CoachAthleteLink,
} from '@/lib/coach/relationships'

const BLUE = '#3B92D4'

function since(d: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' }
}
function lastSeen(d: string | null): string {
  if (!d) return 'jamais vu'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400_000)
  if (days <= 0) return 'actif aujourd’hui'
  if (days === 1) return 'vu hier'
  if (days < 7) return `vu il y a ${days} j`
  return `vu le ${since(d)}`
}

export default function CoachAthletes() {
  const router = useRouter()
  const [athletes, setAthletes] = useState<AthleteSummary[]>([])
  const [pending, setPending] = useState<CoachAthleteLink[]>([])
  const [coaches, setCoaches] = useState<{ linkId: string; coachId: string; since: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [acceptCode, setAcceptCode] = useState('')
  const [acceptMsg, setAcceptMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [a, p, c] = await Promise.all([listMyAthletes(), listPendingInvites(), listMyCoaches()])
      setAthletes(a); setPending(p); setCoaches(c)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Chargement impossible') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  const onCreateInvite = async () => {
    setBusy(true); setErr(null)
    try { const { code } = await createInvite(); setNewCode(code); await reload() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Création impossible') }
    finally { setBusy(false) }
  }
  const onAccept = async () => {
    if (!acceptCode.trim() || busy) return
    setBusy(true); setAcceptMsg(null); setErr(null)
    try { await acceptInvite(acceptCode); setAcceptCode(''); setAcceptMsg('Coach ajouté — il peut désormais te suivre.'); await reload() }
    catch (e) { setAcceptMsg(e instanceof Error ? e.message : 'Code invalide') }
    finally { setBusy(false) }
  }
  const onRevoke = async (linkId: string) => {
    if (!confirm('Confirmer ? Ce lien sera rompu.')) return
    try { await revokeLink(linkId); await reload() } catch { setErr('Action impossible') }
  }
  const copyCode = (code: string) => { void navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600) }

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '18px 16px 60px', fontFamily: 'DM Sans,sans-serif' }}>
      {/* En-tête de l'espace coach */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${BLUE} 14%, transparent)`, color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'Syne,DM Sans,sans-serif' }}>Athlètes</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>Ton roster et tes invitations.</p>
        </div>
        <button onClick={() => router.push('/coach')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          Dashboard
        </button>
      </div>

      {err && <div style={{ margin: '12px 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12.5 }}>{err}</div>}

      {/* ── Mes athlètes ── */}
      <div style={{ ...label, margin: '22px 0 10px' }}>Mes athlètes</div>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>Chargement…</p>
      ) : athletes.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '26px 18px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '0 0 14px', lineHeight: 1.55 }}>Tu n’as pas encore d’athlète. Invite-en un : il reçoit un code, l’entre dans son appli, et tu pourras le suivre.</p>
          <button onClick={onCreateInvite} disabled={busy}
            style={{ padding: '11px 20px', borderRadius: 12, border: 'none', background: BLUE, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Inviter mon premier athlète
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {athletes.map(a => (
            <div key={a.linkId} style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.first_name || a.full_name || '?').slice(0, 1).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name || a.first_name || 'Athlète'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{lastSeen(a.last_seen_at)}</div>
              </div>
              <button onClick={() => onRevoke(a.linkId)} title="Retirer" aria-label="Retirer cet athlète"
                style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Inviter / invitations en attente ── */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Inviter un athlète</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Génère un code à lui transmettre. Il l’entrera dans « Mes coachs ».</div>
          </div>
          <button onClick={onCreateInvite} disabled={busy}
            style={{ padding: '10px 16px', borderRadius: 11, border: 'none', background: BLUE, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            + Nouveau code
          </button>
        </div>
        {newCode && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: `color-mix(in srgb, ${BLUE} 7%, var(--bg-alt))`, border: `1px solid color-mix(in srgb, ${BLUE} 25%, var(--border))` }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 20, fontWeight: 800, letterSpacing: '0.12em', color: BLUE }}>{newCode}</span>
            <button onClick={() => copyCode(newCode)} style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
        )}
        {pending.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ ...label, marginBottom: 6 }}>En attente d’acceptation</div>
            {pending.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.code}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>créé le {since(p.created_at)}</span>
                <button onClick={() => onRevoke(p.id)} style={{ marginLeft: 'auto', fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Annuler</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mes coachs (côté athlète) ── */}
      <div style={{ ...label, margin: '28px 0 10px' }}>Mes coachs</div>
      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Un coach t’a invité ?</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 12px' }}>Entre son code pour l’autoriser à suivre tes données. Tu peux révoquer à tout moment.</div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <input value={acceptCode} onChange={e => setAcceptCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void onAccept() }}
            placeholder="Code (ex. ABCD-2345)" style={{ flex: 1, minWidth: 160, padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em' }} />
          <button onClick={onAccept} disabled={busy || !acceptCode.trim()}
            style={{ padding: '11px 18px', borderRadius: 11, border: 'none', background: acceptCode.trim() ? BLUE : 'var(--border)', color: acceptCode.trim() ? '#fff' : 'var(--text-dim)', fontSize: 13.5, fontWeight: 700, cursor: acceptCode.trim() ? 'pointer' : 'default' }}>
            Accepter
          </button>
        </div>
        {acceptMsg && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-mid)' }}>{acceptMsg}</div>}
        {coaches.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ ...label, marginBottom: 6 }}>Coachs actifs</div>
            {coaches.map(c => (
              <div key={c.linkId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: `color-mix(in srgb, ${BLUE} 14%, transparent)`, color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Coach</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>depuis le {since(c.since)}</div>
                </div>
                <button onClick={() => onRevoke(c.linkId)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Révoquer</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
