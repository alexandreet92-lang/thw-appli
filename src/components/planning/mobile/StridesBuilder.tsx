'use client'
// ══════════════════════════════════════════════════════════════════
// Builder INTERVALS STRIDES (agilité / changement de direction, cônes).
// • Galerie de 27 ateliers (diagrammes de cônes) + « Mes ateliers »
//   (réutilisables) + « Atelier libre ».
// • Chaque atelier ajouté est réglable (reps, effort, récup, repos, note).
// • On peut sauvegarder un atelier comme réutilisable (table custom_ateliers).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import type { Block } from '@/app/planning/page'
import type { MBlock } from './blocks'
import { Card, FieldLabel } from './ui'
import { ATELIER_PRESETS, type AtelierPreset } from './atelierPresets'
import {
  newAtelierFromPreset, newFreeAtelier, newAtelierFromCustom, syncStrideBlock, atelierMin,
  isStrideBlock, type StrideBlock, type AtelierExt,
} from './strideBlocks'
import { listCustomAteliers, saveCustomAtelier, deleteCustomAtelier, type CustomAtelier } from '@/lib/planning/customAteliers'

function Diagram({ svg, accent, size = 96 }: { svg: string; accent: string; size?: number }) {
  return (
    <div style={{ color: accent, lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 120 60" width="${size}" height="${size * 0.5}">${svg}</svg>` }} />
  )
}
function Num({ value, onChange, unit, w = 66, min = 0, step = 1 }: { value: number; onChange: (n: number) => void; unit?: string; w?: number; min?: number; step?: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: w }}>
      <input type="number" value={Number.isFinite(value) ? value : ''} min={min} step={step}
        onChange={e => onChange(Math.max(min, Number(e.target.value) || 0))} inputMode="numeric"
        className="se-tnum" style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: unit ? '8px 22px 8px 8px' : '8px', borderRadius: 9, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 14, fontWeight: 600, outline: 'none' }} />
      {unit && <span style={{ position: 'absolute', right: 7, fontSize: 9.5, color: 'var(--se-dim)', pointerEvents: 'none' }}>{unit}</span>}
    </div>
  )
}

// Profil d'intensité : une barre par répétition, hauteur = zone.
function IntensityProfile({ blocks, accent }: { blocks: StrideBlock[]; accent: string }) {
  const bars = blocks.flatMap(b => Array.from({ length: Math.max(1, b.at.reps) }, () => Math.max(1, Math.min(5, b.at.zone))))
  if (!bars.length) return null
  const H: Record<number, number> = { 1: 20, 2: 38, 3: 58, 4: 80, 5: 100 }
  const gap = 1.5, bw = (100 - gap * (bars.length - 1)) / bars.length
  return (
    <div style={{ height: 72, display: 'flex', alignItems: 'flex-end', gap: `${gap}%`, padding: '0 2px' }}>
      {bars.map((z, i) => <div key={i} style={{ width: `${bw}%`, height: `${H[z]}%`, borderRadius: '3px 3px 0 0', background: accent, opacity: 0.3 + z * 0.13 }} />)}
    </div>
  )
}

