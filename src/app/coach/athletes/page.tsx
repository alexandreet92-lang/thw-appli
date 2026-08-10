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
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [manage, setManage] = useState<RosterAthlete | null>(null)

  const [newCode, setNewCode] = useState<string | null>(null)
  const [acceptCode, setAcceptCode] = useState('')
  const [acceptMsg, setAcceptMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    // Sur l'app native, un token en cours de refresh peut faire échouer une
    // requête au montage → on retente une fois avant d'abandonner, et on NE
    // remplace JAMAIS le roster par du vide sur erreur (sinon les athlètes
    // « disparaissent »). On garde la liste précédente.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const [r, p, c] = await Promise.all([getRoster(), listPendingInvites(), listMyCoaches()])
        setRoster(r); setPending(p); setCoaches(c)
        setLoading(false)
        return
      } catch {
        if (attempt === 0) { await new Promise(res => setTimeout(res, 600)); continue }
      }
    }
    setLoading(false)
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
      <div>
        <h1 style={{ fontFamily: DISP, fontWeight: 600, fontSize: 28, margin: 0, color: 'var(--text)' }}>Athlètes</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '3px 0 0' }}>Ton roster, en un coup d’œil — repère qui a besoin de toi.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '20px 0' }}>
        {tile(loading ? '—' : kpis.total, 'athlète' + (kpis.total > 1 ? 's' : ''), 'var(--primary)')}
        {tile(loading ? '—' : kpis.active, 'actif' + (kpis.active > 1 ? 's' : '') + ' (7 j)')}
        {tile(loading ? '—' : kpis.alert, 'en alerte', kpis.alert > 0 ? '#F59E0B' : 'var(--text)')}
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

          {/* Vue en ligne unique — un athlète = une ligne, lisible d'un coup d'œil */}
          <div style={{ ...card, overflowX: 'auto' }}>
            <div style={{ minWidth: 860 }}>
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '11px 16px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', fontWeight: 800 }}>
                <div /><div>Athlète</div><div>Statut</div><div>Dernière act.</div><div>Charge · 7 j</div><div>Séances</div><div>Fatigue</div><div>Prochaine course</div><div>Blessures</div><div />
              </div>
              {visible.map(a => (
                <div key={a.id} onClick={() => router.push(`/coach/athlete/${a.id}`)} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  {/* Sélection (bulk : Lancer un système, Grouper) */}
                  <button onClick={e => { e.stopPropagation(); toggleSel(a.id) }} aria-label="Sélectionner" style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${sel.has(a.id) ? 'var(--primary)' : 'var(--border-mid)'}`, background: sel.has(a.id) ? 'var(--primary)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel.has(a.id) ? 'var(--on-primary)' : 'transparent', padding: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                  {/* Athlète */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {avatar(a, 34)}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        {a.unread > 0 && <span style={{ background: '#EF4444', color: '#fff', fontSize: 9.5, fontWeight: 800, borderRadius: 9, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>{a.unread}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.sports.slice(0, 2).join(', ') || '—'}{a.group ? ` · ${a.group}` : ''}</div>
                    </div>
                  </div>
                  {/* Statut */}
                  <div><span style={{ fontSize: 11, fontWeight: 700, color: STC[a.status], border: `1px solid ${STC[a.status]}`, borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>{STLABEL[a.status]}</span></div>
                  {/* Dernière activité */}
                  <div style={{ color: 'var(--text-mid)', ...NUM }}>{lastSeenTxt(a.lastDays)}</div>
                  {/* Charge 7 j */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Spark d={a.load7} col={STC[a.status]} /><span style={{ ...NUM, fontSize: 12, color: 'var(--text-dim)' }}>{a.tss7}</span></div>
                  {/* Séances faites / planifiées */}
                  <div style={{ ...NUM, fontWeight: 700, color: 'var(--text)' }}>{a.adhTotal > 0 ? <>{a.adhDone}<span style={{ color: 'var(--text-dim)', fontWeight: 600 }}> / {a.adhTotal}</span></> : <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>—</span>}</div>
                  {/* Fatigue moyenne */}
                  <div style={{ ...NUM, fontWeight: 700, color: (a.fatigue ?? 0) >= 4 ? '#F59E0B' : 'var(--text)' }}>{a.fatigue ? `${a.fatigue.toFixed(1)}/5` : '—'}</div>
                  {/* Prochaine course */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, color: a.race ? 'var(--text-mid)' : 'var(--text-dim)' }}>
                    {a.race ? <><span style={{ ...NUM, fontWeight: 800, color: a.race.days <= 14 ? '#ef4444' : 'var(--primary)', flexShrink: 0 }}>J-{a.race.days}</span><span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.race.name}</span></> : <span style={{ fontSize: 12 }}>—</span>}
                  </div>
                  {/* Blessures actives */}
                  <div style={{ ...NUM, fontWeight: 700, color: a.activeInjuries > 0 ? '#ef4444' : 'var(--text-dim)' }}>{a.activeInjuries > 0 ? a.activeInjuries : '—'}</div>
                  {/* Gérer */}
                  <button onClick={e => { e.stopPropagation(); setManage(a) }} aria-label="Gérer" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = 'var(--bg-alt)' }} onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Invitations — une seule carte, deux volets ── */}
          <div style={{ ...card, marginTop: 22, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {/* Volet 1 : inviter un athlète */}
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'color-mix(in srgb, var(--primary) 13%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
                </span>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', fontFamily: DISP }}>Inviter un athlète</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 12 }}>Génère un code et transmets-le à ton athlète : il l’entre dans « Mon coach » et tu le suis aussitôt.</div>
              <button onClick={onInvite} disabled={busy} style={{ width: '100%', padding: '11px 16px', borderRadius: 11, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Générer un code d’invitation
              </button>
              {newCode && <div style={{ marginTop: 12 }}><InviteCodeReveal code={newCode} /></div>}
              {pending.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ ...lab, margin: '0 0 4px' }}>En attente d’acceptation</div>
                  {pending.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{ ...NUM, fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.06em' }}>{p.code}</span>
                      <button onClick={() => onRevoke(p.id)} style={{ marginLeft: 'auto', fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Annuler</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Volet 2 : rejoindre un coach (côté athlète) — séparé par un filet */}
            <div style={{ padding: 18, borderLeft: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-card2)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                </span>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', fontFamily: DISP }}>Un coach t’a invité ?</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 12 }}>Entre son code pour l’autoriser à te suivre. Révocable à tout moment.</div>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <input value={acceptCode} onChange={e => setAcceptCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void onAccept() }} placeholder="Code (ex. ABCD-2345)" style={{ flex: 1, minWidth: 130, padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }} />
                <button onClick={onAccept} disabled={busy || !acceptCode.trim()} style={{ padding: '11px 18px', borderRadius: 11, border: 'none', background: acceptCode.trim() ? 'var(--primary)' : 'var(--bg-card2)', color: acceptCode.trim() ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 13.5, fontWeight: 700, cursor: acceptCode.trim() ? 'pointer' : 'default', fontFamily: BODY }}>Accepter</button>
              </div>
              {acceptMsg && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-mid)' }}>{acceptMsg}</div>}
              {coaches.length > 0 && coaches.map(c => (
                <div key={c.linkId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Coach lié</span>
                  <button onClick={() => onRevoke(c.linkId)} style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Révoquer</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Barre d'actions groupées ── */}
      {sel.size > 0 && (
        <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 50, background: 'var(--text)', color: 'var(--bg)', borderRadius: 14, padding: '10px 12px 10px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', flexWrap: 'wrap', maxWidth: 'calc(100vw - 24px)' }}>
          <span style={{ fontWeight: 800, fontSize: 13.5 }}>{sel.size} sélectionné{sel.size > 1 ? 's' : ''}</span>
          <button onClick={() => router.push(`/coach/studio?athletes=${[...sel].join(',')}`)} style={{ ...bulkBtn, background: 'var(--primary)', color: 'var(--on-primary)' }}>Lancer un système</button>
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

// Colonnes de la vue en ligne (une seule vue) + chiffres tabulaires.
const COLS = '26px minmax(190px,1.8fr) 92px 100px 116px 74px 70px minmax(120px,1.15fr) 74px 34px'
const NUM: React.CSSProperties = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }
const bulkBtn: React.CSSProperties = { border: 'none', borderRadius: 9, background: 'color-mix(in srgb, var(--bg) 16%, transparent)', color: 'var(--bg)', fontWeight: 700, fontSize: 12.5, padding: '8px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }
