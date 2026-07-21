'use client'
// ══════════════════════════════════════════════════════════════
// Surpage « Paramètres » de l'IA — navigation à gauche, contenu à droite.
// Design system THW : tokens uniquement (--primary, --bg-*, --text-*,
// --font-display/body, --r-*), zéro couleur en dur hors logos de marque,
// menus déroulants custom, feedback « Enregistré » à chaque sauvegarde.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { matchProfessions } from '@/lib/profile/professions'
import {
  DEFAULT_TRAINING_SETTINGS, type TrainingAgentSettings,
  FOCUS_OPTS, OBJECTIF_OPTS, TON_OPTS, DETAIL_OPTS, NIVEAU_OPTS, FORMAT_OPTS,
  PERIODISATION_OPTS, UNITES_OPTS, MATERIEL_OPTS,
} from '@/lib/ai/agent-settings'
import { getPushState, enablePush, disablePush, type PushState } from '@/lib/push/client'
import { ConnectorLogo, type ConnectorId } from '@/components/ai/ConnectorLogos'

export type SettingsSection =
  | 'profil' | 'instructions' | 'modele' | 'voix' | 'notifications'
  | 'agent_training' | 'agent_networks' | 'connecteurs' | 'abonnement'

const SPORTS: [string, string][] = [
  ['running', 'Course à pied'], ['cycling', 'Vélo'], ['swimming', 'Natation'],
  ['trail', 'Trail'], ['triathlon', 'Triathlon'], ['hyrox', 'Hyrox'],
  ['gym', 'Muscu / gym'], ['crossfit', 'CrossFit'],
]

// ── Styles partagés (tokens uniquement) ──
const FB = 'var(--font-body)'
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--border-mid)', background: 'var(--bg-alt)', color: 'var(--text)',
  fontSize: 14, fontFamily: FB, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
}
const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7, display: 'block', fontFamily: FB }
const sectionTitleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', marginBottom: 4 }
const sectionLead: React.CSSProperties = { fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 20px', maxWidth: 560, fontFamily: FB }

function onFocusRing(e: React.FocusEvent<HTMLElement>) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-dim)' }
function onBlurRing(e: React.FocusEvent<HTMLElement>) { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.boxShadow = 'none' }

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} aria-pressed={value} type="button"
      style={{ flexShrink: 0, width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: value ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', transition: 'background 0.18s' }}>
      <span style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
    </button>
  )
}

