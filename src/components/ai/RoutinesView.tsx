'use client'
// ══════════════════════════════════════════════════════════════
// Interface dédiée « Routines » (façon Claude) : liste des routines,
// création/édition avec modèles prêts à l'emploi, et vue détail avec le
// prompt + l'historique complet des exécutions (chaque run consultable).
// ══════════════════════════════════════════════════════════════

import { Switch } from '@/components/shadcn/switch'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { SlideView } from '@/components/ui/SlideView'
import PressPop from '@/components/ui/PressPop'
import { AnimatedList, AnimatedItem } from '@/components/motion/AnimatedList'
import { Card } from '@/components/shadcn/card'
import { Button } from '@/components/shadcn/button'
import {
  listRoutines, createRoutine, updateRoutine, deleteRoutine, runRoutine, listRuns,
  scheduleLabel, type Routine, type RoutineRun, type RoutineInput,
} from '@/lib/routines/client'
import {
  useIsMobile, MobileHeader, RoundBtn, Ico, ICON, MCard, SectionLabel, Group, GroupRow, IconTile, Dot,
  SegTrack, PillButton, HCard, HScroll, MSheet, SheetHeader, SkeletonCard, SKELETON_CSS,
  TILE, MODEL_DOT, MODEL_NAME, STATUS_DOT, PAGE_BG, HAIRLINE, FB as MFB,
} from '@/components/ai/mobile/MobileKit'

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
  width: '100%', boxSizing: 'border-box', padding: '16px 18px', borderRadius: 'var(--r-md)',
  border: 'none', background: 'var(--bg-card2)', color: 'var(--text)',
  fontSize: 17, fontFamily: FB, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
// Label discret : petite majuscule espacée (var(--text-dim)).
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 10, fontSize: 14, fontWeight: 500,
  color: 'var(--text-mid)', fontFamily: FB,
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
function RoutineSwitch({ on, onClick, ariaLabel }: { on: boolean; onClick: () => void; ariaLabel: string }) {
  return <Switch checked={on} onCheckedChange={() => onClick()} aria-label={ariaLabel} />
}

type FormState = Partial<Routine> & { id?: string }

// Mobile (≤ 767 px) : interface dédiée façon maquettes validées (cartes blanches,
// feuille du bas pour le formulaire). Desktop : interface historique inchangée.
export default function RoutinesView({ onClose }: { onClose: () => void }) {
  const isMobile = useIsMobile()
  return isMobile ? <RoutinesMobile onClose={onClose} /> : <RoutinesDesktop onClose={onClose} />
}

