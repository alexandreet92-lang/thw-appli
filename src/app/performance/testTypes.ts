// Types partagés des tests de performance (utilisés par page.tsx et testCompute.ts).
export type TestSport = 'running' | 'cycling' | 'natation' | 'aviron' | 'hyrox'

export interface FieldDef {
  cle: string
  label: string
  unite: string | null
  type: 'number' | 'string'
  placeholder?: string
  helper?: string
  required?: boolean
}
