'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// FICHE ATHLÈTE 360° — la vue centrale du mode coach. Réunit tout ce que
// l'athlète a produit (entraînements, récup, nutrition, blessures, planning,
// progression) en onglets. Lecture seule, via la RLS coach.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getAthleteProfile, getActivities, getRecovery, getInjuries, getPlanning, getBody, getActiveNutrition,
  type AthleteProfile, type ActivityRow, type RecoveryRow, type InjuryRow, type PlannedRow, type BodyRow, type NutritionActive,
} from '@/lib/coach/athlete-data'
import { assignSession, deleteAssignedSession } from '@/lib/coach/assign'

type Tab = 'overview' | 'training' | 'recovery' | 'nutrition' | 'injuries' | 'planning' | 'progression'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Aperçu' }, { key: 'training', label: 'Entraînements' }, { key: 'recovery', label: 'Récupération' },
  { key: 'nutrition', label: 'Nutrition' }, { key: 'injuries', label: 'Blessures' }, { key: 'planning', label: 'Planning' }, { key: 'progression', label: 'Progression' },
]
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const fmtDate = (d: string | null) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '—' } }
const fmtDur = (s: number | null) => s ? `${Math.round(s / 60)} min` : ''
const fmtKm = (m: number | null) => m ? `${(m / 1000).toFixed(1)} km` : ''

