'use client'

interface Icon { label: string; color: string }
interface Props { config: Record<string, unknown> }

const SPORT_ICONS: Record<string, string> = {
  'Modèle':      'M8 2v4m8-4v4M3 9h18M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  'Dupliquer':   'M8 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3M13 21h8M17 17l4 4m0-4-4 4',
  'Glisser':     'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  'Cycle':       'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5l3 3',
  'Pectoraux':   'M4 8c0-2 2-4 4-4h8c2 0 4 2 4 4v6c0 2-1.5 3-3 3H7c-1.5 0-3-1-3-3V8z',
  'Dos':         'M4 4h16M4 8h10M4 12h12M4 16h8M4 20h6',
  'Jambes':      'M8 2v10l-4 10M16 2v10l4 10M8 12h8',
  'Épaules':     'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-7 9a7 7 0 0 1 14 0H5z',
  'Bras':        'M6 4l2 8 4-4 4 4 2-8M6 18v2M18 18v2',
  'Core':        'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v4M8 12h8',
  'Étirements':  'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v4l3 3',
  'Nutrition':   'M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z',
  'Bain froid':  'M12 2a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7zM5 14h14a2 2 0 0 1 0 4H5a2 2 0 0 1 0-4z',
  'OAuth':       'M12 1l9 4.9V12c0 5.5-3.8 10.7-9 12C6.8 22.7 3 17.5 3 12V5.9L12 1z',
  'Chiffré':     'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5h5',
  'Privé':       'M17 11H7a4 4 0 0 0-4 4v4h18v-4a4 4 0 0 0-4-4zm-5-8a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  'RGPD':        'M9 12l2 2 4-4M7.8 4A8 8 0 1 0 19 8.2',
  'Muscles':     'M6.5 5.5h2v3H12v-3h2v3h.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H14v3h-2v-3H9v3H7v-3h-.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h.5v-3z',
  'Humeur':      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3 9a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm6 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm-6 4c.83 1 2 1.5 3 1.5s2.17-.5 3-1.5',
  'Vélo':        'M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 9a5 5 0 1 0 10 0H9.5l2-4H14a1 1 0 0 0 0-2h-2a1 1 0 0 0-.89.55L8.88 11H5z',
  'Running':     'M13 4a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm-2.5 3.5L9 11l2 2v4h2v-4.5l-2-1.5 1.5-3L14 10h3v-2h-4l-2.5-2z',
  'Trail':       'M3 17l3-8 3 4 3-6 3 10H3z',
  'Muscu':       'M6.5 5.5h2v3H12v-3h2v3h.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H14v3h-2v-3H9v3H7v-3h-.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h.5v-3z',
  'Natation':    'M2 12c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1v2c-1.5 0-1.5 1-3 1s-1.5-1-3-1-1.5 1-3 1-1.5-1-3-1-1.5 1-3 1v-2zm5-5a2 2 0 1 1 4 0 2 2 0 0 1-4 0z',
  'Yoga':        'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-4 8c0-1 .5-2 2-2.5V21h4V8.5c1.5.5 2 1.5 2 2.5H8z',
  'Séries':      'M3 6h18M3 12h18M3 18h18',
  'Lap':         'M12 2v4m0 12v4m-8-8H2m20 0h-2M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8M8.4 15.6 5.6 18.4',
  'Superset':    'M4 4h7v7H4V4zm9 9h7v7h-7v-7zm0-9 7 7m-7 0 7-7',
  'EMOM':        'M12 2v10l6 3',
  'Tabata':      'M5 3v18M19 3v18M5 12h14',
  'Sommeil':     'M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z',
  'HRV':         'M2 12h3l3-8 3 16 3-12 3 8 3-4h3',
  'Ressenti':    'M12 2C8 2 5 5 5 9c0 4 7 13 7 13s7-9 7-13c0-4-3-7-7-7zm0 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  'Mobilité':    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v4l3 3',
  'Scan':        'M4 6V4h4M20 6V4h-4M4 18v2h4M20 18v2h-4M7 10h10M7 14h10',
  'Photo IA':    'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'Repas types': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v4l3 3',
  'Manuel':      'M3 6h18M3 10h18M3 14h10',
  'Strava':      'M5 9.5 8.5 2l3.5 7.5H9L8.5 8 8 9.5H5zm9 0L17.5 2 21 9.5h-3L17.5 8 17 9.5h-3z',
  'Garmin':      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6l4 2',
  'Wahoo':       'M12 2L4 12l8 10 8-10-8-10z',
  'Apple Health':'M12 2C8 2 5 5 5 9c0 4 7 13 7 13s7-9 7-13c0-4-3-7-7-7z',
  'Passé':       'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5l3 3',
  "Aujourd'hui": 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5l3 3',
  'Planifié':    'M8 2v4m8-4v4M3 9h18M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  'Manqué':      'M6 18L18 6M6 6l12 12',
}

function getPath(label: string) {
  return SPORT_ICONS[label] ?? 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z'
}

export function IconGridVisual({ config }: Props) {
  const icons = config.icons as Icon[]

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${icons.length <= 4 ? 2 : 3}, 1fr)`, gap: 12, width: '100%' }}>
        {icons.map(({ label, color }, i) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0, animation: `stagger-in 350ms ${i * 100}ms cubic-bezier(0.34,1.56,0.64,1) forwards` }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={getPath(label)} />
              </svg>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
