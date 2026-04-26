'use client'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

/**
 * Consistent page header: 24px/700 title + 13px subtitle.
 * Place at the top of every page (except dashboard).
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 28,
    }}>
      <div>
        <h1 style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "'Syne', sans-serif",
          color: 'var(--text)',
          letterSpacing: '-0.3px',
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            margin: '4px 0 0',
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--text-mid)',
            lineHeight: 1.4,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div style={{ flexShrink: 0 }}>
          {action}
        </div>
      )}
    </div>
  )
}
