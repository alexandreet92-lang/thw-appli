# PROMPT IA DEBUG — Audit code conv items + input bar

## 1. AISidebar.tsx — Composant ConvItem (l.71-139)

### ItemCls (classes appliquées au bouton item)

```tsx
const isActive = c.id === activeId
const itemCls = isActive
  ? 'bg-black/[0.06] dark:bg-white/10'
  : 'bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/5'
```

### Wrapper item

```tsx
<div ref={ref} className="group relative">
```

### Bouton item (cliquable)

```tsx
<button
  onClick={() => onSelect(c)}
  className={`w-full text-left px-3 py-2.5 rounded-xl
              border-0 outline-none focus:outline-none
              transition-colors duration-100 ${itemCls}`}
>
  <p className="text-[13px] font-medium truncate text-[#0A0A0A] dark:text-white leading-snug">
    {c.isPinned && <span className="mr-1 text-[#3B82F6]">★</span>}
    {c.title || 'Nouvelle discussion'}
  </p>
  <p className="text-[11px] text-[#999] mt-0.5">{fmt(c.updatedAt)}</p>
</button>
```

### Bouton 3-dot menu

```tsx
<button
  onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
  aria-label="Options"
  className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded
              flex items-center justify-center text-[#8C8C8C]
              transition-opacity duration-100
              hover:bg-black/5 dark:hover:bg-white/10
              ${menu || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
  </svg>
</button>
```

### Map() qui rend les items (l.213-232)

```tsx
<div className="flex-1 overflow-y-auto px-2 min-h-0">
  {filtered.length === 0 && (
    <p className="text-center text-[12px] text-[#8C8C8C] mt-5 mx-3">
      ...
    </p>
  )}
  {pinned.length > 0 && (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8C8C8C] mx-1 mt-1 mb-1">Epingles</p>
      {pinned.map(c => (
        <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
      ))}
    </>
  )}
  {recent.map(c => (
    <ConvItem key={c.id} c={c} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} />
  ))}
</div>
```

## 2. AIPanel.tsx — Input bar wrapper + textarea

### Outer wrapper (l.19313-19316)

```tsx
<div
  className="px-4 pt-2 pb-6 bg-white dark:bg-[#0A0A0A]"
  style={{ flexShrink: 0, position: 'relative' }}
>
```

### Inner wrap `aip-input-wrap` (l.19339-19346)

```tsx
<div
  className="aip-input-wrap max-w-[680px] mx-auto
             bg-white dark:bg-[#1E1E1E]
             rounded-2xl
             border border-[#E8E8E8] dark:border-[#2A2A2A]
             shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
  style={{ transition: 'box-shadow 0.15s' }}
>
```

### Textarea (l.19439-19455)

```tsx
<textarea
  ref={areaRef}
  value={input}
  onChange={handleInput}
  onKeyDown={handleKey}
  placeholder={activeQA
    ? 'Ajoute ta question ou du contexte pour préciser ta demande…'
    : 'Pose ta question…'}
  rows={1}
  className="w-full px-4 pt-4 pb-2 bg-transparent resize-none
             text-[15px] leading-relaxed
             text-[#0A0A0A] dark:text-white
             placeholder:text-[#BABABA] dark:placeholder:text-[#555]
             focus:outline-none
             min-h-[56px] max-h-[180px] overflow-y-auto
             border-0 font-[DM_Sans,sans-serif]"
/>
```

## Observation

Aucun `bg-gray-*`, `bg-neutral-*`, `bg-slate-*`, `border-b`, `divide-y`, `ring`, `shadow` sur les items conv eux-mêmes (sauf le menu popup conditionnel `{menu && ...}` qui n'apparaît qu'au clic 3-dot).

L'item au repos = `bg-transparent` + `w-full text-left px-3 py-2.5 rounded-xl border-0 outline-none focus:outline-none transition-colors duration-100`.
