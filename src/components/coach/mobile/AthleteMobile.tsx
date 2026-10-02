'use client'
// ══════════════════════════════════════════════════════════════════
// FICHE ATHLÈTE — version MOBILE (maquette k3). Ronds retour / message,
// en-tête avatar, « Accès rapide » (Planning · Calendrier · Training ·
// Performance · Récup · Nutrition → drawer existant de la page), segmenté
// Aperçu / Fiche / Données / Objectifs / Connexion à pouce glissant, contenu
// en cartes blanches. Données et gestionnaires = ceux de la page.
// ══════════════════════════════════════════════════════════════════
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import type { DrawerKind } from '@/components/coach/AthleteDetailDrawer'
import { CoachFormsSection } from '@/components/coach/CustomForms'
import type { AthleteProfile, ActivityRow, InjuryRow, NutritionActive, RaceRow, WeekSessions, NutritionToday, RecoveryVitals, ConnectionRow } from '@/lib/coach/athlete-data'
import {
  MPage, Rise, CCard, CardHead, MAvatar, RowLink, RowText, SegM, TabPanel, CountUp, EmptyM, SkelRows, CTA, GroupM,
  RoundBtn, Ico, ICON, TILE, NUM, CARD_BG, SOFT_SHADOW, useTT,
} from './CoachKit'

export type AthleteTab = 'overview' | 'fiche' | 'data' | 'goals' | 'connexions'
const TAB_ORDER: AthleteTab[] = ['overview', 'fiche', 'data', 'goals', 'connexions']
const TAB_KEY: Record<AthleteTab, string> = { overview: 'w1e.tabOverview', fiche: 'w1e.tabFiche', data: 'w1e.tabData', goals: 'w1e.tabGoals', connexions: 'w1e.tabConnexions' }

export interface AthleteFx {
  sportLabel: (s: string) => string; goalLabel: (s: string) => string; genderLabel: (s: string) => string; cap: (s: string) => string
  providerMeta: (p: string) => { name: string; color: string; initials: string }
  fmtDate: (d: string | null) => string; fmtDur: (s: number | null) => string; fmtKm: (m: number | null) => string; fmtSleep: (m: number | null) => string
  daysTo: (d: string) => number
}
export interface AthleteMobileProps {
  id: string; name: string; profile: AthleteProfile | null; loading: boolean; denied: boolean
  tab: AthleteTab; setTab: (t: AthleteTab) => void; openDrawer: (k: Exclude<DrawerKind, null>) => void; onBack: () => void
  acts: ActivityRow[]; activeInj: InjuryRow[]; nutri: NutritionActive | null; races: RaceRow[]; week: WeekSessions | null
  eaten: NutritionToday | null; vitals: RecoveryVitals | null; conns: ConnectionRow[] | null
  tss7: number; fatigueAvg: number | null; age: number | null; fx: AthleteFx
  drawerSlot: ReactNode
}

const SPORT_DOT: Record<string, string> = {
  run: 'var(--sport-run)', running: 'var(--sport-run)', trail: 'var(--sport-run)', trail_run: 'var(--sport-run)',
  bike: 'var(--sport-bike)', cycling: 'var(--sport-bike)', swim: 'var(--sport-swim)', gym: 'var(--sport-gym)', hyrox: 'var(--sport-hyrox)', rowing: 'var(--sport-rowing)',
}