// Menu déroulant custom (remplace <select> natif).
function Dropdown({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly (readonly [string, string])[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const current = options.find(o => o[0] === value)?.[1] ?? '—'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', textAlign: 'left', borderColor: open ? 'var(--primary)' : 'var(--border-mid)', boxShadow: open ? '0 0 0 3px var(--primary-dim)' : 'none' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 20, maxHeight: 240, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: '0 12px 34px rgba(0,0,0,0.28)', padding: 5, transformOrigin: 'top', animation: 'thwDDin 0.15s cubic-bezier(0.2,0.9,0.3,1)' }}>
          {options.map(([v, l]) => {
            const on = v === value
            return (
              <button key={v} type="button" onClick={() => { onChange(v); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none', borderRadius: 'var(--r-sm)', background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text)', fontSize: 13.5, fontWeight: on ? 600 : 450, cursor: 'pointer', fontFamily: FB }}
                onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                <span style={{ flex: 1 }}>{l}</span>
                {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Pilule sélectionnable (sports, matériel).
function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: '8px 14px', borderRadius: 999, border: 'none', background: on ? 'var(--primary-dim)' : 'var(--bg-alt)', color: on ? 'var(--primary)' : 'var(--text-mid)', fontSize: 12.5, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: FB, transition: 'background 0.14s, color 0.14s' }}>
      {children}
    </button>
  )
}

function NotifRow({ title, desc, value, onChange }: { title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '15px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: FB }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5, fontFamily: FB }}>{desc}</div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

type ProfileState = {
  full_name: string; preferred_name: string; work_profession: string
  work_hours_per_week: string; ideal_sleep_hours: string; sport_hours_per_week: string
  sports: string[]
}

const CURATED_NOTIFS: { key: string; title: string; desc: string; def: boolean }[] = [
  { key: 'coach.reponse_terminee', title: 'Complétions de réponse', desc: 'Sois averti lorsque Hybrid a terminé une réponse. Utile pour les longues analyses.', def: true },
  { key: 'entrainement.nouveau_plan', title: 'Nouveau plan', desc: 'Quand un plan d’entraînement est prêt.', def: true },
  { key: 'coach.analyse_terminee', title: 'Analyse terminée', desc: 'Quand ton analyse de séance est prête.', def: false },
  { key: 'performance.resume_hebdo', title: 'Résumé hebdomadaire', desc: 'Ton bilan de la semaine, chaque lundi.', def: true },
  { key: 'performance.progression', title: 'Nouveau record', desc: 'Quand une nouvelle perf est détectée.', def: true },
  { key: 'competitions.j1', title: 'Compétition J-1', desc: 'La veille de ta compétition.', def: true },
  { key: 'tokens.quota_epuise', title: 'Quota épuisé', desc: 'Quand tu as utilisé tout ton quota IA du mois.', def: true },
]

export default function AISettingsModal({ open, initialSection = 'profil', onClose }: { open: boolean; initialSection?: SettingsSection; onClose: () => void }) {
  const [section, setSection] = useState<SettingsSection>(initialSection)
  const [isWide, setIsWide] = useState(true)
  const [showNav, setShowNav] = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const flashSaved = useCallback(() => setSavedAt(Date.now()), [])
  useEffect(() => {
    if (!savedAt) return
    const id = setTimeout(() => setSavedAt(0), 1700)
    return () => clearTimeout(id)
  }, [savedAt])

  useEffect(() => { if (open) { setSection(initialSection); setShowNav(false) } }, [open, initialSection])
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 820px)')
    const on = () => setIsWide(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const [profile, setProfile] = useState<ProfileState>({ full_name: '', preferred_name: '', work_profession: '', work_hours_per_week: '', ideal_sleep_hours: '', sport_hours_per_week: '', sports: [] })
  const [instruction, setInstruction] = useState('')
  const [defaultModel, setDefaultModel] = useState('athena')
  const [voice, setVoice] = useState<{ lang: string; style: string; speed: string }>({ lang: 'fr-FR', style: 'neutre', speed: 'normal' })
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [globalNotif, setGlobalNotif] = useState(true)
  const [pushState, setPushState] = useState<PushState | 'loading'>('loading')
  const [agent, setAgent] = useState<TrainingAgentSettings>(DEFAULT_TRAINING_SETTINGS)
  const uidRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    try {
      const m = localStorage.getItem('thw_ai_default_model'); if (m) setDefaultModel(m)
      const v = JSON.parse(localStorage.getItem('thw_voice_settings') || '{}'); setVoice({ lang: v.lang || 'fr-FR', style: v.style || 'neutre', speed: v.speed || 'normal' })
    } catch { /* ignore */ }
    void (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      uidRef.current = user.id
      const [{ data: prof }, { data: rules }] = await Promise.all([
        sb.from('profiles').select('full_name,preferred_name,work_profession,work_hours_per_week,ideal_sleep_hours,sport_hours_per_week,sports,ai_agent_training').eq('id', user.id).maybeSingle(),
        sb.from('ai_rules').select('rule_text').eq('user_id', user.id).eq('category', 'instruction').eq('active', true).maybeSingle(),
      ])
      if (prof) {
        setProfile({
          full_name: prof.full_name ?? '', preferred_name: prof.preferred_name ?? '', work_profession: prof.work_profession ?? '',
          work_hours_per_week: prof.work_hours_per_week?.toString() ?? '', ideal_sleep_hours: prof.ideal_sleep_hours?.toString() ?? '',
          sport_hours_per_week: prof.sport_hours_per_week?.toString() ?? '', sports: (prof.sports as string[] | null) ?? [],
        })
        if (prof.ai_agent_training) setAgent({ ...DEFAULT_TRAINING_SETTINGS, ...(prof.ai_agent_training as Partial<TrainingAgentSettings>) })
      }
      if (rules?.rule_text) setInstruction(rules.rule_text)
      try {
        const r = await fetch('/api/notifications/preferences'); const j = await r.json()
        setGlobalNotif(j.global_enabled ?? true); setPrefs(j.preferences ?? {})
      } catch { /* ignore */ }
      setPushState(await getPushState())
    })()
  }, [open])

  const saveProfile = useCallback(async (patch: Record<string, unknown>) => {
    const uid = uidRef.current; if (!uid) return
    try { await createClient().from('profiles').update(patch).eq('id', uid); flashSaved() } catch { /* ignore */ }
  }, [flashSaved])
  const saveInstruction = useCallback(async (text: string) => {
    const uid = uidRef.current; if (!uid) return
    const sb = createClient()
    const { data: existing } = await sb.from('ai_rules').select('id').eq('user_id', uid).eq('category', 'instruction').maybeSingle()
    if (existing) await sb.from('ai_rules').update({ rule_text: text.trim(), active: true }).eq('id', existing.id)
    else await sb.from('ai_rules').insert({ user_id: uid, category: 'instruction', rule_text: text.trim(), active: true })
    flashSaved()
  }, [flashSaved])
  const saveVoice = useCallback((next: { lang: string; style: string; speed: string }) => {
    setVoice(next); try { localStorage.setItem('thw_voice_settings', JSON.stringify(next)) } catch { /* ignore */ }; flashSaved()
  }, [flashSaved])
  const saveModel = useCallback((m: string) => {
    setDefaultModel(m); try { localStorage.setItem('thw_ai_default_model', m) } catch { /* ignore */ }; flashSaved()
  }, [flashSaved])
  const saveAgent = useCallback((next: TrainingAgentSettings) => {
    setAgent(next); const uid = uidRef.current
    if (uid) void createClient().from('profiles').update({ ai_agent_training: next }).eq('id', uid)
    try { localStorage.setItem('thw_agent_training', JSON.stringify(next)) } catch { /* ignore */ }
    flashSaved()
  }, [flashSaved])
  const patchPref = useCallback((key: string, val: boolean) => {
    setPrefs(p => ({ ...p, [key]: val }))
    void fetch('/api/notifications/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: { [key]: val } }) }).then(() => flashSaved())
  }, [flashSaved])
  const setGlobal = useCallback((v: boolean) => {
    setGlobalNotif(v)
    void fetch('/api/notifications/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ global_enabled: v }) }).then(() => flashSaved())
  }, [flashSaved])

  if (!open) return null

  const NAV: { group: string; items: { id: SettingsSection; label: string; disabled?: boolean }[] }[] = [
    { group: 'Général', items: [
      { id: 'profil', label: 'Profil' }, { id: 'instructions', label: 'Instructions' },
      { id: 'modele', label: 'Modèle par défaut' }, { id: 'voix', label: 'Voix' }, { id: 'notifications', label: 'Notifications' },
    ] },
    { group: 'Agents', items: [ { id: 'agent_training', label: 'Training' }, { id: 'agent_networks', label: 'Networks (bientôt)', disabled: true } ] },
    { group: 'Compte', items: [ { id: 'connecteurs', label: 'Connecteurs' }, { id: 'abonnement', label: 'Abonnement' } ] },
  ]

  const nav = (
    <div style={{ width: isWide ? 244 : '100%', flexShrink: 0, borderRight: isWide ? '1px solid var(--border)' : 'none', padding: '14px 12px', overflowY: 'auto', background: isWide ? 'var(--bg-card2)' : 'transparent' }}>
      {NAV.map(g => (
        <div key={g.group} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '6px 12px', fontFamily: FB }}>{g.group}</div>
          {g.items.map(it => {
            const active = section === it.id && isWide
            return (
              <button key={it.id} disabled={it.disabled} type="button"
                onClick={() => { if (it.disabled) return; setSection(it.id); if (!isWide) setShowNav(false) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--r-sm)', border: 'none', cursor: it.disabled ? 'not-allowed' : 'pointer', background: active ? 'var(--primary-dim)' : 'transparent', color: it.disabled ? 'var(--text-dim)' : active ? 'var(--primary)' : 'var(--text-mid)', fontSize: 14, fontWeight: active ? 600 : 500, fontFamily: FB, transition: 'background 0.12s' }}
                onMouseEnter={e => { if (!active && !it.disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!active && !it.disabled) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                {it.label}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 13800, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isWide ? 28 : 0, fontFamily: FB }}>
      <style>{`
        @keyframes thwDDin { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .thw-conn-row:hover { background: var(--bg-hover); }
      `}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: 920, height: isWide ? '85vh' : '100%', background: 'var(--bg-card)', borderRadius: isWide ? 'var(--r-lg)' : 0, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: 'max(16px, env(safe-area-inset-top)) 20px 14px', borderBottom: '1px solid var(--border)' }}>
          {!isWide && !showNav && (
            <button type="button" onClick={() => setShowNav(true)} aria-label="Retour" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <div style={{ flex: 1, fontSize: 19, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>Paramètres</div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'var(--bg-alt)', cursor: 'pointer', color: 'var(--text-mid)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {(isWide || showNav) && nav}
          {(isWide || !showNav) && (
            <div style={{ flex: 1, overflowY: 'auto', padding: isWide ? '26px 32px' : '22px 20px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
              {section === 'profil' && <ProfilSection profile={profile} setProfile={setProfile} saveProfile={saveProfile} />}
              {section === 'instructions' && <InstructionsSection value={instruction} setValue={setInstruction} save={saveInstruction} />}
              {section === 'modele' && <ModeleSection value={defaultModel} onChange={saveModel} />}
              {section === 'voix' && <VoixSection voice={voice} save={saveVoice} />}
              {section === 'notifications' && <NotificationsSection prefs={prefs} globalNotif={globalNotif} pushState={pushState} setPushState={setPushState} patchPref={patchPref} setGlobal={setGlobal} />}
              {section === 'agent_training' && <AgentTrainingSection agent={agent} save={saveAgent} />}
              {section === 'agent_networks' && <div style={sectionTitleStyle}>Networks — bientôt disponible</div>}
              {section === 'connecteurs' && <ConnecteursSection />}
              {section === 'abonnement' && <AbonnementSection />}
            </div>
          )}
        </div>

        {/* Toast « Enregistré » */}
        <div aria-live="polite" style={{ position: 'absolute', bottom: 18, left: '50%', transform: `translateX(-50%) translateY(${savedAt ? 0 : 12}px)`, opacity: savedAt ? 1 : 0, pointerEvents: 'none', transition: 'opacity 0.25s, transform 0.25s', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 999, background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: FB, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          Enregistré
        </div>
      </div>
    </div>
  )
}

// ── Profil ─────────────────────────────────────────────────────
function ProfilSection({ profile, setProfile, saveProfile }: { profile: ProfileState; setProfile: React.Dispatch<React.SetStateAction<ProfileState>>; saveProfile: (patch: Record<string, unknown>) => void }) {
  const [profQuery, setProfQuery] = useState('')
  const [profOpen, setProfOpen] = useState(false)
  const matches = matchProfessions(profQuery || profile.work_profession, 40)
  const toggleSport = (s: string) => {
    setProfile(p => {
      const sports = p.sports.includes(s) ? p.sports.filter(x => x !== s) : [...p.sports, s]
      saveProfile({ sports })
      return { ...p, sports }
    })
  }
  const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? null : n }

  return (
    <div>
      <div style={sectionTitleStyle}>Profil</div>
      <p style={sectionLead}>Ces informations aident Hybrid à personnaliser ses conseils.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 540 }}>
        <div>
          <label style={fieldLabel}>Nom complet</label>
          <input style={inputStyle} onFocus={onFocusRing} onBlur={e => { onBlurRing(e); saveProfile({ full_name: profile.full_name.trim() || null }) }} value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Ton nom" />
        </div>
        <div>
          <label style={fieldLabel}>Comment souhaites-tu que Hybrid t’appelle ?</label>
          <input style={inputStyle} onFocus={onFocusRing} onBlur={e => { onBlurRing(e); saveProfile({ preferred_name: profile.preferred_name.trim() || null }) }} value={profile.preferred_name} onChange={e => setProfile(p => ({ ...p, preferred_name: e.target.value }))} placeholder="Ex. Alex, Coach…" />
        </div>
        <div style={{ position: 'relative' }}>
          <label style={fieldLabel}>Quelle est la meilleure description de ton travail ?</label>
          <input style={inputStyle} onFocus={e => { onFocusRing(e); setProfOpen(true); setProfQuery('') }} onBlur={e => { onBlurRing(e); setTimeout(() => setProfOpen(false), 150) }} value={profOpen ? profQuery : profile.work_profession} onChange={e => setProfQuery(e.target.value)} placeholder="Rechercher un métier…" />
          {profOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 20, maxHeight: 240, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: '0 12px 34px rgba(0,0,0,0.28)', padding: 5, transformOrigin: 'top', animation: 'thwDDin 0.15s cubic-bezier(0.2,0.9,0.3,1)' }}>
              {matches.map(m => (
                <button key={m} type="button" onMouseDown={() => { setProfile(p => ({ ...p, work_profession: m })); saveProfile({ work_profession: m }); setProfOpen(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none', borderRadius: 'var(--r-sm)', background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontSize: 13.5, fontFamily: FB }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>{m}</button>
              ))}
              {matches.length === 0 && <div style={{ padding: '9px 11px', fontSize: 13, color: 'var(--text-dim)' }}>Aucun résultat</div>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {([['work_hours_per_week', 'Travail / semaine', 'Ex. 40'], ['ideal_sleep_hours', 'Sommeil idéal', 'Ex. 8'], ['sport_hours_per_week', 'Sport / semaine', 'Ex. 10']] as const).map(([k, label, ph]) => (
            <div key={k} style={{ flex: '1 1 140px' }}>
              <label style={fieldLabel}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 34 }} inputMode="decimal" onFocus={onFocusRing} onBlur={e => { onBlurRing(e); saveProfile({ [k]: num(profile[k]) }) }} value={profile[k]} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-dim)', fontFamily: FB }}>h</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <label style={fieldLabel}>Sports pratiqués</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPORTS.map(([v, l]) => <Pill key={v} on={profile.sports.includes(v)} onClick={() => toggleSport(v)}>{l}</Pill>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Instructions ───────────────────────────────────────────────
const INSTRUCTION_PRESETS = [
  { label: 'Coach exigeant', text: 'Sois direct et exigeant. Ne me ménage pas, dis-moi la vérité sur ma forme et mes efforts, quitte à être cash. Priorité à la performance.' },
  { label: 'Pédagogue', text: 'Explique-moi toujours le pourquoi de tes recommandations, avec des mots simples. Je veux comprendre et progresser.' },
  { label: 'Bref et efficace', text: 'Réponds de façon concise et actionnable. Va droit au but, pas de blabla. Des listes claires quand c’est utile.' },
  { label: 'Motivateur', text: 'Sois positif et motivant. Encourage-moi, célèbre mes progrès, garde-moi engagé même les jours difficiles.' },
]
function InstructionsSection({ value, setValue, save }: { value: string; setValue: (v: string) => void; save: (v: string) => void }) {
  return (
    <div>
      <div style={sectionTitleStyle}>Instructions</div>
      <p style={sectionLead}>Un prompt qui dit à Hybrid comment se comporter et répondre. Il en tiendra compte dans toutes tes conversations.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {INSTRUCTION_PRESETS.map(p => <Pill key={p.label} on={false} onClick={() => { setValue(p.text); save(p.text) }}>{p.label}</Pill>)}
      </div>
      <textarea value={value} onChange={e => setValue(e.target.value)} onFocus={onFocusRing} onBlur={e => { onBlurRing(e); save(value) }} rows={7}
        placeholder="Ex. Tu es mon coach hybride. Sois technique mais accessible…"
        style={{ ...inputStyle, fontSize: 14, lineHeight: 1.55, resize: 'vertical', maxWidth: 640 }} />
    </div>
  )
}

// ── Modèle par défaut ──────────────────────────────────────────
function ModeleSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const MODELS: [string, string, string][] = [['hermes', 'Hermès', 'Rapide'], ['athena', 'Athéna', 'Équilibré'], ['zeus', 'Zeus', 'Maximum']]
  return (
    <div>
      <div style={sectionTitleStyle}>Modèle par défaut</div>
      <p style={sectionLead}>Le modèle utilisé par défaut pour tes nouvelles conversations.</p>
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 'var(--r-md)', background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
        {MODELS.map(([id, label, speed]) => {
          const on = value === id
          return (
            <button key={id} type="button" onClick={() => onChange(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 'var(--r-sm)', border: 'none', background: on ? 'var(--bg-card)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-dim)', cursor: 'pointer', fontFamily: FB, transition: 'background 0.14s, color 0.14s', boxShadow: on ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
              <span style={{ fontSize: 14, fontWeight: on ? 600 : 500 }}>{label}</span>
              <span style={{ fontSize: 10.5, color: on ? 'var(--primary)' : 'var(--text-dim)', fontWeight: 500 }}>{speed}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Voix ───────────────────────────────────────────────────────
function VoixSection({ voice, save }: { voice: { lang: string; style: string; speed: string }; save: (v: { lang: string; style: string; speed: string }) => void }) {
  return (
    <div>
      <div style={sectionTitleStyle}>Voix</div>
      <p style={sectionLead}>Comment Hybrid te parle en mode vocal.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 420 }}>
        <div><label style={fieldLabel}>Langue</label><Dropdown value={voice.lang} onChange={v => save({ ...voice, lang: v })} options={[['fr-FR', 'Français'], ['en-US', 'Anglais'], ['es-ES', 'Espagnol']]} /></div>
        <div><label style={fieldLabel}>Style</label><Dropdown value={voice.style} onChange={v => save({ ...voice, style: v })} options={[['douce', 'Douce'], ['neutre', 'Neutre'], ['energique', 'Énergique']]} /></div>
        <div><label style={fieldLabel}>Vitesse</label><Dropdown value={voice.speed} onChange={v => save({ ...voice, speed: v })} options={[['lent', 'Lent'], ['normal', 'Normal'], ['rapide', 'Rapide']]} /></div>
      </div>
    </div>
  )
}

// ── Notifications ──────────────────────────────────────────────
function NotificationsSection({ prefs, globalNotif, pushState, setPushState, patchPref, setGlobal }: {
  prefs: Record<string, boolean>; globalNotif: boolean; pushState: PushState | 'loading'
  setPushState: (s: PushState) => void; patchPref: (k: string, v: boolean) => void; setGlobal: (v: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const togglePush = async () => {
    if (busy) return; setBusy(true)
    try { setPushState(pushState === 'on' ? await disablePush() : await enablePush()) } finally { setBusy(false) }
  }
  return (
    <div>
      <div style={sectionTitleStyle}>Notifications</div>
      <p style={sectionLead}>Choisis ce qui mérite de te déranger.</p>
      {pushState !== 'unsupported' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '15px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Notifications sur cet appareil</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>
              {pushState === 'denied' ? 'Bloquées par le navigateur — autorise-les dans les réglages du site.'
                : pushState === 'unconfigured' ? 'Bientôt disponible sur ce serveur.'
                : 'Reçois les notifications push, même app fermée.'}
            </div>
          </div>
          <Toggle value={pushState === 'on'} onChange={() => { if (pushState === 'off' || pushState === 'on') void togglePush() }} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Toutes les notifications</div>
        <Toggle value={globalNotif} onChange={setGlobal} />
      </div>
      <div style={{ opacity: globalNotif ? 1 : 0.45, pointerEvents: globalNotif ? 'auto' : 'none' }}>
        {CURATED_NOTIFS.map(n => <NotifRow key={n.key} title={n.title} desc={n.desc} value={prefs[n.key] ?? n.def} onChange={(v) => patchPref(n.key, v)} />)}
      </div>
    </div>
  )
}

// ── Agent Training ─────────────────────────────────────────────
function AgentTrainingSection({ agent, save }: { agent: TrainingAgentSettings; save: (a: TrainingAgentSettings) => void }) {
  const set = (patch: Partial<TrainingAgentSettings>) => save({ ...agent, ...patch })
  const toggleIn = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ flex: '1 1 210px' }}><label style={fieldLabel}>{label}</label>{children}</div>
  )
  return (
    <div>
      <div style={sectionTitleStyle}>Agent Training</div>
      <p style={sectionLead}>Ces réglages pilotent le comportement du coach Training dans tes conversations.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 540 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Field label="Discipline prioritaire"><Dropdown value={agent.focus} onChange={v => set({ focus: v })} options={FOCUS_OPTS} /></Field>
          <Field label="Objectif principal"><Dropdown value={agent.objectif} onChange={v => set({ objectif: v })} options={OBJECTIF_OPTS} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Field label="Ton du coach"><Dropdown value={agent.ton} onChange={v => set({ ton: v })} options={TON_OPTS} /></Field>
          <Field label="Niveau de détail"><Dropdown value={agent.detail} onChange={v => set({ detail: v })} options={DETAIL_OPTS} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Field label="Niveau de l’athlète"><Dropdown value={agent.niveau} onChange={v => set({ niveau: v })} options={NIVEAU_OPTS} /></Field>
          <Field label="Format des réponses"><Dropdown value={agent.format} onChange={v => set({ format: v })} options={FORMAT_OPTS} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Field label="Périodisation préférée"><Dropdown value={agent.periodisation} onChange={v => set({ periodisation: v })} options={PERIODISATION_OPTS} /></Field>
          <Field label="Unités"><Dropdown value={agent.unites} onChange={v => set({ unites: v })} options={UNITES_OPTS} /></Field>
        </div>
        <div>
          <label style={fieldLabel}>Matériel disponible</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MATERIEL_OPTS.map(([v, l]) => <Pill key={v} on={agent.materiel.includes(v)} onClick={() => set({ materiel: toggleIn(agent.materiel, v) })}>{l}</Pill>)}
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Jours d’entraînement préférés</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {DAYS.map((d, i) => {
              const on = agent.jours.includes(i)
              return <button key={i} type="button" onClick={() => set({ jours: on ? agent.jours.filter(x => x !== i) : [...agent.jours, i] })} style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', border: 'none', background: on ? 'var(--primary-dim)' : 'var(--bg-alt)', color: on ? 'var(--primary)' : 'var(--text-mid)', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: FB }}>{d}</button>
            })}
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Contraintes / blessures à toujours considérer</label>
          <textarea value={agent.contraintes} onChange={e => set({ contraintes: e.target.value })} onFocus={onFocusRing} onBlur={onBlurRing} rows={3} placeholder="Ex. genou droit fragile, pas de sauts…" style={{ ...inputStyle, fontSize: 14, lineHeight: 1.5, resize: 'vertical' }} />
        </div>
        {([['proactivite', 'Suggestions proactives', 'Hybrid propose des idées utiles sans que tu le demandes.'], ['science', 'Appuyer sur la science', 'Justifie les conseils par des références quand pertinent.'], ['emoji', 'Emojis', 'Autoriser quelques emojis dans les réponses.']] as const).map(([k, title, desc]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{desc}</div></div>
            <Toggle value={agent[k]} onChange={(v) => set({ [k]: v } as Partial<TrainingAgentSettings>)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Connecteurs ────────────────────────────────────────────────
function ConnecteursSection() {
  const CONNECTORS: { id: ConnectorId; name: string; desc: string; ready: boolean }[] = [
    { id: 'strava', name: 'Strava', desc: 'Importe automatiquement tes activités.', ready: true },
    { id: 'polar', name: 'Polar', desc: 'Séances, sommeil et récupération.', ready: true },
    { id: 'wahoo', name: 'Wahoo', desc: 'Séances vélo et home-trainer.', ready: true },
    { id: 'withings', name: 'Withings', desc: 'Poids, sommeil, métriques santé.', ready: true },
    { id: 'gcal', name: 'Google Agenda', desc: 'Synchronise tes séances avec ton agenda.', ready: false },
    { id: 'acal', name: 'Apple Agenda', desc: 'Synchronise tes séances avec ton agenda.', ready: false },
    { id: 'excel', name: 'Excel', desc: 'Exporte / importe tes données en tableur.', ready: false },
  ]
  return (
    <div>
      <div style={sectionTitleStyle}>Connecteurs</div>
      <p style={sectionLead}>Connecte Hybrid à tes applications pour qu’il travaille avec toutes tes données.</p>
      <div style={{ maxWidth: 560 }}>
        {CONNECTORS.map((c, i) => (
          <div key={c.id} className="thw-conn-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 6px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', borderRadius: 'var(--r-sm)', transition: 'background 0.12s' }}>
            <ConnectorLogo id={c.id} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</div>
            </div>
            {c.ready ? (
              <a href="/connections" style={{ padding: '5px 12px', borderRadius: 999, background: 'var(--bg-alt)', border: '1px solid var(--border-mid)', color: 'var(--text)', fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: FB, whiteSpace: 'nowrap' }}>Connecter</a>
            ) : (
              <span style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Bientôt</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Abonnement ─────────────────────────────────────────────────
function AbonnementSection() {
  return (
    <div>
      <div style={sectionTitleStyle}>Abonnement</div>
      <p style={sectionLead}>Gère ton plan, tes tokens et ta facturation.</p>
      <a href="/settings/subscription" style={{ display: 'inline-block', padding: '12px 20px', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: FB }}>Voir mon abonnement</a>
    </div>
  )
}