export function StridesBuilder({ blocks, onChange, accent }: { blocks: MBlock[]; onChange: (b: Block[]) => void; accent: string }) {
  const sBlocks = useMemo(() => (blocks as MBlock[]).filter(isStrideBlock) as StrideBlock[], [blocks])
  const [gallery, setGallery] = useState(false)
  const [custom, setCustom] = useState<CustomAtelier[]>([])
  const [savedFlash, setSavedFlash] = useState<string | null>(null)

  useEffect(() => { void listCustomAteliers().then(setCustom) }, [])

  const setAt = (id: string, at: AtelierExt) => onChange(sBlocks.map(b => b.id === id ? syncStrideBlock({ ...b, at }) : b) as Block[])
  const add = (b: StrideBlock) => { onChange([...sBlocks, b] as Block[]); setGallery(false) }
  const remove = (id: string) => onChange(sBlocks.filter(b => b.id !== id) as Block[])
  const move = (id: string, dir: -1 | 1) => {
    const i = sBlocks.findIndex(b => b.id === id); const j = i + dir
    if (i < 0 || j < 0 || j >= sBlocks.length) return
    const nb = [...sBlocks];[nb[i], nb[j]] = [nb[j], nb[i]]; onChange(nb as Block[])
  }
  async function saveReusable(b: StrideBlock) {
    const saved = await saveCustomAtelier({ name: b.at.name, zone: b.at.zone, reps: b.at.reps, recovery_sec: b.at.recoverySec, rest_between_sec: b.at.restBetweenSec, note: b.at.note || null, svg: b.at.svg ?? null })
    if (saved) { setCustom(c => [saved, ...c]); setSavedFlash(b.id); setTimeout(() => setSavedFlash(null), 1800) }
  }
  async function delCustom(id: string) { await deleteCustomAtelier(id); setCustom(c => c.filter(x => x.id !== id)) }

  const totalMin = sBlocks.reduce((s, b) => s + atelierMin(b.at), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sBlocks.length > 0 && (
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>Profil d'intensité</span>
            <span className="se-tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--se-text)' }}>≈ {totalMin} min · {sBlocks.length} atelier{sBlocks.length > 1 ? 's' : ''}</span>
          </div>
          <IntensityProfile blocks={sBlocks} accent={accent} />
        </Card>
      )}

      {sBlocks.map((b, i) => (
        <Card key={b.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {b.at.svg && <div style={{ flexShrink: 0, width: 64, height: 32, border: '1px solid var(--se-rule)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><Diagram svg={b.at.svg} accent={accent} size={60} /></div>}
            <input value={b.at.name} onChange={e => setAt(b.id, { ...b.at, name: e.target.value })}
              style={{ flex: 1, minWidth: 0, fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--se-text)', border: 'none', background: 'transparent', outline: 'none' }} />
            <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-dim)', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.35 : 1 }}>↑</button>
            <button type="button" onClick={() => move(b.id, 1)} disabled={i === sBlocks.length - 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-dim)', cursor: i === sBlocks.length - 1 ? 'default' : 'pointer', opacity: i === sBlocks.length - 1 ? 0.35 : 1 }}>↓</button>
            <button type="button" onClick={() => remove(b.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: '#ef4444', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
            <div><FieldLabel>Répétitions</FieldLabel><Num value={b.at.reps} onChange={n => setAt(b.id, { ...b.at, reps: n })} w={72} min={1} /></div>
            <div><FieldLabel>Effort / rép.</FieldLabel><Num value={b.at.effortSec} onChange={n => setAt(b.id, { ...b.at, effortSec: n })} unit="s" w={78} step={5} /></div>
            <div><FieldLabel>Récup entre rép.</FieldLabel><Num value={b.at.recoverySec} onChange={n => setAt(b.id, { ...b.at, recoverySec: n })} unit="s" w={78} step={5} /></div>
            <div><FieldLabel>Repos entre blocs</FieldLabel><Num value={b.at.restBetweenSec} onChange={n => setAt(b.id, { ...b.at, restBetweenSec: n })} unit="s" w={78} step={5} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <FieldLabel right={<span style={{ display: 'inline-flex', gap: 4 }}>{[1, 2, 3, 4, 5].map(z => <button key={z} type="button" onClick={() => setAt(b.id, { ...b.at, zone: z })} style={{ width: 22, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1px solid ${b.at.zone === z ? accent : 'var(--se-rule)'}`, background: b.at.zone === z ? accent : 'var(--se-card)', color: b.at.zone === z ? '#fff' : 'var(--se-dim)' }}>{z}</button>)}</span>}>Zone · note</FieldLabel>
            <input value={b.at.note} onChange={e => setAt(b.id, { ...b.at, note: e.target.value })} placeholder="Consigne (ex. sur signal du coach)"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--se-rule)', background: 'var(--se-card)', color: 'var(--se-text)', fontSize: 13, outline: 'none' }} />
          </div>
          <button type="button" onClick={() => saveReusable(b)} style={{ width: '100%', padding: '9px', borderRadius: 9, border: `1px dashed ${accent}`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {savedFlash === b.id ? 'Enregistré dans Mes ateliers' : 'Sauvegarder comme atelier réutilisable'}
          </button>
        </Card>
      ))}

      {!sBlocks.length && <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--se-dim)', textAlign: 'center' }}>Ajoute un atelier d'agilité pour construire ta séance.</p>}

      <button type="button" onClick={() => setGallery(g => !g)} style={{ padding: '13px', borderRadius: 12, border: `1px solid ${accent}`, background: gallery ? accent : 'var(--se-card)', color: gallery ? '#fff' : accent, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
        {gallery ? 'Fermer la bibliothèque' : '+ Ajouter un atelier'}
      </button>

      {gallery && (
        <Card style={{ padding: 14 }}>
          {/* Mes ateliers */}
          {custom.length > 0 && (
            <>
              <p style={{ margin: '0 0 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>Mes ateliers</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8, marginBottom: 16 }}>
                {custom.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <button type="button" onClick={() => add(newAtelierFromCustom(c))} style={tileStyle(accent)}>
                      {c.svg ? <Diagram svg={c.svg} accent={accent} size={72} /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8M12 8v8"/></svg>}
                      <span style={tileName}>{c.name}</span>
                    </button>
                    <button type="button" onClick={() => delCustom(c.id)} aria-label="Supprimer" style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'var(--se-card2)', color: 'var(--se-dim)', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Atelier libre */}
          <p style={{ margin: '0 0 8px', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>Catalogue</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
            <button type="button" onClick={() => add(newFreeAtelier())} style={{ ...tileStyle(accent), borderStyle: 'dashed' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              <span style={tileName}>Atelier libre</span>
            </button>
            {ATELIER_PRESETS.map((p: AtelierPreset) => (
              <button key={p.id} type="button" onClick={() => add(newAtelierFromPreset(p))} style={tileStyle(accent)}>
                <Diagram svg={p.svg} accent={accent} size={82} />
                <span style={tileName}>{p.name}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function tileStyle(_accent: string): React.CSSProperties {
  return { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px 8px', borderRadius: 10, border: '1px solid var(--se-rule)', background: 'var(--se-card)', cursor: 'pointer', minHeight: 78, width: '100%' }
}
const tileName: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--se-text)', textAlign: 'center', lineHeight: 1.15 }
