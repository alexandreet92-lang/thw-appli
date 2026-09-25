'use client'
// ══════════════════════════════════════════════════════════════
// Interface dédiée « Routines » (façon Claude) : liste des routines,
// création/édition avec modèles prêts à l'emploi, et vue détail avec le
// prompt + l'historique complet des exécutions (chaque run consultable).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import {
  listRoutines, createRoutine, updateRoutine, deleteRoutine, runRoutine, listRuns,
  scheduleLabel, type Routine, type RoutineRun, type RoutineInput,
} from '@/lib/routines/client'

const ACCENT = 'var(--primary)'

// Bilan de forme COMPLET — le compte rendu autonome phare : le coach lit TOUTES
// les données (entraînements, charge, récup, sommeil, nutrition, blessures) et
// rend un verdict + des ajustements concrets. C'est le cœur du coach autonome.
const FULL_BILAN_PROMPT =
  "Fais mon BILAN DE FORME COMPLET. LIS d'abord mes données RÉELLES des ~3 dernières semaines avec tes outils " +
  "(entraînements réalisés vs prévus, volume & intensité par sport, dérive cardiaque, charge CTL/ATL/TSB & monotonie, " +
  "récupération & sommeil, HRV si dispo, RPE, nutrition/apports, blessures ou douleurs, objectifs et courses à venir). " +
  "Puis rends un compte rendu STRUCTURÉ et ACTIONNABLE, chiffres à l'appui :\n" +
  "1. **État de forme** — un verdict clair en une phrase (frais / en forme / fatigue / surcharge / sous-entraîné).\n" +
  "2. **Ce qui progresse** — signaux positifs concrets (avec les chiffres).\n" +
  "3. **Points d'attention** — fatigue, stagnation, déséquilibre, risque de blessure, sommeil ou nutrition insuffisants.\n" +
  "4. **Mes recommandations** — 3 à 5 actions PRÉCISES et priorisées : monter/baisser le volume (de combien), rendre les " +
  "intervalles plus ou moins rapides, augmenter les charges en muscu, placer une semaine de décharge, ajuster " +
  "sommeil/nutrition… CHAQUE reco justifiée par une donnée réelle.\n" +
  "Base TOUT sur mes chiffres réels (jamais inventés). Si une donnée manque, dis-le en une ligne. Direct et sans blabla."

const TEMPLATES: { label: string; name: string; prompt: string; frequency: RoutineInput['frequency']; hour: number; model?: RoutineInput['model'] }[] = [
  { label: 'Bilan de forme complet', name: 'Bilan de forme complet', frequency: 'every2', hour: 8, model: 'zeus',
    prompt: FULL_BILAN_PROMPT },
  { label: 'Brief matinal', name: 'Brief matinal', frequency: 'daily', hour: 7,
    prompt: "Chaque matin, fais-moi un brief clair de ma journée d'entraînement : la séance prévue du jour, les points d'attention (récupération, forme), et un conseil d'exécution concret." },
  { label: 'Bilan hebdo', name: 'Bilan de la semaine', frequency: 'weekly', hour: 19,
    prompt: "Fais le bilan de ma semaine d'entraînement : volume, charge, points forts et axes d'amélioration, puis propose 1 à 2 ajustements concrets pour la semaine à venir." },
  { label: 'Rappel récup', name: 'Check récupération', frequency: 'daily', hour: 8,
    prompt: "Regarde mes indicateurs de récupération récents et dis-moi si je dois lever le pied aujourd'hui. Sois concret et bref." },
  { label: 'Prépa course', name: 'Point prépa compétition', frequency: 'weekly', hour: 18,
    prompt: "Où en est ma préparation pour ma prochaine compétition ? Rappelle l'échéance, ce qu'il reste à travailler, et le focus de la semaine." },
]

const FREQ_OPTS: { v: RoutineInput['frequency']; l: string }[] = [
  { v: 'daily', l: 'Chaque jour' },
  { v: 'every2', l: 'Tous les 2 jours' },
  { v: 'every3', l: 'Tous les 3 jours' },
  { v: 'weekdays', l: 'En semaine' },
  { v: 'weekends', l: 'Le week-end' },
  { v: 'weekly', l: 'Un jour précis' },
]
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MODEL_OPTS: { v: RoutineInput['model']; l: string }[] = [
  { v: 'hermes', l: 'Hermès (rapide)' },
  { v: 'athena', l: 'Athéna (équilibré)' },
  { v: 'zeus', l: 'Zeus (max)' },
]

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

const FB = 'var(--font-body)'

// Champ soigné (façon réglages) : bordure fine, fond carte, radius généreux,
// focus ring subtil. Réutilisé par les inputs, le textarea et les dropdowns.
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)',
  fontSize: 14, fontFamily: FB, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
