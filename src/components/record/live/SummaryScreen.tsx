'use client'
// Écran résumé (pré-séance) : en-tête (durée est. / tours / exos), liste
// scrollable des blocs et de leurs exercices avec cible, bouton « Commencer ».
import { IconHash, IconClock, IconArrowRight, IconChevronLeft } from '@tabler/icons-react'
import type { WorkoutExercise } from '@/types/workout'
import { buildTimeline, estimateDurationSec } from './buildTimeline'
import { useI18n } from '@/lib/i18n'

interface Props { title: string; blocks: WorkoutExercise[]; onStart: () => void; onClose: () => void }
type TFn = (key: string, vars?: Record<string, string | number>) => string
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

function metaOf(ex: WorkoutExercise, t: TFn): { time: boolean; text: string } {
  if (ex.durationSec && ex.durationSec > 0) return { time: true, text: `${ex.durationSec}s` }
  return { time: false, text: `${ex.reps} ${t('w3a.reps')}${ex.weightKg > 0 ? ` · ${ex.weightKg} kg` : ` · ${t('w3a.bodyweight_abbr')}`}` }
}

function blockView(b: WorkoutExercise, t: TFn) {
  const circuit = b.mode === 'circuit'
  return {
    title: circuit ? t('w3a.circuit') : cap(b.name),
    rounds: Math.max(1, circuit ? b.circuitRounds ?? 1 : b.sets),
    restTour: circuit ? b.circuitRestSec ?? 0 : b.restSec ?? 0,
    exos: (circuit ? b.circuitExercises ?? [] : [b]).map(e => ({ name: cap(e.name), ...metaOf(e, t) })),
  }
}

export default function SummaryScreen({ title, blocks, onStart, onClose }: Props) {
  const { t } = useI18n()
  const est = Math.round(estimateDurationSec(buildTimeline(blocks)) / 60)
  const views = blocks.map(b => blockView(b, t))
  const tours = views.reduce((a, v) => a + v.rounds, 0)
  const exos = views.reduce((a, v) => a + v.exos.length, 0)

  const stat = (n: string, l: string) => (
    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '11px 12px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{n}</div>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mid)', fontWeight: 700, marginTop: 2 }}>{l}</div>
    </div>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top) + 12px) 22px 14px', flexShrink: 0 }}>
        <button onClick={onClose} aria-label={t('w3a.back')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'grid', placeItems: 'center', marginBottom: 10 }}><IconChevronLeft size={18} /></button>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>{t('w3a.ready_to_start')}</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-0.01em' }}>{title}</h1>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {stat(`~${est} min`, t('w3a.duration_est'))}{stat(String(tours), t('w3a.tours'))}{stat(String(exos), t('w3a.exos'))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 12px' }}>
        {views.map((v, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>{v.title} · {v.rounds} {v.rounds > 1 ? t('w3a.tours_plural') : t('w3a.tour_singular')}</span>
              {v.restTour > 0 && <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700 }}>{t('w3a.recovery_short')} {v.restTour}s</span>}
            </div>
            {v.exos.map((e, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: j < v.exos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-card2)', display: 'grid', placeItems: 'center', color: 'var(--text-mid)', flexShrink: 0 }}>{e.time ? <IconClock size={15} /> : <IconHash size={15} />}</span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{e.name}</span>
                <span style={{ fontSize: 14, color: e.time ? 'var(--phase-prepare)' : 'var(--text-mid)', fontWeight: 700 }}>{e.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom) + 20px)', flexShrink: 0 }}>
        <button onClick={onStart} style={{ width: '100%', height: 54, border: 'none', borderRadius: 15, cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {t('w3a.start')} <IconArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
