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
import { User, CreditCard, Users, Sparkles, Share2, ClipboardList, Bell, SlidersHorizontal, Zap, Shield, Palette, LogOut, ChevronLeft, Check } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { SlideView } from '@/components/ui/SlideView'

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
  return (
    <Line first={first}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{label}{locked && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 7, fontWeight: 700 }}>· verrouillé</span>}</p>
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
  return (
    <div>
      <Intro>Ce que voient tes athlètes quand ils te rejoignent ou consultent ton profil.</Intro>
      <Section label="Identité">
        <Group>
          <Line first align="flex-start">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 6px' }}>Nom d&apos;affichage</p>
              <input value={s.coachName as string} onChange={e => set('coachName', e.target.value)} placeholder="Ex. Coach Alex" style={{ ...ctrl, width: '100%', boxSizing: 'border-box', fontSize: 15, background: 'transparent', border: 'none', padding: 0 }} />
            </div>
          </Line>
          <Line align="flex-start">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '0 0 6px' }}>Certifications / diplômes</p>
              <input value={s.certifs as string} onChange={e => set('certifs', e.target.value)} placeholder="Ex. BPJEPS, Ironman U. Certified…" style={{ ...ctrl, width: '100%', boxSizing: 'border-box', fontSize: 15, background: 'transparent', border: 'none', padding: 0 }} />
            </div>
          </Line>
        </Group>
      </Section>

      <Section label="Spécialités">
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

      <Section label="Bio">
        <Group>
          <textarea value={s.bio as string} onChange={e => set('bio', e.target.value)} placeholder="Présente-toi en une ou deux phrases…" rows={3}
            style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'none' as const, fontFamily: 'var(--font-body)', lineHeight: 1.6, boxSizing: 'border-box' as const, display: 'block' }} />
        </Group>
      </Section>

      <Section label="Visibilité">
        <Group>
          <ToggleLine first label="Visible dans l'annuaire coach" sub="Permet à de nouveaux athlètes de te trouver." value={!!s.directoryVisible} onChange={v => set('directoryVisible', v)} />
        </Group>
      </Section>
    </div>
  )
}

function AccesBloc({ s, set }: { s: S; set: SetFn }) {
  return (
    <div>
      <Intro>Comment tes athlètes te rejoignent, et les règles du lien coach ↔ athlète.</Intro>
      <Section label="Invitation">
        <Group>
          <FieldLine first label="Méthode par défaut"><Seg value={s.inviteMethod as string} options={[['code', 'Code'], ['link', 'Lien']]} onChange={v => set('inviteMethod', v)} /></FieldLine>
          <ToggleLine label="Accepter automatiquement les demandes" sub="Les athlètes qui entrent ton code sont liés sans validation." value={!!s.autoAccept} onChange={v => set('autoAccept', v)} />
        </Group>
      </Section>
      <Section label="Consentement & inactivité">
        <Group>
          <ToggleLine first label="Consentement de l'athlète requis" sub="L'athlète doit accepter avant que tu voies ses données (RGPD)." value locked />
          <ToggleLine label="Retirer les athlètes inactifs" sub={`Rompre le lien après ${s.autoRemoveMonths} mois sans activité.`} value={!!s.autoRemoveInactive} onChange={v => set('autoRemoveInactive', v)} />
          {!!s.autoRemoveInactive && <SliderLine label="Après" min={1} max={12} value={s.autoRemoveMonths as number} onChange={v => set('autoRemoveMonths', v)} suffix=" mois" />}
        </Group>
      </Section>
    </div>
  )
}

