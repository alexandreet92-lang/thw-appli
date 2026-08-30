'use client'
// ══════════════════════════════════════════════════════════════════
// DÉMO « séance live » du GUIDE — une VRAIE animation d'un écran
// d'enregistrement : le chrono tourne, les métriques bougent, les blocs de la
// séance défilent (échauffement → seuil → récup → seuil…), une pastille REC
// pulse. Isolé du vrai SessionRunner (aucun GPS/capteur) pour ne rien casser :
// c'est purement illustratif, joué pendant le tour « Démarrer ».
// Le halo du guide pointe le chrono ; la carte explique ce qui se passe.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

// Séance course fractionnée compressée (les durées sont courtes pour que TOUT
// le déroulé se voie en quelques secondes pendant le guide, puis boucle).
interface Phase { key: string; label: string; sec: number; zone: number; pace: string; accent: string }
const PHASES: Phase[] = [
  { key: 'wu',  label: 'Échauffement',   sec: 9,  zone: 2, pace: '5:40', accent: '#22c55e' },
  { key: 's1',  label: 'Seuil · 1/3',    sec: 10, zone: 4, pace: '4:05', accent: '#f97316' },
  { key: 'r1',  label: 'Récup',          sec: 6,  zone: 1, pace: '6:10', accent: '#38bdf8' },
  { key: 's2',  label: 'Seuil · 2/3',    sec: 10, zone: 4, pace: '4:02', accent: '#f97316' },
  { key: 'r2',  label: 'Récup',          sec: 6,  zone: 1, pace: '6:12', accent: '#38bdf8' },
  { key: 's3',  label: 'Seuil · 3/3',    sec: 10, zone: 5, pace: '3:58', accent: '#ef4444' },
  { key: 'cd',  label: 'Retour au calme', sec: 8,  zone: 1, pace: '6:30', accent: '#38bdf8' },
]
const TOTAL = PHASES.reduce((s, p) => s + p.sec, 0)
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function GuideLiveDemo({ dataGuide }: { dataGuide?: string }) {
  const { t } = useI18n()
  // Libellé de phase traduit (le fractionné 1/3… reste langue-neutre).
  const phaseLabel = (key: string): string => {
    switch (key) {
      case 'wu': return t('gld.warmup')
      case 'r1': case 'r2': return t('gld.recovery')
      case 'cd': return t('gld.cooldown')
      case 's1': return `${t('gld.threshold')} · 1/3`
      case 's2': return `${t('gld.threshold')} · 2/3`
      case 's3': return `${t('gld.threshold')} · 3/3`
      default: return ''
    }
  }
  const [elapsed, setElapsed] = useState(0)
  const start = useRef<number>(Date.now())
  useEffect(() => {
    start.current = Date.now()
    let raf = 0
    const tick = () => { setElapsed((Date.now() - start.current) / 1000); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const loop = elapsed % TOTAL
  // Phase courante + progression dans la phase.
  let acc = 0, curIdx = 0, into = 0
  for (let i = 0; i < PHASES.length; i++) { if (loop < acc + PHASES[i].sec) { curIdx = i; into = loop - acc; break } acc += PHASES[i].sec }
  const cur = PHASES[curIdx]
  const next = PHASES[(curIdx + 1) % PHASES.length]

  // Métriques « vivantes ».
  const chrono = mmss(loop)
  const jitter = Math.sin(elapsed * 3.1) * 0.03
  const paceParts = cur.pace.split(':')
  const paceSec = (parseInt(paceParts[0]) * 60 + parseInt(paceParts[1])) * (1 + jitter)
  const pace = mmss(paceSec)
  const speedKmh = 3600 / paceSec
  const distKm = ((loop * speedKmh) / 3600).toFixed(2)
  const hr = Math.round(118 + cur.zone * 14 + Math.sin(elapsed * 2) * 2 + into * 0.6)

  const tile: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }
  const tileLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }
  const tileVal: React.CSSProperties = { fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '3px 0 0', fontVariantNumeric: 'tabular-nums' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40000, background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'var(--font-body, DM Sans, sans-serif)' }}>
      <style>{`@keyframes gld_rec{0%,100%{opacity:1}50%{opacity:0.35}}@keyframes gld_bar{from{opacity:.4}to{opacity:1}}`}</style>

      {/* Bandeau haut : REC + sport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '18px 18px 8px', flexShrink: 0 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', animation: 'gld_rec 1s ease-in-out infinite' }} />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: '#ef4444' }}>REC</span>
        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{t('gld.session_type')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>{t('gld.demo')}</span>
      </div>

      {/* Chrono géant — cible du halo du guide */}
      <div data-guide={dataGuide} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{t('gld.time')}</p>
        <p style={{ margin: '2px 0 0', fontFamily: 'DM Mono, monospace', fontSize: 62, fontWeight: 700, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{chrono}</p>
      </div>

      {/* Métriques live */}
      <div style={{ display: 'flex', gap: 9, padding: '10px 16px', flexShrink: 0 }}>
        <div style={tile}><p style={tileLabel}>{t('gld.distance')}</p><p style={tileVal}>{distKm}<span style={{ fontSize: 12, color: 'var(--text-dim)' }}> km</span></p></div>
        <div style={tile}><p style={tileLabel}>{t('gld.pace')}</p><p style={tileVal}>{pace}<span style={{ fontSize: 12, color: 'var(--text-dim)' }}> /km</span></p></div>
        <div style={tile}><p style={tileLabel}>{t('gld.hr')}</p><p style={{ ...tileVal, color: cur.accent }}>{hr}<span style={{ fontSize: 12, color: 'var(--text-dim)' }}> bpm</span></p></div>
      </div>

      {/* Profil de séance — les blocs, avec le bloc courant surligné */}
      <div style={{ padding: '8px 16px 4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 54 }}>
          {PHASES.map((p, i) => (
            <div key={p.key} style={{ flex: p.sec, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{
                height: `${28 + p.zone * 13}%`, borderRadius: 5,
                background: i === curIdx ? p.accent : `color-mix(in srgb, ${p.accent} 32%, transparent)`,
                border: i === curIdx ? `1px solid ${p.accent}` : '1px solid transparent',
                transition: 'background .3s, height .3s',
              }} />
            </div>
          ))}
        </div>
        {/* Barre de progression globale */}
        <div style={{ marginTop: 8, height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(loop / TOTAL) * 100}%`, background: 'linear-gradient(90deg,#06B6D4,#3B82F6)', borderRadius: 999 }} />
        </div>
      </div>

      {/* Bloc en cours + prochain */}
      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 16, background: `color-mix(in srgb, ${cur.accent} 12%, transparent)`, border: `1px solid ${cur.accent}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: cur.accent, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 13 }}>Z{cur.zone}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: cur.accent }}>{t('gld.current')}</p>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{phaseLabel(cur.key)}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{mmss(cur.sec - into)}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-dim)' }}>{t('gld.remaining')} · {cur.pace}/km</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 15px', borderRadius: 14, background: 'var(--bg-card)', border: '1px dashed var(--border)', opacity: 0.85 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{t('gld.next')}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-mid)' }}>{phaseLabel(next.key)}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--text-dim)' }}>{mmss(next.sec)}</span>
        </div>
      </div>

      {/* Barre d'action live (Pause / Terminer) — illustratif */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 10, padding: '12px 16px calc(16px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
        <button disabled style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-mid)', fontSize: 14, fontWeight: 700, cursor: 'default' }}>{t('gld.pause')}</button>
        <button disabled style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'default' }}>{t('gld.finish')}</button>
      </div>
    </div>
  )
}
