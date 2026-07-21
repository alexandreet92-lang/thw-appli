'use client'
// ══════════════════════════════════════════════════════════════
// Surpage « Paramètres » de l'IA (style Claude) : navigation à gauche,
// contenu à droite. Sections : Général (Profil, Instructions, Modèle,
// Voix, Notifications), Agents (Training), Connecteurs, Abonnement.
// Réutilise les backends existants (profiles, ai_rules, préférences de
// notifications, réglages voix localStorage, push Web).
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

export type SettingsSection =
  | 'profil' | 'instructions' | 'modele' | 'voix' | 'notifications'
  | 'agent_training' | 'agent_networks' | 'connecteurs' | 'abonnement'

const ACCENT = '#5b6fff'

const SPORTS: [string, string][] = [
  ['running', 'Course à pied'], ['cycling', 'Vélo'], ['swimming', 'Natation'],
  ['trail', 'Trail'], ['triathlon', 'Triathlon'], ['hyrox', 'Hyrox'],
  ['gym', 'Muscu / gym'], ['crossfit', 'CrossFit'],
]

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9,
  border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)',
  fontSize: 14, fontFamily: 'DM Sans,sans-serif', outline: 'none',
}
const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6, display: 'block' }
const sectionTitle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif', marginBottom: 16 }

