'use client'

export const MMP_TABLE_DURATIONS = [1, 5, 10, 30, 60, 180, 300, 480, 600, 720, 900, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 14400, 18000, 21600]
export const MMP_TABLE_LABELS    = ["Pmax", "5''", "10''", "30''", "1'", "3'", "5'", "8'", "10'", "12'", "15'", "20'", "30'", "45'", "1h", "1h30", "2h", "3h", "4h", "5h", "6h"]

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
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card2)' }}>
              <th style={{
                padding: '10px 18px', textAlign: 'right',
                fontSize: 11, fontWeight: 700, color: '#EF4444',
                textTransform: 'uppercase', letterSpacing: 0.8,
                borderRight: '1px solid var(--border)',
              }}>
                Records
              </th>
              <th style={{
                padding: '10px 14px', textAlign: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: 0.8,
                borderRight: '1px solid var(--border)',
              }}>
                Durée
              </th>
              <th style={{
                padding: '10px 18px', textAlign: 'left',
                fontSize: 11, fontWeight: 700, color: '#818CF8',
                textTransform: 'uppercase', letterSpacing: 0.8,
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
                    padding: '8px 18px', textAlign: 'right',
                    color: rec > 0 ? '#EF4444' : 'var(--text-dim)',
                    borderRight: '1px solid var(--border)',
                  }}>
                    {loading ? (
                      <span style={{ color: 'var(--text-dim)' }}>…</span>
                    ) : rec > 0 ? (
                      <>
                        <span className="stat-number" style={{ fontSize: 16, lineHeight: 1 }}>{rec}</span>
                        <span style={{ fontSize: 11, marginLeft: 4, color: 'var(--text-dim)' }}>W</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td style={{
                    padding: '8px 14px', textAlign: 'center',
                    color: 'var(--text-mid)', fontWeight: 600,
                    fontSize: 12, letterSpacing: 0.3,
                    borderRight: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {labels[i]}
                  </td>
                  <td style={{
                    padding: '8px 18px', textAlign: 'left',
                    background: sessBg, color: sessColor,
                  }}>
                    {skip || sess <= 0 ? (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    ) : (
                      <>
                        <span className="stat-number" style={{ fontSize: 16, lineHeight: 1, fontWeight: star ? 800 : 700 }}>{sess}</span>
                        <span style={{ fontSize: 11, marginLeft: 4, color: star ? sessColor : 'var(--text-dim)' }}>W</span>
                        {star && <span style={{ marginLeft: 6, fontSize: 13 }}>★</span>}
                      </>
                    )}
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
