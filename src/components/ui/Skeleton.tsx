/**
 * Skeleton screen components — shimmer placeholders that match
 * the exact shape of the content they replace.
 * Design rule: skeleton screens replace ALL spinners/loaders.
 */

// ── Base shimmer block ────────────────────────────────────────────
interface SkeletonProps {
  height?:       number | string
  width?:        number | string
  borderRadius?: number | string
  className?:    string
  style?:        React.CSSProperties
}

export function Skeleton({
  height       = 16,
  width        = '100%',
  borderRadius = 8,
  className,
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer${className ? ' ' + className : ''}`}
      style={{ height, width, borderRadius, flexShrink: 0, ...style }}
    />
  )
}

// ── Text lines (matching paragraph shapes) ────────────────────────
export function SkeletonLines({
  lines = 3,
  gap   = 8,
}: {
  lines?: number
  gap?:   number
}) {
  const widths = ['100%', '82%', '64%', '88%', '72%']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={11} width={widths[i % widths.length]} borderRadius={4} />
      ))}
    </div>
  )
}

// ── KPI stat card skeleton ────────────────────────────────────────
export function SkeletonStat({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 16, borderRadius: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      <Skeleton height={10} width={56} borderRadius={4} />
      <Skeleton height={26} width={72} borderRadius={6} />
      <Skeleton height={5}  width="100%" borderRadius={3} />
      <Skeleton height={10} width={44} borderRadius={4} />
    </div>
  )
}

// ── Planning week grid skeleton ───────────────────────────────────
export function SkeletonPlanningGrid() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Skeleton height={34} width={200} borderRadius={10} />
        <Skeleton height={34} width={110} borderRadius={10} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Skeleton height={34} width={120} borderRadius={9} />
          <Skeleton height={34} width={120} borderRadius={9} />
          <Skeleton height={34} width={136} borderRadius={9} />
        </div>
      </div>

      {/* KPI cards 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SkeletonStat />
        <SkeletonStat />
        <div style={{ gridColumn: 'span 2' }}>
          <SkeletonStat />
        </div>
      </div>

      {/* Week grid */}
      <Skeleton height={260} borderRadius={16} />
    </div>
  )
}

// ── Activity list skeleton ────────────────────────────────────────
export function SkeletonActivityList({ rows = 4 }: { rows?: number }) {
  const heights = [88, 120, 80, 100, 92, 110]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          height={heights[i % heights.length]}
          borderRadius={12}
        />
      ))}
    </div>
  )
}

// ── Generic section card skeleton ────────────────────────────────
export function SkeletonCard({
  titleWidth = 120,
  valueWidth = 80,
  rows = 2,
  style,
}: {
  titleWidth?: number
  valueWidth?: number
  rows?: number
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      padding: '18px 16px', borderRadius: 16,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 10,
      ...style,
    }}>
      <Skeleton height={11} width={titleWidth} borderRadius={4} />
      <Skeleton height={24} width={valueWidth} borderRadius={6} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={8} width={`${85 - i * 18}%`} borderRadius={3} />
      ))}
    </div>
  )
}

// ── Page header skeleton ──────────────────────────────────────────
export function SkeletonPageHeader({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <Skeleton height={28} width={180} borderRadius={8} />
      <Skeleton height={12} width={110} borderRadius={4} />
    </div>
  )
}

// ── Profile header skeleton ───────────────────────────────────────
export function SkeletonProfileHeader() {
  return (
    <div style={{
      padding: '24px 16px', borderRadius: 16,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <Skeleton height={72} width={72} borderRadius={36} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={20} width={140} borderRadius={6} />
        <Skeleton height={12} width={90} borderRadius={4} />
        <Skeleton height={10} width={120} borderRadius={4} />
      </div>
    </div>
  )
}

// ── Fitness cards skeleton (CTL / ATL / TSB) ─────────────────────
export function SkeletonFitnessCards() {
  return (
    <div style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 16 }}>
      <Skeleton height={10} width={48} borderRadius={4} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              flex: 1, borderRadius: 16, padding: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              minHeight: 96, gap: 8,
            }}
          >
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
              <Skeleton height={10} width={28} borderRadius={4} />
              <Skeleton height={20} width={20} borderRadius={10} />
            </div>
            <Skeleton height={30} width={56} borderRadius={8} style={{ marginTop: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Training page full skeleton (replaces 4-row generic placeholder) ──
export function SkeletonTrainingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 0 24px' }}>
      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      {/* Fitness cards */}
      <SkeletonFitnessCards />
      {/* Chart area */}
      <Skeleton height={180} borderRadius={16} style={{ margin: '0 16px' }} />
      {/* Activity list */}
      <SkeletonActivityList rows={4} />
    </div>
  )
}

// ── Calendar grid skeleton ────────────────────────────────────────
export function SkeletonCalendarGrid() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton height={32} width={32} borderRadius={8} />
        <Skeleton height={20} width={140} borderRadius={6} />
        <Skeleton height={32} width={32} borderRadius={8} />
      </div>
      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} height={14} borderRadius={4} />
        ))}
      </div>
      {/* Day cells — 5 weeks */}
      {Array.from({ length: 5 }).map((_, week) => (
        <div key={week} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: 7 }).map((_, day) => (
            <Skeleton key={day} height={52} borderRadius={8} />
          ))}
        </div>
      ))}
    </div>
  )
}
