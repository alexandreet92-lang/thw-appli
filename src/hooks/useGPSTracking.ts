'use client'
import { useState, useEffect, useRef } from 'react'

export interface GPSPoint {
  lat: number
  lng: number
  altitude: number | null
  timestamp: number
  speed: number | null
}

interface GPSState {
  points: GPSPoint[]
  currentSpeed: number          // km/h
  maxSpeed: number              // km/h
  distance: number              // mètres
  elevationGain: number         // mètres (D+ uniquement)
  currentAltitude: number | null
  available: boolean
  error: string | null
}

const INITIAL_STATE: GPSState = {
  points: [],
  currentSpeed: 0,
  maxSpeed: 0,
  distance: 0,
  elevationGain: 0,
  currentAltitude: null,
  available: false,
  error: null,
}

/** Haversine — distance entre 2 points GPS en mètres. */
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

/**
 * Track GPS continuously when isActive=true.
 * Accumule distance, D+, vitesse, max vitesse.
 */
export function useGPSTracking(isActive: boolean) {
  const [state, setState] = useState<GPSState>(INITIAL_STATE)
  const watchIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<GPSPoint | null>(null)

  useEffect(() => {
    if (!isActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState(s => ({ ...s, error: 'GPS non supporté sur ce navigateur', available: false }))
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: GPSPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          altitude: pos.coords.altitude,
          timestamp: pos.timestamp,
          speed: pos.coords.speed,
        }
        const speedKmh = pos.coords.speed != null && pos.coords.speed > 0
          ? pos.coords.speed * 3.6
          : 0

        setState(prev => {
          let distance = prev.distance
          let elevationGain = prev.elevationGain
          if (lastPointRef.current) {
            distance += haversine(lastPointRef.current, point)
            if (point.altitude != null && lastPointRef.current.altitude != null) {
              const diff = point.altitude - lastPointRef.current.altitude
              if (diff > 0) elevationGain += diff
            }
          }
          return {
            points: [...prev.points, point],
            currentSpeed: speedKmh,
            maxSpeed: Math.max(prev.maxSpeed, speedKmh),
            distance,
            elevationGain,
            currentAltitude: point.altitude,
            available: true,
            error: null,
          }
        })
        lastPointRef.current = point
      },
      (err) => setState(s => ({ ...s, error: err.message, available: false })),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isActive])

  return state
}