function Toggle({ value, onChange, color = ACCENT }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button onClick={() => onChange(!value)} aria-pressed={value}
      style={{ flexShrink: 0, width: 42, height: 25, borderRadius: 999, border: 'none', cursor: 'pointer', background: value ? color : 'var(--border)', position: 'relative', transition: 'background 0.15s' }}>
      <span style={{ position: 'absolute', top: 3, left: value ? 20 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
    </button>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly (readonly [string, string])[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

// Ligne de notification (style image 5) : titre + description + toggle.
function NotifRow({ title, desc, value, onChange, disabled }: { title: string; desc: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '0.5px solid var(--border)', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <Toggle value={value} onChange={disabled ? () => {} : onChange} />
    </div>
  )
}

type ProfileState = {
  full_name: string; preferred_name: string; work_profession: string
  work_hours_per_week: string; ideal_sleep_hours: string; sport_hours_per_week: string
  sports: string[]
}

// Notifications curées affichées ici (clés alignées sur le catalogue).
const CURATED_NOTIFS: { key: string; title: string; desc: string }[] = [
  { key: 'coach.reponse_terminee', title: 'Complétions de réponse', desc: 'Sois averti lorsque Hybrid a terminé une réponse. Utile pour les longues analyses.' },
  { key: 'entrainement.nouveau_plan', title: 'Nouveau plan', desc: 'Quand un plan d’entraînement est prêt.' },
  { key: 'coach.analyse_terminee', title: 'Analyse terminée', desc: 'Quand ton analyse de séance est prête.' },
  { key: 'performance.resume_hebdo', title: 'Résumé hebdomadaire', desc: 'Ton bilan de la semaine, chaque lundi.' },
  { key: 'performance.progression', title: 'Nouveau record', desc: 'Quand une nouvelle perf / un record est détecté.' },
  { key: 'competitions.j1', title: 'Compétition J-1', desc: 'La veille de ta compétition.' },
  { key: 'tokens.quota_epuise', title: 'Quota épuisé', desc: 'Quand tu as utilisé tout ton quota IA du mois.' },
]

export default function AISettingsModal({ open, initialSection = 'profil', onClose }: { open: boolean; initialSection?: SettingsSection; onClose: () => void }) {
  const [section, setSection] = useState<SettingsSection>(initialSection)
  const [isWide, setIsWide] = useState(true)
  const [showNav, setShowNav] = useState(true)   // mobile : liste vs contenu

  useEffect(() => { if (open) { setSection(initialSection); setShowNav(false) } }, [open, initialSection])
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 820px)')
    const on = () => setIsWide(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // ── Données ──
  const [profile, setProfile] = useState<ProfileState>({ full_name: '', preferred_name: '', work_profession: '', work_hours_per_week: '', ideal_sleep_hours: '', sport_hours_per_week: '', sports: [] })
  const [instruction, setInstruction] = useState('')
  const [defaultModel, setDefaultModel] = useState('athena')
  const [voice, setVoice] = useState<{ lang: string; style: string; speed: string }>({ lang: 'fr-FR', style: 'neutre', speed: 'normal' })
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [globalNotif, setGlobalNotif] = useState(true)
  const [pushState, setPushState] = useState<PushState | 'loading'>('loading')
  const [agent, setAgent] = useState<TrainingAgentSettings>(DEFAULT_TRAINING_SETTINGS)
  const uidRef = useRef<string | null>(null)

  // Chargement à l'ouverture.
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

  // ── Persistance ──
  const saveProfile = useCallback((patch: Record<string, unknown>) => {
    const uid = uidRef.current; if (!uid) return
    void createClient().from('profiles').update(patch).eq('id', uid)
  }, [])
  const saveInstruction = useCallback(async (text: string) => {
    const uid = uidRef.current; if (!uid) return
    const sb = createClient()
    const { data: existing } = await sb.from('ai_rules').select('id').eq('user_id', uid).eq('category', 'instruction').maybeSingle()
    if (existing) await sb.from('ai_rules').update({ rule_text: text.trim(), active: true }).eq('id', existing.id)
    else await sb.from('ai_rules').insert({ user_id: uid, category: 'instruction', rule_text: text.trim(), active: true })
  }, [])
  const saveVoice = useCallback((next: { lang: string; style: string; speed: string }) => {
    setVoice(next); try { localStorage.setItem('thw_voice_settings', JSON.stringify(next)) } catch { /* ignore */ }
  }, [])
  const saveAgent = useCallback((next: TrainingAgentSettings) => {
    setAgent(next); const uid = uidRef.current; if (uid) void createClient().from('profiles').update({ ai_agent_training: next }).eq('id', uid)
    try { localStorage.setItem('thw_agent_training', JSON.stringify(next)) } catch { /* ignore */ }
  }, [])
  const patchPref = useCallback((key: string, val: boolean) => {
    setPrefs(p => ({ ...p, [key]: val }))
    void fetch('/api/notifications/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: { [key]: val } }) })
  }, [])

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
    <div style={{ width: isWide ? 230 : '100%', flexShrink: 0, borderRight: isWide ? '0.5px solid var(--border)' : 'none', padding: '10px 8px', overflowY: 'auto' }}>
      {NAV.map(g => (
        <div key={g.group} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '6px 10px' }}>{g.group}</div>
          {g.items.map(it => (
            <button key={it.id} disabled={it.disabled}
              onClick={() => { if (it.disabled) return; setSection(it.id); if (!isWide) setShowNav(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: it.disabled ? 'not-allowed' : 'pointer', background: section === it.id && isWide ? 'var(--bg-hover)' : 'transparent', color: it.disabled ? 'var(--text-dim)' : 'var(--text)', fontSize: 14, fontWeight: section === it.id ? 600 : 450, fontFamily: 'DM Sans,sans-serif' }}>
              {it.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 13800, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isWide ? 24 : 0 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 880, height: isWide ? '86vh' : '100%', background: 'var(--bg-card)', borderRadius: isWide ? 18 : 0, border: '0.5px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'max(12px, env(safe-area-inset-top)) 16px 12px', borderBottom: '0.5px solid var(--border)' }}>
          {!isWide && !showNav && (
            <button onClick={() => setShowNav(true)} aria-label="Retour" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <div style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>Paramètres</div>
          <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-mid)', fontSize: 22, lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {(isWide || showNav) && nav}
          {(isWide || !showNav) && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
              {section === 'profil' && <ProfilSection profile={profile} setProfile={setProfile} saveProfile={saveProfile} />}
              {section === 'instructions' && <InstructionsSection value={instruction} setValue={setInstruction} save={saveInstruction} />}
              {section === 'modele' && <ModeleSection value={defaultModel} onChange={(m) => { setDefaultModel(m); try { localStorage.setItem('thw_ai_default_model', m) } catch { /* ignore */ } }} />}
              {section === 'voix' && <VoixSection voice={voice} save={saveVoice} />}
              {section === 'notifications' && <NotificationsSection prefs={prefs} globalNotif={globalNotif} pushState={pushState} setPushState={setPushState} patchPref={patchPref} setGlobal={(v) => { setGlobalNotif(v); void fetch('/api/notifications/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ global_enabled: v }) }) }} />}
              {section === 'agent_training' && <AgentTrainingSection agent={agent} save={saveAgent} />}
              {section === 'agent_networks' && <div style={sectionTitle}>Networks — bientôt disponible</div>}
              {section === 'connecteurs' && <ConnecteursSection />}
              {section === 'abonnement' && <AbonnementSection />}
            </div>
          )}
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
      const has = p.sports.includes(s)
      const sports = has ? p.sports.filter(x => x !== s) : [...p.sports, s]
      saveProfile({ sports })
      return { ...p, sports }
    })
  }
  const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? null : n }

  return (
    <div>
      <div style={sectionTitle}>Profil</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
        <div>
          <label style={fieldLabel}>Nom complet</label>
          <input style={inputStyle} value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} onBlur={() => saveProfile({ full_name: profile.full_name.trim() || null })} placeholder="Ton nom" />
        </div>
        <div>
          <label style={fieldLabel}>Comment souhaites-tu que Hybrid t’appelle ?</label>
          <input style={inputStyle} value={profile.preferred_name} onChange={e => setProfile(p => ({ ...p, preferred_name: e.target.value }))} onBlur={() => saveProfile({ preferred_name: profile.preferred_name.trim() || null })} placeholder="Ex. Alex, Coach…" />
        </div>
        <div style={{ position: 'relative' }}>
          <label style={fieldLabel}>Quelle est la meilleure description de ton travail ?</label>
          <input style={inputStyle} value={profOpen ? profQuery : profile.work_profession}
            onFocus={() => { setProfOpen(true); setProfQuery('') }}
            onChange={e => setProfQuery(e.target.value)}
            onBlur={() => setTimeout(() => setProfOpen(false), 150)}
            placeholder="Rechercher un métier…" />
          {profOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, marginTop: 4, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              {matches.map(m => (
                <button key={m} onMouseDown={() => { setProfile(p => ({ ...p, work_profession: m })); saveProfile({ work_profession: m }); setProfOpen(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontSize: 13.5, fontFamily: 'DM Sans,sans-serif' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>{m}</button>
              ))}
              {matches.length === 0 && <div style={{ padding: '9px 12px', fontSize: 13, color: 'var(--text-dim)' }}>Aucun résultat</div>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={fieldLabel}>Heures de travail / semaine</label>
            <input style={inputStyle} inputMode="numeric" value={profile.work_hours_per_week} onChange={e => setProfile(p => ({ ...p, work_hours_per_week: e.target.value }))} onBlur={() => saveProfile({ work_hours_per_week: num(profile.work_hours_per_week) })} placeholder="Ex. 40" />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={fieldLabel}>Heures de sommeil idéales</label>
            <input style={inputStyle} inputMode="decimal" value={profile.ideal_sleep_hours} onChange={e => setProfile(p => ({ ...p, ideal_sleep_hours: e.target.value }))} onBlur={() => saveProfile({ ideal_sleep_hours: num(profile.ideal_sleep_hours) })} placeholder="Ex. 8" />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={fieldLabel}>Heures de sport / semaine</label>
            <input style={inputStyle} inputMode="decimal" value={profile.sport_hours_per_week} onChange={e => setProfile(p => ({ ...p, sport_hours_per_week: e.target.value }))} onBlur={() => saveProfile({ sport_hours_per_week: num(profile.sport_hours_per_week) })} placeholder="Ex. 10" />
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Sports pratiqués</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SPORTS.map(([v, l]) => {
              const on = profile.sports.includes(v)
              return (
                <button key={v} onClick={() => toggleSport(v)}
                  style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${on ? ACCENT : 'var(--border)'}`, background: on ? 'rgba(91,111,255,0.12)' : 'transparent', color: on ? ACCENT : 'var(--text-mid)', fontSize: 12.5, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{l}</button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Instructions ───────────────────────────────────────────────
const INSTRUCTION_PRESETS = [
  { label: 'Coach exigeant', text: 'Sois direct et exigeant. Ne me ménage pas, dis-moi la vérité sur ma forme et mes efforts, quitte à être cash. Priorité à la performance.' },
  { label: 'Pédagogue', text: 'Explique-moi toujours le pourquoi de tes recommandations, avec des mots simples. Je veux comprendre et progresser dans ma compréhension.' },
  { label: 'Bref et efficace', text: 'Réponds de façon concise et actionnable. Va droit au but, pas de blabla. Des listes claires quand c’est utile.' },
  { label: 'Motivateur', text: 'Sois positif et motivant. Encourage-moi, célèbre mes progrès, garde-moi engagé même les jours difficiles.' },
]
function InstructionsSection({ value, setValue, save }: { value: string; setValue: (v: string) => void; save: (v: string) => void }) {
  return (
    <div>
      <div style={sectionTitle}>Instructions</div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 14, maxWidth: 560 }}>
        Un prompt qui dit à Hybrid comment se comporter et répondre. Il en tiendra compte dans toutes tes conversations.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
        {INSTRUCTION_PRESETS.map(p => (
          <button key={p.label} onClick={() => { setValue(p.text); save(p.text) }}
            style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{p.label}</button>
        ))}
      </div>
      <textarea value={value} onChange={e => setValue(e.target.value)} onBlur={() => save(value)} rows={7}
        placeholder="Ex. Tu es mon coach hybride. Sois technique mais accessible…"
        style={{ ...inputStyle, fontSize: 13.5, lineHeight: 1.55, resize: 'vertical', maxWidth: 620 }} />
    </div>
  )
}

// ── Modèle par défaut ──────────────────────────────────────────
function ModeleSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const MODELS: [string, string, string, string][] = [
    ['hermes', 'Hermès', 'Rapide', '#d4a017'], ['athena', 'Athéna', 'Équilibré', ACCENT], ['zeus', 'Zeus', 'Maximum', '#8b5cf6'],
  ]
  return (
    <div>
      <div style={sectionTitle}>Modèle par défaut</div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16, maxWidth: 560 }}>Le modèle utilisé par défaut pour tes nouvelles conversations.</p>
      <div style={{ display: 'flex', gap: 10, maxWidth: 480 }}>
        {MODELS.map(([id, label, speed, color]) => {
          const on = value === id
          return (
            <button key={id} onClick={() => onChange(id)}
              style={{ flex: 1, padding: '14px 8px', borderRadius: 12, border: `1.5px solid ${on ? color : 'var(--border)'}`, background: on ? `${color}18` : 'transparent', color: on ? color : 'var(--text-mid)', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 3 }}>{speed}</div>
              <div style={{ fontSize: 15, fontWeight: on ? 700 : 600 }}>{label}</div>
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
      <div style={sectionTitle}>Voix</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
        <div>
          <label style={fieldLabel}>Langue</label>
          <Select value={voice.lang} onChange={v => save({ ...voice, lang: v })} options={[['fr-FR', 'Français'], ['en-US', 'Anglais'], ['es-ES', 'Espagnol']]} />
        </div>
        <div>
          <label style={fieldLabel}>Style</label>
          <Select value={voice.style} onChange={v => save({ ...voice, style: v })} options={[['douce', 'Douce'], ['neutre', 'Neutre'], ['energique', 'Énergique']]} />
        </div>
        <div>
          <label style={fieldLabel}>Vitesse</label>
          <Select value={voice.speed} onChange={v => save({ ...voice, speed: v })} options={[['lent', 'Lent'], ['normal', 'Normal'], ['rapide', 'Rapide']]} />
        </div>
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
  const DEFAULTS: Record<string, boolean> = { 'coach.reponse_terminee': true, 'entrainement.nouveau_plan': true, 'coach.analyse_terminee': false, 'performance.resume_hebdo': true, 'performance.progression': true, 'competitions.j1': true, 'tokens.quota_epuise': true }
  const togglePush = async () => {
    if (busy) return; setBusy(true)
    try { setPushState(pushState === 'on' ? await disablePush() : await enablePush()) } finally { setBusy(false) }
  }
  return (
    <div>
      <div style={sectionTitle}>Notifications</div>
      {/* Push appareil */}
      {pushState !== 'unsupported' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Notifications sur cet appareil</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>
              {pushState === 'denied' ? 'Bloquées par le navigateur — autorise-les dans les réglages du site.'
                : pushState === 'unconfigured' ? 'Bientôt disponible sur ce serveur.'
                : 'Reçois les notifications push sur cet appareil, même app fermée.'}
            </div>
          </div>
          <Toggle value={pushState === 'on'} onChange={() => { if (pushState === 'off' || pushState === 'on') void togglePush() }} />
        </div>
      )}
      {/* Toggle global */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Toutes les notifications</div>
        <Toggle value={globalNotif} onChange={setGlobal} />
      </div>
      <div style={{ opacity: globalNotif ? 1 : 0.45, pointerEvents: globalNotif ? 'auto' : 'none' }}>
        {CURATED_NOTIFS.map(n => (
          <NotifRow key={n.key} title={n.title} desc={n.desc} value={prefs[n.key] ?? DEFAULTS[n.key] ?? false} onChange={(v) => patchPref(n.key, v)} />
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.5 }}>
        Retrouve toutes les catégories de notifications détaillées dans Profil → Notifications.
      </p>
    </div>
  )
}

// ── Agent Training ─────────────────────────────────────────────
function AgentTrainingSection({ agent, save }: { agent: TrainingAgentSettings; save: (a: TrainingAgentSettings) => void }) {
  const set = (patch: Partial<TrainingAgentSettings>) => save({ ...agent, ...patch })
  const toggleIn = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <div>
      <div style={sectionTitle}>Agent Training</div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 18, maxWidth: 560 }}>
        Ces réglages pilotent le comportement du coach Training dans tes conversations.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Discipline prioritaire</label><Select value={agent.focus} onChange={v => set({ focus: v })} options={FOCUS_OPTS} /></div>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Objectif principal</label><Select value={agent.objectif} onChange={v => set({ objectif: v })} options={OBJECTIF_OPTS} /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Ton du coach</label><Select value={agent.ton} onChange={v => set({ ton: v })} options={TON_OPTS} /></div>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Niveau de détail</label><Select value={agent.detail} onChange={v => set({ detail: v })} options={DETAIL_OPTS} /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Niveau de l’athlète</label><Select value={agent.niveau} onChange={v => set({ niveau: v })} options={NIVEAU_OPTS} /></div>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Format des réponses</label><Select value={agent.format} onChange={v => set({ format: v })} options={FORMAT_OPTS} /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Périodisation préférée</label><Select value={agent.periodisation} onChange={v => set({ periodisation: v })} options={PERIODISATION_OPTS} /></div>
          <div style={{ flex: '1 1 200px' }}><label style={fieldLabel}>Unités</label><Select value={agent.unites} onChange={v => set({ unites: v })} options={UNITES_OPTS} /></div>
        </div>
        <div>
          <label style={fieldLabel}>Matériel disponible</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {MATERIEL_OPTS.map(([v, l]) => {
              const on = agent.materiel.includes(v)
              return <button key={v} onClick={() => set({ materiel: toggleIn(agent.materiel, v) })} style={{ padding: '6px 11px', borderRadius: 999, border: `1px solid ${on ? ACCENT : 'var(--border)'}`, background: on ? 'rgba(91,111,255,0.12)' : 'transparent', color: on ? ACCENT : 'var(--text-mid)', fontSize: 12, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{l}</button>
            })}
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Jours d’entraînement préférés</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAYS.map((d, i) => {
              const on = agent.jours.includes(i)
              return <button key={i} onClick={() => set({ jours: agent.jours.includes(i) ? agent.jours.filter(x => x !== i) : [...agent.jours, i] })} style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${on ? ACCENT : 'var(--border)'}`, background: on ? 'rgba(91,111,255,0.12)' : 'transparent', color: on ? ACCENT : 'var(--text-mid)', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>{d}</button>
            })}
          </div>
        </div>
        <div>
          <label style={fieldLabel}>Contraintes / blessures à toujours considérer</label>
          <textarea value={agent.contraintes} onChange={e => set({ contraintes: e.target.value })} rows={3} placeholder="Ex. genou droit fragile, pas de sauts…" style={{ ...inputStyle, fontSize: 13, lineHeight: 1.5, resize: 'vertical' }} />
        </div>
        {[['proactivite', 'Suggestions proactives', 'Hybrid propose des idées utiles sans que tu le demandes.'], ['science', 'Appuyer sur la science', 'Justifie les conseils par des références scientifiques quand pertinent.'], ['emoji', 'Emojis', 'Autoriser quelques emojis dans les réponses.']].map(([k, title, desc]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div><div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{desc}</div></div>
            <Toggle value={agent[k as 'proactivite' | 'science' | 'emoji']} onChange={(v) => set({ [k]: v } as Partial<TrainingAgentSettings>)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Connecteurs ────────────────────────────────────────────────
function ConnecteursSection() {
  const CONNECTORS: { name: string; desc: string; ready: boolean }[] = [
    { name: 'Strava', desc: 'Importe automatiquement tes activités.', ready: true },
    { name: 'Polar', desc: 'Séances, sommeil et récupération.', ready: true },
    { name: 'Wahoo', desc: 'Séances vélo et home-trainer.', ready: true },
    { name: 'Withings', desc: 'Poids, sommeil, métriques santé.', ready: true },
    { name: 'Google Agenda', desc: 'Synchronise tes séances avec ton agenda.', ready: false },
    { name: 'Apple Agenda', desc: 'Synchronise tes séances avec ton agenda.', ready: false },
    { name: 'Excel', desc: 'Exporte / importe tes données en tableur.', ready: false },
  ]
  return (
    <div>
      <div style={sectionTitle}>Connecteurs</div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16, maxWidth: 560 }}>Connecte Hybrid à tes applications pour qu’il travaille avec toutes tes données.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560 }}>
        {CONNECTORS.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 12, border: '0.5px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{c.desc}</div>
            </div>
            {c.ready ? (
              <a href="/connections" style={{ padding: '7px 13px', borderRadius: 8, background: ACCENT, color: '#fff', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', fontFamily: 'DM Sans,sans-serif' }}>Connecter</a>
            ) : (
              <span style={{ padding: '7px 11px', borderRadius: 8, background: 'var(--bg-alt)', color: 'var(--text-dim)', fontSize: 12, fontWeight: 600 }}>Bientôt</span>
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
      <div style={sectionTitle}>Abonnement</div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 16, maxWidth: 560 }}>Gère ton plan, tes tokens et ta facturation.</p>
      <a href="/settings/subscription" style={{ display: 'inline-block', padding: '11px 18px', borderRadius: 10, background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'DM Sans,sans-serif' }}>Voir mon abonnement</a>
    </div>
  )
}
