'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// PAGE ATHLÈTES — le centre de commande du coach.
// KPIs · bandeau « à suivre en priorité » · recherche / filtres / tri /
// vue grille-liste · cartes riches (forme, charge 7j, adhérence, fatigue,
// blessure, prochaine course, non-lus) · groupes · note privée · actions
// rapides + actions groupées · invitations · mes coachs.
// Design : tokens + polices de l'app (Fraunces / Inter).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getRoster, setAthleteGroup, setAthleteNote, type RosterAthlete, type Forme } from '@/lib/coach/roster'
import { createInvite, acceptInvite, revokeLink, listPendingInvites, listMyCoaches, type CoachAthleteLink } from '@/lib/coach/relationships'
import { InviteCodeReveal } from '@/components/coach/CodeCells'

const DISP = 'var(--font-display)'
const BODY = 'var(--font-body)'
const STC: Record<Forme, string> = { ok: '#22C55E', warn: '#F59E0B', injured: '#EF4444', inactive: '#94A3B8' }
const STLABEL: Record<Forme, string> = { ok: 'En forme', warn: 'Attention', injured: 'Blessé', inactive: 'Inactif' }

const initials = (n: string) => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
function lastSeenTxt(days: number): string {
  if (!Number.isFinite(days)) return 'aucune activité'
  if (days <= 0) return "actif aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}
function Spark({ d, col }: { d: number[]; col: string }) {
  const w = 82, h = 24, mx = Math.max(...d, 1), step = w / (d.length - 1)
  const pts = d.map((v, i) => [i * step, h - 3 - (v / mx) * (h - 7)] as const)
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <path d={`${path} L${w} ${h} L0 ${h} Z`} fill={col} opacity={0.12} />
      <path d={path} fill="none" stroke={col} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.1} fill={col} />
    </svg>
  )
}
function Adh({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: Math.min(total, 6) }, (_, i) => (
        <i key={i} style={{ width: 6, height: 12, borderRadius: 2, background: i < done ? '#22C55E' : 'var(--border-mid)' }} />
      ))}
      <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 3 }}>{done}/{total}</span>
    </span>
  )
}

