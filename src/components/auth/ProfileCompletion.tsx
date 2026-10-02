'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { SheetPill, SHEET_CARD_SHADOW, useMobileSafe } from '@/components/ui/BottomSheet'

interface Props { onDone: () => void }

function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

const SPORTS = [
  { id: 'cycling',   labelKey: 'sport.cycling',        color: '#06B6D4' }, // design-allow-color — teinte sport/objectif
  { id: 'running',   labelKey: 'sport.running',        color: '#10B981' }, // design-allow-color — teinte sport/objectif
  { id: 'trail',     labelKey: 'sport.trail',          color: '#F59E0B' }, // design-allow-color — teinte sport/objectif
  { id: 'swimming',  labelKey: 'q.sport.natation',     color: '#3B82F6' }, // design-allow-color — teinte sport/objectif
  { id: 'strength',  labelKey: 'authpage.sportStrength', color: '#8B5CF6' }, // design-allow-color — teinte sport/objectif
  { id: 'triathlon', labelKey: 'sport.triathlon',      color: '#EC4899' }, // design-allow-color — teinte sport/objectif
  { id: 'ski',       labelKey: 'authpage.sportSki',    color: '#06B6D4' }, // design-allow-color — teinte sport/objectif
  { id: 'other',     labelKey: 'q.other',              color: '#8C8C8C' }, // design-allow-color — teinte sport/objectif
]

const OBJECTIVES = [
  { id: 'performance', labelKey: 'authpage.objPerfLabel',   descKey: 'authpage.objPerfDesc',   color: '#06B6D4' }, // design-allow-color — teinte sport/objectif
  { id: 'health',      labelKey: 'authpage.objHealthLabel', descKey: 'authpage.objHealthDesc', color: '#10B981' }, // design-allow-color — teinte sport/objectif
  { id: 'weight',      labelKey: 'goal.perte_poids',        descKey: 'authpage.objWeightDesc', color: '#F59E0B' }, // design-allow-color — teinte sport/objectif
  { id: 'endurance',   labelKey: 'authpage.objEventLabel',  descKey: 'authpage.objEventDesc',  color: '#8B5CF6' }, // design-allow-color — teinte sport/objectif
]

const inputStyle: React.CSSProperties = {
  width: '100%', height: 56, background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--r-md)',
  padding: '0 20px', color: 'white', fontSize: 22, fontWeight: 600,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)',
  textAlign: 'center',
}

const BG = 'linear-gradient(160deg, #060614 0%, #0A0F1E 50%, #050B1A 100%)'

