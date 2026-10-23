import { createRoot } from 'react-dom/client'
import { ProspectionClient } from '../../src/app/admin/prospection/ProspectionClient'
window.THWProspectionMount = (el) => { const r = createRoot(el); r.render(<ProspectionClient />); return () => r.unmount() }