export default function CoachAthletes() {
  const router = useRouter()
  const [roster, setRoster] = useState<RosterAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<CoachAthleteLink[]>([])
  const [coaches, setCoaches] = useState<{ linkId: string; coachId: string; since: string | null }[]>([])

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | Forme>('all')
  const [group, setGroup] = useState<string>('__all')
  const [sort, setSort] = useState<'alert' | 'name' | 'recent' | 'load'>('alert')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [manage, setManage] = useState<RosterAthlete | null>(null)

  const [newCode, setNewCode] = useState<string | null>(null)
  const [acceptCode, setAcceptCode] = useState('')
  const [acceptMsg, setAcceptMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [r, p, c] = await Promise.all([getRoster(), listPendingInvites(), listMyCoaches()])
      setRoster(r); setPending(p); setCoaches(c)
    } catch { /* silencieux */ } finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  const groups = useMemo(() => Array.from(new Set(roster.map(a => a.group).filter((g): g is string => !!g))).sort(), [roster])
  const kpis = useMemo(() => ({
    total: roster.length,
    active: roster.filter(a => a.lastDays <= 7).length,
    alert: roster.filter(a => a.status !== 'ok').length,
    adh: (() => { const withPlan = roster.filter(a => a.adhTotal > 0); if (!withPlan.length) return null; return Math.round(withPlan.reduce((s, a) => s + a.adhDone / a.adhTotal, 0) / withPlan.length * 100) })(),
  }), [roster])

  const visible = useMemo(() => {
    let list = roster.filter(a => (filter === 'all' || a.status === filter) && (group === '__all' || a.group === group) && (!q || a.name.toLowerCase().includes(q.toLowerCase())))
    const w: Record<Forme, number> = { injured: 0, inactive: 1, warn: 2, ok: 3 }
    if (sort === 'name') list = [...list].sort((x, y) => x.name.localeCompare(y.name))
    else if (sort === 'recent') list = [...list].sort((x, y) => x.lastDays - y.lastDays)
    else if (sort === 'load') list = [...list].sort((x, y) => y.tss7 - x.tss7)
    else list = [...list].sort((x, y) => w[x.status] - w[y.status])
    return list
  }, [roster, filter, group, q, sort])

  const priority = useMemo(() => roster.filter(a => a.status !== 'ok').sort((x, y) => ({ injured: 0, inactive: 1, warn: 2, ok: 3 } as Record<Forme, number>)[x.status] - ({ injured: 0, inactive: 1, warn: 2, ok: 3 } as Record<Forme, number>)[y.status]), [roster])

  const toggleSel = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const onInvite = async () => { setBusy(true); try { const { code } = await createInvite(); setNewCode(code); await reload() } catch { /* */ } finally { setBusy(false) } }
  const onAccept = async () => { if (!acceptCode.trim() || busy) return; setBusy(true); setAcceptMsg(null); try { await acceptInvite(acceptCode); setAcceptCode(''); setAcceptMsg('Coach ajouté — il peut désormais te suivre.'); await reload() } catch (e) { setAcceptMsg(e instanceof Error ? e.message : 'Code invalide') } finally { setBusy(false) } }
  const onRevoke = async (linkId: string) => { if (!confirm('Confirmer ? Ce lien sera rompu.')) return; try { await revokeLink(linkId); await reload() } catch { /* */ } }
  const bulkGroup = async (name: string) => { const g = name.trim() || null; await Promise.all([...sel].map(id => { const a = roster.find(x => x.id === id); return a ? setAthleteGroup(a.linkId, g).catch(() => {}) : null })); setSel(new Set()); await reload() }

  // ── styles partagés ──
  const card: React.CSSProperties = { borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const lab: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '22px 0 10px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: BODY }
  const chip = (on: boolean): React.CSSProperties => ({ border: `1px solid ${on ? 'color-mix(in srgb, var(--primary) 40%, var(--border))' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--bg-card)', color: on ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: BODY })
  const field: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', borderRadius: 11, padding: '9px 11px', fontFamily: BODY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }

  const avatar = (a: { avatar: string | null; name: string; status: Forme }, size = 46) => (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, fontSize: size * 0.34, position: 'relative', fontFamily: DISP }}>
      {a.avatar
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : initials(a.name)}
      <span style={{ position: 'absolute', right: -1, bottom: -1, width: size * 0.3, height: size * 0.3, borderRadius: '50%', background: STC[a.status], border: '2.5px solid var(--bg-card)' }} />
    </span>
  )

  const tile = (v: React.ReactNode, l: string, accent = 'var(--text)') => (
    <div style={{ ...card, padding: '14px 16px', flex: 1, minWidth: 140 }}>
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 26, lineHeight: 1, color: accent, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, fontFamily: BODY }}>{l}</div>
    </div>
  )

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: BODY }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: DISP, fontWeight: 600, fontSize: 28, margin: 0, color: 'var(--text)' }}>Athlètes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '3px 0 0' }}>Ton roster, en un coup d’œil — repère qui a besoin de toi.</p>
        </div>
        <button onClick={onInvite} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 15px', borderRadius: 11, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY, flexShrink: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Inviter
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '20px 0' }}>
        {tile(loading ? '—' : kpis.total, 'athlète' + (kpis.total > 1 ? 's' : ''), 'var(--primary)')}
        {tile(loading ? '—' : kpis.active, 'actif' + (kpis.active > 1 ? 's' : '') + ' (7 j)')}
        {tile(loading ? '—' : kpis.alert, 'en alerte', kpis.alert > 0 ? '#F59E0B' : 'var(--text)')}
        {tile(loading ? '—' : kpis.adh === null ? '—' : `${kpis.adh}%`, 'adhérence moyenne')}
        {tile(loading ? '—' : pending.length, 'invitation' + (pending.length > 1 ? 's' : '') + ' en attente')}
      </div>

      {/* Barre d'outils */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 4 }}>
        <label style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 11, padding: '9px 12px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un athlète…" style={{ border: 'none', background: 'none', outline: 'none', color: 'var(--text)', fontFamily: BODY, fontSize: 14, width: '100%' }} />
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([['all', 'Tous'], ['ok', 'En forme'], ['warn', 'Attention'], ['injured', 'Blessé'], ['inactive', 'Inactif']] as [('all' | Forme), string][]).map(([f, l]) => (
            <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
              {f !== 'all' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: STC[f as Forme] }} />}{l}
            </button>
          ))}
        </div>
        {groups.length > 0 && (
          <select value={group} onChange={e => setGroup(e.target.value)} style={field}>
            <option value="__all">Tous les groupes</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={field}>
          <option value="alert">Trier : priorité</option>
          <option value="name">Nom (A→Z)</option>
          <option value="recent">Dernière activité</option>
          <option value="load">Charge de la semaine</option>
        </select>
        <div style={{ display: 'flex', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 11, padding: 3 }}>
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} aria-label={v} style={{ border: 'none', background: view === v ? 'var(--bg-card)' : 'none', color: view === v ? 'var(--primary)' : 'var(--text-dim)', borderRadius: 8, padding: '6px 9px', cursor: 'pointer', display: 'flex', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {v === 'grid'
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite', marginTop: 24 }}>Chargement du roster…</p>
      ) : roster.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '30px 20px', marginTop: 18 }}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '0 0 14px', lineHeight: 1.55 }}>Tu n’as pas encore d’athlète. Invite-en un : il reçoit un code, l’entre dans son appli, et tu le suis.</p>
          <button onClick={onInvite} disabled={busy} style={{ padding: '11px 20px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>Inviter mon premier athlète</button>
          {newCode && <div style={{ maxWidth: 420, margin: '0 auto' }}><InviteCodeReveal code={newCode} /></div>}
        </div>
      ) : (
        <>
          {/* À suivre en priorité */}
          {priority.length > 0 && (
            <>
              <div style={lab}>À suivre en priorité <span style={{ color: 'var(--text-mid)', background: 'var(--bg-alt)', borderRadius: 6, padding: '1px 7px' }}>{priority.length}</span></div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
                {priority.map(a => (
                  <Link key={a.id} href={`/coach/athlete/${a.id}`} style={{ flex: '0 0 264px', ...card, borderLeft: `3px solid ${STC[a.status]}`, padding: '12px 14px', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>{avatar(a, 34)}<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{a.name}</span></div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginTop: 9, lineHeight: 1.4 }}><b style={{ color: STC[a.status] }}>{STLABEL[a.status]}</b> — {a.reason}</div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Roster */}
          <div style={lab}>Tout le roster <span style={{ color: 'var(--text-mid)', background: 'var(--bg-alt)', borderRadius: 6, padding: '1px 7px' }}>{visible.length}</span></div>

          {view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {visible.map(a => {
                const on = sel.has(a.id)
                return (
                  <div key={a.id} style={{ ...card, padding: 15, position: 'relative', border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, boxShadow: on ? '0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <button onClick={() => toggleSel(a.id)} aria-label="Sélectionner" style={{ position: 'absolute', top: 13, right: 13, width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border-mid)'}`, background: on ? 'var(--primary)' : 'var(--bg-alt)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: on ? 'var(--on-primary)' : 'transparent' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </button>
                    <Link href={`/coach/athlete/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: 'inherit', paddingRight: 26 }}>
                      {avatar(a)}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>{[a.level, a.sports.slice(0, 2).join(', ')].filter(Boolean).join(' · ') || 'Athlète'}{a.group ? ` · ${a.group}` : ''}</div>
                      </div>
                      {a.unread > 0 && <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 9, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{a.unread}</span>}
                    </Link>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginTop: 13 }}>
                      <div><div style={{ fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Dernière activité</div><div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 1, color: 'var(--text)' }}>{lastSeenTxt(a.lastDays)}</div></div>
                      <div><div style={{ fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Charge · 7 j</div><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}><Spark d={a.load7} col={STC[a.status]} /><span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{a.tss7} TSS</span></div></div>
                      <div><div style={{ fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Adhérence</div><div style={{ marginTop: 3 }}><Adh done={a.adhDone} total={a.adhTotal} /></div></div>
                      <div><div style={{ fontSize: 10.5, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Fatigue · 7 j</div><div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 1, color: (a.fatigue ?? 0) >= 4 ? '#F59E0B' : 'var(--text)' }}>{a.fatigue ? `${a.fatigue.toFixed(1)}/5` : '—'}</div></div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: a.race ? 'var(--text-mid)' : 'var(--text-dim)' }}>
                      {a.race ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5"/></svg><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.race.name}</span><span style={{ fontWeight: 800, color: 'var(--primary)' }}>J-{a.race.days}</span></> : <span>Aucune course programmée</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      <button onClick={() => router.push(`/coach/athlete/${a.id}`)} style={qaBtn}>Fiche</button>
                      <button onClick={() => router.push('/coach/messages')} style={qaBtn}>✉︎ Message</button>
                      <button onClick={() => router.push(`/coach/athlete/${a.id}`)} style={qaBtn}>＋ Assigner</button>
                      <button onClick={() => setManage(a)} style={{ ...qaBtn, flex: '0 0 34px' }} aria-label="Plus">⋯</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.1fr 1fr auto', gap: 12, padding: '11px 16px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', fontWeight: 800 }}>
                <div>Athlète</div><div>Statut</div><div>Dernière act.</div><div>Charge 7 j</div><div>Adhérence</div><div />
              </div>
              {visible.map(a => (
                <div key={a.id} onClick={() => router.push(`/coach/athlete/${a.id}`)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.1fr 1fr auto', gap: 12, alignItems: 'center', padding: '11px 16px', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{avatar(a, 32)}<div><div style={{ fontWeight: 700, color: 'var(--text)' }}>{a.name}</div><div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{a.sports.slice(0, 2).join(', ') || '—'}</div></div></div>
                  <div><span style={{ fontSize: 11, fontWeight: 700, color: STC[a.status], border: `1px solid ${STC[a.status]}`, borderRadius: 6, padding: '2px 7px' }}>{STLABEL[a.status]}</span></div>
                  <div style={{ color: 'var(--text-mid)' }}>{lastSeenTxt(a.lastDays)}</div>
                  <div><Spark d={a.load7} col={STC[a.status]} /></div>
                  <div><Adh done={a.adhDone} total={a.adhTotal} /></div>
                  <div style={{ textAlign: 'right' }}>{a.unread > 0 && <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 9, padding: '2px 6px' }}>{a.unread}</span>}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Invitations ── */}
          <div style={{ ...card, marginTop: 22, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Inviter un athlète</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Génère un code à lui transmettre. Il l’entrera dans « Mes coachs ».</div>
              </div>
              <button onClick={onInvite} disabled={busy} style={{ padding: '10px 16px', borderRadius: 11, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>+ Nouveau code</button>
            </div>
            {newCode && <InviteCodeReveal code={newCode} />}
            {pending.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ ...lab, margin: '0 0 6px' }}>En attente d’acceptation</div>
                {pending.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.code}</span>
                    <button onClick={() => onRevoke(p.id)} style={{ marginLeft: 'auto', fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Annuler</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Mes coachs (côté athlète) ── */}
          <div style={{ ...card, marginTop: 14, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Un coach t’a invité ?</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 12px' }}>Entre son code pour l’autoriser à te suivre. Révocable à tout moment.</div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <input value={acceptCode} onChange={e => setAcceptCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void onAccept() }} placeholder="Code (ex. ABCD-2345)" style={{ flex: 1, minWidth: 160, padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }} />
              <button onClick={onAccept} disabled={busy || !acceptCode.trim()} style={{ padding: '11px 18px', borderRadius: 11, border: 'none', background: acceptCode.trim() ? 'var(--primary)' : 'var(--border)', color: acceptCode.trim() ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 13.5, fontWeight: 700, cursor: acceptCode.trim() ? 'pointer' : 'default', fontFamily: BODY }}>Accepter</button>
            </div>
            {acceptMsg && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-mid)' }}>{acceptMsg}</div>}
            {coaches.length > 0 && coaches.map(c => (
              <div key={c.linkId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Coach</span>
                <button onClick={() => onRevoke(c.linkId)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Révoquer</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Barre d'actions groupées ── */}
      {sel.size > 0 && (
        <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 50, background: 'var(--text)', color: 'var(--bg)', borderRadius: 14, padding: '10px 12px 10px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', flexWrap: 'wrap', maxWidth: 'calc(100vw - 24px)' }}>
          <span style={{ fontWeight: 800, fontSize: 13.5 }}>{sel.size} sélectionné{sel.size > 1 ? 's' : ''}</span>
          <button onClick={() => router.push('/coach/studio')} style={{ ...bulkBtn, background: 'var(--primary)', color: 'var(--on-primary)' }}>Lancer un système</button>
          <button onClick={() => { const g = prompt('Nom du groupe (vide pour retirer) :'); if (g !== null) void bulkGroup(g) }} style={bulkBtn}>🗂 Grouper</button>
          <button onClick={() => setSel(new Set())} style={{ ...bulkBtn, background: 'transparent' }}>Annuler</button>
        </div>
      )}

      {/* ── Gérer un athlète (groupe · note · retirer) ── */}
      {manage && (() => {
        const a = manage
        return (
          <div onClick={() => setManage(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(440px, 100%)', ...card, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>{avatar(a, 40)}<div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: DISP }}>{a.name}</div></div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', fontFamily: BODY }}>Groupe</label>
              <input list="coach-groups" defaultValue={a.group ?? ''} onBlur={async e => { await setAthleteGroup(a.linkId, e.target.value.trim() || null); await reload() }} placeholder="Ex. Triathlon, Débutants…" style={{ width: '100%', boxSizing: 'border-box', margin: '5px 0 14px', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13.5, fontFamily: BODY, outline: 'none' }} />
              <datalist id="coach-groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', fontFamily: BODY }}>Note privée</label>
              <textarea defaultValue={a.note ?? ''} onBlur={async e => { await setAthleteNote(a.linkId, e.target.value); await reload() }} rows={3} placeholder="Visible par toi seul (objectifs, contexte, rappels…)" style={{ width: '100%', boxSizing: 'border-box', margin: '5px 0 14px', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 13.5, fontFamily: BODY, outline: 'none', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button onClick={() => { setManage(null); void onRevoke(a.linkId) }} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: '#EF4444', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>Retirer l’athlète</button>
                <button onClick={() => setManage(null)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>Terminé</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

const qaBtn: React.CSSProperties = { flex: 1, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', borderRadius: 9, padding: '7px 0', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }
const bulkBtn: React.CSSProperties = { border: 'none', borderRadius: 9, background: 'color-mix(in srgb, var(--bg) 16%, transparent)', color: 'var(--bg)', fontWeight: 700, fontSize: 12.5, padding: '8px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }
