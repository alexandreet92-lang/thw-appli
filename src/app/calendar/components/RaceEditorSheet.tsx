'use client'
// ══════════════════════════════════════════════════════════════════
// Éditeur de course — sheet bas→haut PLEINE LARGEUR, style éditorial clair.
// Conteneur + présentation seulement : le modèle de données et la sauvegarde
// (onSave, clés performanceData) sont INCHANGÉS. Triathlon = 5 segments ;
// autres sports = SportFields existant (zéro perte de donnée) dans une carte.
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import { Race, RaceLevel, RaceSport, RACE_CFG, SPORT_LABEL, SPORT_COLOR, SPORT_BG } from './types'
import SportFields from './SportFields'
import TriSegments from './TriSegments'
import RaceDropZone from './RaceDropZone'
import ParcoursViewer from '@/components/gpx/ParcoursViewer'
import { SegmentCard } from './RaceSegmentCard'
import { RACE_EDITOR_CSS } from './raceTheme'
import { useI18n } from '@/lib/i18n'

interface Props {
  race?: Race; initialDate?: string; onClose: () => void
  onSave: (r: Omit<Race, 'id'>, files: File[], filesBike?: File[], filesRun?: File[]) => Promise<void>
  onDelete?: () => void
}
const SPORTS: RaceSport[] = ['run', 'trail', 'bike', 'swim', 'hyrox', 'triathlon', 'rowing']
const LEVELS: RaceLevel[] = ['main', 'important', 'secondary', 'gty']  // GTY = donnée existante, conservée
const LBL: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }
const INP: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }
const findGpx = (list: File[]) => list.find(f => /\.(gpx|tcx|kml)$/i.test(f.name))

export default function RaceEditorSheet({ race, initialDate, onClose, onSave, onDelete }: Props) {
  const { t } = useI18n()
  const isEdit = !!race
  // Portail sur <body> : la sheet doit passer AU-DESSUS de la barre d'onglets.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [sport, setSport] = useState<RaceSport>(race?.sport ?? 'run')
  const [level, setLevel] = useState<RaceLevel>(race?.level ?? 'important')
  const [name, setName] = useState(race?.name ?? '')
  const [date, setDate] = useState(race?.date ?? initialDate ?? new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState(race?.notes ?? '')
  const [pd, setPd] = useState<Record<string, unknown>>(race?.performanceData ?? {})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
          runDistance: sport === 'run' ? (pd.runDist as string) : undefined,
          triDistance: sport === 'triathlon' ? (pd.triFormat as string) : undefined },
          // Format Hyrox / type vélo / type aviron : conservés dans performanceData (pd).
        files, filesBike, filesRun,
      )
      onClose()
    } catch (e) { console.error('[RaceEditor save]', e) } finally { setSaving(false) }
  }

  if (!mounted) return null

  return createPortal(
    <>
      <style>{RACE_EDITOR_CSS}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'raceScrimIn .2s ease' }} />
      <div className="race-ed" onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, top: 'max(64px, calc(env(safe-area-inset-top, 0px) + 48px))', zIndex: 1201,
        background: 'var(--bg-card2)', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 50px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'raceSheetUp .34s cubic-bezier(.2,.8,.2,1) forwards',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)', margin: '10px auto 0', flexShrink: 0 }} />
        {/* Header sticky */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 14px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 className="ed-fr" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{isEdit ? t('calendar.editRace') : t('calendar.addRace')}</h3>
          <button onClick={onClose} aria-label={t('calendar.close')} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} /></button>
        </div>

        {/* Corps scrollable — contenu centré (largeur de lecture max) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Sport */}
            <div>
              <p style={LBL}>{t('calendar.sport')}</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {SPORTS.map(s => (
                  <button key={s} onClick={() => { setSport(s); setPd({}) }} style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${sport === s ? SPORT_COLOR[s] : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: sport === s ? SPORT_BG[s] : 'var(--bg-card)', color: sport === s ? SPORT_COLOR[s] : 'var(--text-dim)' }}>{SPORT_LABEL[s]}</button>
                ))}
              </div>
            </div>
            {/* Objectif (niveau) — GTY conservé */}
            <div>
              <p style={LBL}>{t('calendar.goal')}</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {LEVELS.map(l => { const c = RACE_CFG[l]; return (
                  <button key={l} onClick={() => setLevel(l)} style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${level === l ? c.border : 'var(--border)'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: level === l ? c.bg : 'var(--bg-card)', color: level === l ? c.color : 'var(--text-dim)' }}>{c.label}</button>
                ) })}
              </div>
            </div>
            {/* Nom + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div><p style={LBL}>{t('calendar.name')}</p><input style={INP} value={name} onChange={e => setName(e.target.value)} placeholder={t('calendar.raceNamePlaceholder')} /></div>
              <div><p style={LBL}>{t('calendar.date')}</p><input type="date" style={INP} value={date} onChange={e => setDate(e.target.value)} /></div>
            </div>
            {/* Segments adaptatifs — pour le triathlon, le dépôt du parcours
                vélo est sous la section Vélo, et le parcours course sous la
                section Course (et non en bas de la page). */}
            {sport === 'triathlon'
              ? <TriSegments pd={pd} setPd={setPd}
                  bikeParcours={(
                    <div style={{ marginTop: 4 }}>
                      <RaceDropZone label={t('calendar.bikeRoute')} list={filesBike} setter={setFilesBike} />
                      {findGpx(filesBike) && <div style={{ marginTop: 10 }}><ParcoursViewer file={findGpx(filesBike)} /></div>}
                    </div>
                  )}
                  runParcours={(
                    <div style={{ marginTop: 4 }}>
                      <RaceDropZone label={t('calendar.runRoute')} list={filesRun} setter={setFilesRun} />
                      {findGpx(filesRun) && <div style={{ marginTop: 10 }}><ParcoursViewer file={findGpx(filesRun)} /></div>}
                    </div>
                  )}
                />
              : <SegmentCard color={SPORT_COLOR[sport]} label={SPORT_LABEL[sport]}><SportFields sport={sport} pd={pd} setPd={setPd} /></SegmentCard>}
            {/* Parcours (sports hors triathlon) */}
            {sport !== 'triathlon' && (
              <div>
                <p style={LBL}>{t('calendar.route')}</p>
                <RaceDropZone list={files} setter={setFiles} />
                {findGpx(files) && <div style={{ marginTop: 10 }}><ParcoursViewer file={findGpx(files)} /></div>}
              </div>
            )}
            {/* Notes */}
            <div><p style={LBL}>{t('calendar.notes')}</p>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('calendar.raceNotesPlaceholder')} style={{ ...INP, resize: 'vertical' }} /></div>
          </div>
        </div>

        {/* Footer sticky */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 24px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 900, alignItems: 'center' }}>
            {isEdit && onDelete && (confirmDelete ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#ef4444' }}>{t('calendar.deleteRaceConfirm')}</span>
                <button onClick={onDelete} style={{ padding: '10px 16px', borderRadius: 999, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('calendar.confirm')}</button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: '10px 14px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer' }}>{t('calendar.cancel')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ padding: 12, borderRadius: 999, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>{t('calendar.delete')}</button>
            ))}
            {!confirmDelete && (<>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('calendar.close')}</button>
              <button onClick={handleSave} disabled={saving || !name.trim()} style={{ flex: 2, padding: 12, borderRadius: 999, background: SPORT_COLOR[sport], border: 'none', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: saving ? 'wait' : 'pointer', opacity: !name.trim() ? 0.5 : 1 }}>{saving ? '…' : isEdit ? t('calendar.save') : t('calendar.add')}</button>
            </>)}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