export default function AthleteMobile(p: AthleteMobileProps) {
  const { t } = useI18n()
  const tt = useTT()
  const [dir, setDir] = useState(1)
  const { fx } = p
  const changeTab = (v: AthleteTab) => { setDir(TAB_ORDER.indexOf(v) >= TAB_ORDER.indexOf(p.tab) ? 1 : -1); p.setTab(v) }

  if (p.denied) {
    return (
      <MPage>
        <div style={{ display: 'flex', margin: '4px 0 16px' }}><RoundBtn label={t('w1e.back')} onClick={p.onBack}><Ico d={ICON.back} size={22} sw={2.2} /></RoundBtn></div>
        <CCard><EmptyM icon={<Ico d={ICON.lock} size={24} />} title={t('w1e.notFoundTitle')} hint={t('w1e.notFoundBody')} action={<CTA onClick={p.onBack}>{t('w1e.backToAthletes')}</CTA>} /></CCard>
      </MPage>
    )
  }

  const QUICK: { kind: Exclude<DrawerKind, null>; label: string; color: string; icon: ReactNode }[] = [
    { kind: 'planning', label: t('w1e.actPlanning'), color: TILE.cyan, icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
    { kind: 'calendar', label: t('w1e.actCalendar'), color: TILE.red, icon: ICON.flag },
    { kind: 'training', label: t('w1e.actTraining'), color: TILE.orange, icon: ICON.activity },
    { kind: 'performance', label: t('w1e.actPerformance'), color: TILE.violet, icon: ICON.star },
    { kind: 'recovery', label: tt('co.act_recovery_short', 'Récup'), color: TILE.red, icon: ICON.heart },
    { kind: 'nutrition', label: t('w1e.actNutrition'), color: TILE.green, icon: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.9-5.4 5.2-6" /></> },
  ]

  const sub = [
    ...(p.profile?.sports ?? []).map(fx.sportLabel).slice(0, 3),
    p.profile?.level ? fx.cap(p.profile.level) : null,
  ].filter(Boolean).join(' · ') || t('w1e.athlete')
  const fatigueHigh = (p.fatigueAvg ?? 0) >= 4

  return (
    <MPage>
      {/* Ronds retour · message */}
      <Rise style={{ display: 'flex', alignItems: 'center', margin: '2px 0 14px' }}>
        <RoundBtn label={t('w1e.back')} onClick={p.onBack}><Ico d={ICON.back} size={22} sw={2.2} /></RoundBtn>
        <span style={{ flex: 1 }} />
        <RoundBtn label={t('w1e.actMessage')} onClick={() => p.openDrawer('message')}><Ico d={ICON.chat} size={21} /></RoundBtn>
      </Rise>

      {/* En-tête */}
      <Rise i={1} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <MAvatar name={p.name} url={p.profile?.avatar_url ?? null} size={76} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</h1>
          <p style={{ margin: '5px 0 0', fontSize: 16, color: 'var(--text-mid)' }}>
            {sub}
            {p.activeInj.length > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}> · {p.activeInj.length > 1 ? t('w1e.injuriesN', { n: p.activeInj.length }) : t('w1e.injury1', { n: p.activeInj.length })}</span>}
          </p>
        </div>
      </Rise>

      {/* Accès rapide */}
      <Rise i={2}>
        <CCard>
          <h2 style={{ margin: '0 0 14px', fontSize: 19, fontWeight: 800, letterSpacing: '-0.015em' }}>{tt('co.quick_access', 'Accès rapide')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {QUICK.map(q => (
              <button key={q.kind} type="button" onClick={() => p.openDrawer(q.kind)} className="cm-press"
                style={{ minHeight: 84, border: 'none', borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 4px', fontFamily: 'var(--font-body)' }}>
                <span style={{ color: q.color, display: 'flex' }}><Ico d={q.icon} size={26} sw={2} /></span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{q.label}</span>
              </button>
            ))}
          </div>
        </CCard>
      </Rise>

      {/* Segmenté */}
      <Rise i={3} style={{ margin: '14px 0' }}>
        <div data-guide="athlete-tabs"><SegM options={TAB_ORDER.map(v => ({ v, l: t(TAB_KEY[v]) }))} value={p.tab} onChange={changeTab} /></div>
      </Rise>

      {p.loading ? (
        <CCard><SkelRows n={4} /></CCard>
      ) : (
        <TabPanel k={p.tab} dir={dir}>
          {p.tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <Kpi label={tt('co.load_7d', 'Charge 7 j')} value={<CountUp value={Math.round(p.tss7)} />} />
                <Kpi label={tt('co.fatigue', 'Fatigue')} tone={fatigueHigh ? TILE.orange : undefined} value={p.fatigueAvg != null ? <><CountUp value={p.fatigueAvg} decimals={1} /><small style={{ fontSize: 16, fontWeight: 700 }}>/5</small></> : '—'} />
                <Kpi label={p.activeInj.length > 1 ? t('w1e.injuriesLabel') : t('w1e.injuryLabel')} tone={p.activeInj.length ? 'var(--danger)' : undefined} value={<CountUp value={p.activeInj.length} />} />
              </div>
              <CCard>
                <CardHead title={t('w1e.lastSessions')} right={tt('co.see_all', 'Tout voir')} onRight={() => p.openDrawer('training')} />
                {p.acts.length === 0 ? <EmptyM title={t('w1e.noRecentActivity')} /> : p.acts.slice(0, 5).map((a, i) => (
                  <RowLink key={a.id} first={i === 0} href={`/activities?id=${a.id}&uid=${p.id}`}>
                    <span aria-hidden style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: SPORT_DOT[a.sport_type ?? ''] ?? 'var(--text-dim)' }} />
                    <RowText title={a.title || fx.sportLabel(a.sport_type ?? '') || t('w1e.session')}
                      sub={<span style={NUM}>{[fx.fmtKm(a.distance_m), fx.fmtDur(a.moving_time_s), a.tss ? `TSS ${Math.round(a.tss)}` : ''].filter(Boolean).join(' · ') || '—'}</span>} />
                    <span style={{ ...NUM, flexShrink: 0, fontSize: 15, color: 'var(--text-dim)' }}>{fx.fmtDate(a.started_at)}</span>
                  </RowLink>
                ))}
              </CCard>
            </div>
          )}

          {p.tab === 'fiche' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <GroupM>
                <KV first k={t('w1e.age')} v={p.age != null ? <span style={NUM}>{t('w1e.ageYears', { age: p.age })}</span> : '—'} />
                <KV k={t('w1e.gender')} v={p.profile?.gender ? fx.genderLabel(p.profile.gender) : '—'} />
                <KV k={t('w1e.height')} v={p.profile?.height_cm ? <span style={NUM}>{p.profile.height_cm} cm</span> : '—'} />
                <KV k={t('w1e.weight')} v={p.profile?.weight_kg ? <span style={NUM}>{p.profile.weight_kg} kg</span> : '—'} />
                <KV k={t('w1e.level')} v={p.profile?.level ? fx.cap(p.profile.level) : '—'} />
                <KV k={t('w1e.sports')} v={(p.profile?.sports ?? []).map(fx.sportLabel).join(', ') || '—'} />
                <KV k={t('w1e.country')} v={p.profile?.country || '—'} />
              </GroupM>
              <CoachFormsSection athleteId={p.id} athleteName={p.name} mobile />
            </div>
          )}

          {p.tab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DataCard label={t('w1e.dataTraining')} color={TILE.orange} icon={ICON.activity} onClick={() => p.openDrawer('training')}
                big={<>{p.week ? <CountUp value={p.week.done} /> : '—'}<Unit> / {p.week ? p.week.planned : '—'} {t('w1e.sessionsUnit')}</Unit></>}
                sub={t('w1e.doneVsPlanned')} metrics={[[`${Math.round(p.tss7)}`, t('w1e.tss7d')], [`${p.acts.length}`, t('w1e.sessions45d')]]} />
              <DataCard label={t('w1e.dataRecovery')} color={TILE.indigo} icon={ICON.moon} onClick={() => p.openDrawer('recovery')}
                big={<>{fx.fmtSleep(p.vitals?.sleepMin ?? null)}<Unit> {t('w1e.sleepUnit')}</Unit></>}
                sub={t('w1e.lastNight')} metrics={[[p.vitals?.hrv != null ? `${Math.round(p.vitals.hrv)}` : '—', t('w1e.hrvMs')], [p.fatigueAvg != null ? `${p.fatigueAvg.toFixed(1)}/5` : '—', t('w1e.avgFatigueLower')]]} />
              <DataCard label={t('w1e.dataNutrition')} color={TILE.green} icon={<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />} onClick={() => p.openDrawer('nutrition')}
                big={p.nutri || (p.eaten && p.eaten.hasLog) ? <><CountUp value={p.eaten?.kcal ?? 0} /><Unit> / {p.nutri?.calories_mid ?? '—'} {t('w1e.kcalUnit')}</Unit></> : null}
                sub={p.nutri || (p.eaten && p.eaten.hasLog) ? t('w1e.eatenVsGoal') : t('w1e.noNutritionLog')}
                metrics={p.nutri || (p.eaten && p.eaten.hasLog) ? [[`${p.eaten?.prot ?? 0}${p.nutri?.proteines ? ` / ${p.nutri.proteines}` : ''}`, t('w1e.proteinG')], [`${p.eaten?.gluc ?? 0}${p.nutri?.glucides ? ` / ${p.nutri.glucides}` : ''}`, t('w1e.carbsG')]] : []} />
              <CCard>
                <button type="button" onClick={() => p.openDrawer('recovery')} className="cm-press" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                  <DataHead label={t('w1e.injuriesLabel')} color={TILE.red} icon={<path d="M12 2v20M2 12h20" />} />
                </button>
                <div style={{ ...NUM, marginTop: 10, fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: p.activeInj.length ? 'var(--danger)' : 'var(--text)' }}>
                  <CountUp value={p.activeInj.length} /><Unit> {p.activeInj.length > 1 ? t('w1e.activeFemN') : t('w1e.activeFem1')}</Unit>
                </div>
                {p.activeInj.length === 0 ? <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--text-mid)' }}>{t('w1e.noActiveInjury')}</p> : p.activeInj.slice(0, 3).map((x, i) => (
                  <RowLink key={x.id} first={i === 0} href="/injuries" style={{ minHeight: 52 }}>
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                    <RowText title={x.label} />
                  </RowLink>
                ))}
              </CCard>
            </div>
          )}

          {p.tab === 'goals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <CCard>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text-mid)' }}>{t('w1e.primaryGoal')}</span>
                <span style={{ display: 'block', marginTop: 6, fontSize: 22, fontWeight: 800, letterSpacing: '-0.015em', color: p.profile?.primary_goal ? 'var(--text)' : 'var(--text-dim)' }}>{p.profile?.primary_goal ? fx.goalLabel(p.profile.primary_goal) : t('w1e.notProvided')}</span>
              </CCard>
              <CCard>
                <CardHead title={t('w1e.upcomingRaces')} right={t('w1e.actCalendar')} onRight={() => p.openDrawer('calendar')} />
                {p.races.length === 0 ? <EmptyM icon={<Ico d={ICON.flag} size={24} />} title={t('w1e.noRacePlanned')} /> : p.races.map((r, i) => {
                  const d = fx.daysTo(r.start_date); const w = Math.floor(d / 7)
                  return (
                    <RowLink key={r.id} first={i === 0} href={`/calendar?race=${r.id}`}>
                      <span style={{ ...NUM, width: 64, flexShrink: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{t('w1e.dayCountdown', { d })}</span>
                      <RowText title={r.name || t('w1e.race')} sub={<span style={NUM}>{d <= 14 && <span aria-hidden style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', marginRight: 6, verticalAlign: 'middle' }} />}{fx.fmtDate(r.start_date)} · {w > 0 ? t('w1e.weeksShort', { w }) : t('w1e.daysShort', { d })}</span>} />
                    </RowLink>
                  )
                })}
              </CCard>
            </div>
          )}

          {p.tab === 'connexions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <CCard>
                <CardHead title={t('w1e.connectedApps')} />
                {p.conns === null ? <SkelRows n={2} /> : p.conns.filter(c => c.is_active).length === 0 ? <EmptyM title={t('w1e.noConnectedApp')} /> : p.conns.filter(c => c.is_active).map((c, i) => {
                  const m = fx.providerMeta(c.provider)
                  return (
                    <div key={c.provider} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, minHeight: 64, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: `color-mix(in srgb, ${m.color} 16%, transparent)`, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{m.initials}</span>
                      <RowText title={m.name} sub={<span style={{ color: c.last_error ? 'var(--danger)' : undefined }}>{c.last_error ? t('w1e.syncError') : c.last_used_at ? t('w1e.syncedOn', { date: fx.fmtDate(c.last_used_at) }) : t('w1e.connected')}</span>} />
                      <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: c.last_error ? 'var(--danger)' : 'var(--success)', flexShrink: 0 }} />
                    </div>
                  )
                })}
              </CCard>
              <p style={{ margin: '0 6px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>{t('w1e.connectionsInfo')}</p>
            </div>
          )}
        </TabPanel>
      )}

      {p.drawerSlot}
    </MPage>
  )
}

