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
