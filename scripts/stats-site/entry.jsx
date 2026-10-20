import { createRoot } from 'react-dom/client'
import { StatsClient } from '../../src/app/admin/statistiques/StatsClient'
window.THWStatsMount = (el) => { const r = createRoot(el); r.render(<StatsClient />); return () => r.unmount() }
