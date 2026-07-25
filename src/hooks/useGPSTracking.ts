'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

export enum GPSStatus {
  idle        = 'idle',
  requesting  = 'requesting',
  acquiring   = 'acquiring',
  good        = 'good',
  approximate = 'approximate',
  poor        = 'poor',
  denied      = 'denied',
  unavailable = 'unavailable',
  error       = 'error',
}

export interface GPSPoint {
  lat: number
  lng: number
  altitude: number | null
  timestamp: number
  speed: number | null
}

export interface GPSState {
  status: GPSStatus
  accuracy: number | null
  points: GPSPoint[]
  currentSpeed: number
  maxSpeed: number
  distance: number
  elevationGain: number
  currentAltitude: number | null
  gradient: number
  currentLat: number | null
  currentLng: number | null
}

const INITIAL_STATE: GPSState = {
  status: GPSStatus.idle,
  accuracy: null,
  points: [],
  currentSpeed: 0,
  maxSpeed: 0,
  distance: 0,
  elevationGain: 0,
  currentAltitude: null,
  gradient: 0,
  currentLat: null,
  currentLng: null,
}

function haversine(a: GPSPoint, b: GPSPoint): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function accuracyToStatus(accuracy: number): GPSStatus {
  if (accuracy < 20) return GPSStatus.good
  if (accuracy <= 50) return GPSStatus.approximate
  return GPSStatus.poor
}

// Pente lissée : dérivée altitude/distance sur une fenêtre glissante d'environ
// 30 m (au moins 15 m pour publier une valeur) — la dérivée point à point est
// trop bruitée avec l'altitude GPS.
const GRADIENT_WINDOW_M = 30
const GRADIENT_MIN_SPAN_M = 15

// Réglage recording.gpsFrequency (secondes entre deux positions retenues,
// ou 'auto' = aucune limitation). Throttling par ignorance des positions trop
// rapprochées — la première position est toujours gardée. Tolérance de 20 %
// pour ne pas rejeter une position à cause du jitter du GPS (~1 Hz natif).
export type GPSFrequency = number | 'auto'

export function useGPSTracking(isActive: boolean, gpsFrequency?: GPSFrequency): {
  gps: GPSState
  stopWatching: () => void
  resetTracking: () => void
} {
  const [state, setState] = useState<GPSState>(INITIAL_STATE)
  const watchIdRef   = useRef<number | null>(null)
  const lastPointRef = useRef<GPSPoint | null>(null)
  const cumDistRef   = useRef(0)
  const altWindowRef = useRef<{ d: number; alt: number }[]>([])
  const activeRef    = useRef(isActive)
  useEffect(() => { activeRef.current = isActive }, [isActive])
  // Ref (pas de dépendance d'effet) : changer la fréquence ne redémarre pas le watch.
  const frequencyRef = useRef<GPSFrequency | undefined>(gpsFrequency)
  useEffect(() => { frequencyRef.current = gpsFrequency }, [gpsFrequency])
  const lastAcceptedRef = useRef<number | null>(null)

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const resetTracking = useCallback(() => {
    lastPointRef.current = null
    cumDistRef.current = 0
    altWindowRef.current = []
    lastAcceptedRef.current = null
    setState(prev => ({
      ...prev,
      points: [],
      distance: 0,
      elevationGain: 0,
      maxSpeed: 0,
      gradient: 0,
    }))
  }, [])

  useEffect(() => {
    if (!isActive) {
      stopWatching()
      setState(s => ({ ...s, status: GPSStatus.idle }))
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState(s => ({ ...s, status: GPSStatus.unavailable }))
      return
    }

    setState(s => ({ ...s, status: GPSStatus.requesting }))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Throttling recording.gpsFrequency : ignorer les positions arrivant
        // plus vite que l'intervalle configuré (la 1re est toujours gardée).
        const freq = frequencyRef.current
        if (typeof freq === 'number' && freq > 0) {
          const minMs = freq * 1000 * 0.8 // tolérance jitter 20 %
          if (lastAcceptedRef.current !== null && pos.timestamp - lastAcceptedRef.current < minMs) return
        }
        lastAcceptedRef.current = pos.timestamp

        const { latitude, longitude, altitude, accuracy, speed } = pos.coords
        const point: GPSPoint = {
          lat: latitude,
          lng: longitude,
          altitude,
          timestamp: pos.timestamp,
          speed,
        }
        const speedKmh = speed != null && speed > 0 ? speed * 3.6 : 0

        // Déplacement + variation d'altitude calculés hors du updater React
        // (mutations de refs interdites dans un updater — double invocation).
        let dDelta = 0
        let dAlt: number | null = null
        if (lastPointRef.current) {
          const d = haversine(lastPointRef.current, point)
          if (d > 0.5 && d < 200) {
            dDelta = d
            if (point.altitude != null && lastPointRef.current.altitude != null) {
              dAlt = point.altitude - lastPointRef.current.altitude
            }
          }
        }
        cumDistRef.current += dDelta

        // Pente lissée sur ~30 m (fenêtre glissante distance/altitude).
        let smoothedGradient: number | null = null
        if (point.altitude != null && (dDelta > 0 || altWindowRef.current.length === 0)) {
          const w = altWindowRef.current
          w.push({ d: cumDistRef.current, alt: point.altitude })
          while (w.length > 1 && cumDistRef.current - w[0].d > GRADIENT_WINDOW_M) w.shift()
          const span = cumDistRef.current - w[0].d
          if (span >= GRADIENT_MIN_SPAN_M) {
            smoothedGradient = ((point.altitude - w[0].alt) / span) * 100
          }
        }
        lastPointRef.current = point

        setState(prev => {
          const newStatus = prev.status === GPSStatus.requesting
            ? GPSStatus.acquiring
            : (accuracy != null ? accuracyToStatus(accuracy) : prev.status)

          return {
            status: newStatus,
            accuracy: accuracy ?? prev.accuracy,
            points: [...prev.points, point],
            currentSpeed: speedKmh,
            maxSpeed: Math.max(prev.maxSpeed, speedKmh),
            distance: prev.distance + dDelta,
            elevationGain: dAlt != null && dAlt > 0 ? prev.elevationGain + dAlt : prev.elevationGain,
            currentAltitude: altitude,
            gradient: smoothedGradient ?? prev.gradient,
            currentLat: latitude,
            currentLng: longitude,
          }
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState(s => ({ ...s, status: GPSStatus.denied }))
        } else {
          setState(s => ({ ...s, status: GPSStatus.error }))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    return stopWatching
  }, [isActive, stopWatching])

  return { gps: state, stopWatching, resetTracking }
}
