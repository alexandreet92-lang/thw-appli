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

export function useGPSTracking(isActive: boolean): {
  gps: GPSState
  stopWatching: () => void
  resetTracking: () => void
} {
  const [state, setState] = useState<GPSState>(INITIAL_STATE)
  const watchIdRef   = useRef<number | null>(null)
  const lastPointRef = useRef<GPSPoint | null>(null)
  const activeRef    = useRef(isActive)
  useEffect(() => { activeRef.current = isActive }, [isActive])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const resetTracking = useCallback(() => {
    lastPointRef.current = null
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
        const { latitude, longitude, altitude, accuracy, speed } = pos.coords
        const point: GPSPoint = {
          lat: latitude,
          lng: longitude,
          altitude,
          timestamp: pos.timestamp,
          speed,
        }
        const status = accuracy != null
          ? (state.status === GPSStatus.requesting ? GPSStatus.acquiring : accuracyToStatus(accuracy))
          : GPSStatus.acquiring
        const speedKmh = speed != null && speed > 0 ? speed * 3.6 : 0

        setState(prev => {
          let distance       = prev.distance
          let elevationGain  = prev.elevationGain
          let gradient       = prev.gradient

          if (lastPointRef.current) {
            const d = haversine(lastPointRef.current, point)
            if (d > 0.5 && d < 200) {
              distance += d
              if (point.altitude != null && lastPointRef.current.altitude != null) {
                const dAlt = point.altitude - lastPointRef.current.altitude
                if (dAlt > 0) elevationGain += dAlt
                if (d > 0) gradient = (dAlt / d) * 100
              }
            }
          }

          const newStatus = prev.status === GPSStatus.requesting
            ? GPSStatus.acquiring
            : (accuracy != null ? accuracyToStatus(accuracy) : prev.status)

          return {
            status: newStatus,
            accuracy: accuracy ?? prev.accuracy,
            points: [...prev.points, point],
            currentSpeed: speedKmh,
            maxSpeed: Math.max(prev.maxSpeed, speedKmh),
            distance,
            elevationGain,
            currentAltitude: altitude,
            gradient,
            currentLat: latitude,
            currentLng: longitude,
          }
        })
        lastPointRef.current = point
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
