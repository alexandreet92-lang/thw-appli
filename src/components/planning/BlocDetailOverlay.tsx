'use client'
// Surpage Training Bloc (maquette). Desktop : overlay centré zoom (scale .92→1).
// Mobile (<768px) : slide haut→bas (translateY -100%→0). Le picker de focus reste centré.
// createPortal sur document.body. Persistance localStorage via trainingBlocks. Aucun numéro
// de semaine ISO en UI. Couleurs surface/texte = tokens de thème ; cyan = couleur assumée.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BLOC_SPORT_KEYS, SPORT_LABELS, SPORT_COLORS } from '@/lib/constants/blocTypes'
import { loadBlocs, upsertBloc, deleteBloc, newBloc } from '@/app/planning/trainingBlocks'
import type { TrainingBlocData } from '@/types/trainingBloc'
import { weekStartOptions, formatWeekStart, formatWeekEnd, currentWeekInBloc, blocPhase, getWeekStart, type WeekOption } from '@/lib/utils/weekDates'
import { useWindowWidth } from '@/hooks/useWindowWidth'
import { FocusPicker } from './FocusPicker'
import { BlocStartWeekPicker } from './BlocStartWeekPicker'

const CY = '#22d3ee', ON = '#04141a' // cyan/on-cyan = couleurs fonctionnelles assumées
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-dim)', marginBottom: 8 }
const card: React.CSSProperties = { background: 'var(--bg-card2)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }
const stepBtn: React.CSSProperties = { width: 26, height: 24, border: 'none', background: 'transparent', fontSize: 14, cursor: 'pointer', color: 'var(--text-mid)' }
const stepBox: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', background: 'var(--bg-card2)', borderRadius: 999 }

export function BlocDetailOverlay({ open, blocId, onClose, onChanged }: {
  open: boolean; blocId: string | null; onClose: () => void; onChanged: () => void
}) {
  const isMobile = useWindowWidth() < 768
  const [shown, setShown] = useState(false)
  const [blocs, setBlocs] = useState<TrainingBlocData[]>(() => loadBlocs())
  const [sport, setSport] = useState<string>('velo')
  const [activeId, setActiveId] = useState<string | null>(blocId)
  const [focusOpen, setFocusOpen] = useState(false)
  const [sessIdx, setSessIdx] = useState<number | null>(null)
  const options = useMemo<WeekOption[]>(() => weekStartOptions(), [])

  useEffect(() => { const t = setTimeout(() => setShown(open), 10); return () => clearTimeout(t) }, [open])
  useEffect(() => {
    if (!open) return
    const list = loadBlocs(); setBlocs(list); setActiveId(blocId)
    const b = list.find(x => x.id === blocId); if (b) setSport(b.sport)
  }, [open, blocId])
  if (!open) return null

  const sportBlocs = blocs.filter(b => b.sport === sport)
  const startTs = (b: TrainingBlocData) => getWeekStart(b.startYear, b.startWeek).getTime()
  const phaseOf = (b: TrainingBlocData) => blocPhase(b.startYear, b.startWeek, b.durationWeeks)
  const pastAll = sportBlocs.filter(b => phaseOf(b) === 'past').sort((a, b) => startTs(b) - startTs(a))
  // Onglets blocs : max 10 passés (récents d'abord) + en cours + à venir.
  const forSport = [
    ...pastAll.slice(0, 10),
    ...sportBlocs.filter(b => phaseOf(b) === 'current').sort((a, b) => startTs(a) - startTs(b)),
    ...sportBlocs.filter(b => phaseOf(b) === 'future').sort((a, b) => startTs(a) - startTs(b)),
  ]
  const bloc = blocs.find(b => b.id === activeId) ?? null
  const sync = (list: TrainingBlocData[]) => { setBlocs(list); onChanged() }
  const patch = (p: Partial<TrainingBlocData>) => { if (bloc) sync(upsertBloc({ ...bloc, ...p })) }
  function pickSport(s: string) { setSport(s); const first = blocs.find(b => b.sport === s); setActiveId(first?.id ?? null) }
  function create() { const b = newBloc(sport); sync(upsertBloc(b)); setActiveId(b.id) }
  function remove() { if (!bloc) return; const list = deleteBloc(bloc.id); sync(list); setActiveId(list.find(b => b.sport === sport)?.id ?? null) }

  const cwb = bloc ? currentWeekInBloc(bloc.startWeek, bloc.durationWeeks) : 1
  const panel: React.CSSProperties = isMobile
    ? { position: 'fixed', top: 0, left: 0, right: 0, height: '92dvh', borderRadius: '0 0 20px 20px', background: 'var(--bg-card)', overflowY: 'auto', padding: '52px 20px 32px', transform: shown ? 'translateY(0)' : 'translateY(-100%)', transition: 'transform .35s cubic-bezier(.2,.8,.2,1)', border: '1px solid var(--border)' }
    : { background: 'var(--bg-card)', borderRadius: 20, width: 'min(640px,94vw)', maxHeight: '88vh', overflowY: 'auto', padding: '26px 28px', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,.6)', transform: shown ? 'scale(1)' : 'scale(0.92)', transition: 'transform .3s cubic-bezier(.2,.8,.2,1)' }

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', zIndex: 200, opacity: shown ? 1 : 0, transition: 'opacity .25s', padding: isMobile ? 0 : 16 }}>
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, color: 'var(--text)' }}>Training Bloc</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-mid)' }}>✕</button>
        </div>

        {/* Onglets sport */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
          {BLOC_SPORT_KEYS.map(s => (
            <button key={s} onClick={() => pickSport(s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid', borderColor: sport === s ? 'var(--border-mid)' : 'var(--border)', background: sport === s ? 'var(--bg-card2)' : 'transparent', color: sport === s ? 'var(--text)' : 'var(--text-dim)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: SPORT_COLORS[s] }} />{SPORT_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Blocs du sport */}
        <div style={lbl}>Blocs</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {forSport.map(b => (
            <button key={b.id} onClick={() => setActiveId(b.id)} style={{ padding: '5px 11px', fontSize: 11.5, fontWeight: 600, borderRadius: 8, border: '1px solid', borderColor: activeId === b.id ? 'rgba(34,211,238,.25)' : 'var(--border)', background: activeId === b.id ? 'rgba(34,211,238,.12)' : 'transparent', color: activeId === b.id ? CY : 'var(--text-dim)', cursor: 'pointer' }}>{b.name}</button>
          ))}
          <button onClick={create} style={{ padding: '5px 11px', fontSize: 11.5, fontWeight: 600, borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>+ Nouveau</button>
          {pastAll.length > 10 && <span style={{ fontSize: 10.5, color: 'var(--text-dim)', padding: '5px 8px' }}>+{pastAll.length - 10} blocs archivés</span>}
          {bloc && <button onClick={remove} style={{ padding: '5px 9px', fontSize: 11, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,.1)', color: '#ef4444', cursor: 'pointer', marginLeft: 'auto' }}>Supprimer</button>}
        </div>

        {!bloc ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '8px 0 4px' }}>Aucun bloc pour ce sport — clique sur <strong style={{ color: CY }}>+ Nouveau</strong>.</p>
        ) : (<>
          <div style={lbl}>Nom du bloc</div>
          <input value={bloc.name} onChange={e => patch({ name: e.target.value })} placeholder="Nom du bloc…"
            style={{ width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 13px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <div style={card}>
              <div style={lbl}>Début du bloc</div>
              <BlocStartWeekPicker options={options} startKey={`${bloc.startYear}-${bloc.startWeek}`} durationWeeks={bloc.durationWeeks} onSelect={(o: WeekOption) => patch({ startYear: o.year, startWeek: o.week })} />
            </div>
            <div style={card}>
              <div style={lbl}>Durée</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{bloc.durationWeeks} semaines</span>
                <div style={stepBox}>
                  <button onClick={() => patch({ durationWeeks: Math.max(1, bloc.durationWeeks - 1) })} style={stepBtn}>−</button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{bloc.durationWeeks}</span>
                  <button onClick={() => patch({ durationWeeks: bloc.durationWeeks + 1 })} style={stepBtn}>+</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: bloc.durationWeeks }).map((_, i) => (
                  <span key={i} style={{ width: 20, height: 6, borderRadius: 6, background: i < cwb ? CY : 'var(--border-mid)' }} />
                ))}
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>sem. <strong style={{ color: 'var(--text)' }}>{cwb}</strong>/{bloc.durationWeeks}</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatWeekStart(bloc.startYear, bloc.startWeek)}</span>
                {' → '}
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatWeekEnd(bloc.startYear, bloc.startWeek + bloc.durationWeeks - 1)}</span>
              </div>
            </div>
          </div>

          <div style={lbl}>Focus du bloc</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {bloc.focus.map(q => (
              <span key={q} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 12px', background: 'rgba(34,211,238,.12)', color: CY }}>
                {q}<span onClick={() => patch({ focus: bloc.focus.filter(x => x !== q) })} style={{ opacity: .6, cursor: 'pointer', fontSize: 10 }}>✕</span>
              </span>
            ))}
            <span onClick={() => setFocusOpen(true)} style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '6px 12px', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer' }}>+ type</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={lbl}>Entraînements prévus</span>
            <div style={stepBox}>
              <button onClick={() => patch({ sessions: bloc.sessions.slice(0, Math.max(1, bloc.sessions.length - 1)) })} style={stepBtn}>−</button>
              <span style={{ minWidth: 24, textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{bloc.sessions.length}</span>
              <button onClick={() => patch({ sessions: [...bloc.sessions, { type: null }] })} style={stepBtn}>+</button>
            </div>
          </div>
          {bloc.sessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0 }}>{i + 1}</span>
              <div onClick={() => setSessIdx(i)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card2)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: s.type ? 'var(--text)' : 'var(--text-dim)' }}>{s.type ?? 'Choisir un type'}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>▾</span>
              </div>
            </div>
          ))}

          <button onClick={onClose} style={{ marginTop: 18, width: '100%', background: CY, color: ON, border: 'none', borderRadius: 12, padding: 13, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Enregistrer</button>
        </>)}
      </div>

      {bloc && <FocusPicker open={focusOpen} sport={sport} mode="multi" selected={bloc.focus}
        onToggle={t => patch({ focus: bloc.focus.includes(t) ? bloc.focus.filter(x => x !== t) : [...bloc.focus, t] })}
        onClose={() => setFocusOpen(false)} />}
      {bloc && sessIdx !== null && <FocusPicker open sport={sport} mode="single" selected={bloc.sessions[sessIdx]?.type ? [bloc.sessions[sessIdx].type as string] : []}
        onPick={t => patch({ sessions: bloc.sessions.map((x, j) => j === sessIdx ? { type: t } : x) })}
        onClose={() => setSessIdx(null)} />}
    </div>,
    document.body
  )
}
