import { useState, useEffect } from 'react'
import { Incident, activeAssignment, RouteInfo } from '../lib/api'
import { RouteLine } from './MapView'

// Global cache for live street-level OSRM road coordinates
const STREET_ROUTE_CACHE = new Map<string, RouteInfo>()
const LISTENERS = new Set<() => void>()

function notifyListeners() {
  LISTENERS.forEach(fn => fn())
}

/**
 * Fetches real shortest street route from OpenStreetMap OSRM Road Network API.
 * Maps through actual streets, avenues, and highways with turn-by-turn road geometry.
 */
export async function fetchLiveStreetRoute(
  from: [number, number],
  to: [number, number]
): Promise<RouteInfo | null> {
  const key = `${from[0].toFixed(5)},${from[1].toFixed(5)}_${to[0].toFixed(5)},${to[1].toFixed(5)}`
  if (STREET_ROUTE_CACHE.has(key)) {
    return STREET_ROUTE_CACHE.get(key)!
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = await res.json()
      if (data?.routes?.[0]?.geometry?.coordinates?.length) {
        const roadCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]
        )
        const distKm = Number((data.routes[0].distance / 1000).toFixed(1))
        const etaMin = Math.max(1, Math.round(data.routes[0].duration / 60))
        const routeInfo: RouteInfo = {
          coords: roadCoords,
          distance_km: distKm,
          eta_min: etaMin,
          simulated: false,
          label: `Shortest Street Route (${distKm} km · ETA ${etaMin} min via Road Network)`
        }
        STREET_ROUTE_CACHE.set(key, routeInfo)
        notifyListeners()
        return routeInfo
      }
    }
  } catch {
    // offline or network fallback
  }
  return null
}

// Builds real street route lines to draw on the map (Google Maps style)
export function routesFor(inc?: Incident | null): RouteLine[] {
  const a = activeAssignment(inc)
  if (!inc || !a) return []
  const out: RouteLine[] = []

  // 1. Scene Navigation Route (Ambulance -> Accident Scene)
  if (a.scene_route && ['offered', 'en_route'].includes(a.status)) {
    let coords = a.scene_route.coords
    const from = coords[0]
    const to = coords[coords.length - 1]

    if (from && to && coords.length <= 4) {
      const key = `${from[0].toFixed(5)},${from[1].toFixed(5)}_${to[0].toFixed(5)},${to[1].toFixed(5)}`
      const cached = STREET_ROUTE_CACHE.get(key)
      if (cached) {
        coords = cached.coords
        a.scene_route.coords = cached.coords
        a.scene_route.distance_km = cached.distance_km
        a.scene_route.eta_min = cached.eta_min
          ; (a.scene_route as any).simulated = false
      } else {
        fetchLiveStreetRoute(from, to)
      }
    }

    const isSim = (a.scene_route as any)?.simulated === true && coords.length <= 4
    out.push({
      coords,
      color: '#173B68', // Deep Enterprise Blue
      label: `🚑 ${a.ambulance_code} → Incident Scene (${a.scene_route.distance_km} km · ETA ${a.scene_route.eta_min} min [${isSim ? 'Calculating Street Route…' : 'Shortest Road Route'}])`
    })
  }

  // 2. Hospital Transfer Route (Accident Scene -> Emergency Hospital)
  if (a.hospital_route && ['on_scene', 'transporting', 'at_hospital'].includes(a.status)) {
    let coords = a.hospital_route.coords
    const from = coords[0]
    const to = coords[coords.length - 1]

    if (from && to && coords.length <= 4) {
      const key = `${from[0].toFixed(5)},${from[1].toFixed(5)}_${to[0].toFixed(5)},${to[1].toFixed(5)}`
      const cached = STREET_ROUTE_CACHE.get(key)
      if (cached) {
        coords = cached.coords
        a.hospital_route.coords = cached.coords
        a.hospital_route.distance_km = cached.distance_km
        a.hospital_route.eta_min = cached.eta_min
          ; (a.hospital_route as any).simulated = false
      } else {
        fetchLiveStreetRoute(from, to)
      }
    }

    const isSim = (a.hospital_route as any)?.simulated === true && coords.length <= 4
    out.push({
      coords,
      color: '#198754', // Hospital transfer green corridor
      dashed: a.status === 'on_scene',
      label: `🏥 Scene → ${a.hospital_name || 'Designated Hospital'} (${a.hospital_route.distance_km} km · ETA ${a.hospital_route.eta_min} min [${isSim ? 'Calculating Street Route…' : 'Shortest Road Route'}])`
    })
  }

  return out
}

/**
 * React hook that returns route lines and automatically re-renders
 * as soon as high-precision street-level OSRM road coordinates are resolved.
 */
export function useLiveStreetRoutes(inc?: Incident | null): RouteLine[] {
  const [, setTick] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1)
    LISTENERS.add(handleUpdate)
    return () => {
      LISTENERS.delete(handleUpdate)
    }
  }, [])

  return routesFor(inc)
}
