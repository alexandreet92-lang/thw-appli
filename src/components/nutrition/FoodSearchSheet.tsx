'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { searchFoods, getRecentFoods, saveToRecent, type FoodItem } from '@/lib/food-search'
import { COMMON_FOODS } from '@/lib/common-foods'

interface Props {
  onSelect: (food: FoodItem, grams: number) => void
  onClose: () => void
  initialBarcode?: string
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{ fontSize: 10, color, fontFamily: 'DM Mono,monospace' }}>
      {label} {value}g
    </span>
  )
}

function FoodRow({ food, onSelect }: { food: FoodItem; onSelect: (food: FoodItem) => void }) {
  const n = food.nutriments
  return (
    <button
      onClick={() => onSelect(food)}
      style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', gap: 10 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card2)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {food.product_name}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: '#06B6D4', fontFamily: 'DM Mono,monospace' }}>{n['energy-kcal_100g']} kcal</span>
          <MacroPill label="P" value={n.proteins_100g} color="#22c55e" />
          <MacroPill label="G" value={n.carbohydrates_100g} color="#eab308" />
          <MacroPill label="L" value={n.fat_100g} color="#f97316" />
        </div>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[72, 56, 64].map((w, i) => (
        <div key={i}>
          <div style={{ height: 13, borderRadius: 6, background: 'var(--border)', width: `${w}%`, animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ height: 10, borderRadius: 4, background: 'var(--border)', width: '45%', marginTop: 5, animation: 'pulse 1.4s ease-in-out infinite', opacity: 0.6 }} />
        </div>
      ))}
    </div>
  )
}

export function FoodSearchSheet({ onSelect, onClose, initialBarcode }: Props) {
  const [query, setQuery] = useState(initialBarcode ?? '')
  const [loading, setLoading] = useState(!!initialBarcode)
  const [localResults, setLocalResults] = useState<FoodItem[]>([])
  const [apiResults, setApiResults] = useState<FoodItem[]>([])
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([])
  const [grams, setGrams] = useState('100')
  const [pending, setPending] = useState<FoodItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecentFoods(getRecentFoods())
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  useEffect(() => {
    if (initialBarcode) void runSearch(initialBarcode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBarcode])

  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    const { local, api } = await searchFoods(q)
    setLocalResults(local)
    setApiResults(api)
    setLoading(false)
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) { setLocalResults([]); setApiResults([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(() => void runSearch(val), 320)
  }

  const handleSelect = (food: FoodItem) => {
    setPending(food)
    setGrams('100')
  }

  const handleConfirm = () => {
    if (!pending) return
    const g = parseFloat(grams) || 100
    saveToRecent(pending)
    onSelect(pending, g)
  }

  const showEmpty = !loading && query.trim() && !localResults.length && !apiResults.length
  const showDefault = !query.trim()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input ref={inputRef} value={query} onChange={e => handleChange(e.target.value)} placeholder="Rechercher un aliment..." style={{ width: '100%', padding: '9px 9px 9px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', fontSize: 14, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'var(--bg-card2)', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Confirm grams */}
        {pending && (
          <div style={{ margin: '0 16px 12px', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }}>{pending.product_name}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={grams} onChange={e => setGrams(e.target.value)} min="1" style={{ width: 80, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 14, color: 'var(--text)', fontFamily: 'DM Mono,monospace', outline: 'none' }} />
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>g</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setPending(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}>Retour</button>
              <button onClick={handleConfirm} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#06B6D4,#3B82F6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>Ajouter</button>
            </div>
          </div>
        )}

        {/* Results */}
        {!pending && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <Skeleton />}

            {!loading && showDefault && (
              <>
                {recentFoods.length > 0 && (
                  <>
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>Recemment utilises</p>
                    {recentFoods.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />
                  </>
                )}
                <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>Aliments frequents</p>
                {COMMON_FOODS.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
              </>
            )}

            {!loading && !showDefault && (
              <>
                {localResults.length > 0 && (
                  <>
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>Bibliothèque</p>
                    {localResults.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
                  </>
                )}
                {apiResults.length > 0 && (
                  <>
                    {localResults.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 16px' }} />}
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>Produits</p>
                    {apiResults.map(f => <FoodRow key={f.code} food={f} onSelect={handleSelect} />)}
                  </>
                )}
                {showEmpty && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 10 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                      Aucun aliment trouve pour &ldquo;{query}&rdquo;<br/>
                      <span style={{ fontSize: 11 }}>Essayez un terme plus simple ou saisissez les valeurs manuellement</span>
                    </p>
                    <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>Saisie manuelle</button>
                  </div>
                )}
              </>
            )}
            <div style={{ height: 24 }} />
          </div>
        )}
      </div>
    </div>
  )
}
