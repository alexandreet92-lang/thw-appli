'use client'
import type { AddedIngredient } from './FoodSearch'
import { calcMacros } from './FoodSearch'

interface Props {
  ingredient: AddedIngredient
  onRemove:   () => void
}

function FoodThumb({ url }: { url?: string }) {
  if (!url) return <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--bg-card2)', flexShrink: 0 }} />
  return <img src={url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
}

export default function IngredientRow({ ingredient, onRemove }: Props) {
  const { food, qty } = ingredient
  const m = calcMacros(food, qty)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <FoodThumb url={food.image_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {food.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', gap: 8, marginTop: 1 }}>
          <span>{qty}g</span>
          <span style={{ color: '#06B6D4' }}>{m.kcal} kcal</span>
          <span>P{m.prot}</span>
          <span>G{m.gluc}</span>
          <span>L{m.lip}</span>
        </div>
      </div>
      <button onClick={onRemove}
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>
        ×
      </button>
    </div>
  )
}
