'use client'
// ══════════════════════════════════════════════════════════════════
// TestEditorSheet — planifie un TEST DE FORME dans le calendrier (même
// coquille que RaceEditorSheet / EventModal). On choisit un sport, on lie
// (optionnellement) un test du catalogue Performance, on saisit un titre et
// le déroulé du protocole, puis une date. Persisté dans calendar_events
// (category='test', ref=slug du test lié). Le lien vers la page Performance
// est rendu au clic sur l'objectif dans le calendrier.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import { RACE_EDITOR_CSS } from './raceTheme'
import { testsForSport, protocolForSlug, type CatalogSport } from '@/lib/tests/catalog'
import TestProtocolView from '@/components/tests/TestProtocolView'

export interface PlannedTestInput {
  sport: CatalogSport
  title: string
  protocol: string   // déroulé
  date: string
  ref: string | null // slug du test Performance lié
}

const SPORTS: { id: CatalogSport; label: string; color: string }[] = [
  { id: 'running',  label: 'Running',  color: '#22c55e' },
  { id: 'cycling',  label: 'Cyclisme', color: '#3b82f6' },
  { id: 'natation', label: 'Natation', color: '#06b6d4' },
  { id: 'aviron',   label: 'Aviron',   color: '#14b8a6' },
  { id: 'hyrox',    label: 'Hyrox',    color: '#ec4899' },
  { id: 'gym',      label: 'Muscu',    color: '#f97316' },
]
const sportColor = (s: CatalogSport) => SPORTS.find(x => x.id === s)?.color ?? '#8b5cf6'

const LBL: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }
const INP: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }

export default function TestEditorSheet({ mode = 'create', initial, initialDate, onClose, onDelete, onSave }: {
  mode?: 'create' | 'edit'
  initial?: PlannedTestInput
  initialDate?: string
  onClose: () => void
  onDelete?: () => void
  onSave: (t: PlannedTestInput) => Promise<void> | void
}) {
  const isEdit = mode === 'edit'
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { document.body.classList.add('race-editor-open'); return () => document.body.classList.remove('race-editor-open') }, [])

  const [sport, setSport]     = useState<CatalogSport>(initial?.sport ?? 'running')
  const [ref, setRef]         = useState<string | null>(initial?.ref ?? null)
  const [title, setTitle]     = useState(initial?.title ?? '')
  const [protocol, setProto]  = useState(initial?.protocol ?? '')
  const [date, setDate]       = useState(initial?.date ?? initialDate ?? '')
  const [saving, setSaving]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const tests = testsForSport(sport)

  // Sélection d'un test du catalogue : pré-remplit titre + déroulé, garde le slug.
  function pickTest(slug: string) {
    if (!slug) { setRef(null); return }
    const t = tests.find(x => x.id === slug)
    setRef(slug)
    if (t) {
      if (!title.trim()) setTitle(t.name)
      if (!protocol.trim()) setProto(t.desc)
    }
  }

  async function handleSave() {
    if (!title.trim() || !date) return
    setSaving(true)
    try { await onSave({ sport, title: title.trim(), protocol: protocol.trim(), date, ref }); onClose() }
    catch (e) { console.error('[TestEditorSheet save]', e) }
    finally { setSaving(false) }
  }

  const accent = sportColor(sport)
  if (!mounted) return null

  return createPortal(
    <>
      <style>{RACE_EDITOR_CSS}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'raceScrimIn .2s ease' }} />
      <div className="race-ed" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, top: 'max(64px, calc(env(safe-area-inset-top, 0px) + 48px))', zIndex: 9999,
        background: 'var(--bg-card2)', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 50px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'raceSheetUp .34s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 className="ed-fr" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{isEdit ? 'Modifier le test' : 'Planifier un test'}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Sport */}
            <div>
              <p style={LBL}>Sport</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {SPORTS.map(s => {
                  const on = sport === s.id
                  return <button key={s.id} onClick={() => { setSport(s.id); setRef(null) }} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${on ? s.color : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: on ? `${s.color}1f` : 'var(--bg-card)', color: on ? s.color : 'var(--text-dim)' }}>{s.label}</button>
                })}
              </div>
            </div>

            {/* Test lié (catalogue Performance) */}
            <div>
              <p style={LBL}>Test lié (page Performance)</p>
              <select value={ref ?? ''} onChange={e => pickTest(e.target.value)} style={INP}>
                <option value="">— Test personnalisé (non lié) —</option>
                {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {ref && <p style={{ fontSize: 11, color: accent, margin: '6px 0 0' }}>Lié à « {tests.find(t => t.id === ref)?.name} » — visible dans la bulle tests de Performance.</p>}
            </div>

            {/* Procédé du test lié (même déroulé que la page Performance) */}
            {ref && protocolForSlug(ref) && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 16px 18px' }}>
                <p style={{ ...LBL, color: accent, marginBottom: 12 }}>Procédé du test</p>
                <TestProtocolView proto={protocolForSlug(ref)!} accent={accent} />
              </div>
            )}

            {/* Titre */}
            <div><p style={LBL}>Titre</p><input style={INP} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Test VMA piste" /></div>

            {/* Date */}
            <div><p style={LBL}>Date</p><input type="date" style={INP} value={date} onChange={e => setDate(e.target.value)} /></div>

            {/* Déroulé / protocole */}
            <div><p style={LBL}>Déroulé du test</p>
              <textarea rows={6} style={{ ...INP, resize: 'vertical', lineHeight: 1.5 }} value={protocol} onChange={e => setProto(e.target.value)} placeholder="Échauffement, étapes, conditions, données à relever…" /></div>
          </div>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 720, alignItems: 'center' }}>
            {isEdit && onDelete && (confirmDelete ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ef4444' }}>Supprimer ce test ?</span>
                <button onClick={onDelete} style={{ padding: '10px 16px', borderRadius: 999, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Confirmer</button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: '10px 14px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ padding: 12, borderRadius: 999, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Supprimer</button>
            ))}
            {!confirmDelete && (<>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
              <button onClick={handleSave} disabled={saving || !title.trim() || !date} style={{ flex: 2, padding: 12, borderRadius: 999, background: accent, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: saving ? 'wait' : 'pointer', opacity: (!title.trim() || !date) ? 0.5 : 1 }}>{saving ? '…' : isEdit ? 'Enregistrer' : 'Planifier'}</button>
            </>)}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
