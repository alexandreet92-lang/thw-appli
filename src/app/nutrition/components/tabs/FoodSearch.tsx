'use client'
import { useState, useRef } from 'react'
import type { CSSProperties } from 'react'

export interface FoodItem {
  id:        string
  name:      string
  brand?:    string
  kcal_100g: number
  prot_100g: number
  gluc_100g: number
  lip_100g:  number
  image_url?: string
}

export interface AddedIngredient {
  food: FoodItem
  qty:  number
}

export function calcMacros(food: FoodItem, qty: number) {
  const r = qty / 100
  return {
    kcal: Math.round(food.kcal_100g * r),
    prot: Math.round(food.prot_100g * r),
    gluc: Math.round(food.gluc_100g * r),
    lip:  Math.round(food.lip_100g  * r),
  }
}

function FoodThumb({ url }: { url?: string }) {
  if (!url) return <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg-card2)', flexShrink: 0 }} />
  return <img src={url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
}

interface Props {
  onAdd:     (ingredient: AddedIngredient) => void
  onBarcode: () => void
}

export default function FoodSearch({ onAdd, onBarcode }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<FoodItem[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [qty,      setQty]      = useState(100)
  const [open,     setOpen]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleInput(val: string) {
    setQuery(val); setOpen(false); setSelected(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) { setResults([]); return }
    timerRef.current = setTimeout(() => void doSearch(val), 400)
  }

  async function doSearch(q: string) {
    setLoading(true)
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=8&fields=product_name,brands,nutriments,image_small_url,code`
      const res  = await fetch(url)
      const data = await res.json() as { products?: Array<Record<string, unknown>> }
      setResults(
        (data.products ?? [])
          .map((p): FoodItem | null => {
            if (!p.product_name) return null
            const n = p.nutriments as Record<string, number> | undefined
            return {
              id:        String(p.code ?? Math.random()),
              name:      String(p.product_name),
              brand:     p.brands ? String(p.brands).split(',')[0].trim() : undefined,
              kcal_100g: Math.round(Number(n?.['energy-kcal_100g'] ?? n?.['energy_100g'] ?? 0)),
              prot_100g: Math.round(Number(n?.proteins_100g       ?? 0)),
              gluc_100g: Math.round(Number(n?.carbohydrates_100g  ?? 0)),
              lip_100g:  Math.round(Number(n?.fat_100g            ?? 0)),
              image_url: p.image_small_url ? String(p.image_small_url) : undefined,
            }
          })
          .filter((x): x is FoodItem => x !== null)
      )
      setOpen(true)
    } catch { setResults([]) } finally { setLoading(false) }
  }

  function pick(food: FoodItem) { setSelected(food); setQty(100); setOpen(false) }

  function add() {
    if (!selected) return
    onAdd({ food: selected, qty })
    setSelected(null); setQuery(''); setResults([]); setQty(100)
  }

  const macros = selected ? calcMacros(selected, qty) : null
  const btnBase: CSSProperties = { width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 18, lineHeight: '1' }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={e => handleInput(e.target.value)} placeholder="Rechercher un aliment..."
          style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }} />
        <button onClick={onBarcode} title="Scanner un code-barres"
          style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2"  y="3" width="2" height="12" fill="var(--text-dim)" /><rect x="5"  y="3" width="1" height="12" fill="var(--text-dim)" />
            <rect x="7"  y="3" width="2" height="12" fill="var(--text-dim)" /><rect x="10" y="3" width="1" height="12" fill="var(--text-dim)" />
            <rect x="12" y="3" width="1" height="12" fill="var(--text-dim)" /><rect x="14" y="3" width="2" height="12" fill="var(--text-dim)" />
          </svg>
        </button>
      </div>
      {loading && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, paddingLeft: 4 }}>Recherche...</div>}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
          {results.map(food => (
            <button key={food.id} onClick={() => pick(food)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
              <FoodThumb url={food.image_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.name}</div>
                {food.brand && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{food.brand}</div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>{food.kcal_100g} kcal/100g</div>
            </button>
          ))}
        </div>
      )}
      {selected && macros && (
        <div style={{ marginTop: 8, background: 'var(--bg-card2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{selected.name}</div>
              {selected.brand && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{selected.brand}</div>}
            </div>
            <button onClick={() => { setSelected(null); setQuery('') }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <button onClick={() => setQty(q => Math.max(10, q - 10))} style={btnBase}>-</button>
            <div style={{ flex: 1, textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{qty} g</div>
            <button onClick={() => setQty(q => q + 10)} style={btnBase}>+</button>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
            <span style={{ color: '#00c8e0', fontWeight: 700 }}>{macros.kcal} kcal</span>
            <span>P {macros.prot}g</span><span>G {macros.gluc}g</span><span>L {macros.lip}g</span>
          </div>
          <button onClick={add}
            style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#06B6D4,#3B82F6)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>
            Ajouter
          </button>
        </div>
      )}
    </div>
  )
}
