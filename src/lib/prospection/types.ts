// Types de la prospection par email (admin). Les tables sont décrites dans
// supabase/migrations/20261024_prospection.sql.

export type ContactStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained'
export type DeliveryStatus = 'delivered' | 'bounced' | 'complained'

export interface ProspectSettings {
  enabled: boolean
  daily_target: number
  send_hour: number
  ramp_start: string | null
  subject: string
  body: string
  from_name: string
  from_email: string
  postal_address: string
}

export interface ProspectContact {
  id: string
  email: string
  first_name: string | null
  token: string
}

export interface SendRow {
  id: number
  sent_at: string
  status: 'sent' | 'failed'
  error: string | null
  delivery_status: DeliveryStatus | null
  click_count: number
  open_count: number
  email: string
}

export interface RampInfo {
  week: number
  weeks: number
  cap: number
  limit: number
}

export interface DayPoint { day: string; sent: number; clicks: number }

export interface ProspectionOverview {
  settings: ProspectSettings
  ramp: RampInfo
  mailReady: boolean
  today: {
    sent: number
    failed: number
    bounced: number
    clicks: number
    opens: number
    unsubscribes: number
  }
  queue: number
  total: number
  week: DayPoint[]
  recent: SendRow[]
}