// Label discret : petite majuscule espacée (var(--text-dim)).
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: FB,
}

function onFocusRing(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = 'var(--primary)'
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-dim)'
}
function onBlurRing(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = 'var(--border)'
  e.currentTarget.style.boxShadow = 'none'
}

type DDOpt = { value: string; label: string }

// Menu déroulant custom (remplace le <select> système). Même logique de sélection
// que le natif : onChange(value). Cohérent avec les champs (bordure, focus, radius).
function Dropdown({ value, onChange, options, ariaLabel }: {
  value: string; onChange: (v: string) => void; options: DDOpt[]; ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const current = options.find(o => o.value === value)?.label ?? '—'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" aria-label={ariaLabel} onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', textAlign: 'left', borderColor: open ? 'var(--primary)' : 'var(--border)', boxShadow: open ? '0 0 0 3px var(--primary-dim)' : 'none' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, maxHeight: 240, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 5, animation: 'thwRoutDD 0.15s cubic-bezier(0.2,0.9,0.3,1)' }}>
          {options.map(o => {
            const on = o.value === value
            return (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '9px 11px', border: 'none', borderRadius: 'var(--r-sm)', background: on ? 'var(--primary-dim)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text)', fontSize: 13.5, fontWeight: on ? 600 : 450, cursor: 'pointer', fontFamily: FB }}>
                <span style={{ flex: 1 }}>{o.label}</span>
                {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Interrupteur propre : piste + pastille qui glisse.
function Switch({ on, onClick, ariaLabel }: { on: boolean; onClick: () => void; ariaLabel: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={ariaLabel}
      style={{ flexShrink: 0, width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', transition: 'background 0.18s', padding: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'var(--on-primary)', transition: 'left 0.18s' }} />
    </button>
  )
}

type FormState = Partial<Routine> & { id?: string }

export default function RoutinesView({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState<{ mode: 'list' } | { mode: 'form'; form: FormState } | { mode: 'detail'; id: string }>({ mode: 'list' })
  const [err, setErr]           = useState<string | null>(null)
  const [shown, setShown]       = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r) }, [])
  const requestClose = () => { setShown(false); setTimeout(onClose, 300) }

  const load = useCallback(async () => {
    setLoading(true)
    try { setRoutines(await listRoutines()) } catch (e) { setErr(e instanceof Error ? e.message : t('w1a.r_erreur')) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { void load() }, [load])

  const openNew = () => setView({ mode: 'form', form: { name: '', prompt: '', frequency: 'daily', hour: 7, weekday: 0, model: 'athena', allow_write: false } })
  const openEdit = (r: Routine) => setView({ mode: 'form', form: { ...r } })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 13500, background: 'var(--bg)', display: 'flex', flexDirection: 'column', transform: shown ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'max(14px, env(safe-area-inset-top)) 16px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <button onClick={() => { if (view.mode === 'list') requestClose(); else setView({ mode: 'list' }) }}
          aria-label={t('w1a.r_retour')}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 19, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>
          {view.mode === 'form' ? (view.form.id ? t('w1a.r_modifierRoutine') : t('w1a.r_nouvelleRoutine')) : t('w1a.r_routines')}
        </div>
        {view.mode === 'list' && (
          <button onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            {t('w1a.r_nouvelle')}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        {view.mode === 'list' && <ListView routines={routines} loading={loading} err={err} onNew={openNew} onOpen={(id) => setView({ mode: 'detail', id })} onToggle={async (r) => { await updateRoutine(r.id, { enabled: !r.enabled }); void load() }} />}
        {view.mode === 'form' && <FormView initial={view.form} onCancel={() => setView({ mode: 'list' })} onSaved={() => { setView({ mode: 'list' }); void load() }} />}
        {view.mode === 'detail' && <DetailView id={view.id} routine={routines.find(r => r.id === view.id) ?? null} onEdit={openEdit} onChanged={load} onDeleted={() => { setView({ mode: 'list' }); void load() }} />}
      </div>
    </div>
  )
}

// ── Liste ──────────────────────────────────────────────────────
function ListView({ routines, loading, err, onNew, onOpen, onToggle }: {
  routines: Routine[]; loading: boolean; err: string | null; onNew: () => void
  onOpen: (id: string) => void; onToggle: (r: Routine) => void
}) {
  const { t } = useI18n()
  if (loading) return <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 40 }}>{t('w1a.r_chargement')}</div>
  if (err) return <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 13, padding: 40 }}>{err}</div>
  if (routines.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{t('w1a.r_aucuneRoutine')}</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 18px' }}>
          {t('w1a.r_aucuneRoutineDesc')}
        </p>
        <button onClick={onNew} style={{ padding: '11px 18px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>{t('w1a.r_creerPremiere')}</button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640, margin: '0 auto' }}>
      {routines.map(r => (
        <div key={r.id} onClick={() => onOpen(r.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '0.5px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: r.enabled ? 'var(--primary-dim)' : 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.enabled ? ACCENT : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{scheduleLabel(r)}{!r.enabled && t('w1a.r_enPause')}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(r) }}
            aria-label={r.enabled ? t('w1a.r_mettrePause') : t('w1a.r_activer')}
            style={{ flexShrink: 0, width: 42, height: 25, borderRadius: 999, border: 'none', cursor: 'pointer', background: r.enabled ? ACCENT : 'var(--border)', position: 'relative', transition: 'background 0.15s' }}>
            <span style={{ position: 'absolute', top: 3, left: r.enabled ? 20 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Formulaire (création / édition) ────────────────────────────
function FormView({ initial, onCancel, onSaved }: { initial: FormState; onCancel: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [f, setF] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedTpl, setAppliedTpl] = useState<number | null>(null)
  const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }))

  const save = async () => {
    if (!f.name?.trim() || !f.prompt?.trim()) { setError(t('w1a.r_validationMsg')); return }
    setSaving(true); setError(null)
    try {
      const body: RoutineInput = {
        name: f.name!.trim(), prompt: f.prompt!.trim(),
        frequency: (f.frequency as RoutineInput['frequency']) ?? 'daily',
        hour: f.hour ?? 7, weekday: f.weekday ?? 0,
        model: (f.model as RoutineInput['model']) ?? 'athena',
        allow_write: !!f.allow_write,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
      }
      if (f.id) await updateRoutine(f.id, body)
      else await createRoutine(body)
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : t('w1a.r_erreur')) }
    finally { setSaving(false) }
  }

  const freqOptions: DDOpt[] = FREQ_OPTS.map(o => ({ value: o.v, label: t(`w1a.r_freq_${o.v}`) }))
  const hourOptions: DDOpt[] = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: t('w1a.r_heureOption', { h: String(i).padStart(2, '0') }) }))
  const dayOptions: DDOpt[] = DAYS.map((_, i) => ({ value: String(i), label: t(`w1a.r_day_${i}`) }))
  const modelOptions: DDOpt[] = MODEL_OPTS.map(o => ({ value: o.v, label: t(`w1a.r_model_${o.v}`) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 560, margin: '0 auto', fontFamily: FB }}>
      <style>{`@keyframes thwRoutDD{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {!f.id && (
        <div>
          <span style={labelStyle}>{t('w1a.r_modelesPrets')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TEMPLATES.map((tpl, i) => {
              const on = appliedTpl === i
              return (
                <button key={i} type="button"
                  onClick={() => { set({ name: t(`w1a.r_tpl_${i}_name`), prompt: t(`w1a.r_tpl_${i}_prompt`), frequency: tpl.frequency, hour: tpl.hour, ...(tpl.model ? { model: tpl.model } : {}) }); setAppliedTpl(i) }}
                  onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-dim)' : 'var(--bg-card2)', color: on ? 'var(--primary)' : 'var(--text-mid)', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: FB, transition: 'background 0.14s, color 0.14s, border-color 0.14s' }}>
                  {t(`w1a.r_tpl_${i}_label`)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>{t('w1a.r_nom')}</label>
        <input value={f.name ?? ''} onChange={e => { set({ name: e.target.value }); setAppliedTpl(null) }}
          onFocus={onFocusRing} onBlur={onBlurRing} placeholder={t('w1a.r_nomPh')} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>{t('w1a.r_promptLabel')}</label>
        <textarea value={f.prompt ?? ''} onChange={e => { set({ prompt: e.target.value }); setAppliedTpl(null) }} rows={7}
          onFocus={onFocusRing} onBlur={onBlurRing} placeholder={t('w1a.r_promptPh')}
          style={{ ...inputStyle, fontSize: 14, lineHeight: 1.6, resize: 'vertical', minHeight: 140 }} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={labelStyle}>{t('w1a.r_frequence')}</label>
          <Dropdown value={f.frequency ?? 'daily'} ariaLabel={t('w1a.r_frequence')}
            onChange={v => set({ frequency: v as RoutineInput['frequency'] })} options={freqOptions} />
        </div>
        <div style={{ flex: '0 0 130px' }}>
          <label style={labelStyle}>{t('w1a.r_heure')}</label>
          <Dropdown value={String(f.hour ?? 7)} ariaLabel={t('w1a.r_heure')}
            onChange={v => set({ hour: Number(v) })} options={hourOptions} />
        </div>
      </div>

      {f.frequency === 'weekly' && (
        <div>
          <label style={labelStyle}>{t('w1a.r_jour')}</label>
          <Dropdown value={String(f.weekday ?? 0)} ariaLabel={t('w1a.r_jour')}
            onChange={v => set({ weekday: Number(v) })} options={dayOptions} />
        </div>
      )}

      <div>
        <label style={labelStyle}>{t('w1a.r_modeleIA')}</label>
        <Dropdown value={f.model ?? 'athena'} ariaLabel={t('w1a.r_modeleIA')}
          onChange={v => set({ model: v as RoutineInput['model'] })} options={modelOptions} />
      </div>

      {/* Garde-fou : autoriser les modifications */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', borderRadius: 'var(--r-md)', background: 'var(--bg-card2)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('w1a.r_autoriserModifs')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>
            {t('w1a.r_autoriserModifsDesc')}
          </div>
        </div>
        <Switch on={!!f.allow_write} onClick={() => set({ allow_write: !f.allow_write })} ariaLabel={t('w1a.r_autoriserModifs')} />
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--text-mid)', padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 2 }}>
        <button type="button" onClick={onCancel}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          style={{ padding: '11px 18px', borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FB, transition: 'background 0.14s' }}>
          {t('w1a.r_annuler')}
        </button>
        <button type="button" onClick={save} disabled={saving}
          onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          style={{ padding: '11px 22px', borderRadius: 'var(--r-sm)', border: 'none', background: saving ? 'var(--border-mid)' : ACCENT, color: 'var(--on-primary)', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: FB, transition: 'opacity 0.14s, background 0.14s' }}>
          {saving ? '…' : f.id ? t('w1a.r_enregistrer') : t('w1a.r_creerRoutine')}
        </button>
      </div>
    </div>
  )
}

// ── Détail + historique ────────────────────────────────────────
function DetailView({ id, routine, onEdit, onChanged, onDeleted }: {
  id: string; routine: Routine | null
  onEdit: (r: Routine) => void; onChanged: () => void; onDeleted: () => void
}) {
  const { t } = useI18n()
  const [runs, setRuns] = useState<RoutineRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [running, setRunning] = useState(false)
  const [openRun, setOpenRun] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true)
    try { setRuns(await listRuns(id)) } catch { /* ignore */ } finally { setLoadingRuns(false) }
  }, [id])
  useEffect(() => { void loadRuns() }, [loadRuns])

  const doRunNow = async () => {
    setRunning(true)
    try { await runRoutine(id); await loadRuns(); onChanged() } catch { /* ignore */ } finally { setRunning(false) }
  }

  if (!routine) return <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 40 }}>{t('w1a.r_introuvable')}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640, margin: '0 auto' }}>
      {/* En-tête routine */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>{routine.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{scheduleLabel(routine)}{!routine.enabled && t('w1a.r_enPause')}{routine.allow_write && t('w1a.r_peutAgir')}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={doRunNow} disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: running ? 'default' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          {running ? t('w1a.r_execution') : t('w1a.r_executerMaintenant')}
        </button>
        <button onClick={() => updateRoutine(id, { enabled: !routine.enabled }).then(onChanged)}
          style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          {routine.enabled ? t('w1a.r_mettrePause') : t('w1a.r_activer')}
        </button>
        <button onClick={() => onEdit(routine)}
          style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          {t('w1a.r_modifier')}
        </button>
        {confirmDel ? (
          <button onClick={() => deleteRoutine(id).then(onDeleted)}
            style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            {t('w1a.r_confirmerSuppression')}
          </button>
        ) : (
          <button onClick={() => setConfirmDel(true)}
            style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            {t('w1a.r_supprimer')}
          </button>
        )}
      </div>

      {/* Prompt */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>{t('w1a.r_instruction')}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-alt)', border: '0.5px solid var(--border)', whiteSpace: 'pre-wrap' }}>{routine.prompt}</div>
      </div>

      {/* Historique */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>{t('w1a.r_executions')}</div>
        {loadingRuns ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: 12 }}>{t('w1a.r_chargement')}</div>
        ) : runs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: 12 }}>{t('w1a.r_aucuneExecution')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.map(run => {
              const isOpen = openRun === run.id
              const color = run.status === 'error' ? '#ef4444' : run.status === 'running' ? '#f59e0b' : '#22c55e'
              return (
                <div key={run.id} style={{ borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <button onClick={() => setOpenRun(isOpen ? null : run.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }}>{fmtWhen(run.created_at)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{run.status === 'error' ? t('w1a.r_statusError') : run.status === 'running' ? t('w1a.r_statusRunning') : t('w1a.r_statusDone')}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '4px 14px 14px', fontSize: 13.5, lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap', borderTop: '0.5px solid var(--border)' }}>
                      {run.error ? <span style={{ color: '#ef4444' }}>{run.error}</span> : (run.output || '—')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