export function ProfileCompletion({ onDone }: Props) {
  const { t } = useI18n()
  const [step,          setStep]         = useState(1)
  const [firstName,     setFirstName]    = useState('')
  const [primarySport,  setPrimarySport] = useState('')
  const [objective,     setObjective]    = useState('')
  const [saving,        setSaving]       = useState(false)
  const mobile = useMobileSafe()

  const isDisabled =
    (step === 1 && !firstName.trim()) ||
    (step === 2 && !primarySport) ||
    (step === 3 && !objective)

  const handleComplete = async () => {
    setSaving(true)
    try {
      const sb = createClient()
      const user = await getCurrentUser()
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

  // Mobile (≤ 767 px) : page gris chaud plein écran, titres Inter gras,
  // champ plein blanc, puces pilule, objectifs en carte blanche à filets,
  // pilule cyan fixe en bas + « Passer » en texte.
  if (mobile) {
    const head: React.CSSProperties = { fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 8px', textAlign: 'center', lineHeight: 1.2 }
    const sub: React.CSSProperties = { fontSize: 15, color: 'var(--text-mid)', margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5 }
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--surface-page)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
        <div style={{ display: 'flex', gap: 6, padding: 'calc(env(safe-area-inset-top) + 16px) 20px 0' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 'var(--r-pill)', background: i <= step ? 'var(--primary)' : 'var(--surface-chip)', transition: 'background 400ms' }} />
          ))}
        </div>

        <div style={{ flex: 1, padding: '36px 16px 24px', width: '100%', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box' }}>
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 96, height: 96, margin: '0 auto 28px', borderRadius: '50%', background: 'var(--surface-card)', boxShadow: 'var(--shadow-capsule)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--text)', fontWeight: 800 }}>
                {firstName ? firstName[0]?.toUpperCase() : '?'}
              </div>
              <h2 style={head}>{t('welcome.t0')}</h2>
              <p style={sub}>{t('authpage.step1Sub')}</p>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('authpage.firstNamePh')} autoFocus autoComplete="given-name"
                onKeyDown={e => { if (e.key === 'Enter' && firstName.trim()) handleNext() }}
                style={{ width: '100%', minHeight: 56, boxSizing: 'border-box', border: 'none', borderRadius: 'var(--r-md)', background: 'var(--surface-card)', boxShadow: SHEET_CARD_SHADOW,
                  padding: '0 20px', color: 'var(--text)', fontSize: 22, fontWeight: 600, textAlign: 'center', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={head}>{t('authpage.step2Title')}</h2>
              <p style={sub}>{t('authpage.step2Sub')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {SPORTS.map(sp => {
                  const on = primarySport === sp.id
                  return (
                    <button key={sp.id} type="button" onClick={() => setPrimarySport(sp.id)} aria-pressed={on}
                      style={{ minHeight: 52, padding: '0 12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: on ? 700 : 600,
                        background: on ? 'var(--text)' : 'var(--surface-card)', color: on ? 'var(--bg)' : 'var(--text)', boxShadow: on ? 'none' : SHEET_CARD_SHADOW,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s ease, color 0.2s ease' }}>
                      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: sp.color, flexShrink: 0 }} />
                      {t(sp.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={head}>{t('authpage.step3Title')}</h2>
              <p style={sub}>{t('authpage.step3Sub')}</p>
              <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', boxShadow: SHEET_CARD_SHADOW, overflow: 'hidden' }}>
                {OBJECTIVES.map((o, i) => {
                  const on = objective === o.id
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => setObjective(o.id)}
                      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 64, padding: '14px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      {i > 0 && <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 16, fontWeight: on ? 700 : 600, color: 'var(--text)' }}>{t(o.labelKey)}</span>
                        <span style={{ display: 'block', fontSize: 14, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.4 }}>{t(o.descKey)}</span>
                      </span>
                      <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: on ? 'var(--primary)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--text-dim)' }}>
                        {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', bottom: 0, background: 'var(--surface-page)', padding: '10px 16px calc(14px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box' }}>
          <SheetPill onClick={handleNext} disabled={isDisabled || saving}>
            {saving ? t('common.saving') : step < 3 ? t('common.continue') : t('common.finish')}
          </SheetPill>
          <SheetPill variant="ghost" onClick={handleSkip}>{t('authpage.skipStep')}</SheetPill>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', fontFamily: 'var(--font-body)' }}>
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
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>
              {t('welcome.t0')}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 32px', lineHeight: 1.5 }}>
              {t('authpage.step1Sub')}
            </p>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder={t('authpage.firstNamePh')}
              autoFocus
              style={inputStyle}
              onKeyDown={e => { if (e.key === 'Enter' && firstName.trim()) handleNext() }}
            />
          </div>
        )}

        {/* Step 2 — Sport */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 8px', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
              {t('authpage.step2Title')}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5 }}>
              {t('authpage.step2Sub')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SPORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setPrimarySport(s.id)}
                  style={{
                    padding: '16px 12px', borderRadius: 'var(--r-md)',
                    background: primarySport === s.id ? `rgba(${hexRgb(s.color)},0.15)` : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${primarySport === s.id ? s.color : 'rgba(255,255,255,0.1)'}`,
                    color: primarySport === s.id ? s.color : 'rgba(255,255,255,0.6)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 200ms', fontFamily: 'var(--font-body)',
                  }}
                >
                  {t(s.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Objectif */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 8px', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
              {t('authpage.step3Title')}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', textAlign: 'center', lineHeight: 1.5 }}>
              {t('authpage.step3Sub')}
            </p>
            {OBJECTIVES.map(o => (
              <button
                key={o.id}
                onClick={() => setObjective(o.id)}
                style={{
                  width: '100%', marginBottom: 10, padding: '14px 16px',
                  borderRadius: 'var(--r-md)', textAlign: 'left',
                  background: objective === o.id ? `rgba(${hexRgb(o.color)},0.12)` : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${objective === o.id ? o.color : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer', transition: 'all 200ms', fontFamily: 'var(--font-body)',
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 3px', color: objective === o.id ? o.color : 'white' }}>{t(o.labelKey)}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{t(o.descKey)}</p>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleNext}
          disabled={isDisabled || saving}
          style={{
            width: '100%', height: 52, borderRadius: 'var(--r-md)', marginTop: 24,
            background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
            border: 'none', color: 'white', fontSize: 16, fontWeight: 700,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled || saving ? 0.4 : 1,
            transition: 'opacity 200ms', fontFamily: 'var(--font-body)',
          }}
        >
          {saving ? t('common.saving') : step < 3 ? `${t('common.continue')} →` : `${t('common.finish')} →`}
        </button>

        <button onClick={handleSkip} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          {t('authpage.skipStep')}
        </button>
      </div>
    </div>
  )
}
