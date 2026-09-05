'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// /bienvenue — questionnaire d'onboarding à BRANCHES (Athlète / Athlète-coach /
// Coach) et à deux versions (complète & express). Piloté par la donnée
// (questions.ts) ; la plupart des questions sont en choix multiple + champ
// « Autre ». Persiste sur le profil (colonnes compat + onboarding jsonb) puis
// pose profile_setup_done=true. À la charte (tokens).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'
import {
  buildQuestionList, ATHLETE_QUESTIONS, type ObProfile, type ObVersion, type ObQuestion,
} from './questions'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

type Answers = Record<string, unknown>

// Champs texte affichés en zone multi-lignes (réponses longues).
const TEXTAREA = new Set(['a_mainGoal', 'a_injuries', 'c_pricing', 'c_expectations'])

export default function BienvenuePage() {
  const router = useRouter()
  const { t } = useI18n()

  const [profile, setProfile] = useState<ObProfile | null>(null)
  const [version, setVersion] = useState<ObVersion | null>(null)
  const [a, setA] = useState<Answers>({})
  const [step, setStep] = useState(0)              // 0 profil · 1 version · 2..2+N-1 questions · 2+N final
  const [dir, setDir] = useState<'r' | 'l'>('r')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const touch = useRef<number | null>(null)

  const list = useMemo<ObQuestion[]>(
    () => (profile && version ? buildQuestionList(profile, version) : []),
    [profile, version],
  )
  const N = list.length
  const STEP_VERSION = 1
  const STEP_FIRST_Q = 2
  const STEP_FINAL = STEP_FIRST_Q + N

  // Idempotent : si l'onboarding est déjà fait → dashboard.
  useEffect(() => {
    let cancel = false
    void (async () => {
      const sb = createClient()
      const user = await getCurrentUser()
      if (!user) { router.replace('/auth'); return }
      const { data } = await sb.from('profiles').select('profile_setup_done').eq('id', user.id).maybeSingle()
      if (cancel || !data) return
      if (data.profile_setup_done) { router.replace('/') }
    })()
    return () => { cancel = true }
  }, [router])

  // ── Accès/écriture des réponses ───────────────────────────────────
  const getStr = (id: string): string => (typeof a[id] === 'string' ? a[id] as string : '')
  const getArr = (id: string): string[] => (Array.isArray(a[id]) ? a[id] as string[] : [])
  const setStr = (id: string, v: string) => setA(p => ({ ...p, [id]: v }))
  const toggleArr = (id: string, v: string) => setA(p => {
    const cur = Array.isArray(p[id]) ? p[id] as string[] : []
    return { ...p, [id]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
  })
  const getPerSport = (qid: string, sport: string, field: string): string => {
    const m = a[qid] as Record<string, Record<string, string>> | undefined
    return m?.[sport]?.[field] ?? ''
  }
  const setPerSport = (qid: string, sport: string, field: string, v: string) => setA(p => {
    const m = { ...(p[qid] as Record<string, Record<string, string>> | undefined ?? {}) }
    m[sport] = { ...(m[sport] ?? {}), [field]: v }
    return { ...p, [qid]: m }
  })
  const getTf = (qid: string, tf: string): string => {
    const m = a[qid] as Record<string, string> | undefined
    return m?.[tf] ?? ''
  }
  const setTf = (qid: string, tf: string, v: string) => setA(p => {
    const m = { ...(p[qid] as Record<string, string> | undefined ?? {}) }
    m[tf] = v
    return { ...p, [qid]: m }
  })

  // ── Question courante ─────────────────────────────────────────────
  const qIdx = step - STEP_FIRST_Q
  const q: ObQuestion | null = qIdx >= 0 && qIdx < N ? list[qIdx] : null
  const isFinal = step >= STEP_FINAL && N >= 0 && step === STEP_FINAL

  // Une question masquée (showIf faux) est ignorée à la navigation.
  const visible = (i: number): boolean => {
    const qq = list[i]; return qq ? (qq.showIf ? qq.showIf(a) : true) : true
  }

  const isAnswered = (qq: ObQuestion): boolean => {
    if (qq.optional || qq.kind === 'perSport' || qq.kind === 'timeframes') return true
    if (qq.kind === 'multi') return getArr(qq.id).length > 0 || getStr(`${qq.id}__other`).trim().length > 0
    if (qq.kind === 'single') return getStr(qq.id).length > 0 || getStr(`${qq.id}__other`).trim().length > 0
    return getStr(qq.id).trim().length > 0 // number, text
  }

  const canNext = step === 0 ? !!profile
    : step === STEP_VERSION ? !!version
    : q ? isAnswered(q) : true

  function go(next: number, d: 'r' | 'l') { setDir(d); setStep(next); setError('') }

  function onNext() {
    if (step < STEP_FIRST_Q + N - 1) {
      // Avance jusqu'à la prochaine question visible.
      let i = step + 1
      while (i < STEP_FIRST_Q + N && !visible(i - STEP_FIRST_Q)) i++
      go(i, 'r')
    } else void finish()
  }
  function onBack() {
    if (step === 0) return
    let i = step - 1
    while (i >= STEP_FIRST_Q && !visible(i - STEP_FIRST_Q)) i--
    go(Math.max(0, i), 'l')
  }
  const onSkip = onNext

  async function finish() {
    setSaving(true); setError('')
    const sb = createClient()
    const user = await getCurrentUser()
    if (!user) { router.replace('/auth'); return }

    // Colonnes de compatibilité (dashboard, calculs) alimentées depuis les
    // réponses athlète quand elles existent.
    const goalType = getStr('a_goalType') === 'autre' ? (getStr('a_goalType__other').trim() || 'autre') : getStr('a_goalType')
    const legacy = {
      primary_goal: goalType || null,
      sports: getArr('a_sports'),
      weekly_volume: getStr('a_volume') || null,
      level: getStr('a_level') || null,
      profile_setup_done: true,
    }
    const rich = {
      ...legacy,
      profile_type: profile,
      onboarding: { version, profile, ...a },
    }
    // Tente l'écriture complète ; si le schéma étendu n'est pas encore appliqué
    // (colonnes profile_type / onboarding absentes), on retombe sur les colonnes
    // historiques pour ne jamais bloquer l'utilisateur.
    let e = (await sb.from('profiles').update(rich).eq('id', user.id)).error
    if (e) e = (await sb.from('profiles').update(legacy).eq('id', user.id)).error
    setSaving(false)
    if (e) { setError(t('welcome.saveError')); return }
    setDir('r'); setStep(STEP_FINAL)
  }

  // Swipe tactile (uniquement pendant les questions).
  function onTouchStart(e: React.TouchEvent) { touch.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touch.current == null || isFinal) return
    const dx = e.changedTouches[0].clientX - touch.current
    touch.current = null
    if (dx < -55 && canNext) onNext()
    else if (dx > 55 && step > 0) onBack()
  }

  // Numéro/total pour la barre de progression (profil & version comptent).
  const totalSteps = STEP_FIRST_Q + N
  const dispNum = Math.min(step + 1, totalSteps)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <style>{`
        @keyframes qIn { from { opacity: 0; transform: translateX(var(--qx)) } to { opacity: 1; transform: translateX(0) } }
        @keyframes qCheck { from { stroke-dashoffset: 60 } to { stroke-dashoffset: 0 } }
        @keyframes qPop { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        .q-slide { animation: qIn 0.32s cubic-bezier(0.32,0.72,0,1) both }
        @media (prefers-reduced-motion: reduce) { .q-slide { animation: none } .q-check, .q-pop { animation: none !important } }
      `}</style>
      <LanguageDropdown />

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{
        width: '100%', maxWidth: 460, background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-card)', padding: '20px 22px 22px', overflow: 'hidden',
      }}>
        {!isFinal && (
          <>
            {/* Progression + N/M + Passer (dès l'étape profil) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--bg-card2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(dispNum / Math.max(1, totalSteps)) * 100}%`, background: 'var(--primary-gradient)', borderRadius: 99, transition: 'width 0.3s ease' }} />
              </div>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>{t('q.of', { n: dispNum, m: totalSteps })}</span>
              {q?.optional && (
                <button onClick={onSkip} style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{t('q.skip')}</button>
              )}
            </div>

            <div key={step} className="q-slide" style={{ ['--qx' as string]: dir === 'r' ? '28px' : '-28px' }}>
              {step === 0 && <ProfileStep t={t} value={profile} onChange={setProfile} />}
              {step === STEP_VERSION && <VersionStep t={t} value={version} onChange={setVersion} />}
              {q && <QuestionView
                q={q} t={t} showCoachIntro={profile === 'both' && q.block === 'coach' && qIdx === ATHLETE_LEN(version)}
                getStr={getStr} getArr={getArr} setStr={setStr} toggleArr={toggleArr}
                getPerSport={getPerSport} setPerSport={setPerSport} getTf={getTf} setTf={setTf}
                sportsSelected={getArr('a_sports')} />}
            </div>

            {error && <p style={{ color: 'var(--charge-hard)', fontFamily: FB, fontSize: 13, margin: '14px 0 0', textAlign: 'center' }}>{error}</p>}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
              {step > 0 ? (
                <button onClick={onBack} aria-label={t('onboarding.back')} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border-mid)', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={18} /></button>
              ) : <span />}
              <button onClick={onNext} disabled={!canNext || saving} style={{
                height: 48, padding: '0 24px', borderRadius: 999, border: 'none',
                background: (!canNext || saving) ? 'var(--bg-card2)' : 'var(--primary-gradient)',
                color: (!canNext || saving) ? 'var(--text-dim)' : '#fff', fontFamily: FB, fontSize: 15, fontWeight: 700,
                cursor: (!canNext || saving) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: (!canNext || saving) ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 18px rgba(6,182,212,0.28)',
              }}>
                {saving ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <>{step === totalSteps - 1 ? t('q.finish') : t('q.next')}<ArrowRight size={17} /></>}
              </button>
            </div>
          </>
        )}

        {/* ── Écran final ── */}
        {isFinal && (
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <svg className="q-pop" width="72" height="72" viewBox="0 0 72 72" style={{ margin: '0 auto', display: 'block', animation: 'qPop 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
              <circle cx="36" cy="36" r="33" fill="var(--primary-dim)" />
              <path className="q-check" d="M22 37l9 9 19-21" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" style={{ animation: 'qCheck 0.5s ease 0.25s both' }} />
            </svg>
            <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '20px 0 4px' }}>{t('q.doneTitle')}</h1>
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 0 22px' }}>{t('q.doneSub')}</p>

            <div style={{ textAlign: 'left', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 22 }}>
              <RecapRow label={t('ob.profile.title')} value={profile ? t('ob.profile.' + profile) : '—'} />
              <RecapRow label={t('ob.version.title')} value={version ? t('ob.version.' + version) : '—'} />
              {getArr('a_sports').length > 0 && <RecapRow label={t('onboarding.recapSports')} value={getArr('a_sports').map(s => tOpt(t, 'a_sports', s)).join(', ')} />}
              {getStr('a_goalType') && <RecapRow label={t('onboarding.recapGoal')} value={getStr('a_goalType') === 'autre' ? (getStr('a_goalType__other') || t('q.other')) : tOpt(t, 'a_goalType', getStr('a_goalType'))} />}
              {getStr('c_current') && <RecapRow label={t('ob.c_current.title')} value={getStr('c_current')} />}
            </div>

            <button onClick={() => { router.replace('/'); router.refresh() }} style={{
              width: '100%', height: 50, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary-gradient)', color: '#fff',
              fontFamily: FB, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 18px rgba(6,182,212,0.28)',
            }}>{t('q.enter')}<ArrowRight size={17} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

// Nb de questions athlète présentes (pour repérer le début du bloc coach en « both »).
function ATHLETE_LEN(version: ObVersion | null): number {
  if (!version) return 0
  return version === 'express' ? ATHLETE_QUESTIONS.filter(q => q.express).length : ATHLETE_QUESTIONS.length
}

type TF = (key: string, vars?: Record<string, string | number>) => string
// Label d'option (avec repli sur la clé brute si non traduite).
function tOpt(t: TF, qid: string, value: string): string {
  const k = `ob.${qid}.${value}`; const r = t(k); return r === k ? value : r
}

// ── Écran « Qui es-tu ? » ─────────────────────────────────────────
function ProfileStep({ t, value, onChange }: { t: TF; value: ObProfile | null; onChange: (p: ObProfile) => void }) {
  const opts: ObProfile[] = ['athlete', 'both', 'coach']
  return (
    <div>
      <h1 style={{ fontFamily: FD, fontSize: 23, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, margin: '0 0 20px' }}>{t('ob.profile.q')}</h1>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {opts.map((o, i) => (
          <OptionButton key={o} selected={value === o} multi={false} i={i}
            title={t('ob.profile.' + o)} desc={t('ob.profile.' + o + 'D')} onClick={() => onChange(o)} />
        ))}
      </div>
    </div>
  )
}

// ── Écran « Version » (incite au complet) ─────────────────────────
function VersionStep({ t, value, onChange }: { t: TF; value: ObVersion | null; onChange: (v: ObVersion) => void }) {
  return (
    <div>
      <h1 style={{ fontFamily: FD, fontSize: 23, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, margin: '0 0 6px' }}>{t('ob.version.q')}</h1>
      <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 0 18px', lineHeight: 1.5 }}>{t('ob.version.hint')}</p>
      {/* Complet mis en avant */}
      <button onClick={() => onChange('full')} style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px 16px', marginBottom: 12,
        border: 'none', borderRadius: 'var(--r-md)',
        background: value === 'full' ? 'var(--primary-dim)' : 'var(--bg-card2)',
        boxShadow: value === 'full' ? 'inset 0 0 0 2px var(--primary)' : 'inset 0 0 0 1px var(--border)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: FB, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{t('ob.version.full')}</span>
          <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--primary-dim)', borderRadius: 999, padding: '2px 8px' }}>{t('ob.version.recommended')}</span>
        </span>
        <span style={{ display: 'block', fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', marginTop: 5, lineHeight: 1.45 }}>{t('ob.version.fullD')}</span>
      </button>
      {/* Express discret */}
      <button onClick={() => onChange('express')} style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '13px 16px',
        border: 'none', borderRadius: 'var(--r-md)',
        background: value === 'express' ? 'var(--primary-dim)' : 'transparent',
        boxShadow: value === 'express' ? 'inset 0 0 0 2px var(--primary)' : 'inset 0 0 0 1px var(--border)',
      }}>
        <span style={{ fontFamily: FB, fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{t('ob.version.express')}</span>
        <span style={{ display: 'block', fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>{t('ob.version.expressD')}</span>
      </button>
    </div>
  )
}

// ── Rendu générique d'une question ────────────────────────────────
interface QVProps {
  q: ObQuestion; t: TF; showCoachIntro: boolean
  getStr: (id: string) => string; getArr: (id: string) => string[]
  setStr: (id: string, v: string) => void; toggleArr: (id: string, v: string) => void
  getPerSport: (qid: string, s: string, f: string) => string; setPerSport: (qid: string, s: string, f: string, v: string) => void
  getTf: (qid: string, tf: string) => string; setTf: (qid: string, tf: string, v: string) => void
  sportsSelected: string[]
}
function QuestionView(p: QVProps) {
  const { q, t } = p
  const title = t(`ob.${q.id}.title`)
  const descKey = `ob.${q.id}.desc`; const desc = t(descKey)
  return (
    <div>
      {p.showCoachIntro && (
        <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)', margin: '0 0 10px' }}>{t('ob.blockCoach')}</p>
      )}
      <h1 style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.22, margin: '0 0 6px' }}>{title}</h1>
      {desc !== descKey && <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: '0 0 16px', lineHeight: 1.5 }}>{desc}</p>}
      {desc === descKey && <div style={{ height: 14 }} />}

      {(q.kind === 'single' || q.kind === 'multi') && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {q.options!.map((o, i) => {
            const selected = q.kind === 'multi' ? p.getArr(q.id).includes(o.value) : p.getStr(q.id) === o.value
            return (
              <OptionButton key={o.value} selected={selected} multi={q.kind === 'multi'} i={i}
                title={t(`ob.${q.id}.${o.value}`)} desc={o.hasDesc ? t(`ob.${q.id}.${o.value}D`) : undefined}
                onClick={() => q.kind === 'multi' ? p.toggleArr(q.id, o.value) : p.setStr(q.id, o.value)} />
            )
          })}
          {q.other && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '14px 14px 4px' }}>
              <input value={p.getStr(`${q.id}__other`)} onChange={e => { p.setStr(`${q.id}__other`, e.target.value); if (q.kind === 'single' && e.target.value) p.setStr(q.id, 'autre') }}
                placeholder={t('q.other')} style={inputStyle} />
            </div>
          )}
        </div>
      )}

      {q.kind === 'number' && (
        <input type="number" inputMode="numeric" value={p.getStr(q.id)} onChange={e => p.setStr(q.id, e.target.value)}
          placeholder={q.unit || '0'} style={inputStyle} />
      )}

      {q.kind === 'text' && (
        TEXTAREA.has(q.id)
          ? <textarea value={p.getStr(q.id)} onChange={e => p.setStr(q.id, e.target.value)} rows={3}
              placeholder={t(`ob.${q.id}.ph`)} style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.5 }} />
          : <input value={p.getStr(q.id)} onChange={e => p.setStr(q.id, e.target.value)}
              placeholder={t(`ob.${q.id}.ph`)} style={inputStyle} />
      )}

      {q.kind === 'timeframes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {q.timeframes!.map(tf => (
            <div key={tf.id}>
              <label style={{ display: 'block', fontFamily: FB, fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>{t(`ob.${q.id}.${tf.id}`)}</label>
              <input value={p.getTf(q.id, tf.id)} onChange={e => p.setTf(q.id, tf.id, e.target.value)}
                placeholder={t(`ob.${q.id}.ph`)} style={inputStyle} />
            </div>
          ))}
        </div>
      )}

      {q.kind === 'perSport' && (
        p.sportsSelected.length === 0
          ? <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)' }}>{t('ob.perSport.empty')}</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {p.sportsSelected.map(s => (
                <div key={s} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                  <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{tOpt(t, 'a_sports', s)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.perSportFields!.map(f => (
                      <div key={f.id}>
                        <label style={{ display: 'block', fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 5 }}>{t(`ob.${q.id}.${f.id}`)}</label>
                        {f.kind === 'single'
                          ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {f.options!.map(ov => {
                                const sel = p.getPerSport(q.id, s, f.id) === ov
                                return (
                                  <button key={ov} type="button" onClick={() => p.setPerSport(q.id, s, f.id, sel ? '' : ov)}
                                    style={{ border: 'none', boxShadow: `inset 0 0 0 1px ${sel ? 'var(--primary)' : 'var(--border-mid)'}`, background: sel ? 'var(--primary-dim)' : 'transparent', color: sel ? 'var(--primary)' : 'var(--text-mid)', borderRadius: 999, padding: '5px 11px', fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    {t(`ob.${q.id}.${f.id}.${ov}`)}
                                  </button>
                                )
                              })}
                            </div>
                          : <input type={f.kind === 'number' ? 'number' : 'text'} inputMode={f.kind === 'number' ? 'numeric' : undefined}
                              value={p.getPerSport(q.id, s, f.id)} onChange={e => p.setPerSport(q.id, s, f.id, e.target.value)}
                              placeholder={f.unit || t(`ob.${q.id}.${f.id}.ph`)} style={{ ...inputStyle, height: 42 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}

// ── Bouton d'option (radio / checkbox) réutilisable ───────────────
function OptionButton({ selected, multi, i, title, desc, onClick }: {
  selected: boolean; multi: boolean; i: number; title: string; desc?: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer', width: '100%',
      padding: '14px 14px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
      borderRadius: selected ? 'var(--r-md)' : 0,
      background: selected ? 'var(--primary-dim)' : 'transparent',
      boxShadow: selected ? 'inset 0 0 0 1px var(--primary)' : 'none', transition: 'background 0.15s',
    }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FB, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        {desc && <span style={{ display: 'block', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', marginTop: 3, lineHeight: 1.45 }}>{desc}</span>}
      </span>
      <span style={{
        width: 22, height: 22, borderRadius: multi ? 6 : '50%', flexShrink: 0,
        border: `2px solid ${selected ? 'var(--primary)' : 'var(--border-mid)'}`,
        background: selected ? 'var(--primary)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}>{selected && <Check size={13} color="#fff" strokeWidth={3} />}</span>
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-mid)',
  borderRadius: 'var(--r-sm)', padding: '0 14px', color: 'var(--text)', fontFamily: FB, fontSize: 14, outline: 'none',
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '5px 0' }}>
      <span style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