function IaBloc({ s, set }: { s: S; set: SetFn }) {
  return (
    <div>
      <Intro>L&apos;IA t&apos;aide à piloter ton roster. Elle est distincte du coach personnel de l&apos;athlète.</Intro>
      <Section label="Comportement">
        <Group>
          <FieldLine first label="Modèle par défaut"><Select value={s.aiModel as string} options={[['hermes', 'Hermès'], ['athena', 'Athéna'], ['zeus', 'Zeus']]} onChange={v => set('aiModel', v)} /></FieldLine>
          <FieldLine label="Ton"><Select value={s.aiTone as string} options={[['concis', 'Concis'], ['pedago', 'Pédagogue'], ['direct', 'Direct']]} onChange={v => set('aiTone', v)} /></FieldLine>
          <FieldLine label="Autonomie"><Seg value={s.aiAutonomy as string} options={[['propose', 'Propose'], ['auto', 'Agit auto']]} onChange={v => set('aiAutonomy', v)} /></FieldLine>
        </Group>
      </Section>
      <Section label="Données lisibles par l'IA">
        <Group>
          <ToggleLine first label="Activités" value={!!s.aiReadActivities} onChange={v => set('aiReadActivities', v)} />
          <ToggleLine label="Récupération" value={!!s.aiReadRecovery} onChange={v => set('aiReadRecovery', v)} />
          <ToggleLine label="Nutrition" value={!!s.aiReadNutrition} onChange={v => set('aiReadNutrition', v)} />
          <ToggleLine label="Blessures" value={!!s.aiReadInjuries} onChange={v => set('aiReadInjuries', v)} />
          <ToggleLine label="Planning" value={!!s.aiReadPlanning} onChange={v => set('aiReadPlanning', v)} />
        </Group>
      </Section>
    </div>
  )
}

function StudioBloc({ s, set }: { s: S; set: SetFn }) {
  return (
    <div>
      <Intro>Systèmes IA qui tournent sur les données de tes athlètes (analyses, rapports, alertes).</Intro>
      <Section label="Défauts des systèmes">
        <Group>
          <FieldLine first label="Modèle par défaut"><Select value={s.studioModel as string} options={[['hermes', 'Hermès'], ['athena', 'Athéna'], ['zeus', 'Zeus']]} onChange={v => set('studioModel', v)} /></FieldLine>
          <FieldLine label="Exécution"><Seg value={s.studioExec as string} options={[['manual', 'Manuelle'], ['auto', 'Auto']]} onChange={v => set('studioExec', v)} /></FieldLine>
          <FieldLine label="Cadence"><Seg value={s.studioCadence as string} options={[['weekly', 'Hebdo'], ['biweekly', '2 sem.']]} onChange={v => set('studioCadence', v)} /></FieldLine>
          <FieldLine label="Cible"><Seg value={s.studioTarget as string} options={[['all', 'Tous'], ['group', 'Groupe']]} onChange={v => set('studioTarget', v)} /></FieldLine>
        </Group>
      </Section>
    </div>
  )
}

