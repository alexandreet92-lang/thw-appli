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
import { listSystems, updateSystem, type StudioSystemRow } from '@/lib/studio/store'
import { type StudioMethod } from '@/lib/studio/graph'
import { listMyAthletes, type AthleteSummary } from '@/lib/coach/relationships'
import StudioMarkdown from '@/components/studio/StudioMarkdown'
import { useI18n } from '@/lib/i18n'

interface RunResult { athleteId: string; name: string; status: 'done' | 'error'; renders: { title: string; text: string }[]; error?: string }

// ── Triage : dérive une sévérité + une accroche d'une ligne depuis le rendu ──
// (heuristique de mots-clés en attendant que les agents émettent une sévérité
// structurée ; permet déjà de classer les athlètes par urgence dans le cockpit).
type Sev = 'crit' | 'warn' | 'ok'
const SEV_RANK: Record<Sev, number> = { crit: 0, warn: 1, ok: 2 }
function triageOf(r: RunResult): { sev: Sev; headline: string } {
  if (r.status === 'error') return { sev: 'crit', headline: r.error || 'Échec du run' }
  const text = r.renders.map(x => x.text).join('\n')
  const firstLine = (r.renders[0]?.text || '')
    .split('\n').map(s => s.replace(/^[#>\s*_`-]+/, '').replace(/[*_`]/g, '').trim()).find(Boolean) || ''
  const headline = firstLine.length > 130 ? firstLine.slice(0, 127) + '…' : firstLine
  if (/blessur|douleur|surcharg|deload|repos forc|arr[êe]t|surentra|d[ée]croch|manqu[ée]|alerte|urgen/i.test(text)) return { sev: 'crit', headline }
  if (/stagnation|surveiller|vigilance|attention|recalibr|complian|fatigue|prudent/i.test(text)) return { sev: 'warn', headline }
  return { sev: 'ok', headline }
}
const SEV_TOKEN: Record<Sev, string> = { crit: 'var(--charge-hard)', warn: 'var(--charge-mid)', ok: 'var(--charge-low)' }
function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}

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
  // Décisions du coach dans le cockpit (client) : athleteId → 'valide' | 'ignore'.
  const [handled, setHandled] = useState<Record<string, 'valide' | 'ignore'>>({})
  // Progression du run en streaming (athlètes analysés / total).
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  // Panneau « Ma méthode » du système sélectionné (persisté dans graph.method).
  const [methodOpen, setMethodOpen] = useState(false)
  const [method, setMethod] = useState<StudioMethod>({})
  const [savingMethod, setSavingMethod] = useState(false)
  const [methodSaved, setMethodSaved] = useState(false)
  const searchParams = useSearchParams()
  const { t } = useI18n()

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

  // Recharge la méthode éditable quand on change de système.
  useEffect(() => {
    const sys = systems.find(s => s.id === systemId)
    setMethod(sys?.graph?.method ?? {}); setMethodSaved(false)
  }, [systemId, systems])

  const saveMethod = async () => {
    const sys = systems.find(s => s.id === systemId)
    if (!sys || savingMethod) return
    setSavingMethod(true); setMethodSaved(false)
    try {
      const newGraph = { ...sys.graph, method }
      await updateSystem(sys.id, { graph: newGraph })
      setSystems(list => list.map(s => s.id === sys.id ? { ...s, graph: newGraph } : s))
      setMethodSaved(true)
    } catch { setErr(t('w3d.run_failed_retry')) }
    finally { setSavingMethod(false) }
  }
  const run = async () => {
    if (!systemId || selected.size === 0 || running) return
    setRunning(true); setErr(null); setResults(null); setHandled({}); setProgress(null); setOpenId(null)
    try {
      const res = await fetch('/api/coach/studio-run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemId, athleteIds: [...selected] }) })
      // Erreur (auth/solde/validation) → réponse JSON classique avant le flux.
      if (!res.ok || !res.body) {
        let msg = t('w3d.run_failed')
        try { const j = await res.json(); if (j?.error) msg = j.error } catch { /* flux illisible */ }
        setErr(msg); return
      }
      // Flux NDJSON : on remplit le cockpit au fur et à mesure.
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      const acc: RunResult[] = []; let total = selected.size; setResults([])
      for (;;) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        let nl: number
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1)
          if (!line) continue
          let msg: { type?: string; total?: number } & Partial<RunResult>
          try { msg = JSON.parse(line) } catch { continue }
          if (msg.type === 'start') { total = msg.total ?? total; setProgress({ done: 0, total }) }
          else if (msg.type === 'result') { acc.push(msg as RunResult); setResults([...acc]); setProgress({ done: acc.length, total: Math.max(total, acc.length) }) }
        }
      }
      if (acc.length === 0) setResults([])
    } catch { setErr(t('w3d.run_failed_retry')) }
    finally { setRunning(false); setProgress(null) }
  }

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const secLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px' }

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>{t('w3d.studio_title')}</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px' }}>{t('w3d.studio_subtitle')}</p>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>{t('w3d.loading')}</p>
      ) : systems.length === 0 ? (
        <div style={{ ...card }}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0, lineHeight: 1.6 }}>{t('w3d.studio_no_system')}</p>
        </div>
      ) : athletes.length === 0 ? (
        <div style={{ ...card }}>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: 0 }}>{t('w3d.studio_no_athletes_prefix')}<Link href="/coach/athletes" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('w3d.nav_athletes')}</Link>.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Choix du système */}
          <div style={{ ...card }}>
            <div style={secLabel}>{t('w3d.system_to_run')}</div>
            <select value={systemId} onChange={e => setSystemId(e.target.value)}
              style={{ width: '100%', maxWidth: 420, padding: '10px 12px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
              {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            {/* Ma méthode — persistée dans le système, appliquée par les agents */}
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setMethodOpen(o => !o)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, border: `1px solid ${methodOpen ? 'var(--primary)' : 'var(--border)'}`, background: methodOpen ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--bg-alt)', color: methodOpen ? 'var(--primary)' : 'var(--text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
                {t('w3d.method_btn')}
              </button>
            </div>
            {methodOpen && (
              <div style={{ marginTop: 12, padding: '14px 15px', borderRadius: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{t('w3d.method_title')}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.5 }}>{t('w3d.method_hint')}</div>
                <MethodSeg label={t('w3d.method_aiwrites')} value={method.aiWrites ?? 'simple'} onChange={v => setMethod(m => ({ ...m, aiWrites: v as StudioMethod['aiWrites'] }))}
                  options={[['none', t('w3d.method_ai_none')], ['simple', t('w3d.method_ai_simple')], ['all', t('w3d.method_ai_all')]]} />
                <MethodSeg label={t('w3d.method_cadence')} value={method.cadence ?? 'weekly'} onChange={v => setMethod(m => ({ ...m, cadence: v as StudioMethod['cadence'] }))}
                  options={[['weekly', t('w3d.method_cad_weekly')], ['biweekly', t('w3d.method_cad_biweekly')], ['triweekly', t('w3d.method_cad_triweekly')], ['block', t('w3d.method_cad_block')]]} />
                <MethodSeg label={t('w3d.method_validation')} value={method.validation ?? 'always'} onChange={v => setMethod(m => ({ ...m, validation: v as StudioMethod['validation'] }))}
                  options={[['always', t('w3d.method_val_always')], ['auto_simple', t('w3d.method_val_auto')]]} />
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t('w3d.method_rules')}</div>
                  <textarea value={(method.rules ?? []).join('\n')} onChange={e => { setMethod(m => ({ ...m, rules: e.target.value.split('\n') })); setMethodSaved(false) }}
                    placeholder={t('w3d.method_rules_ph')} rows={4}
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, outline: 'none' }} />
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => void saveMethod()} disabled={savingMethod}
                    style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700, cursor: savingMethod ? 'default' : 'pointer', fontFamily: 'var(--font-body)', opacity: savingMethod ? 0.6 : 1 }}>
                    {t('w3d.method_save')}
                  </button>
                  {methodSaved && <span style={{ fontSize: 12.5, color: 'var(--charge-low)', fontWeight: 700 }}>✓ {t('w3d.method_saved')}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Choix des athlètes */}
          <div style={{ ...card }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={secLabel}>{t('w3d.athletes_count', { sel: selected.size, total: athletes.length })}</span>
              <button onClick={() => setSelected(selected.size === athletes.length ? new Set() : new Set(athletes.map(a => a.id)))}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {selected.size === athletes.length ? t('w3d.uncheck_all') : t('w3d.check_all')}
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.full_name || a.first_name || t('w3d.athlete_fallback')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12.5 }}>{err}</div>}

          <button data-guide="studio-run" onClick={run} disabled={running || selected.size === 0}
            style={{ alignSelf: 'flex-start', padding: '12px 22px', borderRadius: 12, border: 'none', background: running || selected.size === 0 ? 'var(--border)' : 'var(--primary)', color: running || selected.size === 0 ? 'var(--text-dim)' : 'var(--on-primary)', fontSize: 14, fontWeight: 700, cursor: running || selected.size === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {running ? <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'studio_spin 0.7s linear infinite' }} /> {t('w3d.running')}</> : (selected.size > 1 ? t('w3d.run_on_n_plural', { n: selected.size }) : t('w3d.run_on_n', { n: selected.size }))}
          </button>

          {/* Barre de progression pendant le run (streaming) */}
          {running && progress && (
            <div style={{ ...card, padding: '13px 15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 8 }}>
                <span>{t('w3d.tri_analyzing')}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text)' }}>{progress.done}/{progress.total}</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: 'var(--bg-alt)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`, background: 'var(--primary)', borderRadius: 99, transition: 'width .35s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>{t('w3d.tri_keepopen')}</div>
            </div>
          )}

          {/* Résultats — COCKPIT DE TRIAGE (athlètes classés par urgence) */}
          {results && (() => {
            const SEV_LABEL: Record<Sev, string> = { crit: t('w3d.tri_totreat'), warn: t('w3d.tri_towatch'), ok: t('w3d.tri_nominal') }
            const triaged = results.map(r => ({ r, ...triageOf(r) })).sort((a, b) => {
              const ha = handled[a.r.athleteId] ? 1 : 0, hb = handled[b.r.athleteId] ? 1 : 0
              if (ha !== hb) return ha - hb
              return SEV_RANK[a.sev] - SEV_RANK[b.sev]
            })
            const counts: Record<Sev, number> = { crit: 0, warn: 0, ok: 0 }
            triaged.forEach(t2 => { if (!handled[t2.r.athleteId]) counts[t2.sev]++ })
            const doneCount = Object.keys(handled).length
            const tileNum: React.CSSProperties = { fontSize: 26, fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Tuiles résumé */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(118px,1fr))', gap: 10 }}>
                  {(['crit', 'warn', 'ok'] as Sev[]).map(sev => (
                    <div key={sev} style={{ ...card, padding: '13px 15px' }}>
                      <div style={{ ...tileNum, color: SEV_TOKEN[sev] }}>{counts[sev]}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 5 }}>{SEV_LABEL[sev].toLowerCase()}</div>
                    </div>
                  ))}
                  <div style={{ ...card, padding: '13px 15px' }}>
                    <div style={{ ...tileNum, color: 'var(--text)' }}>{doneCount}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 5 }}>{t('w3d.tri_handled')}</div>
                  </div>
                </div>

                <div style={secLabel}>{t('w3d.results')} — {t('w3d.tri_by_urgency')}</div>

                {triaged.map(({ r, sev, headline }) => {
                  const open = openId === r.athleteId
                  const state = handled[r.athleteId]
                  const tok = SEV_TOKEN[sev]
                  return (
                    <div key={r.athleteId} style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', opacity: state ? 0.55 : 1, transition: 'opacity .2s' }}>
                      <span style={{ width: 4, alignSelf: 'stretch', background: tok, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: 'var(--text)', background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>{initials(r.name)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{r.name}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: tok, background: `color-mix(in srgb, ${tok} 13%, transparent)` }}>{SEV_LABEL[sev]}</span>
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline || (r.status === 'error' ? r.error : t('w3d.no_render'))}</div>
                          </div>
                          {state ? (
                            <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: state === 'valide' ? 'var(--charge-low)' : 'var(--text-dim)' }}>
                              {state === 'valide' ? `✓ ${t('w3d.tri_validated')}` : t('w3d.tri_ignored')}
                              <button onClick={() => setHandled(h => { const n = { ...h }; delete n[r.athleteId]; return n })} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('w3d.tri_cancel')}</button>
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={() => setHandled(h => ({ ...h, [r.athleteId]: 'valide' }))} style={{ padding: '7px 12px', borderRadius: 9, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('w3d.tri_validate')}</button>
                              <button onClick={() => setOpenId(open ? null : r.athleteId)} style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{open ? t('w3d.tri_close') : t('w3d.tri_adjust')}</button>
                              <button onClick={() => setHandled(h => ({ ...h, [r.athleteId]: 'ignore' }))} style={{ padding: '7px 10px', borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('w3d.tri_ignore')}</button>
                            </div>
                          )}
                        </div>
                        {open && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                            {r.status === 'error' ? (
                              <p style={{ fontSize: 12.5, color: 'var(--charge-hard)' }}>{r.error}</p>
                            ) : r.renders.length === 0 ? (
                              <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{t('w3d.no_render')}</p>
                            ) : r.renders.map((x, i) => (
                              <div key={i} style={{ marginTop: i ? 12 : 0 }}>
                                {x.title && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{x.title}</div>}
                                <div style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--bg-alt)' }}><StudioMarkdown text={x.text} /></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// Segmenté réutilisable pour les réglages de la méthode.
function MethodSeg({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 3, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
        {options.map(([v, lbl]) => {
          const on = value === v
          return (
            <button key={v} onClick={() => onChange(v)}
              style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-body)', background: on ? 'var(--primary)' : 'transparent', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}
