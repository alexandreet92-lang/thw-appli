'use client'

interface SpinnerProps {
  size?: number
  color?: string
  strokeWidth?: number
}

/**
 * Inline SVG spinner — no external dependency.
 * Uses the `spin` keyframe already defined in globals.css.
 */
export function Spinner({ size = 14, color = 'currentColor', strokeWidth = 2 }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0, display: 'inline-block' }}
      aria-hidden="true"
    >
      <circle
        cx="8" cy="8" r="6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity="0.25"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  )
}