function Unit({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-mid)', letterSpacing: 0 }}>{children}</span>
}
function Kpi({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, padding: '14px 14px 16px', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ ...NUM, display: 'block', marginTop: 4, fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: tone ?? 'var(--text)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}
function KV({ k, v, first }: { k: string; v: ReactNode; first?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 54, borderTop: first ? 'none' : '1px solid var(--border)' }}>
      <span style={{ flexShrink: 0, fontSize: 16, color: 'var(--text-mid)' }}>{k}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
    </div>
  )
}
function DataHead({ label, color, icon }: { label: string; color: string; icon: ReactNode }) {
  return (
    <>
      <span style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: `color-mix(in srgb, ${color} 14%, transparent)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico d={icon} size={19} /></span>
      <span style={{ flex: 1, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{label}</span>
      <span style={{ color: 'var(--text-dim)', display: 'flex' }}><Ico d={ICON.chev} size={18} /></span>
    </>
  )
}
function DataCard({ label, color, icon, onClick, big, sub, metrics }: { label: string; color: string; icon: ReactNode; onClick: () => void; big: ReactNode | null; sub: string; metrics: [string, string][] }) {
  return (
    <button type="button" onClick={onClick} className="cm-press"
      style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, padding: 16, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><DataHead label={label} color={color} icon={icon} /></span>
      {big && <span style={{ ...NUM, display: 'block', marginTop: 12, fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{big}</span>}
      <span style={{ display: 'block', marginTop: big ? 4 : 10, fontSize: 15, color: 'var(--text-mid)' }}>{sub}</span>
      {metrics.length > 0 && (
        <span style={{ display: 'flex', gap: 22, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {metrics.map(([v, l], i) => (
            <span key={i} style={{ minWidth: 0 }}>
              <span style={{ ...NUM, display: 'block', fontSize: 17, fontWeight: 800 }}>{v}</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{l}</span>
            </span>
          ))}
        </span>
      )}
    </button>
  )
}
