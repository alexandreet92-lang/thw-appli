'use client'
// ══════════════════════════════════════════════════════════════════════════
// Carte de séance partagée (snapshot). Accent sport (filet 3px), pas de surface
// colorée. Clic → surpage détail (blocs/exos) avec deux actions :
//   • Copier dans ma bibliothèque (session_favorites)
//   • Ajouter à mon planning à une date choisie (planned_sessions)
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { sportColor, sportLabel } from '@/components/recovery/helpers'
import { copySessionToLibrary, addSessionToPlanning } from '@/lib/community/sessions'
import type { SessionRef } from '@/types/community'
import type { Block } from '@/app/planning/page'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function fmtDuration(min: number | null): string | null {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

const TYPE_LABEL: Record<string, string> = {
  warmup: 'Échauffement', effort: 'Effort', recovery: 'Récupération',
  cooldown: 'Retour au calme', circuit_header: 'Circuit',
}
function blockTitle(b: Block): string {
  return b.label?.trim() || TYPE_LABEL[b.type] || 'Bloc'
}
function blockDetail(b: Block): string {
  const p: string[] = []
  if ((b.mode === 'interval' || b.mode === 'series' || b.mode === 'circuit' || b.mode === 'emom' || b.mode === 'tabata') && b.reps) p.push(`${b.reps} ×`)
  if (b.effortMin && b.effortMin > 0) p.push(`${b.effortMin} min`)
  else if (b.durationMin && b.durationMin > 0) p.push(`${b.durationMin} min`)
  if (b.zone) p.push(`Z${b.zone}`)
  if (b.value?.trim()) p.push(b.value.trim())
  if (b.cadence?.trim()) p.push(`${b.cadence} rpm`)
  if (b.inclinePct) p.push(`${b.inclinePct}%`)
  if (b.recoveryMin && b.recoveryMin > 0) p.push(`récup ${b.recoveryMin} min${b.recoveryZone ? ` Z${b.recoveryZone}` : ''}`)
  return p.join(' · ')
}

export function SessionCard({ session }: { session: SessionRef }) {
  const [open, setOpen] = useState(false)
  const col = sportColor(session.sport)
  const meta = [sportLabel(session.sport), fmtDuration(session.durationMin), session.blocks.length ? `${session.blocks.length} bloc${session.blocks.length > 1 ? 's' : ''}` : null, session.rpe ? `RPE ${session.rpe}` : null].filter(Boolean) as string[]

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'stretch', width: '100%', maxWidth: 380, textAlign: 'left', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)', fontFamily: FB }}>
        <span style={{ width: 3, borderRadius: 3, background: col, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 3 }}>
            <span style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>Séance</span>
          </span>
          <span style={{ display: 'block', fontFamily: FD, fontSize: 14.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</span>
          <span className="tnum" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
            {meta.map((s, i) => <span key={i}>{s}</span>)}
          </span>
          <span style={{ display: 'block', marginTop: 6, fontFamily: FB, fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>Voir le détail →</span>
        </span>
      </button>
      {open && <SessionDetailOverlay session={session} onClose={() => setOpen(false)} />}
    </>
  )
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SessionDetailOverlay({ session, onClose }: { session: SessionRef; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [busy, setBusy] = useState<null | 'copy' | 'plan'>(null)
  const [done, setDone] = useState<null | string>(null)
  const [planning, setPlanning] = useState(false)
  const [date, setDate] = useState(todayStr())
  const col = sportColor(session.sport)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!mounted) return null

  async function doCopy() {
    setBusy('copy'); setDone(null)
    const ok = await copySessionToLibrary(session)
    setBusy(null); setDone(ok ? 'Séance copiée dans ta bibliothèque.' : 'Copie impossible. Réessaie.')
  }
  async function doPlan() {
    setBusy('plan'); setDone(null)
    const [y, m, d] = date.split('-').map(Number)
    const ok = await addSessionToPlanning(session, new Date(y, m - 1, d))
    setBusy(null)
    if (ok) { setPlanning(false); setDone('Séance ajoutée à ton planning.') }
    else setDone('Ajout impossible. Réessaie.')
  }

  const meta = [sportLabel(session.sport), fmtDuration(session.durationMin), session.rpe ? `RPE ${session.rpe}` : null].filter(Boolean) as string[]

  const overlay = (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(2px)', zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderTopLeftRadius: 'var(--r-lg)', borderTopRightRadius: 'var(--r-lg)', boxShadow: 'var(--shadow)', animation: 'scale-in 0.22s ease' }}>
        {/* En-tête */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-5) var(--space-3)' }}>
          <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border-mid)', margin: '0 auto var(--space-4)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, background: col, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: FD, fontSize: 19, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{session.title}</h2>
              <div className="tnum" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginTop: 4, fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>
                {meta.map((s, i) => <span key={i}>{s}</span>)}
              </div>
              {session.trainingTypes?.length ? (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {session.trainingTypes.map(t => <span key={t} style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--surface-neutral)', padding: '2px 8px', borderRadius: 'var(--r-sm)' }}>{t}</span>)}
                </div>
              ) : null}
            </div>
            <button onClick={onClose} aria-label="Fermer" style={{ width: 28, height: 28, flexShrink: 0, border: 'none', borderRadius: '50%', background: 'transparent', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        </div>

        {/* Contenu : blocs / exos */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {session.blocks.length === 0 ? (
            <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', padding: 'var(--space-4) 0' }}>Cette séance n&apos;a pas de bloc détaillé.</p>
          ) : session.blocks.map((b, i) => {
            const detail = blockDetail(b)
            return (
              <div key={b.id || i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline', padding: 'var(--space-3)', background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)' }}>
                <span className="tnum" style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 700, color: 'var(--text-dim)', width: 18, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FB, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{blockTitle(b)}</div>
                  {detail && <div className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{detail}</div>}
                </div>
              </div>
            )
          })}
          {session.notes?.trim() && (
            <p style={{ fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5, margin: 'var(--space-2) 0 0' }}>{session.notes.trim()}</p>
          )}
          {session.nutritionItems?.length ? (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <div style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-2)' }}>Nutrition</div>
              {session.nutritionItems.map((n, i) => (
                <div key={n.id || i} className="tnum" style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>{n.timeMin} min · {n.name || n.type} · {n.quantity}</div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div style={{ flexShrink: 0, padding: 'var(--space-4) var(--space-5) var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {done && <p style={{ margin: '0 0 var(--space-1)', fontFamily: FB, fontSize: 12.5, color: 'var(--text-mid)', textAlign: 'center' }}>{done}</p>}
          {planning ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)}
                style={{ flex: 1, height: 40, boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0 var(--space-3)', fontFamily: FB, fontSize: 13.5, color: 'var(--text)', outline: 'none' }} />
              <button onClick={() => void doPlan()} disabled={busy === 'plan'}
                style={{ height: 40, padding: '0 var(--space-5)', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: busy === 'plan' ? 'default' : 'pointer', opacity: busy === 'plan' ? 0.6 : 1 }}>
                {busy === 'plan' ? 'Ajout…' : 'Confirmer'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button onClick={() => void doCopy()} disabled={busy === 'copy'}
                style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)', color: 'var(--text)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: busy === 'copy' ? 'default' : 'pointer', opacity: busy === 'copy' ? 0.6 : 1 }}>
                {busy === 'copy' ? 'Copie…' : 'Copier en bibliothèque'}
              </button>
              <button onClick={() => { setPlanning(true); setDone(null) }}
                style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Ajouter au planning
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
  return createPortal(overlay, document.body)
}