function NotifsBloc({ s, set }: { s: S; set: SetFn }) {
  return (
    <div>
      <Intro>Quand te prévenir, et par quels canaux.</Intro>
      <Section label="Événements">
        <Group>
          <ToggleLine first label="Nouvel athlète accepté" value={!!s.notifNewAthlete} onChange={v => set('notifNewAthlete', v)} />
          <ToggleLine label="Message reçu d'un athlète" value={!!s.notifMessage} onChange={v => set('notifMessage', v)} />
          <ToggleLine label="Alerte santé" sub="Blessure, surmenage ou inactivité" value={!!s.notifHealth} onChange={v => set('notifHealth', v)} />
          <ToggleLine label="Échéance de course proche" value={!!s.notifRace} onChange={v => set('notifRace', v)} />
          <ToggleLine label="Run Studio terminé" value={!!s.notifStudioRun} onChange={v => set('notifStudioRun', v)} />
          <ToggleLine label="Adhérence faible d'un athlète" value={!!s.notifAdherence} onChange={v => set('notifAdherence', v)} />
          <ToggleLine label="Nouveau check-in récupération" value={!!s.notifCheckin} onChange={v => set('notifCheckin', v)} />
        </Group>
      </Section>
      <Section label="Canaux">
        <Group>
          <ToggleLine first label="Dans l'app" value={!!s.chanInApp} onChange={v => set('chanInApp', v)} />
          <ToggleLine label="Notifications push" value={!!s.chanPush} onChange={v => set('chanPush', v)} />
          <ToggleLine label="Email" value={!!s.chanEmail} onChange={v => set('chanEmail', v)} />
        </Group>
      </Section>
      <Section label="Rythme">
        <Group>
          <FieldLine first label="Fréquence"><Select value={s.notifFreq as string} options={[['realtime', 'Temps réel'], ['daily', 'Résumé quotidien'], ['weekly', 'Hebdo']]} onChange={v => set('notifFreq', v)} /></FieldLine>
          <FieldLine label="Heures calmes">
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
  return (
    <div>
      <Intro>Ce qui déclenche une alerte sur ton Dashboard coach.</Intro>
      <Section>
        <Group>
          <SliderLine first label="Inactivité" min={2} max={21} value={s.thInactive as number} onChange={v => set('thInactive', v)} suffix=" j" />
          <SliderLine label="Fatigue élevée (≥)" min={2} max={5} step={0.5} value={s.thFatigue as number} onChange={v => set('thFatigue', v)} suffix=" /5" />
          <SliderLine label="Adhérence faible (<)" min={30} max={90} step={5} value={s.thAdherence as number} onChange={v => set('thAdherence', v)} suffix=" %" />
          <SliderLine label="Pic de charge (>)" min={20} max={80} step={5} value={s.thLoadSpike as number} onChange={v => set('thLoadSpike', v)} suffix=" %" />
          <SliderLine label="Sommeil au plancher (≤)" min={1} max={4} step={0.5} value={s.thSleep as number} onChange={v => set('thSleep', v)} suffix=" /5" />
        </Group>
      </Section>
    </div>
  )
}

function AutoBloc({ s, set, onStudio }: { s: S; set: SetFn; onStudio: () => void }) {
  return (
    <div>
      <Intro>Des règles « si → alors » qui travaillent pour toi entre deux séances de coaching.</Intro>
      <Section>
        <Group>
          <ToggleLine first label="Relancer un athlète inactif" sub={`Message auto après ${s.thInactive} jours sans activité.`} value={!!s.autoRelance} onChange={v => set('autoRelance', v)} />
          <ToggleLine label="Alléger la semaine si récup au plancher" sub="Proposer un deload quand la fatigue explose." value={!!s.autoDeload} onChange={v => set('autoDeload', v)} />
          <ToggleLine label="Rapport hebdo automatique par athlète" sub="Une synthèse de sa semaine chaque lundi." value={!!s.autoWeeklyReport} onChange={v => set('autoWeeklyReport', v)} />
          <ToggleLine label="Alerter si adhérence faible" sub={`Me notifier + relancer sous ${s.thAdherence}%.`} value={!!s.autoAdherence} onChange={v => set('autoAdherence', v)} />
          <ToggleLine label="Mettre le plan en pause si blessure" sub="Suspendre les séances dures + m'alerter." value={!!s.autoInjuryPause} onChange={v => set('autoInjuryPause', v)} />
        </Group>
      </Section>
      <button onClick={onStudio} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--primary) 40%, var(--border))', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>Créer une automatisation sur mesure (Studio)</button>
    </div>
  )
}

