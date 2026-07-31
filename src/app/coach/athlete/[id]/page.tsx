'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// FICHE ATHLÈTE — le hub d'UN athlète. En haut : accès à ses pages (Planning,
// Calendrier, Training, Récupération, Nutrition, Message) qui s'ouvrent en
// DRAWER coulissant depuis la droite (pas de navigation). En dessous, 4 bulles :
// Aperçu · Fiche (identité) · Données (nutrition/training/récup/blessures) ·
// Objectifs & échéances. Données réelles via la RLS coach.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/shared/Sidebar'
import { AthleteDetailDrawer, type DrawerKind } from '@/components/coach/AthleteDetailDrawer'
import {
  getAthleteProfile, getActivities, getRecovery, getInjuries, getActiveNutrition, getUpcomingRaces,
  getWeekSessions, getNutritionToday, getRecoveryVitals,
  type AthleteProfile, type ActivityRow, type RecoveryRow, type InjuryRow, type NutritionActive, type RaceRow,
  type WeekSessions, type NutritionToday, type RecoveryVitals,
} from '@/lib/coach/athlete-data'

type Bubble = 'overview' | 'fiche' | 'data' | 'goals'
const BUBBLES: { key: Bubble; label: string }[] = [
  { key: 'overview', label: 'Aperçu' }, { key: 'fiche', label: 'Fiche' }, { key: 'data', label: 'Données' }, { key: 'goals', label: 'Objectifs' },
]

const SPORT_LABEL: Record<string, string> = { run: 'Course', running: 'Course', bike: 'Vélo', cycling: 'Vélo', swim: 'Natation', hyrox: 'Hyrox', gym: 'Muscu', trail: 'Trail', trail_run: 'Trail', rowing: 'Aviron', triathlon: 'Triathlon' }
const GOAL_LABEL: Record<string, string> = { performance: 'Performance', force: 'Force', endurance: 'Endurance', hybride: 'Hybride', prise_de_masse: 'Prise de masse', perte_de_poids: 'Perte de poids', sante: 'Santé', competition: 'Compétition' }
const GENDER_LABEL: Record<string, string> = { male: 'Homme', female: 'Femme', homme: 'Homme', femme: 'Femme', other: 'Autre' }
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s
const sportLabel = (s: string) => SPORT_LABEL[s] ?? cap(s)
const goalLabel = (s: string) => GOAL_LABEL[s] ?? cap(s)

const fmtDate = (d: string | null) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '—' } }
const fmtDur = (s: number | null) => s ? `${Math.round(s / 60)} min` : ''
const fmtKm = (m: number | null) => m ? `${(m / 1000).toFixed(1)} km` : ''
const ageOf = (d: string | null) => { if (!d) return null; try { const b = new Date(d); const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a } catch { return null } }
const daysTo = (d: string) => Math.max(0, Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000))
const fmtSleep = (min: number | null) => { if (min == null) return '—'; const h = Math.floor(min / 60), m = Math.round(min % 60); return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h` }

const ACTIONS: { kind: Exclude<DrawerKind, null>; label: string; icon: React.ReactNode }[] = [
  { kind: 'planning', label: 'Planning', icon: <svg {...{ width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" /></svg> },
  { kind: 'calendar', label: 'Calendrier', icon: <svg {...{ width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg> },
  { kind: 'training', label: 'Training', icon: <svg {...{ width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }}><path d="M3 12h4l3 8 4-16 3 8h4" /></svg> },
  { kind: 'recovery', label: 'Récupération', icon: <svg {...{ width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg> },
  { kind: 'nutrition', label: 'Nutrition', icon: <svg {...{ width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }}><path d="M12 2a7 7 0 0 0-7 7c0 5 3 11 7 13 4-2 7-8 7-13a7 7 0 0 0-7-7z" /><path d="M12 6v6" /></svg> },
  { kind: 'message', label: 'Message', icon: <svg {...{ width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
]

export default function AthleteFiche() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string

  const [tab, setTab] = useState<Bubble>('overview')
  const [drawer, setDrawer] = useState<DrawerKind>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [acts, setActs] = useState<ActivityRow[]>([])
  const [rec, setRec] = useState<RecoveryRow[]>([])
  const [inj, setInj] = useState<InjuryRow[]>([])
  const [nutri, setNutri] = useState<NutritionActive | null>(null)
  const [races, setRaces] = useState<RaceRow[]>([])
  const [week, setWeek] = useState<WeekSessions | null>(null)
  const [eaten, setEaten] = useState<NutritionToday | null>(null)
  const [vitals, setVitals] = useState<RecoveryVitals | null>(null)

  useEffect(() => { void createClient().auth.getUser().then(({ data }) => setCoachId(data.user?.id ?? null)) }, [])

  const load = useCallback(async () => {
    if (!id) return
    const p = await getAthleteProfile(id)
    if (!p) { setDenied(true); setLoading(false); return }
    setProfile(p)
    const [a, r, i, n, rc, wk, et, vt] = await Promise.all([
      getActivities(id), getRecovery(id), getInjuries(id), getActiveNutrition(id), getUpcomingRaces(id),
      getWeekSessions(id), getNutritionToday(id), getRecoveryVitals(id),
    ])
    setActs(a); setRec(r); setInj(i); setNutri(n); setRaces(rc); setWeek(wk); setEaten(et); setVitals(vt)
    setLoading(false)
  }, [id])
  useEffect(() => { void load() }, [load])

  const name = profile?.full_name || profile?.first_name || 'Athlète'
  const activeInj = inj.filter(x => x.active)
  const recAvg = (k: keyof RecoveryRow) => { const v = rec.map(x => Number(x[k])).filter(n => Number.isFinite(n) && n > 0); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }
  const tss7 = acts.filter(a => a.started_at && (Date.now() - new Date(a.started_at).getTime()) < 7 * 86400000).reduce((s, a) => s + (a.tss ?? 0), 0)

  const card: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: 16 }
  const secLabel: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 12px' }
  const num: React.CSSProperties = { fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums' }

  if (denied) {
    return (
      <div style={{ width: '100%', padding: '48px clamp(16px,4vw,40px)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Athlète introuvable</h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 8 }}>Cet athlète ne fait pas (ou plus) partie de ton roster.</p>
        <button onClick={() => router.push('/coach/athletes')} style={{ marginTop: 16, padding: '10px 18px', borderRadius: 11, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Retour aux athlètes</button>
      </div>
    )
  }

  const tile = (value: React.ReactNode, label: string, accent = 'var(--text)') => (
    <div style={{ ...card, flex: 1, minWidth: 130, padding: 14 }}>
      <div style={{ ...num, fontSize: 24, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>{label}</div>
    </div>
  )
  const miniMetrics = (pairs: [React.ReactNode, string][]) => (
    <div style={{ display: 'flex', gap: 18, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      {pairs.map(([v, l], i) => (
        <div key={i} style={{ minWidth: 0 }}>
          <div style={{ ...num, fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{v}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{l}</div>
        </div>
      ))}
    </div>
  )
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13.5, color: 'var(--text-mid)' }}>{k}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{v}</span>
    </div>
  )

  const age = ageOf(profile?.birth_date ?? null)

  return (
    <div style={{ width: '100%', padding: '18px clamp(16px,4vw,40px) 60px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <button onClick={() => router.push('/coach/athletes')} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        </button>
        <Avatar url={profile?.avatar_url ?? null} name={name} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0, fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>
            {profile?.level ? `${cap(profile.level)} · ` : ''}{(profile?.sports ?? []).map(sportLabel).slice(0, 3).join(', ') || 'Athlète'}
            {activeInj.length > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}> · {activeInj.length} blessure{activeInj.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>

      {/* Accès aux pages (drawer coulissant depuis la droite) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {ACTIONS.map(a => (
          <button key={a.kind} onClick={() => setDrawer(a.kind)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color .14s, color .14s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in srgb, var(--primary) 45%, var(--border))'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}>
            {a.icon}{a.label}
          </button>
        ))}
      </div>

      {/* Bulles */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid var(--border)', marginBottom: 18, paddingBottom: 2 }}>
        {BUBBLES.map(b => (
          <button key={b.key} onClick={() => setTab(b.key)}
            style={{ padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: tab === b.key ? 700 : 500, color: tab === b.key ? 'var(--primary)' : 'var(--text-mid)', borderBottom: `2px solid ${tab === b.key ? 'var(--primary)' : 'transparent'}`, whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', marginBottom: -3 }}>
            {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : (
        <>
          {/* ── Aperçu ── */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {tile(fmtDate(acts[0]?.started_at ?? null), 'Dernière activité')}
                {tile(<>{Math.round(tss7)}</>, 'Charge 7 j (TSS)', 'var(--primary)')}
                {tile(recAvg('fatigue') ? `${recAvg('fatigue')!.toFixed(1)}/5` : '—', 'Fatigue moy.', (recAvg('fatigue') ?? 0) >= 4 ? '#f59e0b' : 'var(--text)')}
                {tile(activeInj.length, 'Blessure' + (activeInj.length > 1 ? 's' : ''), activeInj.length ? '#ef4444' : 'var(--text)')}
              </div>
              <div style={card}>
                <div style={secLabel}>Dernières séances</div>
                {acts.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune activité récente.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {acts.slice(0, 5).map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span style={{ ...num, color: 'var(--text-dim)', width: 52, flexShrink: 0 }}>{fmtDate(a.started_at)}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || sportLabel(a.sport_type ?? '') || 'Séance'}</span>
                        <span style={{ ...num, color: 'var(--text-dim)', flexShrink: 0 }}>{[fmtDur(a.moving_time_s), fmtKm(a.distance_m)].filter(Boolean).join(' · ')}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setDrawer('training')} style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>Voir tout le training →</button>
              </div>
            </div>
          )}

          {/* ── Fiche (identité) ── */}
          {tab === 'fiche' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620 }}>
              <div style={card}>
                <div style={secLabel}>Identité</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Row k="Âge" v={age != null ? <span style={num}>{age} ans</span> : '—'} />
                  <Row k="Sexe" v={profile?.gender ? (GENDER_LABEL[profile.gender] ?? cap(profile.gender)) : '—'} />
                  <Row k="Taille" v={profile?.height_cm ? <span style={num}>{profile.height_cm} cm</span> : '—'} />
                  <Row k="Poids" v={profile?.weight_kg ? <span style={num}>{profile.weight_kg} kg</span> : '—'} />
                  <Row k="Niveau" v={profile?.level ? cap(profile.level) : '—'} />
                  <Row k="Sports" v={(profile?.sports ?? []).map(sportLabel).join(', ') || '—'} />
                  <Row k="Pays" v={profile?.country || '—'} />
                </div>
              </div>
              <div style={{ ...card, borderStyle: 'dashed', textAlign: 'center' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Fiche personnalisée</div>
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.5 }}>Crée une fiche sur-mesure (champs libres), envoie-la à l’athlète par message : il la remplit, et ça revient ici. <b>Bientôt.</b></p>
                <button disabled style={{ padding: '9px 15px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-dim)', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'var(--font-body)' }}>Créer une fiche personnalisée</button>
              </div>
            </div>
          )}

          {/* ── Données ── */}
          {tab === 'data' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, maxWidth: 900 }}>
              {/* Training */}
              <button onClick={() => setDrawer('training')} style={{ ...card, textAlign: 'left', cursor: 'pointer' }}>
                <div style={secLabel}>Training</div>
                <div style={{ ...num, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{week ? week.done : '—'}<span style={{ fontSize: 15, color: 'var(--text-dim)', fontWeight: 600 }}> / {week ? week.planned : '—'}</span><span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}> séances</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>faites / planifiées cette semaine</div>
                {miniMetrics([
                  [`${Math.round(tss7)}`, 'TSS · 7 j'],
                  [`${acts.length}`, 'séances · 45 j'],
                ])}
              </button>
              {/* Récupération */}
              <button onClick={() => setDrawer('recovery')} style={{ ...card, textAlign: 'left', cursor: 'pointer' }}>
                <div style={secLabel}>Récupération</div>
                <div style={{ ...num, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{fmtSleep(vitals?.sleepMin ?? null)}<span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}> sommeil</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>dernière nuit enregistrée</div>
                {miniMetrics([
                  [vitals?.hrv != null ? `${Math.round(vitals.hrv)}` : '—', 'HRV (ms)'],
                  [recAvg('fatigue') ? `${recAvg('fatigue')!.toFixed(1)}/5` : '—', 'fatigue moy.'],
                ])}
              </button>
              {/* Nutrition */}
              <button onClick={() => setDrawer('nutrition')} style={{ ...card, textAlign: 'left', cursor: 'pointer' }}>
                <div style={secLabel}>Nutrition</div>
                {nutri || (eaten && eaten.hasLog) ? (
                  <>
                    <div style={{ ...num, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{eaten?.kcal ?? 0}<span style={{ fontSize: 15, color: 'var(--text-dim)', fontWeight: 600 }}> / {nutri?.calories_mid ?? '—'}</span><span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}> kcal</span></div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>mangé / objectif · aujourd’hui</div>
                    {miniMetrics([
                      [`${eaten?.prot ?? 0}${nutri?.proteines ? ` / ${nutri.proteines}` : ''}`, 'protéines (g)'],
                      [`${eaten?.gluc ?? 0}${nutri?.glucides ? ` / ${nutri.glucides}` : ''}`, 'glucides (g)'],
                    ])}
                  </>
                ) : <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucun plan ni repas enregistré.</div>}
              </button>
              {/* Blessures */}
              <button onClick={() => setDrawer('recovery')} style={{ ...card, textAlign: 'left', cursor: 'pointer' }}>
                <div style={secLabel}>Blessures</div>
                <div style={{ ...num, fontSize: 22, fontWeight: 700, color: activeInj.length ? '#ef4444' : 'var(--text)' }}>{activeInj.length}<span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}> active{activeInj.length > 1 ? 's' : ''}</span></div>
                {activeInj.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>Aucune blessure en cours.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {activeInj.slice(0, 3).map(x => (
                      <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            </div>
          )}

          {/* ── Objectifs & échéances ── */}
          {tab === 'goals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620 }}>
              <div style={card}>
                <div style={secLabel}>Objectif principal</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: profile?.primary_goal ? 'var(--text)' : 'var(--text-dim)' }}>{profile?.primary_goal ? goalLabel(profile.primary_goal) : 'Non renseigné'}</div>
              </div>
              <div style={card}>
                <div style={secLabel}>Échéances à venir</div>
                {races.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Aucune course programmée.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {races.map((r, i) => {
                      const d = daysTo(r.start_date); const w = Math.floor(d / 7)
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ ...num, fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 800, color: d <= 14 ? '#ef4444' : 'var(--primary)', width: 54, flexShrink: 0 }}>J-{d}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || 'Course'}</div>
                            <div style={{ ...num, fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{fmtDate(r.start_date)} · {w > 0 ? `${w} sem` : `${d} j`}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <button onClick={() => setDrawer('calendar')} style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>Ouvrir le calendrier →</button>
              </div>
            </div>
          )}
        </>
      )}

      <AthleteDetailDrawer kind={drawer} athleteId={id} coachId={coachId} name={name} avatar={profile?.avatar_url ?? null} onClose={() => setDrawer(null)} />
    </div>
  )
}
