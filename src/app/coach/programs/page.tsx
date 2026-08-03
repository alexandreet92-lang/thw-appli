'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Coach — création de PROGRAMMES réutilisables (semaines → séances).
// Brouillon puis publication au catalogue public (/programmes), accessible
// à tout le monde. Route protégée par la garde /coach (accès coach requis).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  listMyPrograms, createProgram, updateProgram, deleteProgram,
  LEVEL_LABEL, type CoachProgram, type ProgramLevel, type ProgramWeek, type ProgramSession,
} from '@/lib/coach/programs'

const SPORTS: { key: string; label: string }[] = [
  { key: 'running', label: 'Course' }, { key: 'cycling', label: 'Vélo' }, { key: 'swim', label: 'Natation' },
  { key: 'gym', label: 'Renforcement' }, { key: 'hyrox', label: 'Hyrox' }, { key: 'trail', label: 'Trail' },
  { key: 'triathlon', label: 'Triathlon' }, { key: 'rowing', label: 'Aviron' },
]
const LEVELS: ProgramLevel[] = ['debutant', 'intermediaire', 'avance', 'tous']
const INTENSITES: ProgramSession['intensite'][] = ['Faible', 'Modéré', 'Élevé', 'Maximum']

export default function CoachProgramsPage() {
  const [list, setList] = useState<CoachProgram[] | null>(null)
  const [editing, setEditing] = useState<CoachProgram | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { void listMyPrograms().then(setList).catch(() => setList([])) }, [])

  const openNew = async () => {
    const id = await createProgram('Nouveau programme')
    if (!id) return
    const fresh = (await listMyPrograms()).find(p => p.id === id) ?? null
    setList(await listMyPrograms())
    if (fresh) setEditing(fresh)
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await updateProgram(editing.id, editing)
      setList(await listMyPrograms())
      setSaved(true); setTimeout(() => setSaved(false), 1600)
    } catch { alert('Enregistrement impossible.') } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce programme ?')) return
    await deleteProgram(id)
    setList(await listMyPrograms())
    if (editing?.id === id) setEditing(null)
  }

  // ── Édition de la structure ───────────────────────────────────────
  const set = (patch: Partial<CoachProgram>) => editing && setEditing({ ...editing, ...patch })
  const toggleSport = (k: string) => editing && set({ sports: editing.sports.includes(k) ? editing.sports.filter(x => x !== k) : [...editing.sports, k] })
  const setWeek = (i: number, patch: Partial<ProgramWeek>) => editing && set({ structure: editing.structure.map((w, j) => j === i ? { ...w, ...patch } : w) })
  const addWeek = () => editing && set({ structure: [...editing.structure, { label: `Semaine ${editing.structure.length + 1}`, sessions: [] }] })
  const removeWeek = (i: number) => editing && set({ structure: editing.structure.filter((_, j) => j !== i) })
  const addSession = (wi: number) => editing && setWeek(wi, { sessions: [...editing.structure[wi].sessions, { nom: '', sport: editing.sports[0] ?? 'running' }] })
  const setSession = (wi: number, si: number, patch: Partial<ProgramSession>) => editing && setWeek(wi, { sessions: editing.structure[wi].sessions.map((s, j) => j === si ? { ...s, ...patch } : s) })
  const removeSession = (wi: number, si: number) => editing && setWeek(wi, { sessions: editing.structure[wi].sessions.filter((_, j) => j !== si) })

  // ══ VUE ÉDITEUR ══
  if (editing) {
    const e = editing
    return (
      <div style={wrap}>
        <button onClick={() => setEditing(null)} style={backBtn}>← Mes programmes</button>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
            <Toggle on={e.published} onClick={() => set({ published: !e.published })} label={e.published ? 'Publié au catalogue' : 'Brouillon'} />
            {e.published && <Link href={`/programmes/${e.id}`} target="_blank" style={ghost}>Voir la fiche publique</Link>}
          </div>

          <Field label="Titre"><input value={e.title} onChange={ev => set({ title: ev.target.value })} style={inp} placeholder="Prépa 10 km · 8 semaines" /></Field>
          <Field label="Description"><textarea value={e.description ?? ''} onChange={ev => set({ description: ev.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="À qui s'adresse ce programme, objectif, prérequis…" /></Field>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Niveau" style={{ flex: 1, minWidth: 160 }}>
              <select value={e.level ?? ''} onChange={ev => set({ level: (ev.target.value || null) as ProgramLevel | null })} style={inp}>
                <option value="">—</option>
                {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </select>
            </Field>
            <Field label="Durée (semaines)" style={{ width: 150, flex: 'none' }}>
              <input type="number" min={1} max={52} value={e.duration_weeks} onChange={ev => set({ duration_weeks: Math.max(1, Math.min(52, Number(ev.target.value) || 1)) })} style={inp} />
            </Field>
          </div>

          <div style={secLbl}>Sports</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPORTS.map(s => {
              const on = e.sports.includes(s.key)
              return <button key={s.key} onClick={() => toggleSport(s.key)} style={{ padding: '7px 13px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, background: on ? 'var(--primary)' : 'var(--bg-card2)', color: on ? 'var(--on-primary)' : 'var(--text-mid)' }}>{s.label}</button>
            })}
          </div>

          {/* Structure semaines → séances */}
          <div style={secLbl}>Structure du programme</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {e.structure.map((w, wi) => (
              <div key={wi} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input value={w.label} onChange={ev => setWeek(wi, { label: ev.target.value })} style={{ ...inp, fontWeight: 700, flex: 1 }} placeholder={`Semaine ${wi + 1}`} />
                  <button onClick={() => removeWeek(wi)} aria-label="Retirer la semaine" style={removeBtn}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {w.sessions.map((s, si) => (
                    <div key={si} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input value={s.nom} onChange={ev => setSession(wi, si, { nom: ev.target.value })} style={{ ...inp, flex: 2, minWidth: 140 }} placeholder="Nom de la séance" />
                      <select value={s.sport} onChange={ev => setSession(wi, si, { sport: ev.target.value })} style={{ ...inp, width: 120, flex: 'none' }}>
                        {SPORTS.map(sp => <option key={sp.key} value={sp.key}>{sp.label}</option>)}
                      </select>
                      <input type="number" min={0} value={s.duree ?? ''} onChange={ev => setSession(wi, si, { duree: ev.target.value ? Number(ev.target.value) : undefined })} style={{ ...inp, width: 88, flex: 'none' }} placeholder="min" />
                      <select value={s.intensite ?? ''} onChange={ev => setSession(wi, si, { intensite: (ev.target.value || undefined) as ProgramSession['intensite'] })} style={{ ...inp, width: 120, flex: 'none' }}>
                        <option value="">Intensité</option>
                        {INTENSITES.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                      <button onClick={() => removeSession(wi, si)} aria-label="Retirer la séance" style={removeBtn}>×</button>
                    </div>
                  ))}
                  <button onClick={() => addSession(wi)} style={addBtn}>+ Ajouter une séance</button>
                </div>
              </div>
            ))}
            <button onClick={addWeek} style={addBtn}>+ Ajouter une semaine</button>
          </div>

          <button onClick={save} disabled={saving} style={{ ...primary, width: '100%', height: 46, marginTop: 22, fontSize: 14.5 }}>{saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}</button>
        </div>
      </div>
    )
  }

  // ══ VUE LISTE ══
  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Mes programmes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Construis un programme réutilisable, publie-le au catalogue accessible à tous.</p>
        </div>
        <button onClick={openNew} style={primary}>+ Nouveau</button>
      </div>

      {list === null ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : list.length === 0 ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Aucun programme</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '6px 0 16px' }}>Crée ton premier programme d'entraînement.</p>
          <button onClick={openNew} style={primary}>+ Nouveau programme</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {list.map(p => (
            <div key={p.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.published ? 'var(--primary)' : 'var(--text-dim)', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: p.published ? 'var(--primary)' : 'var(--text-dim)' }}>{p.published ? 'Publié' : 'Brouillon'}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25 }}>{p.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks}</span> sem. · <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.structure.reduce((n, w) => n + w.sessions.length, 0)}</span> séances{p.level ? ` · ${LEVEL_LABEL[p.level]}` : ''}
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(p)} style={{ ...primary, flex: 1 }}>Éditer</button>
                <button onClick={() => remove(p.id)} aria-label="Supprimer" style={ghost}>Suppr.</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: 'block', margin: '14px 0 0', ...style }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  )
}
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
      <span style={{ width: 40, height: 24, borderRadius: 999, background: on ? 'var(--primary)' : 'var(--border-mid)', position: 'relative', transition: 'background 160ms', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 160ms', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </button>
  )
}

const wrap: React.CSSProperties = { width: '100%', maxWidth: 760, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }
const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,26px)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const secLbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '22px 0 10px' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }
const primary: React.CSSProperties = { padding: '9px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
const ghost: React.CSSProperties = { padding: '9px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }
const backBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginBottom: 12 }
const addBtn: React.CSSProperties = { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const removeBtn: React.CSSProperties = { width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--bg-card)', color: 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1, cursor: 'pointer' }
