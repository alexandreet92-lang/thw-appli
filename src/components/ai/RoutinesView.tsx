'use client'
// ══════════════════════════════════════════════════════════════
// Interface dédiée « Routines » (façon Claude) : liste des routines,
// création/édition avec modèles prêts à l'emploi, et vue détail avec le
// prompt + l'historique complet des exécutions (chaque run consultable).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import {
  listRoutines, createRoutine, updateRoutine, deleteRoutine, runRoutine, listRuns,
  scheduleLabel, type Routine, type RoutineRun, type RoutineInput,
} from '@/lib/routines/client'

const ACCENT = '#5b6fff'

const TEMPLATES: { label: string; name: string; prompt: string; frequency: RoutineInput['frequency']; hour: number }[] = [
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

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9,
  border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)',
  fontSize: 14, fontFamily: 'DM Sans,sans-serif', outline: 'none',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 5, display: 'block' }

type FormState = Partial<Routine> & { id?: string }

export default function RoutinesView({ onClose }: { onClose: () => void }) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState<{ mode: 'list' } | { mode: 'form'; form: FormState } | { mode: 'detail'; id: string }>({ mode: 'list' })
  const [err, setErr]           = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRoutines(await listRoutines()) } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const openNew = () => setView({ mode: 'form', form: { name: '', prompt: '', frequency: 'daily', hour: 7, weekday: 0, model: 'athena', allow_write: false } })
  const openEdit = (r: Routine) => setView({ mode: 'form', form: { ...r } })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 13500, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'max(14px, env(safe-area-inset-top)) 16px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <button onClick={() => { if (view.mode === 'list') onClose(); else setView({ mode: 'list' }) }}
          aria-label="Retour"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 19, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>
          {view.mode === 'form' ? (view.form.id ? 'Modifier la routine' : 'Nouvelle routine') : 'Routines'}
        </div>
        {view.mode === 'list' && (
          <button onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Nouvelle
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
  if (loading) return <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 40 }}>Chargement…</div>
  if (err) return <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 13, padding: 40 }}>{err}</div>
  if (routines.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Aucune routine</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto 18px' }}>
          Automatise une tâche récurrente : l&apos;IA l&apos;exécute toute seule à l&apos;heure choisie et t&apos;envoie une notification.
        </p>
        <button onClick={onNew} style={{ padding: '11px 18px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Créer ma première routine</button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640, margin: '0 auto' }}>
      {routines.map(r => (
        <div key={r.id} onClick={() => onOpen(r.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '0.5px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: r.enabled ? 'rgba(91,111,255,0.12)' : 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.enabled ? ACCENT : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{scheduleLabel(r)}{!r.enabled && ' · en pause'}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(r) }}
            aria-label={r.enabled ? 'Mettre en pause' : 'Activer'}
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
  const [f, setF] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }))

  const save = async () => {
    if (!f.name?.trim() || !f.prompt?.trim()) { setError('Donne un nom et décris ce que la routine doit faire.'); return }
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
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, margin: '0 auto' }}>
      {!f.id && (
        <div>
          <span style={labelStyle}>Modèles prêts à l&apos;emploi</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {TEMPLATES.map(tpl => (
              <button key={tpl.label} onClick={() => set({ name: tpl.name, prompt: tpl.prompt, frequency: tpl.frequency, hour: tpl.hour })}
                style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>Nom</label>
        <input value={f.name ?? ''} onChange={e => set({ name: e.target.value })} placeholder="Ex. Brief matinal" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Que doit faire l&apos;IA ?</label>
        <textarea value={f.prompt ?? ''} onChange={e => set({ prompt: e.target.value })} rows={5}
          placeholder="Décris précisément la tâche à répéter. Ex. « Chaque matin, fais-moi le brief de ma journée d'entraînement avec un conseil d'exécution. »"
          style={{ ...inputStyle, fontSize: 13, lineHeight: 1.5, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px' }}>
          <label style={labelStyle}>Fréquence</label>
          <select value={f.frequency ?? 'daily'} onChange={e => set({ frequency: e.target.value as RoutineInput['frequency'] })} style={inputStyle}>
            {FREQ_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 110px' }}>
          <label style={labelStyle}>Heure</label>
          <select value={f.hour ?? 7} onChange={e => set({ hour: Number(e.target.value) })} style={inputStyle}>
            {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}h00</option>)}
          </select>
        </div>
      </div>

      {f.frequency === 'weekly' && (
        <div>
          <label style={labelStyle}>Jour</label>
          <select value={f.weekday ?? 0} onChange={e => set({ weekday: Number(e.target.value) })} style={inputStyle}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
      )}

      <div>
        <label style={labelStyle}>Modèle IA</label>
        <select value={f.model ?? 'athena'} onChange={e => set({ model: e.target.value as RoutineInput['model'] })} style={inputStyle}>
          {MODEL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>

      {/* Garde-fou : autoriser les modifications */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--bg-alt)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Autoriser les modifications</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>
            Off = la routine analyse et te notifie seulement. On = elle peut aussi agir (créer un plan, planifier des séances…) sans validation.
          </div>
        </div>
        <button onClick={() => set({ allow_write: !f.allow_write })} aria-label="Autoriser les modifications"
          style={{ flexShrink: 0, width: 42, height: 25, borderRadius: 999, border: 'none', cursor: 'pointer', background: f.allow_write ? '#f59e0b' : 'var(--border)', position: 'relative', transition: 'background 0.15s' }}>
          <span style={{ position: 'absolute', top: 3, left: f.allow_write ? 20 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
        </button>
      </div>

      {error && <div style={{ fontSize: 12.5, color: '#ef4444' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Annuler</button>
        <button onClick={save} disabled={saving}
          style={{ padding: '11px 20px', borderRadius: 10, border: 'none', background: saving ? 'var(--border)' : ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          {saving ? '…' : f.id ? 'Enregistrer' : 'Créer la routine'}
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

  if (!routine) return <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 40 }}>Routine introuvable.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640, margin: '0 auto' }}>
      {/* En-tête routine */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,DM Sans,sans-serif' }}>{routine.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{scheduleLabel(routine)}{!routine.enabled && ' · en pause'}{routine.allow_write && ' · peut agir'}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={doRunNow} disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: running ? 'default' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          {running ? 'Exécution…' : 'Exécuter maintenant'}
        </button>
        <button onClick={() => updateRoutine(id, { enabled: !routine.enabled }).then(onChanged)}
          style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          {routine.enabled ? 'Mettre en pause' : 'Activer'}
        </button>
        <button onClick={() => onEdit(routine)}
          style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mid)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
          Modifier
        </button>
        {confirmDel ? (
          <button onClick={() => deleteRoutine(id).then(onDeleted)}
            style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Confirmer la suppression
          </button>
        ) : (
          <button onClick={() => setConfirmDel(true)}
            style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            Supprimer
          </button>
        )}
      </div>

      {/* Prompt */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>Instruction</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-alt)', border: '0.5px solid var(--border)', whiteSpace: 'pre-wrap' }}>{routine.prompt}</div>
      </div>

      {/* Historique */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>Exécutions</div>
        {loadingRuns ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: 12 }}>Chargement…</div>
        ) : runs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', padding: 12 }}>Aucune exécution pour l&apos;instant. Utilise « Exécuter maintenant » pour tester.</div>
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
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{run.status === 'error' ? 'erreur' : run.status === 'running' ? 'en cours' : 'terminé'}</span>
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
