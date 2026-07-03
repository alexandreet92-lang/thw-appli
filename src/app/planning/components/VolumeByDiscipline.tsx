'use client'
// Volume par discipline — 2 barres par sport (VOL. réalisé/cible + TSS réalisé/cible).
// Données réelles : séances de la semaine (status 'done' = réalisé, tss = source existante).
// Couleur sport via tokens --sport-*. Chiffres neutres.
import { formatDuration } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface S { sport: string; durationMin: number; tss?: number; status: string }

const TOK: Record<string, string> = {
  bike: '--sport-bike', velo: '--sport-bike', cyclisme: '--sport-bike',
  run: '--sport-run', running: '--sport-run', course: '--sport-run', trail: '--sport-run',
  swim: '--sport-swim', natation: '--sport-swim',
  gym: '--sport-gym', muscu: '--sport-gym', renfo: '--sport-gym',
  hyrox: '--sport-hyrox', rowing: '--sport-rowing', aviron: '--sport-rowing',
}
function col(s: string): string { return `var(${TOK[s.toLowerCase()] ?? '--text-mid'})` }

const lbl: React.CSSProperties = { width: 36, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', flexShrink: 0 }
const val: React.CSSProperties = { width: 110, fontSize: 12, color: 'var(--text-mid)', textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }
const strong: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 }
const track: React.CSSProperties = { flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }

export function VolumeByDiscipline({ sessions }: { sessions: S[] }) {
  const { t } = useI18n()
  const map = new Map<string, { volT: number; volD: number; tssT: number; tssD: number }>()
  for (const s of sessions) {
    const sp = s.sport; if (!sp) continue
    const e = map.get(sp) ?? { volT: 0, volD: 0, tssT: 0, tssD: 0 }
    const dur = s.durationMin ?? 0
    const tss = typeof s.tss === 'number' ? s.tss : 0
    e.volT += dur; e.tssT += tss
    if (s.status === 'done') { e.volD += dur; e.tssD += tss }
    map.set(sp, e)
  }
  const rows = Array.from(map.entries()).map(([sport, v]) => ({ sport, ...v })).sort((a, b) => b.volT - a.volT)
  if (rows.length === 0) return null

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 14px' }}>{t('planning.volumeByDiscipline')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(e => {
          const c = col(e.sport)
          const volPct = e.volT > 0 ? Math.min(e.volD / e.volT, 1) * 100 : 0
          const tssPct = e.tssT > 0 ? Math.min(e.tssD / e.tssT, 1) * 100 : 0
          return (
            <div key={e.sport}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{e.sport}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={lbl}>{t('planning.volShortCaps')}</span>
                <div style={track}><div style={{ width: `${volPct}%`, height: '100%', borderRadius: 3, background: c, animation: 'barFill 0.9s cubic-bezier(0.25,1,0.5,1) both' }} /></div>
                <span style={val}><strong style={strong}>{formatDuration(e.volD)}</strong> / {formatDuration(e.volT)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={lbl}>TSS</span>
                <div style={track}><div style={{ width: `${tssPct}%`, height: '100%', borderRadius: 3, background: c, opacity: 0.55, animation: 'barFill 0.9s cubic-bezier(0.25,1,0.5,1) both' }} /></div>
                <span style={val}><strong style={strong}>{Math.round(e.tssD)}</strong> / {e.tssT > 0 ? Math.round(e.tssT) : '--'} {t('planning.pts')}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
