'use client'
import { useEffect, useState } from 'react'

export function useStravaConnection() {
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaLoading, setStravaLoading] = useState(true)

  useEffect(() => {
    fetch('/api/strava/connected')
      .then(r => r.json())
      .then(d => setStravaConnected(!!d.connected))
      .catch(() => {})
      .finally(() => setStravaLoading(false))
  }, [])

  return { stravaConnected, stravaLoading }
}
