'use client'

export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════
// RÉGLAGES COACH — organisés en sections (comme les réglages athlète).
// Pensé pour couvrir tout : profil, athlètes & accès, assistant IA,
// Studio, notifications, seuils d'alerte, automatisations, assignation,
// confidentialité, facturation, apparence, zone sensible.
// UI-first : l'état est persisté en local (thw_coach_settings) et sera
// branché au backend progressivement.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const DISP = 'Syne, DM Sans, sans-serif'
const BODY = 'DM Sans, sans-serif'
const KEY = 'thw_coach_settings'

type S = Record<string, unknown>
const DEFAULTS: S = {
  // profil
  coachName: '', specialties: ['Endurance'], bio: '', certifs: '', directoryVisible: false,
  // athlètes & accès
  inviteMethod: 'code', autoAccept: false, defaultGroup: '', autoRemoveInactive: false, autoRemoveMonths: 6,
  // assistant IA
  aiModel: 'athena', aiTone: 'pedago', aiLang: 'fr', aiAutonomy: 'propose',
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

const NAV: [string, string][] = [
  ['profil', 'Profil coach'], ['acces', 'Athlètes & accès'], ['ia', 'Assistant IA'], ['studio', 'Studio coach'],
  ['notifs', 'Notifications'], ['seuils', 'Alertes & seuils'], ['auto', 'Automatisations'], ['assign', 'Assignation'],
  ['data', 'Confidentialité'], ['offre', 'Offre & facturation'], ['apparence', 'Apparence'], ['danger', 'Zone sensible'],
]

export default function CoachSettings() {
  const router = useRouter()
  const [s, setS] = useState<S>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const savedT = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) }) } catch { /* */ }
  }, [])
  const set = useCallback((k: string, v: unknown) => {
    setS(prev => { const next = { ...prev, [k]: v }; try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* */ }; return next })
    setSaved(true); if (savedT.current) clearTimeout(savedT.current); savedT.current = setTimeout(() => setSaved(false), 1400)
  }, [])

  const scrollTo = (id: string) => document.getElementById('sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div style={{ width: '100%', padding: '20px clamp(16px,4vw,40px) 80px', boxSizing: 'border-box', fontFamily: BODY }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 800, fontSize: 26, margin: 0, color: 'var(--text)', letterSpacing: '-0.01em' }}>Réglages</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: 7, padding: '3px 9px' }}>Coach</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary)', opacity: saved ? 1 : 0, transition: 'opacity .2s', fontWeight: 700 }}>Enregistré ✓</span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px' }}>Tout ce qui pilote ton espace coach. (Réglages sauvegardés localement — le branchement backend arrive progressivement.)</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 18 }}>
        {/* nav ancre */}
        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'linear-gradient(var(--bg) 70%, transparent)', paddingBottom: 6, display: 'flex', gap: 6, overflowX: 'auto' }}>
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ flexShrink: 0, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
          {/* ── PROFIL ── */}
          <Section id="profil" title="Profil coach" desc="Ce que voient tes athlètes.">
            <Field label="Nom d'affichage"><Input value={s.coachName as string} onChange={v => set('coachName', v)} placeholder="Ex. Coach Alex" /></Field>
            <Field label="Spécialités"><ChipMulti value={s.specialties as string[]} options={['Endurance', 'Force', 'Trail', 'Route', 'Triathlon', 'Hyrox', 'Natation', 'Cyclisme']} onChange={v => set('specialties', v)} /></Field>
            <Field label="Bio courte"><Area value={s.bio as string} onChange={v => set('bio', v)} placeholder="Présente-toi en une ou deux phrases…" /></Field>
            <Field label="Certifications / diplômes"><Input value={s.certifs as string} onChange={v => set('certifs', v)} placeholder="Ex. BPJEPS, Ironman U. Certified…" /></Field>
            <Toggle label="Visible dans l'annuaire coach" desc="Permet à de nouveaux athlètes de te trouver." on={!!s.directoryVisible} onChange={v => set('directoryVisible', v)} />
          </Section>

          {/* ── ATHLÈTES & ACCÈS ── */}
          <Section id="acces" title="Athlètes & accès" desc="Comment tes athlètes te rejoignent.">
            <Field label="Méthode d'invitation par défaut"><Seg value={s.inviteMethod as string} options={[['code', 'Code'], ['link', 'Lien']]} onChange={v => set('inviteMethod', v)} /></Field>
            <Toggle label="Consentement de l'athlète requis" desc="L'athlète doit accepter avant que tu voies ses données (RGPD)." on locked />
            <Toggle label="Accepter automatiquement les demandes" desc="Les athlètes qui entrent ton code sont liés sans validation." on={!!s.autoAccept} onChange={v => set('autoAccept', v)} />
            <Toggle label="Retirer les athlètes inactifs" desc={`Rompre le lien après ${s.autoRemoveMonths} mois sans activité.`} on={!!s.autoRemoveInactive} onChange={v => set('autoRemoveInactive', v)} />
            {!!s.autoRemoveInactive && <Slider label="Après (mois)" min={1} max={12} value={s.autoRemoveMonths as number} onChange={v => set('autoRemoveMonths', v)} suffix=" mois" />}
          </Section>

          {/* ── ASSISTANT IA ── */}
          <Section id="ia" title="Assistant IA coach" desc="L'IA t'aide à gérer ton roster (pas le coach perso de l'athlète).">
            <Field label="Modèle par défaut"><Seg value={s.aiModel as string} options={[['hermes', 'Hermès'], ['athena', 'Athéna'], ['zeus', 'Zeus']]} onChange={v => set('aiModel', v)} /></Field>
            <Field label="Ton"><Seg value={s.aiTone as string} options={[['concis', 'Concis'], ['pedago', 'Pédagogue'], ['direct', 'Direct']]} onChange={v => set('aiTone', v)} /></Field>
            <Field label="Autonomie"><Seg value={s.aiAutonomy as string} options={[['propose', 'Propose'], ['auto', 'Agit auto']]} onChange={v => set('aiAutonomy', v)} /></Field>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', margin: '4px 0 2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Données lisibles par l'IA</div>
            <Toggle label="Activités" on={!!s.aiReadActivities} onChange={v => set('aiReadActivities', v)} />
            <Toggle label="Récupération" on={!!s.aiReadRecovery} onChange={v => set('aiReadRecovery', v)} />
            <Toggle label="Nutrition" on={!!s.aiReadNutrition} onChange={v => set('aiReadNutrition', v)} />
            <Toggle label="Blessures" on={!!s.aiReadInjuries} onChange={v => set('aiReadInjuries', v)} />
            <Toggle label="Planning" on={!!s.aiReadPlanning} onChange={v => set('aiReadPlanning', v)} />
          </Section>

          {/* ── STUDIO ── */}
          <Section id="studio" title="Studio coach" desc="Systèmes IA qui tournent sur les données de tes athlètes.">
            <Field label="Modèle par défaut des systèmes"><Seg value={s.studioModel as string} options={[['hermes', 'Hermès'], ['athena', 'Athéna'], ['zeus', 'Zeus']]} onChange={v => set('studioModel', v)} /></Field>
            <Field label="Exécution"><Seg value={s.studioExec as string} options={[['manual', 'Manuelle'], ['auto', 'Automatique']]} onChange={v => set('studioExec', v)} /></Field>
            <Field label="Cadence par défaut"><Seg value={s.studioCadence as string} options={[['weekly', 'Hebdo'], ['biweekly', '2 semaines']]} onChange={v => set('studioCadence', v)} /></Field>
            <Field label="Cible par défaut"><Seg value={s.studioTarget as string} options={[['all', 'Tous'], ['group', 'Un groupe']]} onChange={v => set('studioTarget', v)} /></Field>
          </Section>

          {/* ── NOTIFICATIONS ── */}
          <Section id="notifs" title="Notifications" desc="Quand te prévenir, et comment.">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Événements</div>
            <Toggle label="Nouvel athlète accepté" on={!!s.notifNewAthlete} onChange={v => set('notifNewAthlete', v)} />
            <Toggle label="Message reçu d'un athlète" on={!!s.notifMessage} onChange={v => set('notifMessage', v)} />
            <Toggle label="Alerte santé (blessure / surmenage / inactivité)" on={!!s.notifHealth} onChange={v => set('notifHealth', v)} />
            <Toggle label="Échéance de course proche" on={!!s.notifRace} onChange={v => set('notifRace', v)} />
            <Toggle label="Run Studio terminé" on={!!s.notifStudioRun} onChange={v => set('notifStudioRun', v)} />
            <Toggle label="Adhérence faible d'un athlète" on={!!s.notifAdherence} onChange={v => set('notifAdherence', v)} />
            <Toggle label="Nouveau check-in récupération" on={!!s.notifCheckin} onChange={v => set('notifCheckin', v)} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', margin: '8px 0 2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Canaux</div>
            <Toggle label="Dans l'app" on={!!s.chanInApp} onChange={v => set('chanInApp', v)} />
            <Toggle label="Notifications push" on={!!s.chanPush} onChange={v => set('chanPush', v)} />
            <Toggle label="Email" on={!!s.chanEmail} onChange={v => set('chanEmail', v)} />
            <Field label="Fréquence"><Seg value={s.notifFreq as string} options={[['realtime', 'Temps réel'], ['daily', 'Résumé quotidien'], ['weekly', 'Hebdo']]} onChange={v => set('notifFreq', v)} /></Field>
            <Field label="Heures calmes (pas de notif)"><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Time value={s.quietFrom as string} onChange={v => set('quietFrom', v)} /><span style={{ color: 'var(--text-dim)', fontSize: 13 }}>→</span><Time value={s.quietTo as string} onChange={v => set('quietTo', v)} /></div></Field>
          </Section>

          {/* ── SEUILS ── */}
          <Section id="seuils" title="Alertes & seuils" desc="Ce qui déclenche une alerte sur ton Dashboard.">
            <Slider label="Inactivité" min={2} max={21} value={s.thInactive as number} onChange={v => set('thInactive', v)} suffix=" jours" />
            <Slider label="Fatigue élevée (≥)" min={2} max={5} step={0.5} value={s.thFatigue as number} onChange={v => set('thFatigue', v)} suffix=" /5" />
            <Slider label="Adhérence faible (<)" min={30} max={90} step={5} value={s.thAdherence as number} onChange={v => set('thAdherence', v)} suffix=" %" />
            <Slider label="Pic de charge (>)" min={20} max={80} step={5} value={s.thLoadSpike as number} onChange={v => set('thLoadSpike', v)} suffix=" %" />
            <Slider label="Sommeil au plancher (≤)" min={1} max={4} step={0.5} value={s.thSleep as number} onChange={v => set('thSleep', v)} suffix=" /5" />
          </Section>

          {/* ── AUTOMATISATIONS ── */}
          <Section id="auto" title="Automatisations" desc="Des règles « si → alors » qui travaillent pour toi.">
            <Toggle label="Relancer un athlète inactif" desc={`Message auto après ${s.thInactive} jours sans activité.`} on={!!s.autoRelance} onChange={v => set('autoRelance', v)} />
            <Toggle label="Alléger la semaine si récup au plancher" desc="Proposer un deload quand la fatigue explose." on={!!s.autoDeload} onChange={v => set('autoDeload', v)} />
            <Toggle label="Rapport hebdo automatique par athlète" desc="Une synthèse de sa semaine chaque lundi." on={!!s.autoWeeklyReport} onChange={v => set('autoWeeklyReport', v)} />
            <Toggle label="Alerter si adhérence faible" desc={`Me notifier + relancer sous ${s.thAdherence}%.`} on={!!s.autoAdherence} onChange={v => set('autoAdherence', v)} />
            <Toggle label="Mettre le plan en pause si blessure" desc="Suspendre les séances dures + m'alerter." on={!!s.autoInjuryPause} onChange={v => set('autoInjuryPause', v)} />
            <button onClick={() => router.push('/coach/studio')} style={{ marginTop: 6, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 11, border: '1px solid color-mix(in srgb, var(--primary) 40%, var(--border))', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>✦ Créer une automatisation sur mesure (Studio)</button>
          </Section>

          {/* ── ASSIGNATION ── */}
          <Section id="assign" title="Assignation & Planning" desc="Tes préférences quand tu assignes une séance.">
            <Field label="Sport par défaut"><Select value={s.assignSport as string} options={['run', 'bike', 'swim', 'gym', 'hyrox', 'trail_run', 'other']} onChange={v => set('assignSport', v)} /></Field>
            <Slider label="Durée par défaut" min={15} max={240} step={15} value={s.assignDuration as number} onChange={v => set('assignDuration', v)} suffix=" min" />
            <Toggle label="Validation de l'athlète requise" desc="La séance compte comme faite seulement s'il la valide." on={!!s.assignRequireValidation} onChange={v => set('assignRequireValidation', v)} />
          </Section>

          {/* ── CONFIDENTIALITÉ ── */}
          <Section id="data" title="Confidentialité & données" desc="Ce que tu vois, et le respect des données de tes athlètes.">
            <Info>Tu accèdes aux données de tes athlètes en <b>lecture seule</b>, uniquement après leur consentement, et ils peuvent révoquer à tout moment.</Info>
            <LinkRow label="Journal d'accès aux données" hint="Voir quand tu as consulté les fiches" />
            <LinkRow label="Exporter les données d'un athlète" hint="Sur demande de l'athlète (RGPD)" />
            <LinkRow label="Politique de confidentialité" hint="Comment les données sont protégées" />
          </Section>

          {/* ── OFFRE ── */}
          <Section id="offre" title="Offre & facturation" desc="Ton plan coach et ta consommation.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'color-mix(in srgb, var(--primary) 7%, var(--bg-alt))', border: '1px solid color-mix(in srgb, var(--primary) 22%, var(--border))' }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>Offre Coach</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Jusqu'à 25 athlètes · quota Studio mensuel</div></div>
              <a href="/settings/subscription" style={{ textDecoration: 'none', padding: '9px 15px', borderRadius: 10, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700 }}>Gérer</a>
            </div>
            <LinkRow label="Packs de tokens Studio" hint="Recharger pour lancer plus de systèmes" />
            <LinkRow label="Historique de facturation" hint="Tes reçus et paiements" />
          </Section>

          {/* ── APPARENCE ── */}
          <Section id="apparence" title="Apparence & langue" desc="">
            <Field label="Langue"><Seg value={s.lang as string} options={[['fr', 'Français'], ['en', 'English']]} onChange={v => set('lang', v)} /></Field>
            <Field label="Unités"><Seg value={s.units as string} options={[['metric', 'Métrique'], ['imperial', 'Impérial']]} onChange={v => set('units', v)} /></Field>
          </Section>

          {/* ── ZONE SENSIBLE ── */}
          <Section id="danger" title="Zone sensible" desc="" danger>
            <button onClick={() => router.push('/')} style={dangerBtn}>Quitter le mode coach</button>
            <button onClick={() => alert('À brancher : rompre tous les liens coach↔athlète.')} style={{ ...dangerBtn, color: '#EF4444', borderColor: 'rgba(239,68,68,.4)' }}>Retirer tous mes athlètes</button>
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ── Composants réutilisables ── */
const cardStyle: React.CSSProperties = { borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
function Section({ id, title, desc, children, danger }: { id: string; title: string; desc: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section id={'sec-' + id} style={{ ...cardStyle, padding: 18, scrollMarginTop: 60, borderColor: danger ? 'rgba(239,68,68,.28)' : 'var(--border)' }}>
      <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, margin: 0, color: danger ? '#EF4444' : 'var(--text)' }}>{title}</h2>
      {desc && <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '3px 0 0' }}>{desc}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 14 }}>{children}</div>
    </section>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 6, fontFamily: BODY }}>{label}</div>{children}</div>
}
function Toggle({ label, desc, on, onChange, locked }: { label: string; desc?: string; on: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <button onClick={() => !locked && onChange?.(!on)} disabled={locked} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 0, border: 'none', background: 'none', cursor: locked ? 'default' : 'pointer', textAlign: 'left', fontFamily: BODY }}>
      <span style={{ width: 40, height: 23, borderRadius: 999, background: on ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', flexShrink: 0, transition: 'background .18s', opacity: locked ? 0.7 : 1 }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}{locked && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 7, fontWeight: 700 }}>· verrouillé</span>}</span>
        {desc && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{desc}</span>}
      </span>
    </button>
  )
}
const fieldStyle: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, fontFamily: BODY, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={fieldStyle} />
}
function Area({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ ...fieldStyle, resize: 'vertical' }} />
}
function Time({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="time" value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, width: 'auto', cursor: 'pointer' }} />
}
function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer', width: 'auto' }}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
}
function Seg({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 11, padding: 3, gap: 3, flexWrap: 'wrap' }}>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{ border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY, background: value === v ? 'var(--bg-card)' : 'transparent', color: value === v ? 'var(--primary)' : 'var(--text-mid)', boxShadow: value === v ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>{l}</button>
      ))}
    </div>
  )
}
function ChipMulti({ value, options, onChange }: { value: string[]; options: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o])
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {options.map(o => { const on = value.includes(o); return (
        <button key={o} onClick={() => toggle(o)} style={{ border: `1px solid ${on ? 'color-mix(in srgb, var(--primary) 40%, var(--border))' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--bg-alt)', color: on ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }}>{o}</button>
      ) })}
    </div>
  )
}
function Slider({ label, min, max, step = 1, value, onChange, suffix }: { label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, fontFamily: BODY }}><span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span><span style={{ fontWeight: 800, color: 'var(--primary)' }}>{value}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
    </div>
  )
}
function Info({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.55, padding: '11px 13px', borderRadius: 11, background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>{children}</div>
}
function LinkRow({ label, hint }: { label: string; hint: string }) {
  return (
    <button onClick={() => {}} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', cursor: 'pointer', textAlign: 'left', fontFamily: BODY }}>
      <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</span><span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{hint}</span></span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  )
}
const dangerBtn: React.CSSProperties = { alignSelf: 'flex-start', padding: '10px 16px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: BODY }
