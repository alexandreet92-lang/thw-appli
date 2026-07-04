'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// /bienvenue — questionnaire d'onboarding one-shot (carte unique, une question
// par écran, slide horizontal + swipe, écran final animé). Persiste sur le
// profil athlète puis pose profile_setup_done=true. À la charte (tokens).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

type QType = 'single' | 'multi'
interface Question { id: string; field: 'primary_goal' | 'sports' | 'weekly_volume' | 'level'; type: QType; titleKey: string; options: string[]; prefix: string; desc: boolean; skippable: boolean; other?: boolean }

const QUESTIONS: Question[] = [
  { id: 'goal', field: 'primary_goal', type: 'single', titleKey: 'q.goal.title', prefix: 'q.goal.', desc: true, skippable: false, other: true,
    options: ['endurance', 'force', 'hybride', 'sante'] },
  { id: 'sports', field: 'sports', type: 'multi', titleKey: 'q.sports.title', prefix: 'q.sport.', desc: false, skippable: true,
    options: ['running', 'velo', 'natation', 'trail', 'triathlon', 'aviron', 'boxe', 'force'] },
  { id: 'vol', field: 'weekly_volume', type: 'single', titleKey: 'q.vol.title', prefix: 'q.vol.', desc: false, skippable: true,
    options: ['<4', '4-7', '7-12', '>12'] },
  { id: 'lvl', field: 'level', type: 'single', titleKey: 'q.lvl.title', prefix: 'q.lvl.', desc: true, skippable: true,
    options: ['debutant', 'intermediaire', 'confirme', 'elite'] },
]
const TOTAL = QUESTIONS.length

interface Answers { primary_goal: string | null; sports: string[]; weekly_volume: string | null; level: string | null }

export default function BienvenuePage() {
  const router = useRouter()
  const { t } = useI18n()
  const [step, setStep] = useState(0)              // 0..TOTAL-1, puis TOTAL = écran final
  const [dir, setDir] = useState<'r' | 'l'>('r')
  const [a, setA] = useState<Answers>({ primary_goal: null, sports: [], weekly_volume: null, level: null })
  const [other, setOther] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const touch = useRef<number | null>(null)

  // Idempotent : si déjà configuré → dashboard ; sinon préremplir.
  useEffect(() => {
    let cancel = false
    void (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth'); return }
      const { data } = await sb.from('profiles').select('primary_goal, sports, weekly_volume, level, profile_setup_done').eq('id', user.id).maybeSingle()
      if (cancel || !data) return
      if (data.profile_setup_done) { router.replace('/'); return }
      setA({
        primary_goal: data.primary_goal ?? null,
        sports: data.sports ?? [],
        weekly_volume: data.weekly_volume ?? null,
        level: data.level ?? null,
      })
    })()
    return () => { cancel = true }
  }, [router])

  const q = QUESTIONS[step]
  const canNext = step >= TOTAL ? true : q.type === 'multi' ? true : q.skippable ? true : (q.id === 'goal' ? (!!a.primary_goal || other.trim().length > 0) : !!a[q.field])

  function selSingle(field: Question['field'], val: string) {
    setA(p => ({ ...p, [field]: val }))
    if (field === 'primary_goal') setOther('')
  }
  function toggleMulti(val: string) {
    setA(p => ({ ...p, sports: p.sports.includes(val) ? p.sports.filter(s => s !== val) : [...p.sports, val] }))
  }

  function go(next: number, d: 'r' | 'l') { setDir(d); setStep(next); setError('') }
  const onNext = () => { if (step < TOTAL - 1) go(step + 1, 'r'); else void finish() }
  const onBack = () => { if (step > 0) go(step - 1, 'l') }
  const onSkip = () => { if (step < TOTAL - 1) go(step + 1, 'r'); else void finish() }

  async function finish() {
    setSaving(true); setError('')
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.replace('/auth'); return }
    const goal = a.primary_goal === null && other.trim() ? other.trim() : (a.primary_goal === 'autre' ? (other.trim() || 'autre') : a.primary_goal)
    const { error: e } = await sb.from('profiles').update({
      primary_goal: goal, sports: a.sports, weekly_volume: a.weekly_volume, level: a.level, profile_setup_done: true,
    }).eq('id', user.id)
    setSaving(false)
    if (e) { setError(t('welcome.saveError')); return }
    setDir('r'); setStep(TOTAL)
  }

  // Swipe tactile
  function onTouchStart(e: React.TouchEvent) { touch.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touch.current == null || step >= TOTAL) return
    const dx = e.changedTouches[0].clientX - touch.current
    touch.current = null
    if (dx < -55 && canNext) onNext()
    else if (dx > 55 && step > 0) onBack()
  }

  const isFinal = step >= TOTAL

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
            {/* En-tête : progression + N sur M + Passer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--bg-card2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((step + 1) / TOTAL) * 100}%`, background: 'var(--primary-gradient)', borderRadius: 99, transition: 'width 0.3s ease' }} />
              </div>
              <span className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>{t('q.of', { n: step + 1, m: TOTAL })}</span>
              {q.skippable && (
                <button onClick={onSkip} style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{t('q.skip')}</button>
              )}
            </div>

            <div key={step} className="q-slide" style={{ ['--qx' as string]: dir === 'r' ? '28px' : '-28px' }}>
              <h1 style={{ fontFamily: FD, fontSize: 23, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, margin: '0 0 20px' }}>{t(q.titleKey)}</h1>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {q.options.map((opt, i) => {
                  const selected = q.type === 'multi' ? a.sports.includes(opt) : a[q.field] === opt
                  return (
                    <button key={opt} onClick={() => q.type === 'multi' ? toggleMulti(opt) : selSingle(q.field, opt)} style={{
                      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer', width: '100%',
                      padding: '14px 14px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                      borderRadius: selected ? 'var(--r-md)' : 0,
                      background: selected ? 'var(--primary-dim)' : 'transparent',
                      boxShadow: selected ? 'inset 0 0 0 1px var(--primary)' : 'none', transition: 'background 0.15s',
                    }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: FB, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{t(q.prefix + opt)}</span>
                        {q.desc && <span style={{ display: 'block', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', marginTop: 3, lineHeight: 1.45 }}>{t(q.prefix + opt + 'D')}</span>}
                      </span>
                      <span style={{
                        width: 22, height: 22, borderRadius: q.type === 'multi' ? 6 : '50%', flexShrink: 0,
                        border: `2px solid ${selected ? 'var(--primary)' : 'var(--border-mid)'}`,
                        background: selected ? 'var(--primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                      }}>{selected && <Check size={13} color="#fff" strokeWidth={3} />}</span>
                    </button>
                  )
                })}

                {/* Option « Autre » avec champ libre (objectif) */}
                {q.other && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 14px 4px' }}>
                    <input value={other} onChange={e => { setOther(e.target.value); if (e.target.value) setA(p => ({ ...p, primary_goal: 'autre' })) }}
                      placeholder={t('q.other')} style={{
                        width: '100%', height: 44, boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-mid)',
                        borderRadius: 'var(--r-sm)', padding: '0 14px', color: 'var(--text)', fontFamily: FB, fontSize: 14, outline: 'none',
                      }} />
                  </div>
                )}
              </div>
            </div>

            {error && <p style={{ color: 'var(--charge-hard)', fontFamily: FB, fontSize: 13, margin: '14px 0 0', textAlign: 'center' }}>{error}</p>}

            {/* Pied : retour + Suivant/Terminer */}
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
                {saving ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <>{step === TOTAL - 1 ? t('q.finish') : t('q.next')}<ArrowRight size={17} /></>}
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

            {/* Récap */}
            <div style={{ textAlign: 'left', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 22 }}>
              <RecapRow label={t('onboarding.recapGoal')} value={(a.primary_goal && a.primary_goal !== 'autre') ? t('q.goal.' + a.primary_goal) : (other.trim() || t('q.other'))} fallbackRaw />
              {a.sports.length > 0 && <RecapRow label={t('onboarding.recapSports')} value={a.sports.map(s => t('q.sport.' + s)).join(', ')} />}
              {a.weekly_volume && <RecapRow label={t('onboarding.recapVolume')} value={t('q.vol.' + a.weekly_volume)} />}
              {a.level && <RecapRow label={t('onboarding.recapLevel')} value={t('q.lvl.' + a.level)} />}
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

function RecapRow({ label, value, fallbackRaw }: { label: string; value: string; fallbackRaw?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '5px 0' }}>
      <span style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-dim)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'right', textTransform: fallbackRaw ? 'capitalize' : 'none' }}>{value}</span>
    </div>
  )
}
