'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// /bienvenue — mini-questionnaire one-shot (1re connexion). Remplit `profiles`
// puis pose profile_setup_done=true → l'utilisateur ne le revoit plus (gate
// middleware). Plein écran, à la charte (tokens, Fraunces/Inter, shuriken).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const FD = 'var(--font-body)', FT = 'var(--font-display)'

const SPORTS = [
  { key: 'running', label: 'Running' }, { key: 'trail', label: 'Trail' },
  { key: 'cycling', label: 'Cyclisme' }, { key: 'triathlon', label: 'Triathlon' },
  { key: 'hyrox', label: 'Hyrox' }, { key: 'gym', label: 'Muscu / Gym' },
  { key: 'aviron', label: 'Aviron' }, { key: 'boxe', label: 'Boxe' },
]
const GOALS = [
  { key: 'performance', label: 'Performance' }, { key: 'sante', label: 'Santé / forme' },
  { key: 'perte_poids', label: 'Perte de poids' }, { key: 'hybride', label: 'Hybride (force + endurance)' },
]
const EXPERIENCE = [
  { key: '<1', label: "Moins d'1 an" }, { key: '1-3', label: '1 – 3 ans' },
  { key: '3-5', label: '3 – 5 ans' }, { key: '5-10', label: '5 – 10 ans' },
  { key: '10+', label: 'Plus de 10 ans' },
]
const GENDERS = [
  { key: 'homme', label: 'Homme' }, { key: 'femme', label: 'Femme' }, { key: 'autre', label: 'Autre' },
]

interface Form {
  full_name: string
  sports: string[]
  primary_goal: string | null
  sport_experience: string | null
  weekly_sessions: number | null
  height_cm: string
  weight_kg: string
  birth_date: string
  gender: string | null
}

const TOTAL = 6

// ── Primitives UI ────────────────────────────────────────────────
function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
      border: `1px solid ${active ? 'var(--primary)' : 'var(--border-mid)'}`,
      background: active ? 'var(--primary-dim)' : 'var(--bg-card2)',
      color: active ? 'var(--primary)' : 'var(--text)',
      fontFamily: FD, fontSize: 14, fontWeight: active ? 600 : 500, transition: 'all 0.15s',
    }}>{label}</button>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{ display: 'block', fontFamily: FD, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
const inputStyle: React.CSSProperties = {
  width: '100%', height: 48, boxSizing: 'border-box', background: 'var(--input-bg)',
  border: '1px solid var(--border-mid)', borderRadius: 12, padding: '0 14px',
  color: 'var(--text)', fontFamily: FD, fontSize: 15, outline: 'none',
}

export default function BienvenuePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState<Form>({
    full_name: '', sports: [], primary_goal: null, sport_experience: null,
    weekly_sessions: null, height_cm: '', weight_kg: '', birth_date: '', gender: null,
  })

  // Préremplissage depuis le profil existant (si déjà renseigné ailleurs).
  useEffect(() => {
    let cancel = false
    void (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      const { data } = await sb.from('profiles')
        .select('full_name, sports, primary_goal, sport_experience, weekly_sessions, height_cm, weight_kg, birth_date, gender')
        .eq('id', user.id).maybeSingle()
      if (cancel || !data) return
      setF(prev => ({
        ...prev,
        full_name: data.full_name ?? '',
        sports: data.sports ?? [],
        primary_goal: data.primary_goal ?? null,
        sport_experience: data.sport_experience ?? null,
        weekly_sessions: data.weekly_sessions ?? null,
        height_cm: data.height_cm != null ? String(data.height_cm) : '',
        weight_kg: data.weight_kg != null ? String(data.weight_kg) : '',
        birth_date: data.birth_date ?? '',
        gender: data.gender ?? null,
      }))
    })()
    return () => { cancel = true }
  }, [router])

  const toggleSport = (k: string) => setF(p => ({ ...p, sports: p.sports.includes(k) ? p.sports.filter(s => s !== k) : [...p.sports, k] }))
  const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? null : n }

  const canNext = (
    step === 0 ? f.full_name.trim().length > 1 :
    step === 1 ? f.sports.length > 0 :
    step === 2 ? !!f.primary_goal :
    step === 3 ? !!f.sport_experience :
    step === 4 ? f.weekly_sessions != null :
    true
  )

  async function finish() {
    setSaving(true); setError('')
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.replace('/auth'); return }
    const { error: e } = await sb.from('profiles').update({
      full_name: f.full_name.trim(),
      sports: f.sports,
      primary_goal: f.primary_goal,
      sport_experience: f.sport_experience,
      weekly_sessions: f.weekly_sessions,
      height_cm: num(f.height_cm),
      weight_kg: num(f.weight_kg),
      birth_date: f.birth_date || null,
      gender: f.gender,
      profile_setup_done: true,
    }).eq('id', user.id)
    setSaving(false)
    if (e) { setError("L'enregistrement a échoué. Réessaie."); return }
    router.replace('/'); router.refresh()
  }

  const next = () => { if (step < TOTAL - 1) setStep(s => s + 1); else void finish() }
  const back = () => setStep(s => Math.max(0, s - 1))

  const TITLES = [
    'Comment tu t’appelles ?',
    'Tes sports principaux',
    'Ton objectif principal',
    'Depuis combien de temps tu pratiques régulièrement ?',
    'Combien de séances par semaine ?',
    'Quelques mesures pour personnaliser',
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px' }}>
        {/* En-tête : shuriken + progression */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/logo_4bras.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 18 }}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 99, background: i <= step ? 'var(--primary)' : 'var(--border)', transition: 'all 0.25s' }} />
            ))}
          </div>
        </div>

        <h1 style={{ fontFamily: FT, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 24px', lineHeight: 1.2, textAlign: 'center' }}>{TITLES[step]}</h1>

        <div style={{ minHeight: 180 }}>
          {step === 0 && (
            <Field label="Nom complet">
              <input autoFocus value={f.full_name} onChange={e => setF(p => ({ ...p, full_name: e.target.value }))} placeholder="Prénom Nom" style={inputStyle} />
            </Field>
          )}
          {step === 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {SPORTS.map(s => <Chip key={s.key} active={f.sports.includes(s.key)} label={s.label} onClick={() => toggleSport(s.key)} />)}
            </div>
          )}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GOALS.map(g => <Chip key={g.key} active={f.primary_goal === g.key} label={g.label} onClick={() => setF(p => ({ ...p, primary_goal: g.key }))} />)}
            </div>
          )}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EXPERIENCE.map(x => <Chip key={x.key} active={f.sport_experience === x.key} label={x.label} onClick={() => setF(p => ({ ...p, sport_experience: x.key }))} />)}
            </div>
          )}
          {step === 4 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => <Chip key={n} active={f.weekly_sessions === n} label={n === 7 ? '7+' : String(n)} onClick={() => setF(p => ({ ...p, weekly_sessions: n }))} />)}
            </div>
          )}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Field label="Taille (cm)"><input type="number" inputMode="numeric" value={f.height_cm} onChange={e => setF(p => ({ ...p, height_cm: e.target.value }))} placeholder="178" style={inputStyle} /></Field>
                <Field label="Poids (kg)"><input type="number" inputMode="decimal" value={f.weight_kg} onChange={e => setF(p => ({ ...p, weight_kg: e.target.value }))} placeholder="72" style={inputStyle} /></Field>
              </div>
              <Field label="Date de naissance"><input type="date" value={f.birth_date} onChange={e => setF(p => ({ ...p, birth_date: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Sexe">
                <div style={{ display: 'flex', gap: 8 }}>
                  {GENDERS.map(g => <Chip key={g.key} active={f.gender === g.key} label={g.label} onClick={() => setF(p => ({ ...p, gender: g.key }))} />)}
                </div>
              </Field>
            </div>
          )}
        </div>

        {error && <p style={{ color: '#EF4444', fontFamily: FD, fontSize: 13, margin: '12px 0 0', textAlign: 'center' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {step > 0 && (
            <button onClick={back} style={{ height: 50, padding: '0 22px', borderRadius: 12, border: '1px solid var(--border-mid)', background: 'transparent', color: 'var(--text-mid)', fontFamily: FD, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Retour</button>
          )}
          <button onClick={next} disabled={!canNext || saving} style={{
            flex: 1, height: 50, borderRadius: 12, border: 'none', cursor: (!canNext || saving) ? 'not-allowed' : 'pointer',
            background: (!canNext || saving) ? 'var(--bg-card2)' : 'var(--primary-gradient)',
            color: (!canNext || saving) ? 'var(--text-dim)' : '#fff', fontFamily: FD, fontSize: 15, fontWeight: 700,
          }}>
            {saving ? 'Enregistrement…' : step === TOTAL - 1 ? 'Terminer' : 'Continuer'}
          </button>
        </div>
        {step === TOTAL - 1 && (
          <p style={{ textAlign: 'center', fontFamily: FD, fontSize: 12, color: 'var(--text-dim)', margin: '14px 0 0' }}>
            Tu pourras tout modifier plus tard dans ton profil.
          </p>
        )}
      </div>
    </div>
  )
}
