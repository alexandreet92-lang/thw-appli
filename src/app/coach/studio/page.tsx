'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// STUDIO COACH — fais tourner UN de tes systèmes Studio sur les données de
// PLUSIEURS athlètes (1 système → N athlètes). Un rendu par athlète.
// Les systèmes se construisent dans ton Studio (côté « mon appli »).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { listSystems, type StudioSystemRow } from '@/lib/studio/store'
import { listMyAthletes, type AthleteSummary } from '@/lib/coach/relationships'
import StudioMarkdown from '@/components/studio/StudioMarkdown'

interface RunResult { athleteId: string; name: string; status: 'done' | 'error'; renders: { title: string; text: string }[]; error?: string }

export default function CoachStudio() {
  const [systems, setSystems] = useState<StudioSystemRow[]>([])
  const [athletes, setAthletes] = useState<AthleteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [systemId, setSystemId] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [results, setResults] = useState<RunResult[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [sysAll, ath] = await Promise.all([listSystems().catch(() => []), listMyAthletes().catch(() => [])])
      if (cancelled) return
      // On ne lance sur des athlètes que les systèmes marqués « coach ».
      const sys = sysAll.filter(s => s.scope === 'coach')
      setSystems(sys); setAthletes(ath)
      if (sys.length) setSystemId(sys[0].id)
      // Pré-sélection venant de « Lancer un système » (page Athlètes) : ?athletes=id1,id2
      const preset = (searchParams.get('athletes') ?? '').split(',').map(s => s.trim()).filter(Boolean)
      const valid = new Set(ath.map(a => a.id))
      const presetValid = preset.filter(id => valid.has(id))
      setSelected(new Set(presetValid.length ? presetValid : ath.map(a => a.id)))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [searchParams])

  // Système lié à un athlète précis → on cible cet athlète (verrouillé sur lui).
  const linkedAthleteId = systems.find(s => s.id === systemId)?.athlete_id ?? null
  useEffect(() => {
    if (linkedAthleteId) setSelected(new Set([linkedAthleteId]))
  }, [linkedAthleteId])

  const toggle = (id: string) => {
    if (linkedAthleteId) return   // sélection verrouillée sur l'athlète lié
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const run = async () => {
    if (!systemId || selected.size === 0 || running) return
    setRunning(true); setErr(null); setResults(null)
    try {
      const res = await fetch('/api/coach/studio-run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemId, athleteIds: [...selected] }) })
      const data = await res.json()
      if (!res.ok) { setErr(data?.error || 'Le run a échoué.'); return }
      setResults(data.results as RunResult[])
      setOpenId((data.results as RunResult[])[0]?.athleteId ?? null)
    } catch { setErr('Le run a échoué — réessaie.') }
    finally { setRunning(false) }
  }

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const secLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px' }

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>Studio coach</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px' }}>Fais tourner un de tes systèmes sur les données de tes athlètes — un rendu par athlète.</p>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>Chargement…</p>
      ) : systems.length === 0 ? (
        <div style={{ ...card }}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.6 }}>Tu n’as pas encore de système. Construis-en un dans ton Studio (bouton IA → Studio, côté « mon appli »), puis reviens ici pour le lancer sur tes athlètes.</p>
        </div>
      ) : athletes.length === 0 ? (
        <div style={{ ...card }}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0 }}>Aucun athlète. Invite-en depuis <Link href="/coach/athletes" style={{ color: 'var(--primary)', fontWeight: 700 }}>Athlètes</Link>.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Choix du système */}
          <div style={{ ...card }}>
            <div style={secLabel}>Système à lancer</div>
            <select value={systemId} onChange={e => setSystemId(e.target.value)}
              style={{ width: '100%', maxWidth: 420, padding: '10px 12px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
              {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Choix des athlètes */}
          <div style={{ ...card }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={secLabel}>Athlètes ({selected.size}/{athletes.length})</span>
              <button onClick={() => setSelected(selected.size === athletes.length ? new Set() : new Set(athletes.map(a => a.id)))}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {selected.size === athletes.length ? 'Tout décocher' : 'Tout cocher'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {athletes.map(a => {
                const on = selected.has(a.id)
                return (
                  <button key={a.id} onClick={() => toggle(a.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 11, border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--bg-alt)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border-mid)'}`, background: on ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name || a.first_name || 'Athlète'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12.5 }}>{err}</div>}

          <button onClick={run} disabled={running || selected.size === 0}
            style={{ alignSelf: 'flex-start', padding: '12px 22px', borderRadius: 12, border: 'none', background: running || selected.size === 0 ? 'var(--border)' : 'var(--primary)', color: running || selected.size === 0 ? 'var(--text-dim)' : 'var(--on-primary)', fontSize: 14, fontWeight: 700, cursor: running || selected.size === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {running ? <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'studio_spin 0.7s linear infinite' }} /> En cours…</> : `Lancer sur ${selected.size} athlète${selected.size > 1 ? 's' : ''}`}
          </button>

          {/* Résultats */}
          {results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={secLabel}>Résultats</div>
              {results.map(r => {
                const open = openId === r.athleteId
                return (
                  <div key={r.athleteId} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    <button onClick={() => setOpenId(open ? null : r.athleteId)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.status === 'done' ? '#22C55E' : '#EF4444', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.name}</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {open && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                        {r.status === 'error' ? (
                          <p style={{ fontSize: 12.5, color: '#EF4444', marginTop: 10 }}>{r.error}</p>
                        ) : r.renders.length === 0 ? (
                          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 10 }}>Aucun rendu.</p>
                        ) : r.renders.map((x, i) => (
                          <div key={i} style={{ marginTop: 10 }}>
                            {x.title && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{x.title}</div>}
                            <div style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--bg-alt)' }}><StudioMarkdown text={x.text} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