function AssignBloc({ s, set }: { s: S; set: SetFn }) {
  return (
    <div>
      <Intro>Tes préférences par défaut quand tu assignes une séance à un athlète.</Intro>
      <Section>
        <Group>
          <FieldLine first label="Sport par défaut"><Select value={s.assignSport as string} options={[['run', 'Course'], ['bike', 'Vélo'], ['swim', 'Natation'], ['gym', 'Muscu'], ['hyrox', 'Hyrox'], ['trail_run', 'Trail'], ['other', 'Autre']]} onChange={v => set('assignSport', v)} /></FieldLine>
          <SliderLine label="Durée par défaut" min={15} max={240} step={15} value={s.assignDuration as number} onChange={v => set('assignDuration', v)} suffix=" min" />
          <ToggleLine label="Validation de l'athlète requise" sub="La séance compte comme faite seulement s'il la valide." value={!!s.assignRequireValidation} onChange={v => set('assignRequireValidation', v)} />
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
  return (
    <div>
      <Intro>Tu accèdes aux données de tes athlètes en <b>lecture seule</b>, uniquement après leur consentement — et ils peuvent le révoquer à tout moment.</Intro>
      <Section label="Données des athlètes">
        <Group>
          <LinkRow first label="Journal d'accès aux données" sub="Voir quand tu as consulté les fiches" />
          <LinkRow label="Exporter les données d'un athlète" sub="Sur demande de l'athlète (RGPD)" />
          <LinkRow label="Politique de confidentialité" sub="Comment les données sont protégées" />
        </Group>
      </Section>
    </div>
  )
}

function OffreBloc() {
  return (
    <div>
      <Intro>Ton plan coach et ta consommation Studio.</Intro>
      <Section label="Plan actuel">
        <Group>
          <Line first>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Offre Coach</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 0' }}>Jusqu&apos;à 25 athlètes · quota Studio mensuel</p>
            </div>
            <a href="/settings/subscription" style={{ textDecoration: 'none', padding: '8px 14px', borderRadius: 10, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>Gérer</a>
          </Line>
        </Group>
      </Section>
      <Section label="Facturation">
        <Group>
          <LinkRow first label="Packs de tokens Studio" sub="Recharger pour lancer plus de systèmes" />
          <LinkRow label="Historique de facturation" sub="Tes reçus et paiements" />
        </Group>
      </Section>
    </div>
  )
}

function ApparenceBloc({ s, set }: { s: S; set: SetFn }) {
  return (
    <div>
      <Intro>Langue et unités de ton espace coach.</Intro>
      <Section>
        <Group>
          <FieldLine first label="Langue"><Seg value={s.lang as string} options={[['fr', 'Français'], ['en', 'English']]} onChange={v => set('lang', v)} /></FieldLine>
          <FieldLine label="Unités"><Seg value={s.units as string} options={[['metric', 'Métrique'], ['imperial', 'Impérial']]} onChange={v => set('units', v)} /></FieldLine>
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
    profil:    { label: 'Profil coach',        node: <ProfilBloc s={s} set={set} /> },
    offre:     { label: 'Offre & facturation', node: <OffreBloc /> },
    data:      { label: 'Confidentialité',     node: <DataBloc /> },
    acces:     { label: 'Athlètes & accès',    node: <AccesBloc s={s} set={set} /> },
    ia:        { label: 'Assistant IA',        node: <IaBloc s={s} set={set} /> },
    studio:    { label: 'Studio coach',        node: <StudioBloc s={s} set={set} /> },
    assign:    { label: 'Assignation',         node: <AssignBloc s={s} set={set} /> },
    seuils:    { label: 'Alertes & seuils',    node: <SeuilsBloc s={s} set={set} /> },
    auto:      { label: 'Automatisations',     node: <AutoBloc s={s} set={set} onStudio={() => router.push('/coach/studio')} /> },
    notifs:    { label: 'Notifications',       node: <NotifsBloc s={s} set={set} /> },
    apparence: { label: 'Apparence & langue',  node: <ApparenceBloc s={s} set={set} /> },
  }

  const GROUPS: { title: string; rows: { id: string; label: string; Icon: typeof User; value?: string }[] }[] = [
    { title: 'Compte', rows: [
      { id: 'profil', label: 'Profil coach', Icon: User },
      { id: 'offre',  label: 'Offre & facturation', Icon: CreditCard, value: 'Coach' },
      { id: 'data',   label: 'Confidentialité', Icon: Shield },
    ] },
    { title: 'Coaching', rows: [
      { id: 'acces',  label: 'Athlètes & accès', Icon: Users },
      { id: 'ia',     label: 'Assistant IA', Icon: Sparkles },
      { id: 'studio', label: 'Studio coach', Icon: Share2 },
      { id: 'assign', label: 'Assignation', Icon: ClipboardList },
      { id: 'seuils', label: 'Alertes & seuils', Icon: SlidersHorizontal },
      { id: 'auto',   label: 'Automatisations', Icon: Zap },
    ] },
    { title: 'Application', rows: [
      { id: 'notifs',    label: 'Notifications', Icon: Bell },
      { id: 'apparence', label: 'Apparence & langue', Icon: Palette },
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
                <button onClick={back} aria-label="Retour" style={{ position: 'absolute', left: 16, top: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>
                  <ChevronLeft size={20} />
                </button>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{CONTENT[active]?.label}</p>
                <span style={{ position: 'absolute', right: 16, top: 10, fontSize: 12, color: 'var(--primary)', opacity: saved ? 1 : 0, transition: 'opacity .2s', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> Enregistré</span>
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
                    ? <img src={profile.avatar_url} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{initial}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Mon espace coach'}</p>
                  <p style={{ fontSize: 13, color: 'var(--primary)', margin: '3px 0 0', fontWeight: 700 }}>Interface coach</p>
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
                <ListRow Icon={LogOut} label="Quitter le mode coach" danger last onClick={() => setConfirmLeave(true)} />
              </div>
            </div>
          )}
        </SlideView>

        {confirmLeave && (
          <div onClick={() => setConfirmLeave(false)} style={{ position: 'fixed', inset: 0, zIndex: 13000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, background: 'var(--bg-card)', borderRadius: 18, padding: '22px 20px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', border: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>Quitter le mode coach ?</p>
              <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>Tu reviens à ton appli athlète. Tes athlètes et réglages coach sont conservés.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmLeave(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => router.push('/')} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Quitter</button>
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
