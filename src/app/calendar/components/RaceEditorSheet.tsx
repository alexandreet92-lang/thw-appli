'use client'
// ══════════════════════════════════════════════════════════════════
// Éditeur de course — sheet bas→haut PLEINE LARGEUR, style éditorial clair.
// Conteneur + présentation seulement : le modèle de données et la sauvegarde
// (onSave, clés performanceData) sont INCHANGÉS. Triathlon = 5 segments ;
// autres sports = SportFields existant (zéro perte de donnée) dans une carte.
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { Race, RaceLevel, RaceSport, RACE_CFG, SPORT_LABEL, SPORT_COLOR, SPORT_BG } from './types'
import SportFields from './SportFields'
import TriSegments from './TriSegments'
import RaceDropZone from './RaceDropZone'
import { SegmentCard } from './RaceSegmentCard'
import { RACE_EDITOR_CSS } from './raceTheme'

interface Props {
  race?: Race; initialDate?: string; onClose: () => void
  onSave: (r: Omit<Race, 'id'>, files: File[], filesBike?: File[], filesRun?: File[]) => Promise<void>
}
const SPORTS: RaceSport[] = ['run', 'trail', 'bike', 'swim', 'hyrox', 'triathlon', 'rowing']
const LEVELS: RaceLevel[] = ['main', 'important', 'secondary', 'gty']  // GTY = donnée existante, conservée
const LBL: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }
const INP: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }

export default function RaceEditorSheet({ race, initialDate, onClose, onSave }: Props) {
  const isEdit = !!race
  const [sport, setSport] = useState<RaceSport>(race?.sport ?? 'run')
  const [level, setLevel] = useState<RaceLevel>(race?.level ?? 'important')
  const [name, setName] = useState(race?.name ?? '')
  const [date, setDate] = useState(race?.date ?? initialDate ?? new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState(race?.notes ?? '')
  const [pd, setPd] = useState<Record<string, unknown>>(race?.performanceData ?? {})
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [filesBike, setFilesBike] = useState<File[]>([])
  const [filesRun, setFilesRun] = useState<File[]>([])

  async function handleSave() {
    if (!name.trim() || !date) return
    setSaving(true)
    try {
      await onSave(
        { name: name.trim(), sport, date, level, notes: notes || undefined, performanceData: pd,
          status: race?.status ?? 'upcoming',
          goalTime: (pd.goalTime as string) || (pd.triSwimTime ? '' : undefined),
          distance: (pd.distance as string) || (pd.rowDist as string) || undefined,
          runDistance: sport === 'run' ? (pd.runDist as string) : undefined },
        files, filesBike, filesRun,
      )
      onClose()
    } catch (e) { console.error('[RaceEditor save]', e) } finally { setSaving(false) }
  }

  return (
    <>
      <style>{RACE_EDITOR_CSS}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'raceScrimIn .2s ease' }} />
      <div className="race-ed" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 401, height: '94vh',
        background: 'var(--bg)', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 50px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'raceSheetUp .34s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />
        {/* Header sticky */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 className="ed-fr" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{isEdit ? 'Modifier la course' : 'Ajouter une course'}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} /></button>
        </div>

        {/* Corps scrollable — contenu centré (largeur de lecture max) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Sport */}
            <div>
              <p style={LBL}>Sport</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {SPORTS.map(s => (
                  <button key={s} onClick={() => { setSport(s); setPd({}) }} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${sport === s ? SPORT_COLOR[s] : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: sport === s ? SPORT_BG[s] : 'var(--bg-card)', color: sport === s ? SPORT_COLOR[s] : 'var(--text-dim)' }}>{SPORT_LABEL[s]}</button>
                ))}
              </div>
            </div>
            {/* Objectif (niveau) — GTY conservé */}
            <div>
              <p style={LBL}>Objectif</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {LEVELS.map(l => { const c = RACE_CFG[l]; return (
                  <button key={l} onClick={() => setLevel(l)} style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${level === l ? c.border : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: level === l ? c.bg : 'var(--bg-card)', color: level === l ? c.color : 'var(--text-dim)' }}>{c.label}</button>
                ) })}
              </div>
            </div>
            {/* Nom + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div><p style={LBL}>Nom</p><input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Ironman Nice" /></div>
              <div><p style={LBL}>Date</p><input type="date" style={INP} value={date} onChange={e => setDate(e.target.value)} /></div>
            </div>
            {/* Segments adaptatifs */}
            {sport === 'triathlon'
              ? <TriSegments pd={pd} setPd={setPd} />
              : <SegmentCard color={SPORT_COLOR[sport]} label={SPORT_LABEL[sport]}><SportFields sport={sport} pd={pd} setPd={setPd} /></SegmentCard>}
            {/* Parcours */}
            <div>
              <p style={LBL}>Parcours</p>
              {sport === 'triathlon' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <RaceDropZone label="Parcours vélo" list={filesBike} setter={setFilesBike} />
                  <RaceDropZone label="Parcours course" list={filesRun} setter={setFilesRun} />
                </div>
              ) : <RaceDropZone list={files} setter={setFiles} />}
            </div>
            {/* Notes */}
            <div><p style={LBL}>Notes</p>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Stratégie de course, préparation…" style={{ ...INP, resize: 'vertical' }} /></div>
          </div>
        </div>

        {/* Footer sticky */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 900 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleSave} disabled={saving || !name.trim()} style={{ flex: 2, padding: 12, borderRadius: 999, background: SPORT_COLOR[sport], border: 'none', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: saving ? 'wait' : 'pointer', opacity: !name.trim() ? 0.5 : 1 }}>{saving ? '…' : isEdit ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </div>
      </div>
    </>
  )
}
