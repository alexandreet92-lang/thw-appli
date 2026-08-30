'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// RÉGLAGES COACH — même langage visuel que les réglages athlète
// (ProfileContent) : fond quasi blanc, en-tête avatar, groupes de bulles
// cliquables + drill-down façon Claude, mêmes polices (Fraunces / Inter) et
// mêmes primitives (Section / Group / Line / Toggle / Intro). Le contenu
// est propre au métier de coach. UI-first : persisté en local
// (thw_coach_settings), branché au backend progressivement.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, CreditCard, Users, Sparkles, Share2, ClipboardList, Bell, SlidersHorizontal, Zap, Shield, Palette, LogOut, ChevronLeft, Check, Languages } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { SlideView } from '@/components/ui/SlideView'
import { useI18n } from '@/lib/i18n'

// ── Fonds « façon Claude » (identiques à ProfileContent) ─────────────
const GREY_CARD = 'color-mix(in srgb, var(--text) 6%, var(--bg))'
const GREY_PAGE = 'color-mix(in srgb, var(--text) 1.5%, var(--bg))'

const KEY = 'thw_coach_settings'

type S = Record<string, unknown>
const DEFAULTS: S = {
  // profil
  coachName: '', specialties: ['Endurance'], bio: '', certifs: '', directoryVisible: false,
  // athlètes & accès
  inviteMethod: 'code', autoAccept: false, autoRemoveInactive: false, autoRemoveMonths: 6,
  // assistant IA
  aiModel: 'athena', aiTone: 'pedago', aiAutonomy: 'propose',
  aiReadActivities: true, aiReadRecovery: true, aiReadNutrition: true, aiReadInjuries: true, aiReadPlanning: true,
  // studio
  studioModel: 'athena', studioExec: 'manual', studioCadence: 'weekly', studioTarget: 'all',
  // notifications
  notifNewAthlete: true, notifMessage: true, notifHealth: true, notifRace: true, notifStudioRun: true, notifAdherence: true, notifCheckin: false,
  chanInApp: true, chanPush: true, chanEmail: false, notifFreq: 'realtime', quietFrom: '22:00', quietTo: '07:00',
  // seuils
  thInactive: 7, thFatigue: 4, thAdherence: 60, thLoadSpike: 40, thSleep: 2,
  // automatisations
  autoRelance: false, autoDeload: false, autoWeeklyReport: false, autoAdherence: false, autoInjuryPause: false,
  // assignation
  assignSport: 'run', assignDuration: 60, assignRequireValidation: false,
  // apparence
  lang: 'fr', units: 'metric',
}

// ══════════════════════════════════════════════════
// PRIMITIVES (mêmes que ProfileContent)
// ══════════════════════════════════════════════════

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {label && <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px 4px' }}>{label}</p>}
      {children}
    </div>
  )
}
function Group({ children }: { children: React.ReactNode }) {
  return <div style={{ background: GREY_CARD, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>{children}</div>
}
function Line({ first, align = 'center', children }: { first?: boolean; align?: 'center' | 'flex-start'; children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: align, gap: 12, padding: '13px 16px', borderTop: first ? 'none' : '1px solid var(--border)', width: '100%', boxSizing: 'border-box' }}>{children}</div>
}
function Intro({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, margin: '0 0 18px 2px' }}>{children}</p>
}
function Toggle({ value, onChange, locked }: { value: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <button onClick={() => !locked && onChange?.(!value)} disabled={locked} style={{ width: 50, height: 30, borderRadius: 15, background: value ? 'var(--primary)' : 'var(--border-mid)', border: 'none', cursor: locked ? 'default' : 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s', opacity: locked ? 0.65 : 1 }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }} />
    </button>
  )
}

// Ligne label + toggle (façon DevicePushSection athlète).
function ToggleLine({ first, label, sub, value, onChange, locked }: { first?: boolean; label: string; sub?: string; value: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  const { t } = useI18n()
  return (
    <Line first={first}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{label}{locked && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 7, fontWeight: 700 }}>{t('w1b.locked')}</span>}</p>
        {sub && <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>{sub}</p>}
      </div>
      <Toggle value={value} onChange={onChange} locked={locked} />
    </Line>
  )
}

// Ligne label + contrôle à droite.
function FieldLine({ first, label, children }: { first?: boolean; label: string; children: React.ReactNode }) {
  return (
    <Line first={first}>
      <span style={{ flex: 1, fontSize: 15, color: 'var(--text)' }}>{label}</span>
      {children}
    </Line>
  )
}

// ── Contrôles (style athlète : input-bg, border) ─────────────────────
const ctrl: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 13.5, fontFamily: 'var(--font-body)', outline: 'none' }

