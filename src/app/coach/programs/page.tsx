'use client'
export const dynamic = 'force-dynamic'

// ══════════════════════════════════════════════════════════════════
// Coach — PROGRAMMES : liste + assistant de création en 3 étapes.
// Route protégée par la garde /coach (accès coach requis).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import {
  listMyPrograms, createProgram, deleteProgram,
  LEVEL_LABEL, PREP_LABEL, type CoachProgram,
} from '@/lib/coach/programs'
import ProgramWizard from '@/components/coach/ProgramWizard'

export default function CoachProgramsPage() {
  const [list, setList] = useState<CoachProgram[] | null>(null)
  const [editing, setEditing] = useState<CoachProgram | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { void listMyPrograms().then(setList).catch(() => setList([])) }, [])

  const openNew = async () => {
    setBusy(true)
    try {
      const id = await createProgram('Nouveau programme')
      if (!id) return
      const fresh = (await listMyPrograms()).find(p => p.id === id) ?? null
      setList(await listMyPrograms())
      if (fresh) setEditing(fresh)
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce programme ?')) return
    await deleteProgram(id)
    setList(await listMyPrograms())
    if (editing?.id === id) setEditing(null)
  }

  // ── Assistant ──
  if (editing) {
    return (
      <div style={{ paddingTop: 8 }}>
        <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', boxSizing: 'border-box' }}>
          <button onClick={() => setEditing(null)} style={backBtn}>← Mes programmes</button>
        </div>
        <ProgramWizard program={editing} onDone={async () => { setEditing(null); setList(await listMyPrograms()) }} />
      </div>
    )
  }

  // ── Liste ──
  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '24px clamp(16px,4vw,40px) 64px', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Mes programmes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Crée un programme réutilisable, publie-le au catalogue accessible à tous.</p>
        </div>
        <button onClick={openNew} disabled={busy} style={primary}>{busy ? '…' : '+ Nouveau'}</button>
      </div>

      {list === null ? (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Chargement…</p>
      ) : list.length === 0 ? (
        <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Aucun programme</p>
          <p style={{ fontSize: 13.5, color: 'var(--text-mid)', margin: '6px 0 16px' }}>Crée ton premier programme d&apos;entraînement.</p>
          <button onClick={openNew} disabled={busy} style={primary}>+ Nouveau programme</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {list.map(p => {
            const sessions = p.structure.reduce((n, w) => n + w.sessions.length, 0)
            return (
              <div key={p.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.published ? 'var(--primary)' : 'var(--text-dim)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: p.published ? 'var(--primary)' : 'var(--text-dim)' }}>{p.published ? 'Publié' : 'Brouillon'}</span>
                  {p.prep_type && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginLeft: 'auto' }}>{PREP_LABEL[p.prep_type]}</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.25 }}>{p.title}</div>
                {p.objective && <div style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>{p.objective}</div>}
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                  <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{p.duration_weeks}</span> sem. · <span className="tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>{sessions}</span> séances{p.level ? ` · ${LEVEL_LABEL[p.level]}` : ''}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditing(p)} style={{ ...primary, flex: 1 }}>Éditer</button>
                  <button onClick={() => remove(p.id)} aria-label="Supprimer" style={ghost}>Suppr.</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const primary: React.CSSProperties = { padding: '9px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
const ghost: React.CSSProperties = { padding: '9px 14px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const backBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: 'var(--text-mid)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginBottom: 4 }