export default function AthleteFiche() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [acts, setActs] = useState<ActivityRow[]>([])
  const [rec, setRec] = useState<RecoveryRow[]>([])
  const [inj, setInj] = useState<InjuryRow[]>([])
  const [plan, setPlan] = useState<PlannedRow[]>([])
  const [body, setBody] = useState<BodyRow[]>([])
  const [nutri, setNutri] = useState<NutritionActive | null>(null)
  // Assignation de séance (source='coach').
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [af, setAf] = useState({ date: '', sport: 'run', title: '', duration_min: '', intensity: '' })

  const reloadPlanning = useCallback(async () => { setPlan(await getPlanning(id).catch(() => [])) }, [id])
  const submitAssign = async () => {
    if (!af.title.trim() || !af.date || assigning) return
    setAssigning(true)
    try {
      await assignSession(id, { date: af.date, sport: af.sport, title: af.title.trim(), duration_min: af.duration_min ? Number(af.duration_min) : null, intensity: af.intensity || null })
      setAssignOpen(false); setAf(f => ({ ...f, title: '', duration_min: '', intensity: '' }))
      await reloadPlanning()
    } catch { /* ignore */ } finally { setAssigning(false) }
  }
  const removeAssigned = async (sid: string) => { try { await deleteAssignedSession(sid); await reloadPlanning() } catch { /* ignore */ } }

  const load = useCallback(async () => {
    if (!id) return
    const p = await getAthleteProfile(id)
    if (!p) { setDenied(true); setLoading(false); return }   // pas lié / pas d'accès
    setProfile(p)
    const [a, r, i, pl, b, n] = await Promise.all([
      getActivities(id), getRecovery(id), getInjuries(id), getPlanning(id), getBody(id), getActiveNutrition(id),
    ])
    setActs(a); setRec(r); setInj(i); setPlan(pl); setBody(b); setNutri(n)
    setLoading(false)
  }, [id])
  useEffect(() => { void load() }, [load])

  const activeInj = inj.filter(x => x.active)
  const recAvg = (k: keyof RecoveryRow) => { const v = rec.map(r => Number(r[k])).filter(n => Number.isFinite(n) && n > 0); return v.length ? (v.reduce((s, x) => s + x, 0) / v.length) : null }
  const name = profile?.full_name || profile?.first_name || 'Athlète'

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const secLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 10px' }

  if (denied) {
    return (
      <div style={{ width: '100%', padding: '48px clamp(16px,4vw,40px)', textAlign: 'center', fontFamily: 'DM Sans,sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>Athlète introuvable</h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 8 }}>Cet athlète ne fait pas (ou plus) partie de ton roster.</p>
        <button onClick={() => router.push('/coach/athletes')} style={{ marginTop: 16, padding: '10px 18px', borderRadius: 11, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Retour au roster</button>
      </div>
    )
  }

  const tile = (value: React.ReactNode, label: string, accent = 'var(--text)') => (
    <div style={{ ...card, flex: 1, minWidth: 120, padding: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, fontFamily: 'Syne,DM Sans,sans-serif', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 5 }}>{label}</div>
    </div>
  )
  const bar = (v: number | null, max = 5, col = 'var(--primary)') => (
    <span style={{ display: 'inline-block', width: 46, height: 6, borderRadius: 3, background: 'var(--bg-alt)', overflow: 'hidden', verticalAlign: 'middle' }}>
      <span style={{ display: 'block', height: '100%', width: `${Math.min(100, ((v ?? 0) / max) * 100)}%`, background: col, borderRadius: 3 }} />
    </span>
  )

  return (
    <div style={{ width: '100%', padding: '18px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: 'DM Sans,sans-serif' }}>
      {/* En-tête athlète */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
        <button onClick={() => router.push('/coach/athletes')} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, color: 'var(--text-dim)', fontWeight: 800, fontSize: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.slice(0, 1).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'Syne,DM Sans,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>
            {profile?.level ? `${profile.level} · ` : ''}{(profile?.sports ?? []).slice(0, 3).join(', ') || 'Athlète'}
            {activeInj.length > 0 && <span style={{ color: '#F59E0B', fontWeight: 700 }}> · {activeInj.length} blessure{activeInj.length > 1 ? 's' : ''} active{activeInj.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid var(--border)', marginBottom: 18, paddingBottom: 2 }}>
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            style={{ padding: '9px 13px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === tb.key ? 700 : 500, color: tab === tb.key ? 'var(--primary)' : 'var(--text-mid)', borderBottom: `2px solid ${tab === tb.key ? 'var(--primary)' : 'transparent'}`, whiteSpace: 'nowrap', fontFamily: 'DM Sans,sans-serif', marginBottom: -3 }}>
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', animation: 'studio_pulse 1.4s ease infinite' }}>Chargement…</p>
      ) : (
        <>
          {/* ── Aperçu ── */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {tile(acts.length, 'séances (45 j)', 'var(--primary)')}
                {tile(fmtDate(acts[0]?.started_at ?? null), 'dernière activité')}
                {tile(activeInj.length, 'blessure' + (activeInj.length > 1 ? 's' : '') + ' active' + (activeInj.length > 1 ? 's' : ''), activeInj.length ? '#F59E0B' : 'var(--text)')}
                {tile(recAvg('fatigue') ? `${recAvg('fatigue')!.toFixed(1)}/5` : '—', 'fatigue moy. (21 j)', (recAvg('fatigue') ?? 0) >= 4 ? '#F59E0B' : 'var(--text)')}
              </div>
              {profile?.primary_goal && (
                <div style={{ ...card }}>
                  <div style={secLabel}>Objectif</div>
                  <div style={{ fontSize: 14.5, color: 'var(--text)', fontWeight: 600 }}>{profile.primary_goal}</div>
                </div>
              )}
              <div style={{ ...card }}>
                <div style={secLabel}>Dernières séances</div>
                {acts.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune activité récente.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {acts.slice(0, 5).map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-dim)', width: 52, flexShrink: 0 }}>{fmtDate(a.started_at)}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.sport_type || 'Séance'}</span>
                        <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{[fmtDur(a.moving_time_s), fmtKm(a.distance_m)].filter(Boolean).join(' · ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Entraînements ── */}
          {tab === 'training' && (
            <div style={{ ...card }}>
              <div style={secLabel}>{acts.length} séance{acts.length > 1 ? 's' : ''} · 45 jours</div>
              {acts.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune activité.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {acts.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-dim)', width: 54, flexShrink: 0 }}>{fmtDate(a.started_at)}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || a.sport_type || 'Séance'}{a.is_race && <span style={{ color: '#EF4444', fontWeight: 700 }}> · Course</span>}</span>
                      <span style={{ color: 'var(--text-dim)', flexShrink: 0, fontSize: 12 }}>{[fmtDur(a.moving_time_s), fmtKm(a.distance_m), a.tss ? `TSS ${a.tss}` : ''].filter(Boolean).join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Récupération ── */}
          {tab === 'recovery' && (
            <div style={{ ...card }}>
              <div style={secLabel}>Check-ins · 21 jours</div>
              {rec.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucun check-in récupération.</div> : (
                <>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 12.5, color: 'var(--text-mid)' }}>
                    <span>Sommeil {recAvg('sleep_quality')?.toFixed(1) ?? '—'}/5</span>
                    <span>Fatigue {recAvg('fatigue')?.toFixed(1) ?? '—'}/5</span>
                    <span>Courbatures {recAvg('soreness')?.toFixed(1) ?? '—'}/5</span>
                    <span>Humeur {recAvg('mood')?.toFixed(1) ?? '—'}/5</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {rec.map(r => (
                      <div key={r.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: 12.5 }}>
                        <span style={{ color: 'var(--text-dim)', width: 54, flexShrink: 0 }}>{fmtDate(r.date)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>😴 {bar(r.sleep_quality, 5, '#22C55E')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>🔋 {bar(r.fatigue, 5, '#F59E0B')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>💪 {bar(r.soreness, 5, '#EF4444')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Nutrition ── */}
          {tab === 'nutrition' && (
            <div style={{ ...card }}>
              <div style={secLabel}>Plan nutrition actif</div>
              {!nutri ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucun plan nutrition actif.</div> : (
                <>
                  {nutri.description && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{nutri.description}</div>}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {tile(nutri.calories_mid ?? '—', 'kcal / jour', 'var(--primary)')}
                    {tile(nutri.proteines ? `${nutri.proteines} g` : '—', 'protéines')}
                    {tile(nutri.glucides ? `${nutri.glucides} g` : '—', 'glucides')}
                    {tile(nutri.lipides ? `${nutri.lipides} g` : '—', 'lipides')}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Blessures ── */}
          {tab === 'injuries' && (
            <div style={{ ...card }}>
              <div style={secLabel}>{inj.length} entrée{inj.length > 1 ? 's' : ''}</div>
              {inj.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune blessure enregistrée.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {inj.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.active ? '#F59E0B' : '#22C55E', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{b.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{b.active ? 'Active' : 'Résolue'}{b.phase ? ` · ${b.phase}` : ''} · depuis {fmtDate(b.onset_date)}{b.resolved_date ? ` → ${fmtDate(b.resolved_date)}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Planning ── */}
          {tab === 'planning' && (
            <div style={{ ...card }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={secLabel}>Séances à venir</div>
                <button onClick={() => { setAssignOpen(o => !o); if (!af.date) setAf(f => ({ ...f, date: new Date().toISOString().slice(0, 10) })) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Assigner une séance
                </button>
              </div>

              {assignOpen && (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 9 }}>
                    <input type="date" value={af.date} onChange={e => setAf(f => ({ ...f, date: e.target.value }))} style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }} />
                    <select value={af.sport} onChange={e => setAf(f => ({ ...f, sport: e.target.value }))} style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', cursor: 'pointer' }}>
                      {['run', 'bike', 'swim', 'gym', 'hyrox', 'trail_run', 'other'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input placeholder="Durée (min)" inputMode="numeric" value={af.duration_min} onChange={e => setAf(f => ({ ...f, duration_min: e.target.value.replace(/[^0-9]/g, '') }))} style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }} />
                    <input placeholder="Intensité (Z2, seuil…)" value={af.intensity} onChange={e => setAf(f => ({ ...f, intensity: e.target.value }))} style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif' }} />
                  </div>
                  <input placeholder="Titre de la séance (ex. Sortie longue Z2 90')" value={af.title} onChange={e => setAf(f => ({ ...f, title: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') void submitAssign() }}
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: 9, padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: 'DM Sans,sans-serif', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setAssignOpen(false)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Annuler</button>
                    <button onClick={() => void submitAssign()} disabled={!af.title.trim() || !af.date || assigning}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: af.title.trim() && af.date ? 'var(--primary)' : 'var(--border)', color: af.title.trim() && af.date ? 'var(--on-primary)' : 'var(--text-dim)', fontSize: 12.5, fontWeight: 700, cursor: af.title.trim() && af.date ? 'pointer' : 'default', fontFamily: 'DM Sans,sans-serif' }}>
                      {assigning ? 'Envoi…' : 'Assigner'}
                    </button>
                  </div>
                </div>
              )}

              {plan.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 12 }}>Aucune séance planifiée.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
                  {plan.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-dim)', width: 92, flexShrink: 0, fontSize: 12 }}>{DAYS[s.day_index] ?? '?'} {fmtDate(s.week_start)}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title || s.sport || 'Séance'}
                        {s.source === 'coach' && <span style={{ marginLeft: 7, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: 6, padding: '2px 6px' }}>Coach</span>}
                      </span>
                      <span style={{ color: 'var(--text-dim)', flexShrink: 0, fontSize: 12 }}>{[s.duration_min ? `${s.duration_min} min` : '', s.intensity ?? ''].filter(Boolean).join(' · ')}</span>
                      {s.source === 'coach' && (
                        <button onClick={() => void removeAssigned(s.id)} title="Retirer" aria-label="Retirer" style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Progression ── */}
          {tab === 'progression' && (
            <div style={{ ...card }}>
              <div style={secLabel}>Poids · 4 mois</div>
              {body.length < 2 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Pas assez de mesures pour tracer une tendance.</div> : (() => {
                const pts = body.filter(b => b.weight_kg != null) as (BodyRow & { weight_kg: number })[]
                if (pts.length < 2) return <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Pas assez de mesures de poids.</div>
                const W = 620, H = 120, PAD = 8
                const xs = pts.map(p => new Date(p.measured_at).getTime())
                const ys = pts.map(p => p.weight_kg)
                const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
                const px = (t: number) => PAD + (x1 === x0 ? 0 : (t - x0) / (x1 - x0)) * (W - 2 * PAD)
                const py = (v: number) => PAD + (y1 === y0 ? 0.5 : (1 - (v - y0) / (y1 - y0))) * (H - 2 * PAD)
                const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${px(xs[i]).toFixed(1)} ${py(p.weight_kg).toFixed(1)}`).join(' ')
                const first = pts[0].weight_kg, last = pts[pts.length - 1].weight_kg, delta = last - first
                return (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>{last.toFixed(1)} kg <span style={{ fontSize: 13, fontWeight: 700, color: delta <= 0 ? '#22C55E' : '#F59E0B' }}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)} kg</span></div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 10, overflow: 'visible' }} preserveAspectRatio="none">
                      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((p, i) => <circle key={i} cx={px(xs[i])} cy={py(p.weight_kg)} r={2.4} fill="var(--primary)" />)}
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                      <span>{fmtDate(pts[0].measured_at)}</span><span>{fmtDate(pts[pts.length - 1].measured_at)}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </>
      )}
    </div>
  )
}
