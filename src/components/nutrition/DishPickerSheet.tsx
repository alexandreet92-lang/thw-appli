'use client'
// ══════════════════════════════════════════════════════════════════
// DishPickerSheet — sélecteur de « plats » composés (catalogue dishes).
// Bottom-sheet à grille de photos. Vue par défaut : récents + plats
// populaires. Recherche debouncée sur la RPC search_dishes. Sélection
// → ajustement du grammage (portion par défaut) → onSelect(dish, grams).
// ══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  searchDishes, getPopularDishes, getRecentDishes, saveToRecentDishes,
  dishMacros, type DishItem,
} from '@/lib/dish-search'

const CYAN = '#06B6D4'

interface Props {
  onSelect: (dish: DishItem, grams: number) => void
  onClose:  () => void
}

function DishCard({ dish, onSelect }: { dish: DishItem; onSelect: (d: DishItem) => void }) {
  const kcalPortion = Math.round(dish.kcal_100g * dish.default_portion_g / 100)
  return (
    <button
      onClick={() => onSelect(dish)}
      style={{
        display: 'flex', flexDirection: 'column', textAlign: 'left', padding: 0,
        border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
        background: 'var(--bg-card2)', cursor: 'pointer', minHeight: 44,
      }}
    >
      <div style={{ width: '100%', aspectRatio: '4 / 3', background: 'var(--border)', position: 'relative' }}>
        {dish.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.image_url} alt="" loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.6" strokeLinecap="round"><path d="M3 11h18M5 11V7a2 2 0 012-2h10a2 2 0 012 2v4M4 11l1 8a2 2 0 002 2h10a2 2 0 002-2l1-8"/></svg>
          </div>
        )}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {dish.name}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: CYAN, fontFamily: 'DM Mono,monospace', fontWeight: 700 }}>
          {kcalPortion} kcal
          <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {dish.default_portion_g}g</span>
        </p>
      </div>
    </button>
  )
}

function GridSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '4px 16px 16px' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ width: '100%', aspectRatio: '4 / 3', background: 'var(--border)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ padding: '8px 10px 10px' }}>
            <div style={{ height: 12, borderRadius: 6, background: 'var(--border)', width: '80%', animation: 'pulse 1.4s ease-in-out infinite' }} />
            <div style={{ height: 10, borderRadius: 4, background: 'var(--border)', width: '40%', marginTop: 6, opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DishPickerSheet({ onSelect, onClose }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<DishItem[]>([])
  const [popular,  setPopular]  = useState<DishItem[]>([])
  const [recents,  setRecents]  = useState<DishItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [pending,  setPending]  = useState<DishItem | null>(null)
  const [grams,    setGrams]    = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecents(getRecentDishes())
    void (async () => {
      setPopular(await getPopularDishes())
      setLoading(false)
    })()
  }, [])

  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    setResults(await searchDishes(q))
    setLoading(false)
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(() => void runSearch(val), 320)
  }

  function handleSelect(dish: DishItem) {
    setPending(dish)
    setGrams(dish.default_portion_g)
  }

  function handleConfirm() {
    if (!pending) return
    const g = grams > 0 ? grams : pending.default_portion_g
    saveToRecentDishes(pending)
    onSelect(pending, g)
  }

  const isSearching = query.trim().length > 0
  const showEmpty   = !loading && isSearching && results.length === 0
  const macros      = pending ? dishMacros(pending, grams || pending.default_portion_g) : null

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
            <input ref={inputRef} value={query} onChange={e => handleChange(e.target.value)} placeholder="Rechercher un plat..."
              style={{ width: '100%', padding: '9px 9px 9px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', fontSize: 14, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'var(--bg-card2)', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Confirm grammage */}
        {pending && macros && (
          <div style={{ margin: '0 16px 12px', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {pending.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pending.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', lineHeight: 1.25 }}>{pending.name}</p>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontFamily: 'DM Mono,monospace', fontSize: 11 }}>
                  <span style={{ color: CYAN, fontWeight: 700 }}>{macros.kcal} kcal</span>
                  <span style={{ color: 'var(--text-dim)' }}>P {macros.prot}</span>
                  <span style={{ color: 'var(--text-dim)' }}>G {macros.gluc}</span>
                  <span style={{ color: 'var(--text-dim)' }}>L {macros.lip}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setGrams(g => Math.max(10, g - 10))} style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>−</button>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{grams} g</div>
              <button onClick={() => setGrams(g => g + 10)} style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setPending(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Retour</button>
              <button onClick={handleConfirm} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${CYAN},#3B82F6)`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif' }}>Ajouter au repas</button>
            </div>
          </div>
        )}

        {/* Grid */}
        {!pending && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <GridSkeleton />}

            {!loading && !isSearching && (
              <>
                {recents.length > 0 && (
                  <>
                    <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>Récemment utilisés</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '0 16px 12px' }}>
                      {recents.map(d => <DishCard key={d.id} dish={d} onSelect={handleSelect} />)}
                    </div>
                  </>
                )}
                <p style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: 0 }}>Plats populaires</p>
                {popular.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '0 16px 16px' }}>
                    {popular.map(d => <DishCard key={d.id} dish={d} onSelect={handleSelect} />)}
                  </div>
                ) : (
                  <div style={{ padding: '24px 24px 32px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.5 }}>
                    Le catalogue de plats est vide.<br/>
                    <span style={{ fontSize: 11 }}>Le seed des plats n&apos;a pas encore été exécuté.</span>
                  </div>
                )}
              </>
            )}

            {!loading && isSearching && !showEmpty && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '4px 16px 16px' }}>
                {results.map(d => <DishCard key={d.id} dish={d} onSelect={handleSelect} />)}
              </div>
            )}

            {showEmpty && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', gap: 10 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                  Aucun plat trouvé pour &ldquo;{query}&rdquo;<br/>
                  <span style={{ fontSize: 11 }}>Essaie un terme plus simple, ou utilise la recherche d&apos;aliments.</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
