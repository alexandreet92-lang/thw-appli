'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// DASHBOARD COACH — page d'atterrissage du mode coach. Vue d'ensemble :
// nombre d'athlètes, invitations en attente, aperçu du roster, accès rapides.
// Les alertes santé (surmenage / blessé / inactif) arriveront avec l'extension
// RLS aux tables récup/blessures (phase suivante).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createInvite, listMyAthletes, listPendingInvites, type AthleteSummary, type CoachAthleteLink } from '@/lib/coach/relationships'

const BLUE = '#3B92D4'

function lastSeen(d: string | null): string {
  if (!d) return 'jamais vu'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400_000)
  if (days <= 0) return 'actif aujourd’hui'
  if (days === 1) return 'vu hier'
  if (days < 7) return `vu il y a ${days} j`
  return 'inactif > 7 j'
}

export default function CoachDashboard() {
  const [athletes, setAthletes] = useState<AthleteSummary[]>([])
  const [pending, setPending] = useState<CoachAthleteLink[]>([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try { const [a, p] = await Promise.all([listMyAthletes(), listPendingInvites()]); setAthletes(a); setPending(p) }
    catch { /* silencieux */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  const onInvite = async () => {
    setBusy(true)
    try { const { code } = await createInvite(); setNewCode(code); await reload() } catch { /* ignore */ } finally { setBusy(false) }
  }
  const copyCode = (c: string) => { void navigator.clipboard?.writeText(c); setCopied(true); setTimeout(() => setCopied(false), 1600) }

  const inactive = athletes.filter(a => {
    if (!a.last_seen_at) return true
    return Date.now() - new Date(a.last_seen_at).getTime() > 7 * 86400_000
  }).length

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const tile = (value: React.ReactNode, label: string, accent = 'var(--text)') => (
    <div style={{ ...card, flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontFamily: 'Syne,DM Sans,sans-serif', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 5, fontFamily: 'DM Sans,sans-serif' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 16px 60px', fontFamily: 'DM Sans,sans-serif' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${BLUE} 14%, transparent)`, color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        </span>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'Syne,DM Sans,sans-serif' }}>Dashboard coach</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>Ton roster en un coup d’œil.</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        {tile(loading ? '—' : athletes.length, 'athlète' + (athletes.length > 1 ? 's' : ''), BLUE)}
        {tile(loading ? '—' : pending.length, 'invitation' + (pending.length > 1 ? 's' : '') + ' en attente')}
        {tile(loading ? '—' : inactive, 'inactif' + (inactive > 1 ? 's' : '') + ' (>7 j)', inactive > 0 ? '#F59E0B' : 'var(--text)')}
      </div>

      {/* Alertes — placeholder tant que la RLS récup/blessures n'est pas étendue */}
      <div style={{ ...card, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
        </span>
        <div style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>
          <b style={{ color: 'var(--text)' }}>Alertes santé</b> — bientôt : repère d’un coup d’œil qui surmène, est blessé ou décroche. (Nécessite l’ouverture des données récup/blessures aux coachs, en cours.)
        </div>
      </div>

      {/* Roster + accès rapides */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 10px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Mes athlètes</span>
        <Link href="/coach/athletes" style={{ fontSize: 12.5, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>Gérer →</Link>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>Chargement…</p>
      ) : athletes.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '26px 18px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '0 0 14px', lineHeight: 1.55 }}>Tu n’as pas encore d’athlète. Invite-en un : il reçoit un code, l’entre dans son appli, et tu le suis.</p>
          <button onClick={onInvite} disabled={busy} style={{ padding: '11px 20px', borderRadius: 12, border: 'none', background: BLUE, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Inviter mon premier athlète</button>
          {newCode && (
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: `color-mix(in srgb, ${BLUE} 7%, var(--bg-alt))`, border: `1px solid color-mix(in srgb, ${BLUE} 25%, var(--border))` }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 800, letterSpacing: '0.12em', color: BLUE }}>{newCode}</span>
              <button onClick={() => copyCode(newCode)} style={{ padding: '6px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{copied ? 'Copié ✓' : 'Copier'}</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {athletes.slice(0, 6).map(a => (
            <div key={a.linkId} style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.first_name || a.full_name || '?').slice(0, 1).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name || a.first_name || 'Athlète'}</div>
                <div style={{ fontSize: 11.5, color: (!a.last_seen_at || Date.now() - new Date(a.last_seen_at).getTime() > 7 * 86400_000) ? '#F59E0B' : 'var(--text-dim)' }}>{lastSeen(a.last_seen_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
