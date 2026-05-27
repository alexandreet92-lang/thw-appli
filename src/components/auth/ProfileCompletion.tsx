'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { onDone: () => void }

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

const SPORTS = [
  { id: 'cycling',   label: 'Cyclisme',    color: '#06B6D4' },
  { id: 'running',   label: 'Running',     color: '#10B981' },
  { id: 'trail',     label: 'Trail',       color: '#F59E0B' },
  { id: 'swimming',  label: 'Natation',    color: '#3B82F6' },
  { id: 'strength',  label: 'Musculation', color: '#8B5CF6' },
  { id: 'triathlon', label: 'Triathlon',   color: '#EC4899' },
  { id: 'ski',       label: 'Ski',         color: '#06B6D4' },
  { id: 'other',     label: 'Autre',       color: '#8C8C8C' },
]

const OBJECTIVES = [
  { id: 'performance', label: 'Améliorer ma performance',  desc: 'Battre mes records, progresser en compétition', color: '#06B6D4' },
  { id: 'health',      label: 'Rester en forme',           desc: 'Santé, bien-être, activité régulière',          color: '#10B981' },
  { id: 'weight',      label: 'Perte de poids',            desc: 'Composition corporelle et nutrition',            color: '#F59E0B' },
  { id: 'endurance',   label: 'Préparer un événement',     desc: 'Marathon, triathlon, cyclosportive…',            color: '#8B5CF6' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', height: 56, background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14,
  padding: '0 20px', color: 'white', fontSize: 22, fontWeight: 600,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif',
  textAlign: 'center',
}

const BG = 'linear-gradient(160deg, #060614 0%, #0A0F1E 50%, #050B1A 100%)'

export function ProfileCompletion({ onDone }: Props) {
  const [step,          setStep]         = useState(1)
  const [firstName,     setFirstName]    = useState('')
  const [primarySport,  setPrimarySport] = useState('')
  const [objective,     setObjective]    = useState('')
  const [saving,        setSaving]       = useState(false)

  const isDisabled =
    (step === 1 && !firstName.trim()) ||
    (step === 2 && !primarySport) ||
    (step === 3 && !objective)

  const handleComplete = async () => {
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        await sb.from('profiles').upsert({
          user_id: user.id,
          first_name: firstName.trim(),
          primary_sport: primarySport,
          objective,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        await sb.auth.updateUser({ data: { first_name: firstName.trim(), primary_sport: primarySport } })
      }
    } catch { /* ignore */ }
    localStorage.setItem('profile_completed', 'true')
    setSaving(false)
    onDone()
  }

  const handleSkip = () => {
    if (step < 3) { setStep(s => s + 1) }
    else { localStorage.setItem('profile_completed', 'true'); onDone() }
  }

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1)
    else handleComplete()
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'linear-gradient(90deg, #06B6D4, #2563EB)' : 'rgba(255,255,255,0.1)',
              transition: 'background 400ms',
            }} />
          ))}
        </div>

        {/* Step 1 — Prénom */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 100, height: 100, margin: '0 auto 32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(37,99,235,0.2))',
              border: '2px dashed rgba(6,182,212,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, color: 'white', fontWeight: 700,
            }}>
              {firstName ? firstName[0]?.toUpperCase() : '?'}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: '0 0 8px', fontFamily: 'Syne, sans-serif' }}>
              Comment tu t&apos;appelles ?
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 32px', lineHeight: 1.5 }}>
              Pour personnaliser ton expérience.
            </p>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Ton prénom"
              autoFocus
              style={inputStyle}
              onKeyDown={e => { if (e.key === 'Enter' && firstName.trim()) handleNext() }}
            />
          </div>
        )}

        {/* Step 2 — Sport */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 8px', textAlign: 'center', fontFamily: 'Syne, sans-serif' }}>
              Ton sport principal ?
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5 }}>
              L&apos;app adaptera les suggestions à ton sport.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SPORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setPrimarySport(s.id)}
                  style={{
                    padding: '16px 12px', borderRadius: 14,
                    background: primarySport === s.id ? `rgba(${hexRgb(s.color)},0.15)` : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${primarySport === s.id ? s.color : 'rgba(255,255,255,0.1)'}`,
                    color: primarySport === s.id ? s.color : 'rgba(255,255,255,0.6)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 200ms', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Objectif */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 8px', textAlign: 'center', fontFamily: 'Syne, sans-serif' }}>
              Ton objectif ?
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5 }}>
              Pour calibrer les recommandations IA.
            </p>
            {OBJECTIVES.map(o => (
              <button
                key={o.id}
                onClick={() => setObjective(o.id)}
                style={{
                  width: '100%', marginBottom: 10, padding: '14px 16px',
                  borderRadius: 14, textAlign: 'left',
                  background: objective === o.id ? `rgba(${hexRgb(o.color)},0.12)` : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${objective === o.id ? o.color : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer', transition: 'all 200ms', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 3px', color: objective === o.id ? o.color : 'white' }}>{o.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{o.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleNext}
          disabled={isDisabled || saving}
          style={{
            width: '100%', height: 52, borderRadius: 14, marginTop: 24,
            background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
            border: 'none', color: 'white', fontSize: 16, fontWeight: 700,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled || saving ? 0.4 : 1,
            transition: 'opacity 200ms', fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {saving ? 'Enregistrement…' : step < 3 ? 'Continuer →' : 'Terminer →'}
        </button>

        <button onClick={handleSkip} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Passer cette étape
        </button>
      </div>
    </div>
  )
}