function RoutinesDesktop({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState<{ mode: 'list' } | { mode: 'form'; form: FormState } | { mode: 'detail'; id: string }>({ mode: 'list' })
  const [err, setErr]           = useState<string | null>(null)
  // Direction du glissement interne : 1 = on avance (liste → détail/formulaire), -1 = retour.
  const [dir, setDir] = useState(1)
  const go = (next: typeof view, d: number) => { setDir(d); setView(next) }
  const toList = () => go({ mode: 'list' }, -1)
  const requestClose = onClose

  const load = useCallback(async () => {
    setLoading(true)
    try { setRoutines(await listRoutines()) } catch (e) { setErr(e instanceof Error ? e.message : t('w1a.r_erreur')) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { void load() }, [load])

  const openNew = () => go({ mode: 'form', form: { name: '', prompt: '', frequency: 'daily', hour: 7, weekday: 0, model: 'athena', allow_write: false } }, 1)
  const openEdit = (r: Routine) => go({ mode: 'form', form: { ...r } }, 1)

  const roundBtn: React.CSSProperties = {
    width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
    background: 'color-mix(in srgb, var(--text) 10%, var(--bg))', color: 'var(--text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.20)',
  }
  const screenKey = view.mode === 'detail' ? `detail-${view.id}` : view.mode

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête : retour rond · titre centré · action ronde (comme Paramètres) */}
      <div style={{ flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(max(14px, env(safe-area-inset-top)) + 58px)', padding: 'max(14px, env(safe-area-inset-top)) 16px 14px', boxSizing: 'border-box' }}>
        <PressPop onClick={() => { if (view.mode === 'list') requestClose(); else toList() }}
          aria-label={t('w1a.r_retour')}
          style={{ ...roundBtn, position: 'absolute', left: 16, top: 'max(14px, env(safe-area-inset-top))' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </PressPop>
        <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
          {view.mode === 'form' ? (view.form.id ? t('w1a.r_modifierRoutine') : t('w1a.r_nouvelleRoutine')) : t('w1a.r_routines')}
        </div>
        {view.mode === 'list' && (
          <PressPop onClick={openNew} aria-label={t('w1a.r_nouvelle')} style={{ ...roundBtn, position: 'absolute', right: 16, top: 'max(14px, env(safe-area-inset-top))' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </PressPop>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <SlideView screenKey={screenKey} direction={dir} variant="push" onBack={view.mode === 'list' ? undefined : toList}>
          {view.mode === 'list' && <ListView routines={routines} loading={loading} err={err} onNew={openNew} onOpen={(id) => go({ mode: 'detail', id }, 1)} onToggle={async (r) => { await updateRoutine(r.id, { enabled: !r.enabled }); void load() }} />}
          {view.mode === 'form' && <FormView initial={view.form} onCancel={toList} onSaved={() => { toList(); void load() }} />}
          {view.mode === 'detail' && <DetailView id={view.id} routine={routines.find(r => r.id === view.id) ?? null} onEdit={openEdit} onChanged={load} onDeleted={() => { toList(); void load() }} />}
        </SlideView>
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
  if (err) return <div style={{ textAlign: 'center', color: 'var(--danger)', fontSize: 13, padding: 40 }}>{err}</div>
  if (routines.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{t('w1a.r_aucuneRoutine')}</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 18px' }}>
          {t('w1a.r_aucuneRoutineDesc')}
        </p>
        <Button onClick={onNew} size="lg">{t('w1a.r_creerPremiere')}</Button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, margin: '0 auto' }}>
      <AnimatedList>
      {routines.map((r, i) => (
        <AnimatedItem key={r.id} index={i}>
        <Card onClick={() => onOpen(r.id)} className="cursor-pointer flex-row items-center gap-3.5 px-5 py-[18px] min-h-[76px] transition-transform duration-200 active:scale-[0.985]">
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: r.enabled ? 'var(--primary-dim)' : 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.enabled ? ACCENT : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 3 }}>{scheduleLabel(r)}{!r.enabled && t('w1a.r_enPause')}</div>
          </div>
          <div onClick={e => e.stopPropagation()}>
            <Switch checked={r.enabled} onCheckedChange={() => onToggle(r)} aria-label={r.enabled ? t('w1a.r_mettrePause') : t('w1a.r_activer')} />
          </div>
        </Card>
        </AnimatedItem>
      ))}
      </AnimatedList>
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
                  style={{ padding: '8px 14px', borderRadius: 'var(--r-sm)', border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-dim)' : 'var(--bg-card2)', color: on ? 'var(--primary)' : 'var(--text-mid)', fontSize: 13, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: FB, transition: 'background 0.14s, color 0.14s, border-color 0.14s' }}>
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
        <RoutineSwitch on={!!f.allow_write} onClick={() => set({ allow_write: !f.allow_write })} ariaLabel={t('w1a.r_autoriserModifs')} />
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--text-mid)', padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 2 }}>
        <Button type="button" variant="ghost" onClick={onCancel}>{t('w1a.r_annuler')}</Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? '…' : f.id ? t('w1a.r_enregistrer') : t('w1a.r_creerRoutine')}
        </Button>
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
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{routine.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{scheduleLabel(routine)}{!routine.enabled && t('w1a.r_enPause')}{routine.allow_write && t('w1a.r_peutAgir')}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button onClick={doRunNow} disabled={running}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          {running ? t('w1a.r_execution') : t('w1a.r_executerMaintenant')}
        </Button>
        <Button variant="secondary" onClick={() => updateRoutine(id, { enabled: !routine.enabled }).then(onChanged)}>
          {routine.enabled ? t('w1a.r_mettrePause') : t('w1a.r_activer')}
        </Button>
        <Button variant="secondary" onClick={() => onEdit(routine)}>{t('w1a.r_modifier')}</Button>
        {confirmDel ? (
          <Button variant="destructive" onClick={() => deleteRoutine(id).then(onDeleted)}>{t('w1a.r_confirmerSuppression')}</Button>
        ) : (
          <Button variant="secondary" className="text-destructive" onClick={() => setConfirmDel(true)}>{t('w1a.r_supprimer')}</Button>
        )}
      </div>

      {/* Prompt */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>{t('w1a.r_instruction')}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', padding: '12px 14px', borderRadius: 'var(--r-sm)', background: 'var(--bg-alt)', border: '0.5px solid var(--border)', whiteSpace: 'pre-wrap' }}>{routine.prompt}</div>
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
                <div key={run.id} style={{ borderRadius: 'var(--r-sm)', border: '0.5px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <button onClick={() => setOpenRun(isOpen ? null : run.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>{fmtWhen(run.created_at)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{run.status === 'error' ? t('w1a.r_statusError') : run.status === 'running' ? t('w1a.r_statusRunning') : t('w1a.r_statusDone')}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '4px 14px 14px', fontSize: 13.5, lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap', borderTop: '0.5px solid var(--border)' }}>
                      {run.error ? <span style={{ color: 'var(--danger)' }}>{run.error}</span> : (run.output || '—')}
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

// ══════════════════════════════════════════════════════════════
// MOBILE — liste en cartes blanches, détail en cartes, formulaire en
// feuille du bas (Annuler · titre · Créer). Mêmes données et mêmes
// appels API que le desktop (listRoutines, create/update/delete, run, runs).
// ══════════════════════════════════════════════════════════════

type RModel = Routine['model']
const asModel = (m: string | undefined | null): RModel => (m === 'hermes' || m === 'zeus' ? m : 'athena')

// Tuile d'icône de chaque modèle prêt à l'emploi (même ordre que TEMPLATES).
const TPL_TILES: { color: string; icon: React.ReactNode }[] = [
  { color: TILE.violet, icon: ICON.activity },
  { color: TILE.orange, icon: ICON.sun },
  { color: TILE.cyan,   icon: ICON.clock },
  { color: TILE.indigo, icon: ICON.moon },
  { color: TILE.red,    icon: ICON.flag },
]

function useScheduleText() {
  const { t } = useI18n()
  return useCallback((r: Pick<Routine, 'frequency' | 'hour' | 'weekday'>) => {
    const hh = `${String(r.hour ?? 0).padStart(2, '0')}:00`
    const base = r.frequency === 'weekly' ? t(`w1a.r_day_${r.weekday ?? 0}`) : t(`w1a.r_freq_${r.frequency}`)
    return `${base} · ${hh}`
  }, [t])
}

function RoutinesMobile({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [dir, setDir] = useState(1)
  const [form, setForm] = useState<FormState | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const load = useCallback(async () => {
    try { setRoutines(await listRoutines()); setErr(null) } catch (e) { setErr(e instanceof Error ? e.message : t('w1a.r_erreur')) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { void load() }, [load])

  const blank: FormState = { name: '', prompt: '', frequency: 'daily', hour: 7, weekday: 0, model: 'athena', allow_write: false }
  const openForm = (f: FormState) => { setForm(f); setFormKey(k => k + 1); setFormOpen(true) }
  const openTemplate = (i: number) => {
    const tpl = TEMPLATES[i]
    openForm({ ...blank, name: t(`w1a.r_tpl_${i}_name`), prompt: t(`w1a.r_tpl_${i}_prompt`), frequency: tpl.frequency, hour: tpl.hour, ...(tpl.model ? { model: tpl.model } : {}) })
  }
  const toggle = async (r: Routine) => {
    setRoutines(list => list.map(x => x.id === r.id ? { ...x, enabled: !r.enabled } : x))
    try { await updateRoutine(r.id, { enabled: !r.enabled }) } catch { /* rechargé ci-dessous */ }
    void load()
  }
  const detail = detailId ? routines.find(r => r.id === detailId) ?? null : null

  return (
    <div style={{ position: 'absolute', inset: 0, background: PAGE_BG, display: 'flex', flexDirection: 'column', fontFamily: MFB }}>
      <style>{SKELETON_CSS}</style>
      <MobileHeader
        left={<RoundBtn label={t('w1a.r_retour')} onClick={() => { if (detailId) { setDir(-1); setDetailId(null) } else onClose() }}><Ico d={ICON.back} size={22} sw={2.2} /></RoundBtn>}
        title={t('w1a.r_routines')}
        right={!detailId ? <RoundBtn label={t('w1a.r_nouvelle')} onClick={() => openForm(blank)}><Ico d={ICON.plus} size={22} sw={2.2} /></RoundBtn> : undefined}
      />
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '4px 16px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
        <SlideView screenKey={detailId ? `d-${detailId}` : 'list'} direction={dir} variant="push" background={PAGE_BG} onBack={detailId ? () => { setDir(-1); setDetailId(null) } : undefined}>
          {detailId ? (
            <MobileDetail id={detailId} routine={detail} onEdit={r => openForm({ ...r })} onChanged={load}
              onDeleted={() => { setDir(-1); setDetailId(null); void load() }} onToggle={toggle} />
          ) : (
            <MobileList routines={routines} loading={loading} err={err} onNew={() => openForm(blank)}
              onOpen={id => { setDir(1); setDetailId(id) }} onToggle={toggle} onTemplate={openTemplate} />
          )}
        </SlideView>
      </div>
      <MSheet open={formOpen} onClose={() => setFormOpen(false)} label={t('w1a.r_nouvelleRoutine')}>
        {form && <MobileForm key={formKey} initial={form} onCancel={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); void load() }} />}
      </MSheet>
    </div>
  )
}

function MobileList({ routines, loading, err, onNew, onOpen, onToggle, onTemplate }: {
  routines: Routine[]; loading: boolean; err: string | null; onNew: () => void
  onOpen: (id: string) => void; onToggle: (r: Routine) => void; onTemplate: (i: number) => void
}) {
  const { t } = useI18n()
  const sched = useScheduleText()
  return (
    <div>
      <p style={{ margin: '0 4px 16px', fontSize: 16, lineHeight: 1.4, color: 'var(--text-mid)' }}>{t('aio.r_intro')}</p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[0, 1, 2].map(i => <SkeletonCard key={i} height={112} />)}</div>
      ) : err ? (
        <MCard><div style={{ fontSize: 15, color: 'var(--danger)' }}>{err}</div></MCard>
      ) : routines.length === 0 ? (
        <MCard style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{t('w1a.r_aucuneRoutine')}</div>
          <p style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5, margin: '6px 0 16px' }}>{t('w1a.r_aucuneRoutineDesc')}</p>
          <PillButton onClick={onNew}>{t('w1a.r_creerPremiere')}</PillButton>
        </MCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatedList>
            {routines.map((r, i) => {
              const model = asModel(r.model)
              const right = !r.enabled ? t('aio.r_paused')
                : r.last_run_at ? t('aio.r_lastRun', { when: fmtWhen(r.last_run_at) })
                : t('aio.r_neverRun')
              return (
                <AnimatedItem key={r.id} index={i}>
                  <MCard onClick={() => onOpen(r.id)} style={{ padding: '16px 16px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25 }}>{r.name}</div>
                        <div style={{ fontSize: 15, color: 'var(--text-mid)', marginTop: 3 }}>{sched(r)}</div>
                      </div>
                      <div onClick={e => e.stopPropagation()} style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
                        <Switch checked={r.enabled} onCheckedChange={() => onToggle(r)} aria-label={r.enabled ? t('w1a.r_mettrePause') : t('w1a.r_activer')} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: HAIRLINE, minHeight: 48, fontSize: 15 }}>
                      <Dot color={MODEL_DOT[model]} />
                      <span style={{ color: 'var(--text-mid)', flexShrink: 0 }}>{MODEL_NAME[model]}</span>
                      <span style={{ flex: 1, minWidth: 0, textAlign: 'right', color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{right}</span>
                    </div>
                  </MCard>
                </AnimatedItem>
              )
            })}
          </AnimatedList>
        </div>
      )}

      <SectionLabel>{t('w1a.r_modelesPrets')}</SectionLabel>
      <HScroll>
        {TEMPLATES.map((_, i) => (
          <HCard key={i} onClick={() => onTemplate(i)} width={160}
            icon={<IconTile color={TPL_TILES[i]?.color ?? TILE.cyan} size={36}><Ico d={TPL_TILES[i]?.icon ?? ICON.clock} size={18} /></IconTile>}
            title={t(`w1a.r_tpl_${i}_label`)} />
        ))}
      </HScroll>
    </div>
  )
}

function MobileDetail({ id, routine, onEdit, onChanged, onDeleted, onToggle }: {
  id: string; routine: Routine | null
  onEdit: (r: Routine) => void; onChanged: () => void; onDeleted: () => void; onToggle: (r: Routine) => void
}) {
  const { t } = useI18n()
  const sched = useScheduleText()
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

  if (!routine) return <MCard><div style={{ fontSize: 15, color: 'var(--text-mid)' }}>{t('w1a.r_introuvable')}</div></MCard>
  const model = asModel(routine.model)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <MCard style={{ padding: '18px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{routine.name}</div>
            <div style={{ fontSize: 15, color: 'var(--text-mid)', marginTop: 4 }}>{sched(routine)}</div>
          </div>
          <div style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
            <Switch checked={routine.enabled} onCheckedChange={() => onToggle(routine)} aria-label={routine.enabled ? t('w1a.r_mettrePause') : t('w1a.r_activer')} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: HAIRLINE, minHeight: 48, fontSize: 15, color: 'var(--text-mid)' }}>
          <Dot color={MODEL_DOT[model]} />
          <span style={{ flexShrink: 0 }}>{MODEL_NAME[model]}</span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {!routine.enabled ? t('aio.r_paused') : routine.allow_write ? t('aio.r_canEdit') : t('aio.r_proposeOnly')}
          </span>
        </div>
      </MCard>

      <div style={{ marginTop: 14 }}>
        <PillButton onClick={() => void doRunNow()} disabled={running}>
          <Ico d={ICON.play} size={16} fill="currentColor" sw={0} />
          {running ? t('w1a.r_execution') : t('w1a.r_executerMaintenant')}
        </PillButton>
      </div>

      <SectionLabel>{t('w1a.r_instruction')}</SectionLabel>
      <MCard><div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{routine.prompt}</div></MCard>

      <SectionLabel>{t('w1a.r_executions')}</SectionLabel>
      {loadingRuns ? (
        <SkeletonCard height={120} />
      ) : runs.length === 0 ? (
        <MCard><div style={{ fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.5 }}>{t('w1a.r_aucuneExecution')}</div></MCard>
      ) : (
        <Group>
          {runs.map((run, i) => {
            const isOpen = openRun === run.id
            const color = run.status === 'error' ? STATUS_DOT.err : run.status === 'running' ? STATUS_DOT.warn : STATUS_DOT.ok
            return (
              <div key={run.id} style={{ borderTop: i === 0 ? 'none' : HAIRLINE }}>
                <button type="button" onClick={() => setOpenRun(isOpen ? null : run.id)} aria-expanded={isOpen}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '0 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: MFB }}>
                  <Dot color={color} size={9} />
                  <span style={{ flex: 1, fontSize: 16, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtWhen(run.created_at)}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-mid)' }}>{run.status === 'error' ? t('w1a.r_statusError') : run.status === 'running' ? t('w1a.r_statusRunning') : t('w1a.r_statusDone')}</span>
                  <span style={{ color: 'var(--text-dim)', display: 'flex', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><Ico d={ICON.chev} size={16} /></span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 16px 16px 37px', fontSize: 15, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {run.error ? <span style={{ color: 'var(--danger)' }}>{run.error}</span> : (run.output || '—')}
                  </div>
                )}
              </div>
            )
          })}
        </Group>
      )}

      <div style={{ marginTop: 22 }}>
        <Group>
          <GroupRow first icon={<span style={{ color: 'var(--text-mid)', display: 'flex' }}><Ico d={ICON.edit} size={19} /></span>} label={t('w1a.r_modifier')} onClick={() => onEdit(routine)} />
          <GroupRow danger chevron={false}
            icon={<span style={{ color: 'var(--danger)', display: 'flex' }}><Ico d={ICON.trash} size={19} /></span>}
            label={confirmDel ? t('w1a.r_confirmerSuppression') : t('w1a.r_supprimer')}
            onClick={() => { if (confirmDel) void deleteRoutine(id).then(onDeleted); else setConfirmDel(true) }} />
        </Group>
      </div>
    </div>
  )
}

// Ligne de réglage avec <select> natif invisible (roue iOS) par-dessus.
function SelectRow({ label, display, value, options, onChange, first }: {
  label: string; display: React.ReactNode; value: string; options: DDOpt[]; onChange: (v: string) => void; first?: boolean
}) {
  return (
    <label style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '0 16px', borderTop: first ? 'none' : HAIRLINE, cursor: 'pointer' }}>
      <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7, fontVariantNumeric: 'tabular-nums' }}>{display}</span>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={label}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16, border: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function MobileForm({ initial, onCancel, onSaved }: { initial: FormState; onCancel: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [f, setF] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedTpl, setAppliedTpl] = useState<number | null>(null)
  const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }))
  const taRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = taRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 260)}px` }
  }, [f.prompt])

  // Même enregistrement que le formulaire desktop.
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

  const freqOptions = FREQ_OPTS.map(o => ({ v: o.v, l: t(`w1a.r_freq_${o.v}`) }))
  const hourOptions: DDOpt[] = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')}:00` }))
  const dayOptions: DDOpt[] = DAYS.map((_, i) => ({ value: String(i), label: t(`w1a.r_day_${i}`) }))
  const modelOptions: DDOpt[] = MODEL_OPTS.map(o => ({ value: o.v, label: t(`w1a.r_model_${o.v}`) }))
  const model = asModel(f.model)
  const grp: React.CSSProperties = { background: 'var(--surface-chip)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }
  const lab: React.CSSProperties = { display: 'block', fontSize: 14, color: 'var(--text-mid)', marginBottom: 4 }
  const fieldBase: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: MFB, padding: 0, caretColor: 'var(--primary)' }

  return (
    <>
      <SheetHeader leftLabel={t('w1a.r_annuler')} onLeft={onCancel}
        title={f.id ? t('w1a.r_modifierRoutine') : t('w1a.r_nouvelleRoutine')}
        rightLabel={saving ? '…' : f.id ? t('w1a.r_enregistrer') : t('aio.r_create')} onRight={() => void save()} rightDisabled={saving} />
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 16px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        {!f.id && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -16px 14px', padding: '0 16px' }}>
            {TEMPLATES.map((tpl, i) => {
              const on = appliedTpl === i
              return (
                <button key={i} type="button"
                  onClick={() => { set({ name: t(`w1a.r_tpl_${i}_name`), prompt: t(`w1a.r_tpl_${i}_prompt`), frequency: tpl.frequency, hour: tpl.hour, ...(tpl.model ? { model: tpl.model } : {}) }); setAppliedTpl(i) }}
                  style={{ flexShrink: 0, minHeight: 40, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: MFB, fontSize: 14, fontWeight: 700,
                    background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--bg)' : 'var(--text-mid)' }}>
                  {t(`w1a.r_tpl_${i}_label`)}
                </button>
              )
            })}
          </div>
        )}

        <div style={grp}>
          <div style={{ padding: '12px 16px 14px' }}>
            <label style={lab} htmlFor="aio-r-name">{t('w1a.r_nom')}</label>
            <input id="aio-r-name" value={f.name ?? ''} onChange={e => { set({ name: e.target.value }); setAppliedTpl(null) }} placeholder={t('w1a.r_nomPh')}
              style={{ ...fieldBase, fontSize: 17, fontWeight: 800 }} />
          </div>
          <div style={{ padding: '12px 16px 14px', borderTop: HAIRLINE }}>
            <label style={lab} htmlFor="aio-r-prompt">{t('aio.r_whatAi')}</label>
            <textarea id="aio-r-prompt" ref={taRef} value={f.prompt ?? ''} rows={3} onChange={e => { set({ prompt: e.target.value }); setAppliedTpl(null) }} placeholder={t('w1a.r_promptPh')}
              style={{ ...fieldBase, fontSize: 16, lineHeight: 1.5, resize: 'none', minHeight: 72, display: 'block' }} />
          </div>
        </div>

        <SectionLabel>{t('aio.r_when')}</SectionLabel>
        <SegTrack full={false} options={freqOptions} value={(f.frequency ?? 'daily') as RoutineInput['frequency']} onChange={v => set({ frequency: v })} />
        <div style={{ ...grp, marginTop: 12 }}>
          {f.frequency === 'weekly' && (
            <SelectRow first label={t('w1a.r_jour')} display={t(`w1a.r_day_${f.weekday ?? 0}`)} value={String(f.weekday ?? 0)} options={dayOptions} onChange={v => set({ weekday: Number(v) })} />
          )}
          <SelectRow first={f.frequency !== 'weekly'} label={t('w1a.r_heure')} display={`${String(f.hour ?? 7).padStart(2, '0')}:00`} value={String(f.hour ?? 7)} options={hourOptions} onChange={v => set({ hour: Number(v) })} />
        </div>

        <SectionLabel>{t('aio.r_options')}</SectionLabel>
        <div style={grp}>
          <SelectRow first label={t('w1a.r_modeleIA')} value={model} options={modelOptions} onChange={v => set({ model: asModel(v) })}
            display={<><Dot color={MODEL_DOT[model]} /><span style={{ color: 'var(--text-mid)', fontWeight: 500 }}>{MODEL_NAME[model]}</span></>} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '10px 16px', borderTop: HAIRLINE }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('aio.r_canEdit')}</div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.4 }}>{t('aio.r_canEditSub')}</div>
            </div>
            <Switch checked={!!f.allow_write} onCheckedChange={v => set({ allow_write: v })} aria-label={t('aio.r_canEdit')} />
          </div>
        </div>

        {error && <div style={{ marginTop: 14, fontSize: 15, color: 'var(--danger)', lineHeight: 1.45 }}>{error}</div>}
      </div>
    </>
  )
}