function Seg({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{ border: 'none', borderRadius: 7, padding: '6px 11px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', background: value === v ? 'var(--bg-card)' : 'transparent', color: value === v ? 'var(--primary)' : 'var(--text-mid)', boxShadow: value === v ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>{l}</button>
      ))}
    </div>
  )
}
function Select({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ ...ctrl, cursor: 'pointer' }}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
}
function SliderLine({ first, label, min, max, step = 1, value, onChange, suffix }: { first?: boolean; label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <Line first={first} align="flex-start">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginBottom: 8 }}>
          <span style={{ color: 'var(--text)' }}>{label}</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{value}{suffix}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
      </div>
    </Line>
  )
}

// Nav row (façon ListRow athlète) — icône + libellé + valeur + chevron.
function ListRow({ Icon, label, value, danger, last, onClick }: { Icon: typeof User; label: string; value?: string; danger?: boolean; last?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left' as const, padding: '0 16px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.14s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? '#ef4444' : 'var(--text-mid)' }}>
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, color: danger ? '#ef4444' : 'var(--text)' }}>{label}</span>
        {value && <span style={{ fontSize: 13, color: 'var(--text-dim)', flexShrink: 0 }}>{value}</span>}
        {!danger && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>}
      </span>
    </button>
  )
}

// ══════════════════════════════════════════════════
// BLOCS (contenu des bulles)
// ══════════════════════════════════════════════════

type SetFn = (k: string, v: unknown) => void

function ProfilBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.profil_intro')}</Intro>
      <Section label={t('w1b.sec_identite')}>
        <Group>
          <Line first align="flex-start">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 6px' }}>{t('w1b.field_display_name')}</p>
              <input value={s.coachName as string} onChange={e => set('coachName', e.target.value)} placeholder={t('w1b.ph_coach_alex')} style={{ ...ctrl, width: '100%', boxSizing: 'border-box', fontSize: 15, background: 'transparent', border: 'none', padding: 0 }} />
            </div>
          </Line>
          <Line align="flex-start">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 6px' }}>{t('w1b.field_certifs')}</p>
              <input value={s.certifs as string} onChange={e => set('certifs', e.target.value)} placeholder={t('w1b.ph_certifs')} style={{ ...ctrl, width: '100%', boxSizing: 'border-box', fontSize: 15, background: 'transparent', border: 'none', padding: 0 }} />
            </div>
          </Line>
        </Group>
      </Section>

      <Section label={t('w1b.sec_specialites')}>
        <Group>
          <Line first>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['Endurance', 'Force', 'Trail', 'Route', 'Triathlon', 'Hyrox', 'Natation', 'Cyclisme'].map(o => {
                const on = (s.specialties as string[]).includes(o)
                return (
                  <button key={o} onClick={() => { const v = s.specialties as string[]; set('specialties', on ? v.filter(x => x !== o) : [...v, o]) }}
                    style={{ border: `1px solid ${on ? 'color-mix(in srgb, var(--primary) 40%, var(--border))' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--input-bg)', color: on ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{o}</button>
                )
              })}
            </div>
          </Line>
        </Group>
      </Section>

      <Section label={t('w1b.sec_bio')}>
        <Group>
          <textarea value={s.bio as string} onChange={e => set('bio', e.target.value)} placeholder={t('w1b.ph_bio')} rows={3}
            style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'none' as const, fontFamily: 'var(--font-body)', lineHeight: 1.6, boxSizing: 'border-box' as const, display: 'block' }} />
        </Group>
      </Section>

      <Section label={t('w1b.sec_visibilite')}>
        <Group>
          <ToggleLine first label={t('w1b.tog_directory')} sub={t('w1b.tog_directory_sub')} value={!!s.directoryVisible} onChange={v => set('directoryVisible', v)} />
        </Group>
      </Section>
    </div>
  )
}

function AccesBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.acces_intro')}</Intro>
      <Section label={t('w1b.sec_invitation')}>
        <Group>
          <FieldLine first label={t('w1b.field_default_method')}><Seg value={s.inviteMethod as string} options={[['code', t('w1b.opt_code')], ['link', t('w1b.opt_link')]]} onChange={v => set('inviteMethod', v)} /></FieldLine>
          <ToggleLine label={t('w1b.tog_auto_accept')} sub={t('w1b.tog_auto_accept_sub')} value={!!s.autoAccept} onChange={v => set('autoAccept', v)} />
        </Group>
      </Section>
      <Section label={t('w1b.sec_consent')}>
        <Group>
          <ToggleLine first label={t('w1b.tog_consent')} sub={t('w1b.tog_consent_sub')} value locked />
          <ToggleLine label={t('w1b.tog_remove_inactive')} sub={t('w1b.tog_remove_inactive_sub', { n: s.autoRemoveMonths as number })} value={!!s.autoRemoveInactive} onChange={v => set('autoRemoveInactive', v)} />
          {!!s.autoRemoveInactive && <SliderLine label={t('w1b.slider_after')} min={1} max={12} value={s.autoRemoveMonths as number} onChange={v => set('autoRemoveMonths', v)} suffix={t('w1b.suffix_months')} />}
        </Group>
      </Section>
    </div>
  )
}

function IaBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.ia_intro')}</Intro>
      <Section label={t('w1b.sec_behavior')}>
        <Group>
          <FieldLine first label={t('w1b.default_model')}><Select value={s.aiModel as string} options={[['hermes', 'Hermès'], ['athena', 'Athéna'], ['zeus', 'Zeus']]} onChange={v => set('aiModel', v)} /></FieldLine>
          <FieldLine label={t('w1b.field_tone')}><Select value={s.aiTone as string} options={[['concis', t('w1b.opt_concis')], ['pedago', t('w1b.opt_pedago')], ['direct', t('w1b.opt_direct')]]} onChange={v => set('aiTone', v)} /></FieldLine>
          <FieldLine label={t('w1b.field_autonomy')}><Seg value={s.aiAutonomy as string} options={[['propose', t('w1b.opt_propose')], ['auto', t('w1b.opt_auto_act')]]} onChange={v => set('aiAutonomy', v)} /></FieldLine>
        </Group>
      </Section>
      <Section label={t('w1b.sec_ai_readable')}>
        <Group>
          <ToggleLine first label={t('w1b.tog_activities')} value={!!s.aiReadActivities} onChange={v => set('aiReadActivities', v)} />
          <ToggleLine label={t('w1b.tog_recovery')} value={!!s.aiReadRecovery} onChange={v => set('aiReadRecovery', v)} />
          <ToggleLine label={t('w1b.tog_nutrition')} value={!!s.aiReadNutrition} onChange={v => set('aiReadNutrition', v)} />
          <ToggleLine label={t('w1b.tog_injuries')} value={!!s.aiReadInjuries} onChange={v => set('aiReadInjuries', v)} />
          <ToggleLine label={t('w1b.tog_planning')} value={!!s.aiReadPlanning} onChange={v => set('aiReadPlanning', v)} />
        </Group>
      </Section>
    </div>
  )
}

function StudioBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.studio_intro')}</Intro>
      <Section label={t('w1b.sec_system_defaults')}>
        <Group>
          <FieldLine first label={t('w1b.default_model')}><Select value={s.studioModel as string} options={[['hermes', 'Hermès'], ['athena', 'Athéna'], ['zeus', 'Zeus']]} onChange={v => set('studioModel', v)} /></FieldLine>
          <FieldLine label={t('w1b.field_execution')}><Seg value={s.studioExec as string} options={[['manual', t('w1b.opt_manual')], ['auto', t('w1b.opt_auto')]]} onChange={v => set('studioExec', v)} /></FieldLine>
          <FieldLine label={t('w1b.field_cadence')}><Seg value={s.studioCadence as string} options={[['weekly', t('w1b.opt_hebdo')], ['biweekly', t('w1b.opt_biweekly')]]} onChange={v => set('studioCadence', v)} /></FieldLine>
          <FieldLine label={t('w1b.field_target')}><Seg value={s.studioTarget as string} options={[['all', t('w1b.opt_all')], ['group', t('w1b.opt_group')]]} onChange={v => set('studioTarget', v)} /></FieldLine>
        </Group>
      </Section>
    </div>
  )
}

function NotifsBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.notifs_intro')}</Intro>
      <Section label={t('w1b.sec_events')}>
        <Group>
          <ToggleLine first label={t('w1b.tog_new_athlete')} value={!!s.notifNewAthlete} onChange={v => set('notifNewAthlete', v)} />
          <ToggleLine label={t('w1b.tog_message')} value={!!s.notifMessage} onChange={v => set('notifMessage', v)} />
          <ToggleLine label={t('w1b.tog_health')} sub={t('w1b.tog_health_sub')} value={!!s.notifHealth} onChange={v => set('notifHealth', v)} />
          <ToggleLine label={t('w1b.tog_race')} value={!!s.notifRace} onChange={v => set('notifRace', v)} />
          <ToggleLine label={t('w1b.tog_studio_run')} value={!!s.notifStudioRun} onChange={v => set('notifStudioRun', v)} />
          <ToggleLine label={t('w1b.tog_adherence')} value={!!s.notifAdherence} onChange={v => set('notifAdherence', v)} />
          <ToggleLine label={t('w1b.tog_checkin')} value={!!s.notifCheckin} onChange={v => set('notifCheckin', v)} />
        </Group>
      </Section>
      <Section label={t('w1b.sec_channels')}>
        <Group>
          <ToggleLine first label={t('w1b.tog_inapp')} value={!!s.chanInApp} onChange={v => set('chanInApp', v)} />
          <ToggleLine label={t('w1b.tog_push')} value={!!s.chanPush} onChange={v => set('chanPush', v)} />
          <ToggleLine label={t('w1b.tog_email')} value={!!s.chanEmail} onChange={v => set('chanEmail', v)} />
        </Group>
      </Section>
      <Section label={t('w1b.sec_rhythm')}>
        <Group>
          <FieldLine first label={t('w1b.field_frequency')}><Select value={s.notifFreq as string} options={[['realtime', t('w1b.opt_realtime')], ['daily', t('w1b.opt_daily')], ['weekly', t('w1b.opt_hebdo')]]} onChange={v => set('notifFreq', v)} /></FieldLine>
          <FieldLine label={t('w1b.field_quiet_hours')}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="time" value={s.quietFrom as string} onChange={e => set('quietFrom', e.target.value)} style={{ ...ctrl, cursor: 'pointer' }} />
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>→</span>
              <input type="time" value={s.quietTo as string} onChange={e => set('quietTo', e.target.value)} style={{ ...ctrl, cursor: 'pointer' }} />
            </span>
          </FieldLine>
        </Group>
      </Section>
    </div>
  )
}

function SeuilsBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.seuils_intro')}</Intro>
      <Section>
        <Group>
          <SliderLine first label={t('w1b.slider_inactivity')} min={2} max={21} value={s.thInactive as number} onChange={v => set('thInactive', v)} suffix={t('w1b.suffix_days')} />
          <SliderLine label={t('w1b.slider_high_fatigue')} min={2} max={5} step={0.5} value={s.thFatigue as number} onChange={v => set('thFatigue', v)} suffix=" /5" />
          <SliderLine label={t('w1b.slider_low_adherence')} min={30} max={90} step={5} value={s.thAdherence as number} onChange={v => set('thAdherence', v)} suffix=" %" />
          <SliderLine label={t('w1b.slider_load_spike')} min={20} max={80} step={5} value={s.thLoadSpike as number} onChange={v => set('thLoadSpike', v)} suffix=" %" />
          <SliderLine label={t('w1b.slider_low_sleep')} min={1} max={4} step={0.5} value={s.thSleep as number} onChange={v => set('thSleep', v)} suffix=" /5" />
        </Group>
      </Section>
    </div>
  )
}

function AutoBloc({ s, set, onStudio }: { s: S; set: SetFn; onStudio: () => void }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.auto_intro')}</Intro>
      <Section>
        <Group>
          <ToggleLine first label={t('w1b.tog_relance')} sub={t('w1b.tog_relance_sub', { n: s.thInactive as number })} value={!!s.autoRelance} onChange={v => set('autoRelance', v)} />
          <ToggleLine label={t('w1b.tog_deload')} sub={t('w1b.tog_deload_sub')} value={!!s.autoDeload} onChange={v => set('autoDeload', v)} />
          <ToggleLine label={t('w1b.tog_weekly_report')} sub={t('w1b.tog_weekly_report_sub')} value={!!s.autoWeeklyReport} onChange={v => set('autoWeeklyReport', v)} />
          <ToggleLine label={t('w1b.tog_auto_adherence')} sub={t('w1b.tog_auto_adherence_sub', { n: s.thAdherence as number })} value={!!s.autoAdherence} onChange={v => set('autoAdherence', v)} />
          <ToggleLine label={t('w1b.tog_injury_pause')} sub={t('w1b.tog_injury_pause_sub')} value={!!s.autoInjuryPause} onChange={v => set('autoInjuryPause', v)} />
        </Group>
      </Section>
      <button onClick={onStudio} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--primary) 40%, var(--border))', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{t('w1b.btn_custom_auto')}</button>
    </div>
  )
}

function AssignBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.assign_intro')}</Intro>
      <Section>
        <Group>
          <FieldLine first label={t('w1b.field_default_sport')}><Select value={s.assignSport as string} options={[['run', t('w1b.opt_run')], ['bike', t('w1b.opt_bike')], ['swim', t('w1b.opt_swim')], ['gym', t('w1b.opt_gym')], ['hyrox', 'Hyrox'], ['trail_run', t('w1b.opt_trail')], ['other', t('w1b.opt_other')]]} onChange={v => set('assignSport', v)} /></FieldLine>
          <SliderLine label={t('w1b.slider_default_duration')} min={15} max={240} step={15} value={s.assignDuration as number} onChange={v => set('assignDuration', v)} suffix=" min" />
          <ToggleLine label={t('w1b.tog_require_validation')} sub={t('w1b.tog_require_validation_sub')} value={!!s.assignRequireValidation} onChange={v => set('assignRequireValidation', v)} />
        </Group>
      </Section>
    </div>
  )
}

function LinkRow({ first, label, sub, onClick }: { first?: boolean; label: string; sub: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: first ? 'none' : '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left' as const, width: '100%', boxSizing: 'border-box' as const }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>{sub}</p>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}

function DataBloc() {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.data_intro_1')}<b>{t('w1b.data_intro_bold')}</b>{t('w1b.data_intro_2')}</Intro>
      <Section label={t('w1b.sec_athlete_data')}>
        <Group>
          {/* « Journal d'accès aux données » : fonctionnalité in-app non encore
              construite (aucune page) → masquée tant qu'elle n'existe pas. */}
          <LinkRow first label={t('w1b.link_export')} sub={t('w1b.link_export_sub')} onClick={() => window.open('/site/exporter-mes-donnees.html', '_blank', 'noopener')} />
          <LinkRow label={t('w1b.link_privacy')} sub={t('w1b.link_privacy_sub')} onClick={() => window.open('/site/confidentialite.html', '_blank', 'noopener')} />
        </Group>
      </Section>
    </div>
  )
}

function OffreBloc() {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.offre_intro')}</Intro>
      <Section label={t('w1b.sec_current_plan')}>
        <Group>
          <Line first>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('w1b.offre_coach')}</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>{t('w1b.offre_coach_sub')}</p>
            </div>
            <a href="/settings/subscription" style={{ textDecoration: 'none', padding: '8px 14px', borderRadius: 10, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{t('w1b.manage')}</a>
          </Line>
        </Group>
      </Section>
      <Section label={t('w1b.sec_billing')}>
        <Group>
          <LinkRow first label={t('w1b.link_token_packs')} sub={t('w1b.link_token_packs_sub')} onClick={() => window.open('/site/recharge-tokens.html', '_blank', 'noopener')} />
          <LinkRow label={t('w1b.link_billing_history')} sub={t('w1b.link_billing_history_sub')} onClick={() => { window.location.href = '/coach/subscription' }} />
        </Group>
      </Section>
    </div>
  )
}

// Apparence & unités (l'apparence/thème suit le système ; ici : unités).
function ApparenceBloc({ s, set }: { s: S; set: SetFn }) {
  const { t } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.apparence_intro')}</Intro>
      <Section>
        <Group>
          <FieldLine first label={t('w1b.field_units')}><Seg value={s.units as string} options={[['metric', t('w1b.opt_metric')], ['imperial', t('w1b.opt_imperial')]]} onChange={v => set('units', v)} /></FieldLine>
        </Group>
      </Section>
    </div>
  )
}

// Langue de l'app (coach) : pilote le contexte i18n GLOBAL (setLang) → change
// réellement toute l'app. 3 langues, comme côté athlète.
function LangueBloc() {
  const { t, lang, setLang } = useI18n()
  return (
    <div>
      <Intro>{t('w1b.langue_intro')}</Intro>
      <Section>
        <Group>
          <FieldLine first label={t('w1b.field_language')}>
            <Seg value={lang} options={[['fr', 'Français'], ['en', 'English'], ['es', 'Español']]} onChange={v => setLang(v as 'fr' | 'en' | 'es')} />
          </FieldLine>
        </Group>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════
// CONTENU — liste + drill-down (mirroir de ProfileContent)
// ══════════════════════════════════════════════════

export function CoachSettingsContent() {
  const router = useRouter()
  const { t } = useI18n()
  const { profile } = useProfile()
  const [s, setS] = useState<S>(DEFAULTS)
  const [active, setActive] = useState<string | null>(null)
  const [dir, setDir] = useState(1)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const savedT = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) }) } catch { /* */ }
  }, [])
  const set = useCallback<SetFn>((k, v) => {
    setS(prev => { const next = { ...prev, [k]: v }; try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* */ }; return next })
    setSaved(true); if (savedT.current) clearTimeout(savedT.current); savedT.current = setTimeout(() => setSaved(false), 1400)
  }, [])

  function open(id: string) { setDir(1); setActive(id); window.scrollTo({ top: 0 }) }
  function back() { setDir(-1); setActive(null); window.scrollTo({ top: 0 }) }

  const CONTENT: Record<string, { label: string; node: React.ReactNode }> = {
    profil:    { label: t('w1b.nav_profil'),    node: <ProfilBloc s={s} set={set} /> },
    offre:     { label: t('w1b.nav_offre'),     node: <OffreBloc /> },
    data:      { label: t('w1b.nav_data'),      node: <DataBloc /> },
    acces:     { label: t('w1b.nav_acces'),     node: <AccesBloc s={s} set={set} /> },
    ia:        { label: t('w1b.nav_ia'),        node: <IaBloc s={s} set={set} /> },
    studio:    { label: t('w1b.nav_studio'),    node: <StudioBloc s={s} set={set} /> },
    assign:    { label: t('w1b.nav_assign'),    node: <AssignBloc s={s} set={set} /> },
    seuils:    { label: t('w1b.nav_seuils'),    node: <SeuilsBloc s={s} set={set} /> },
    auto:      { label: t('w1b.nav_auto'),      node: <AutoBloc s={s} set={set} onStudio={() => router.push('/coach/studio')} /> },
    notifs:    { label: t('w1b.nav_notifs'),    node: <NotifsBloc s={s} set={set} /> },
    apparence: { label: t('w1b.nav_apparence'), node: <ApparenceBloc s={s} set={set} /> },
    langue:    { label: t('w1b.nav_langue'),    node: <LangueBloc /> },
  }

  const GROUPS: { title: string; rows: { id: string; label: string; Icon: typeof User; value?: string }[] }[] = [
    { title: t('w1b.grp_compte'), rows: [
      { id: 'profil', label: t('w1b.nav_profil'), Icon: User },
      { id: 'offre',  label: t('w1b.nav_offre'), Icon: CreditCard, value: t('w1b.plan_coach_short') },
      { id: 'data',   label: t('w1b.nav_data'), Icon: Shield },
    ] },
    { title: t('w1b.grp_coaching'), rows: [
      { id: 'acces',  label: t('w1b.nav_acces'), Icon: Users },
      { id: 'ia',     label: t('w1b.nav_ia'), Icon: Sparkles },
      { id: 'studio', label: t('w1b.nav_studio'), Icon: Share2 },
      { id: 'assign', label: t('w1b.nav_assign'), Icon: ClipboardList },
      { id: 'seuils', label: t('w1b.nav_seuils'), Icon: SlidersHorizontal },
      { id: 'auto',   label: t('w1b.nav_auto'), Icon: Zap },
    ] },
    { title: t('w1b.grp_application'), rows: [
      { id: 'notifs',    label: t('w1b.nav_notifs'), Icon: Bell },
      { id: 'apparence', label: t('w1b.nav_apparence'), Icon: Palette },
      { id: 'langue',    label: t('w1b.nav_langue'), Icon: Languages },
    ] },
  ]

  const initial = (profile?.full_name || profile?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: GREY_PAGE, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 620, margin: '0 auto', padding: '20px 16px 40px', boxSizing: 'border-box' }}>
        <SlideView screenKey={active ?? '__list__'} direction={dir}>
          {active ? (
            <div>
              <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, margin: '0 -16px 16px', padding: '2px 16px 12px' }}>
                <button onClick={back} aria-label={t('w1b.back')} style={{ position: 'absolute', left: 16, top: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>
                  <ChevronLeft size={20} />
                </button>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{CONTENT[active]?.label}</p>
                <span style={{ position: 'absolute', right: 16, top: 10, fontSize: 12, color: 'var(--primary)', opacity: saved ? 1 : 0, transition: 'opacity .2s', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> {t('w1b.saved')}</span>
              </div>
              {CONTENT[active]?.node}
            </div>
          ) : (
            <div>
              {/* En-tête : avatar + nom + espace coach */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 4px 22px' }}>
                <div style={{ width: 58, height: 58, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--primary-dim)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {profile?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={profile.avatar_url} alt={t('w1b.avatar_alt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{initial}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || t('w1b.my_coach_space')}</p>
                  <p style={{ fontSize: 13, color: 'var(--primary)', margin: '3px 0 0', fontWeight: 700 }}>{t('w1b.coach_interface')}</p>
                </div>
              </div>

              {GROUPS.map(g => (
                <div key={g.title} style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px 4px' }}>{g.title}</p>
                  <div style={{ background: GREY_CARD, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    {g.rows.map((r, i) => (
                      <ListRow key={r.id} Icon={r.Icon} label={r.label} value={r.value} last={i === g.rows.length - 1} onClick={() => open(r.id)} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Quitter le mode coach */}
              <div style={{ background: GREY_CARD, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <ListRow Icon={LogOut} label={t('w1b.exit_coach')} danger last onClick={() => setConfirmLeave(true)} />
              </div>
            </div>
          )}
        </SlideView>

        {confirmLeave && (
          <div onClick={() => setConfirmLeave(false)} style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, background: 'var(--bg-card)', borderRadius: 18, padding: '22px 20px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', border: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>{t('w1b.exit_coach_q')}</p>
              <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>{t('w1b.exit_coach_desc')}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmLeave(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('w1b.cancel')}</button>
                <button onClick={() => router.push('/')} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('w1b.exit')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CoachSettingsPage() {
  return <CoachSettingsContent />
}
