'use client'

export const MMP_TABLE_DURATIONS = [1, 5, 10, 30, 60, 180, 300, 480, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 21600]
export const MMP_TABLE_LABELS    = ["Pmax", "5''", "10''", "30''", "1'", "3'", "5'", "8'", "10'", "15'", "20'", "30'", "45'", "1h", "1h30", "2h", "3h", "6h"]

interface Props {
  sessionMmp:  number[]
  recordMmp:   number[] | null
  durations:   number[]
  labels:      string[]
  sessionN:    number                       // activity duration in seconds
  filter:      'year' | 'alltime'
  onFilter:    (f: 'year' | 'alltime') => void
  loading:     boolean
}

export function MmpTable({ sessionMmp, recordMmp, durations, labels, sessionN, filter, onFilter, loading }: Props) {
  return (
    <div style={{ marginTop: 16 }}>
      {/* Filter toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 10 }}>
        {(['year', 'alltime'] as const).map(f => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            style={{
              padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: filter === f ? 'var(--border-mid)' : 'transparent',
              color:      filter === f ? 'var(--text)'       : 'var(--text-dim)',
            }}
          >
            {f === 'year' ? 'Cette année' : 'All time'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card2)' }}>
              <th style={{
                padding: '6px 14px', textAlign: 'right',
                fontSize: 10, fontWeight: 700, color: '#EF4444',
                textTransform: 'uppercase', letterSpacing: 0.7,
                borderRight: '1px solid var(--border)',
              }}>
                Records
              </th>
              <th style={{
                padding: '6px 12px', textAlign: 'center',
                fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: 0.7,
                borderRight: '1px solid var(--border)',
              }}>
                Durée
              </th>
              <th style={{
                padding: '6px 14px', textAlign: 'left',
                fontSize: 10, fontWeight: 700, color: '#818CF8',
                textTransform: 'uppercase', letterSpacing: 0.7,
              }}>
                Cette séance
              </th>
            </tr>
          </thead>
          <tbody>
            {durations.map((d, i) => {
              const rec  = recordMmp?.[i] ?? 0
              const sess = sessionMmp[i] ?? 0
              const skip = d > sessionN && d !== 1

              let sessColor: string = 'var(--text)'
              let sessBg:    string = 'transparent'
              let star = false

              if (!skip && sess > 0 && rec > 0) {
                if (sess >= rec) {
                  sessColor = '#166534'
                  sessBg    = 'rgba(22,163,74,0.08)'
                  star      = true
                } else if (sess >= rec * 0.95) {
                  sessColor = '#F97316'
                }
              }

              const rowBg = i % 2 === 0 ? 'var(--bg)' : 'var(--bg-card2)'

              return (
                <tr key={d} style={{ background: rowBg }}>
                  <td style={{
                    padding: '5px 14px', textAlign: 'right',
                    color: rec > 0 ? '#EF4444' : 'var(--text-dim)',
                    fontVariantNumeric: 'tabular-nums',
                    borderRight: '1px solid var(--border)',
                  }}>
                    {loading ? '…' : rec > 0 ? `${rec} W` : '—'}
                  </td>
                  <td style={{
                    padding: '5px 12px', textAlign: 'center',
                    color: 'var(--text-dim)', fontWeight: 600,
                    borderRight: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {labels[i]}
                  </td>
                  <td style={{
                    padding: '5px 14px', textAlign: 'left',
                    background: sessBg, color: sessColor,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: star ? 700 : 400,
                  }}>
                    {skip ? '—' : sess > 0 ? `${sess} W${star ? ' ★' : ''}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
