'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// /bienvenue — questionnaire d'onboarding à BRANCHES (Athlète / Athlète-coach /
// Coach), versions complète & express. Piloté par la donnée (questions.ts).
// Maquettes A3 / A4 / A5 :
//  • en-tête = ‹ rond + barre de progression + « n / m » (+ « Plus tard ») ;
//  • petit libellé de section cyan, grand titre 28 px, aide grise ;
//  • choix unique = cartes blanches (emoji, titre, description, radio) qui
//    avancent seules ~250 ms après la sélection ; choix multiple = pilules
//    (choisie = pilule sombre) + « Continuer · N sports » ;
//  • glissement iOS entre étapes (transform seul) + retour par glissement
//    depuis le bord gauche ;
//  • « Ton but principal ? » et « Ton objectif principal ? » fusionnés en un
//    écran (cartes + objectif précis optionnel) — les deux clés de réponse
//    (a_goalType / a_mainGoal) sont enregistrées exactement comme avant.
// Persistance inchangée : colonnes compat + onboarding jsonb, puis
// profile_setup_done=true (fin normale OU « Plus tard »).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/currentUser'
import { useI18n } from '@/lib/i18n'
import { SlideView } from '@/components/ui/SlideView'
import { SheetPill, SHEET_CARD_SHADOW } from '@/components/ui/BottomSheet'
import { AUTH_CSS, FB, BackButton, LangPill, PrimaryPill } from '@/components/auth/AuthKit'
import { buildQuestionList, type ObProfile, type ObVersion, type ObQuestion } from './questions'

type Answers = Record<string, unknown>
type TF = (key: string, vars?: Record<string, string | number>) => string

// Champs texte affichés en zone multi-lignes (réponses longues).
const TEXTAREA = new Set(['a_mainGoal', 'a_injuries', 'c_pricing', 'c_expectations'])
// Questions affichées DANS l'écran d'une autre (clé enregistrée inchangée).
const MERGED_INTO: Record<string, string> = { a_mainGoal: 'a_goalType' }
// Délai avant l'avance automatique d'un choix unique.
const AUTO_ADVANCE_MS = 250

const SPORT_EMOJI: Record<string, string> = {
  running: '🏃', velo: '🚴', natation: '🏊', trail: '⛰️', triathlon: '🔱', aviron: '🚣',
  boxe: '🥊', hyrox: '⚡', force: '🏋️', crossfit: '🔥',
}
// Pictogrammes de présentation (aucune incidence sur les données).
const EMOJI: Record<string, Record<string, string>> = {
  profile: { athlete: '🏃', both: '🤝', coach: '📋' },
  version: { full: '✨', express: '⚡' },
  a_sports: SPORT_EMOJI,
  c_sports: SPORT_EMOJI,
  a_goalType: { forme: '💪', performance: '🏁', perte_poids: '⚖️', sante: '🌱', mixte: '🏅' },
  a_level: { debutant: '🌱', intermediaire: '📈', confirme: '🎯', elite: '🏆' },
  a_equipment: { montre_gps: '⌚', capteur_puissance: '⚡', home_trainer: '🚲', tapis: '🏃', salle: '🏋️' },
  a_job: { sedentaire: '🪑', mixte: '🚶', physique: '🛠️' },
  a_nutrition: { suivie: '🥗', parfois: '🍽️', non: '🤷' },
  a_env: { indoor: '🏠', outdoor: '🌳', mixte: '🔁' },
  c_fulltime: { plein_temps: '💼', a_cote: '⏱️' },
  c_method: { endurance: '🫀', force: '🏋️', hybride: '⚡' },
  c_format: { en_ligne: '💻', presentiel: '🤝', mixte: '🔁' },
}
// Libellé de section (petit texte cyan au-dessus du titre).
const SECTION: Record<string, string> = {
  profile: 'au.ob.secProfile', version: 'au.ob.secProfile',
  a_sports: 'au.ob.secProfile', a_perSport: 'au.ob.secProfile', a_level: 'au.ob.secProfile', a_equipment: 'au.ob.secProfile',
  a_goalType: 'au.ob.secGoal', a_mainGoal: 'au.ob.secGoal', a_timeframes: 'au.ob.secGoal',
  a_volume: 'au.ob.secTraining', a_days: 'au.ob.secTraining', a_env: 'au.ob.secTraining', a_hadCoach: 'au.ob.secTraining',
  a_injuries: 'au.ob.secLife', a_sleep: 'au.ob.secLife', a_job: 'au.ob.secLife', a_nutrition: 'au.ob.secLife',
}

const OB_CSS = `
.ob-card{display:flex;align-items:center;gap:14px;width:100%;text-align:left;cursor:pointer;border:none;padding:16px;border-radius:var(--r-lg);background:var(--surface-card);font-family:var(--font-body);color:var(--text);-webkit-tap-highlight-color:transparent;transition:box-shadow .2s ease,transform .16s ease}
.ob-card:active{transform:scale(.985)}
.ob-pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:none;border-radius:var(--r-pill);font-family:var(--font-body);font-size:15px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .18s ease,color .18s ease,transform .16s ease}
.ob-pill:active{transform:scale(.96)}
.ob-field{width:100%;min-height:56px;box-sizing:border-box;border:none;outline:none;border-radius:var(--r-md);background:var(--surface-card);box-shadow:${SHEET_CARD_SHADOW};padding:0 16px;color:var(--text);font-family:var(--font-body);font-size:16px;font-weight:600;transition:box-shadow .16s}
.ob-field::placeholder{color:var(--text-dim);font-weight:500}
.ob-field:focus{box-shadow:inset 0 0 0 2px var(--primary),0 0 0 4px var(--primary-dim)}
textarea.ob-field{padding:14px 16px;line-height:1.45;resize:vertical}
.ob-inset{background:var(--surface-page);box-shadow:none;min-height:48px}
@keyframes obCheck{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}
@keyframes obPop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.06);opacity:1}100%{transform:scale(1)}}
.ob-pop{animation:obPop .55s cubic-bezier(.16,1,.3,1) both}
.ob-check{stroke-dasharray:40;animation:obCheck .45s ease .3s both}
@media(prefers-reduced-motion:reduce){.ob-card,.ob-pill,.ob-field{transition:none}.ob-pop,.ob-check{animation:none!important;stroke-dashoffset:0}}
`

// Label d'option (avec repli sur la clé brute si non traduite).
function tOpt(t: TF, qid: string, value: string): string {
  const k = `ob.${qid}.${value}`; const r = t(k); return r === k ? value : r
}

export default function BienvenuePage() {
  const router = useRouter()
  const { t } = useI18n()

  const [profile, setProfile] = useState<ObProfile | null>(null)
  const [version, setVersion] = useState<ObVersion | null>(null)
  const [a, setA] = useState<Answers>({})
  const [cur, setCur] = useState<string>('profile')   // 'profile' · 'version' · id de question · 'final'
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [firstName, setFirstName] = useState('')
  const autoTimer = useRef<number | null>(null)

  // Idempotent : si l'onboarding est déjà fait → dashboard. On récupère au
  // passage le prénom (écran final « Tout est prêt, {prénom}. »).
  useEffect(() => {
    let cancel = false
    void (async () => {
      const sb = createClient()
      const user = await getCurrentUser()
      if (!user) { router.replace('/auth'); return }
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      const metaName = [meta.first_name, meta.given_name, meta.full_name, meta.name].find(v => typeof v === 'string' && v.trim()) as string | undefined
      if (metaName && !cancel) setFirstName(metaName.trim().split(/\s+/)[0])
      const res: { data: { profile_setup_done: boolean | null; full_name: string | null } | null } =
        await sb.from('profiles').select('profile_setup_done, full_name').eq('id', user.id).maybeSingle()
      if (cancel || !res.data) return
      if (res.data.profile_setup_done) { router.replace('/'); return }
      const fn = (res.data.full_name ?? '').trim().split(/\s+/)[0]
      if (fn) setFirstName(fn)
    })()
    return () => { cancel = true }
  }, [router])

  useEffect(() => () => { if (autoTimer.current) window.clearTimeout(autoTimer.current) }, [])

  // ── Accès/écriture des réponses ───────────────────────────────────
  const getStr = (id: string): string => (typeof a[id] === 'string' ? a[id] as string : '')
  const getArr = (id: string): string[] => (Array.isArray(a[id]) ? a[id] as string[] : [])
  const setStr = (id: string, v: string) => setA(p => ({ ...p, [id]: v }))
  const toggleArr = (id: string, v: string) => setA(p => {
    const c = Array.isArray(p[id]) ? p[id] as string[] : []
    return { ...p, [id]: c.includes(v) ? c.filter(x => x !== v) : [...c, v] }
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

  // ── Étapes visibles ───────────────────────────────────────────────
  // Avant d'avoir choisi profil / version, le total est estimé sur le
  // parcours le plus long (athlète, complet) — il se resserre ensuite.
  const list = useMemo<ObQuestion[]>(
    () => buildQuestionList(profile ?? 'athlete', version ?? 'full'),
    [profile, version],
  )
  const byId = useMemo(() => new Map(list.map(q => [q.id, q])), [list])
  // Une question masquée (showIf faux, ex. heures de coaching) ou fusionnée
  // dans un autre écran N'EST PAS une étape : ni affichée, ni comptée.
  const steps = useMemo<string[]>(() => [
    'profile', 'version',
    ...list.filter(q => !MERGED_INTO[q.id] && (q.showIf ? q.showIf(a) : true)).map(q => q.id),
  ], [list, a])
  const isFinal = cur === 'final'
  const idx = Math.max(0, steps.indexOf(cur))
  const total = steps.length
  const q: ObQuestion | null = byId.get(cur) ?? null
  const merged: ObQuestion[] = q ? list.filter(x => MERGED_INTO[x.id] === q.id) : []

  const hasValue = (qq: ObQuestion): boolean => {
    if (qq.kind === 'multi') return getArr(qq.id).length > 0 || getStr(`${qq.id}__other`).trim().length > 0
    if (qq.kind === 'single') return getStr(qq.id).length > 0 || getStr(`${qq.id}__other`).trim().length > 0
    if (qq.kind === 'perSport') {
      const m = a[qq.id] as Record<string, Record<string, string>> | undefined
      return !!m && Object.values(m).some(f => Object.values(f).some(v => !!v))
    }
    if (qq.kind === 'timeframes') {
      const m = a[qq.id] as Record<string, string> | undefined
      return !!m && Object.values(m).some(v => !!v.trim())
    }
    return getStr(qq.id).trim().length > 0 // number, text
  }
  const isRequiredOk = (qq: ObQuestion): boolean =>
    qq.optional || qq.kind === 'perSport' || qq.kind === 'timeframes' ? true : hasValue(qq)

  const canNext = cur === 'profile' ? !!profile : cur === 'version' ? !!version : q ? isRequiredOk(q) : true
  const lastStep = idx === steps.length - 1
  // Choix unique « pur » (sans champ libre ni question fusionnée) → avance seule.
  // Jamais sur la dernière étape : l'enregistrement reste un geste explicite.
  const autoAdvance = !lastStep && (cur === 'profile' || cur === 'version'
    || (!!q && q.kind === 'single' && !q.other && merged.length === 0))

  function go(next: string, d: 1 | -1) {
    if (autoTimer.current) { window.clearTimeout(autoTimer.current); autoTimer.current = null }
    setDir(d); setCur(next); setError('')
  }
  function onNext() {
    if (saving) return
    if (idx + 1 < steps.length) go(steps[idx + 1], 1)
    else void finish()
  }
  function onBack() {
    if (idx > 0) go(steps[idx - 1], -1)
  }
  // L'avance automatique s'exécute APRÈS le rendu de la sélection : elle doit
  // lire les étapes à jour (ex. « à côté » fait apparaître la question des heures).
  const nextRef = useRef(onNext)
  useEffect(() => { nextRef.current = onNext })
  function scheduleAdvance() {
    if (autoTimer.current) window.clearTimeout(autoTimer.current)
    autoTimer.current = window.setTimeout(() => { autoTimer.current = null; nextRef.current() }, AUTO_ADVANCE_MS)
  }

  async function finish() {
    if (saving) return
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
    go('final', 1)
  }

  function enterApp() { router.replace('/'); router.refresh() }

  // ── Pied : action principale selon l'étape ─────────────────────────
  const sportCount = q && (q.id === 'a_sports' || q.id === 'c_sports')
    ? getArr(q.id).length + (getStr(`${q.id}__other`).trim() ? 1 : 0) : 0
  const nextLabel = lastStep ? t('q.finish')
    : sportCount > 0 ? `${t('au.ob.continue')} · ${sportCount === 1 ? t('au.ob.oneSport') : t('au.ob.nSports', { n: sportCount })}`
    : t('au.ob.continue')
  // Choix unique à avance automatique : pas de bouton, sauf en revenant sur
  // une question déjà répondue (on peut alors repartir sans re-choisir).
  const answeredHere = cur === 'profile' ? !!profile : cur === 'version' ? !!version : q ? hasValue(q) : false
  const showPill = !isFinal && (!autoAdvance || (dir === -1 && answeredHere))
  const showSkip = !isFinal && !!q?.optional && !hasValue(q)
  const showLater = !isFinal && !!profile && cur !== 'profile'

  // ── Contenu de l'étape ────────────────────────────────────────────
  let body: ReactNode = null
  if (isFinal) {
    body = (
      <FinalScreen t={t} firstName={firstName} profile={profile}
        sports={getArr('a_sports').map(s => tOpt(t, 'a_sports', s))}
        goal={getStr('a_goalType') ? (getStr('a_goalType') === 'autre' ? (getStr('a_goalType__other') || t('q.other')) : tOpt(t, 'a_goalType', getStr('a_goalType'))) : ''}
        mainGoal={getStr('a_mainGoal').trim()}
        volume={getStr('a_volume') ? tOpt(t, 'a_volume', getStr('a_volume')) : ''}
        athletes={getStr('c_current')} />
    )
  } else if (cur === 'profile') {
    body = (
      <Step section={t(SECTION.profile)} title={t('ob.profile.q')}>
        <CardList>
          {(['athlete', 'both', 'coach'] as ObProfile[]).map(o => (
            <ChoiceCard key={o} emoji={EMOJI.profile[o]} title={t('ob.profile.' + o)} desc={t('ob.profile.' + o + 'D')} selected={profile === o}
              onClick={() => { setProfile(o); scheduleAdvance() }} />
          ))}
        </CardList>
      </Step>
    )
  } else if (cur === 'version') {
    body = (
      <Step section={t(SECTION.version)} title={t('ob.version.q')} hint={t('ob.version.hint')}>
        <CardList>
          <ChoiceCard emoji={EMOJI.version.full} title={t('ob.version.full')} badge={t('ob.version.recommended')} desc={t('ob.version.fullD')}
            selected={version === 'full'} onClick={() => { setVersion('full'); scheduleAdvance() }} />
          <ChoiceCard emoji={EMOJI.version.express} title={t('ob.version.express')} desc={t('ob.version.expressD')}
            selected={version === 'express'} onClick={() => { setVersion('express'); scheduleAdvance() }} />
        </CardList>
      </Step>
    )
  } else if (q) {
    const section = q.block === 'coach' ? t('ob.blockCoach') : SECTION[q.id] ? t(SECTION[q.id]) : ''
    const descKey = `ob.${q.id}.desc`; const desc = t(descKey)
    const hint = desc !== descKey ? desc : q.kind === 'multi' ? t('au.ob.multiHint') : undefined
    const title = merged.length > 0 ? t('au.ob.goalTitle') : t(`ob.${q.id}.title`)
    body = (
      <Step section={section} title={title} hint={hint}>
        <QuestionBody q={q} t={t} getStr={getStr} getArr={getArr} setStr={setStr} toggleArr={toggleArr}
          getPerSport={getPerSport} setPerSport={setPerSport} getTf={getTf} setTf={setTf}
          sportsSelected={getArr('a_sports')} onPicked={autoAdvance ? scheduleAdvance : undefined} onEnter={canNext ? onNext : undefined} />
        {merged.map(mq => (
          <div key={mq.id} style={{ marginTop: 20 }}>
            <label htmlFor={`ob-${mq.id}`} style={{ display: 'block', margin: '0 4px 6px', fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>
              {t('au.ob.goalPrecise')}
            </label>
            <textarea id={`ob-${mq.id}`} className="ob-field" rows={2} value={getStr(mq.id)} onChange={e => setStr(mq.id, e.target.value)}
              placeholder={t(`ob.${mq.id}.ph`)} />
          </div>
        ))}
      </Step>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-page)', fontFamily: FB }}>
      <style>{AUTH_CSS + OB_CSS}</style>

      {!isFinal && (
        <div style={{ position: 'sticky', top: 0, zIndex: 6, background: 'var(--surface-page)' }}>
          <div className="au-col" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 12px) 20px 8px' }}>
            {idx > 0 ? <BackButton onClick={onBack} /> : <span aria-hidden style={{ width: 44, height: 44, flexShrink: 0 }} />}
            <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={idx + 1}
              style={{ flex: 1, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((idx + 1) / Math.max(1, total)) * 100}%`, background: 'var(--primary)', borderRadius: 'var(--r-pill)', transition: 'width .35s cubic-bezier(.22,1,.36,1)' }} />
            </div>
            <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{idx + 1} / {total}</span>
            {showLater
              ? <button type="button" onClick={() => void finish()} disabled={saving} style={{ flexShrink: 0, minHeight: 44, padding: '0 2px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{t('au.ob.later')}</button>
              : cur === 'profile' ? <LangPill /> : null}
          </div>
        </div>
      )}

      <SlideView variant="push" screenKey={cur} direction={dir} onBack={!isFinal && idx > 0 ? onBack : undefined} background="var(--surface-page)">
        <div className="au-col" style={{
          minHeight: isFinal ? '100dvh' : 'calc(100dvh - 70px - env(safe-area-inset-top))',
          padding: isFinal ? 'calc(env(safe-area-inset-top) + 56px) 20px calc(env(safe-area-inset-bottom) + 120px)' : '10px 20px calc(env(safe-area-inset-bottom) + 150px)',
        }}>
          {body}
          {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 14, margin: '16px 4px 0', textAlign: 'center' }}>{error}</p>}
        </div>
      </SlideView>

      {(showPill || showSkip || isFinal) && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 6, background: 'linear-gradient(to bottom, transparent, var(--surface-page) 26px)' }}>
          <div className="au-col" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '26px 20px calc(env(safe-area-inset-bottom) + 18px)' }}>
            {isFinal
              ? <PrimaryPill onClick={enterApp}>{t('q.enter')}</PrimaryPill>
              : <>
                  {showPill && <PrimaryPill onClick={onNext} disabled={!canNext} loading={saving}>{nextLabel}</PrimaryPill>}
                  {showSkip && <SheetPill variant="ghost" onClick={onNext}>{t('q.skip')}</SheetPill>}
                </>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Gabarit d'étape : section · titre · aide ───────────────────────
function Step({ section, title, hint, children }: { section?: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      {section && <p style={{ margin: '8px 0 6px', fontFamily: FB, fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary)' }}>{section}</p>}
      <h1 className="au-h1">{title}</h1>
      {hint ? <p className="au-sub" style={{ marginBottom: 18 }}>{hint}</p> : <div style={{ height: 18 }} />}
      {children}
    </div>
  )
}

function CardList({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
}

// ── Carte de choix unique (emoji · titre · description · radio) ────
function ChoiceCard({ emoji, title, desc, badge, selected, onClick }: {
  emoji?: string; title: string; desc?: string; badge?: string; selected: boolean; onClick: () => void
}) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className="ob-card"
      style={{ boxShadow: selected ? 'inset 0 0 0 2px var(--primary)' : SHEET_CARD_SHADOW }}>
      {emoji && <span aria-hidden style={{ fontSize: 26, lineHeight: 1, width: 34, textAlign: 'center', flexShrink: 0 }}>{emoji}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{title}</span>
          {badge && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--surface-chip)', borderRadius: 'var(--r-pill)', padding: '3px 10px' }}>{badge}</span>}
        </span>
        {desc && <span style={{ display: 'block', fontSize: 14, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.4 }}>{desc}</span>}
      </span>
      <span aria-hidden style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: selected ? 'var(--primary)' : 'transparent', boxShadow: selected ? 'none' : 'inset 0 0 0 2px var(--text-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s ease',
      }}>{selected && <Check size={14} color="var(--on-primary)" strokeWidth={3.2} />}</span>
    </button>
  )
}

// ── Pilule de choix multiple (choisie = pilule sombre) ──────────────
function ChoicePill({ emoji, label, selected, onClick, muted }: { emoji?: string; label: string; selected: boolean; onClick: () => void; muted?: boolean }) {
  const style: CSSProperties = selected
    ? { background: 'var(--text)', color: 'var(--surface-page)' }
    : { background: 'var(--surface-card)', color: muted ? 'var(--text-mid)' : 'var(--text)', boxShadow: SHEET_CARD_SHADOW }
  return (
    <button type="button" role="checkbox" aria-checked={selected} onClick={onClick} className="ob-pill" style={style}>
      {emoji && <span aria-hidden>{emoji}</span>}
      {label}
    </button>
  )
}

// ── Rendu générique d'une question ────────────────────────────────
interface QBProps {
  q: ObQuestion; t: TF
  getStr: (id: string) => string; getArr: (id: string) => string[]
  setStr: (id: string, v: string) => void; toggleArr: (id: string, v: string) => void
  getPerSport: (qid: string, s: string, f: string) => string; setPerSport: (qid: string, s: string, f: string, v: string) => void
  getTf: (qid: string, tf: string) => string; setTf: (qid: string, tf: string, v: string) => void
  sportsSelected: string[]
  /** Choix unique à avance automatique : appelé après chaque sélection. */
  onPicked?: () => void
  /** Entrée clavier dans un champ simple → étape suivante. */
  onEnter?: () => void
}

function QuestionBody(p: QBProps) {
  const { q, t } = p
  const emo = EMOJI[q.id] ?? {}
  const [otherOpen, setOtherOpen] = useState(() => p.getStr(`${q.id}__other`).length > 0)
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && p.onEnter) { e.preventDefault(); p.onEnter() } }

  if (q.kind === 'single') {
    return (
      <>
        <CardList>
          {q.options!.map(o => (
            <ChoiceCard key={o.value} emoji={emo[o.value]} title={t(`ob.${q.id}.${o.value}`)}
              desc={o.hasDesc ? t(`ob.${q.id}.${o.value}D`) : undefined} selected={p.getStr(q.id) === o.value}
              onClick={() => { p.setStr(q.id, o.value); p.onPicked?.() }} />
          ))}
        </CardList>
        {q.other && (
          <input className="ob-field" style={{ marginTop: 10 }} value={p.getStr(`${q.id}__other`)} placeholder={`${t('q.other')}…`}
            onChange={e => { p.setStr(`${q.id}__other`, e.target.value); if (e.target.value) p.setStr(q.id, 'autre') }} />
        )}
      </>
    )
  }

  if (q.kind === 'multi') {
    const other = p.getStr(`${q.id}__other`)
    return (
      <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {q.options!.map(o => (
            <ChoicePill key={o.value} emoji={emo[o.value]} label={t(`ob.${q.id}.${o.value}`)} selected={p.getArr(q.id).includes(o.value)}
              onClick={() => p.toggleArr(q.id, o.value)} />
          ))}
          {q.other && (
            <ChoicePill label={other.trim() ? other.trim() : `+ ${t('q.other')}`} selected={!!other.trim()} muted onClick={() => setOtherOpen(v => !v || !!other)} />
          )}
        </div>
        {q.other && otherOpen && (
          <input className="ob-field au-rise" autoFocus style={{ marginTop: 14 }} value={other} placeholder={t('q.otherPh')}
            onChange={e => p.setStr(`${q.id}__other`, e.target.value)} onKeyDown={enter} />
        )}
      </>
    )
  }

  if (q.kind === 'number') {
    return (
      <div style={{ position: 'relative' }}>
        <input className="ob-field" type="number" inputMode="numeric" value={p.getStr(q.id)} onChange={e => p.setStr(q.id, e.target.value)}
          placeholder="0" onKeyDown={enter} style={{ paddingRight: q.unit ? 80 : 16, fontVariantNumeric: 'tabular-nums' }} />
        {q.unit && <span aria-hidden style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 600, color: 'var(--text-mid)' }}>{q.unit}</span>}
      </div>
    )
  }

  if (q.kind === 'text') {
    return TEXTAREA.has(q.id)
      ? <textarea className="ob-field" rows={3} value={p.getStr(q.id)} onChange={e => p.setStr(q.id, e.target.value)} placeholder={t(`ob.${q.id}.ph`)} />
      : <input className="ob-field" value={p.getStr(q.id)} onChange={e => p.setStr(q.id, e.target.value)} placeholder={t(`ob.${q.id}.ph`)} onKeyDown={enter} />
  }

  if (q.kind === 'timeframes') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {q.timeframes!.map(tf => (
          <div key={tf.id}>
            <label htmlFor={`ob-${q.id}-${tf.id}`} style={{ display: 'block', margin: '0 4px 6px', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{t(`ob.${q.id}.${tf.id}`)}</label>
            <input id={`ob-${q.id}-${tf.id}`} className="ob-field" value={p.getTf(q.id, tf.id)} onChange={e => p.setTf(q.id, tf.id, e.target.value)} placeholder={t(`ob.${q.id}.ph`)} />
          </div>
        ))}
      </div>
    )
  }

  // perSport : une carte par sport coché.
  if (p.sportsSelected.length === 0) {
    return <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '0 4px' }}>{t('ob.perSport.empty')}</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {p.sportsSelected.map(s => (
        <div key={s} style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 16, boxShadow: SHEET_CARD_SHADOW }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            {SPORT_EMOJI[s] && <span aria-hidden style={{ fontSize: 22 }}>{SPORT_EMOJI[s]}</span>}
            {tOpt(t, 'a_sports', s)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {q.perSportFields!.map(f => (
              <div key={f.id}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', margin: '0 2px 6px' }}>{t(`ob.${q.id}.${f.id}`)}</div>
                {f.kind === 'single'
                  ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {f.options!.map(ov => {
                        const sel = p.getPerSport(q.id, s, f.id) === ov
                        return (
                          <button key={ov} type="button" aria-pressed={sel} className="ob-pill" onClick={() => p.setPerSport(q.id, s, f.id, sel ? '' : ov)}
                            style={sel ? { background: 'var(--text)', color: 'var(--surface-card)', minHeight: 40, fontSize: 14 } : { background: 'var(--surface-chip)', color: 'var(--text)', minHeight: 40, fontSize: 14 }}>
                            {t(`ob.${q.id}.${f.id}.${ov}`)}
                          </button>
                        )
                      })}
                    </div>
                  : <div style={{ position: 'relative' }}>
                      <input className="ob-field ob-inset" type={f.kind === 'number' ? 'number' : 'text'} inputMode={f.kind === 'number' ? 'numeric' : undefined}
                        value={p.getPerSport(q.id, s, f.id)} onChange={e => p.setPerSport(q.id, s, f.id, e.target.value)}
                        placeholder={f.unit ? '0' : t(`ob.${q.id}.${f.id}.ph`)} style={{ paddingRight: f.unit ? 76 : 16 }} />
                      {f.unit && <span aria-hidden style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 600, color: 'var(--text-mid)' }}>{f.unit}</span>}
                    </div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Écran final (A5) ──────────────────────────────────────────────
function FinalScreen({ t, firstName, profile, sports, goal, mainGoal, volume, athletes }: {
  t: TF; firstName: string; profile: ObProfile | null; sports: string[]; goal: string; mainGoal: string; volume: string; athletes: string
}) {
  const rows: [string, string][] = []
  if (profile) rows.push([t('ob.profile.title'), t('ob.profile.' + profile)])
  if (sports.length) rows.push([t('onboarding.recapSports'), sports.join(', ')])
  if (goal || mainGoal) rows.push([t('onboarding.recapGoal'), [goal, mainGoal].filter(Boolean).join(' · ')])
  if (volume) rows.push([t('au.ob.recapAvail'), t('au.ob.perWeek', { v: volume })])
  if (athletes) rows.push([t('au.ob.recapAthletes'), athletes])
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="ob-pop" style={{
        width: 96, height: 96, margin: '0 auto', borderRadius: '50%', color: 'var(--success)',
        background: 'color-mix(in srgb, var(--success) 16%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg aria-hidden width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path className="ob-check" d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 className="au-h1 au-rise" style={{ marginTop: 22, ['--d' as string]: '220ms' }}>
        {firstName ? t('au.ob.doneName', { name: firstName }) : t('q.doneTitle')}
      </h1>
      <p className="au-sub au-rise" style={{ ['--d' as string]: '300ms' }}>{t('q.doneSub')}</p>
      {rows.length > 0 && (
        <div className="au-rise" style={{ ['--d' as string]: '420ms', textAlign: 'left', marginTop: 26, padding: '4px 18px', background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', boxShadow: SHEET_CARD_SHADOW }}>
          {rows.map(([label, value], i) => (
            <div key={label} style={{ padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, color: 'var(--text-mid)' }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 2, overflowWrap: 'anywhere' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
