import {
  DEFAULT_MAP_VIEW_MAX_ZOOM,
  DEFAULT_MAP_VIEW_MIN_ZOOM,
  type DefaultMapViewMarkerLookup,
  type ResolvedDefaultMapView,
  type StoredDefaultMapView,
} from '../../types/maps.js'

export type MapViewCoords = {
  longitude: number
  latitude: number
  zoom: number
}

/**
 * Bounds-check a lon/lat/zoom triple. Used both for the stored default location
 * and for rejecting junk before it is written. Zoom may be fractional (MapLibre).
 */
export function isValidMapView(view: {
  longitude: unknown
  latitude: unknown
  zoom: unknown
}): view is MapViewCoords {
  return (
    typeof view.longitude === 'number' &&
    typeof view.latitude === 'number' &&
    typeof view.zoom === 'number' &&
    Number.isFinite(view.longitude) &&
    Number.isFinite(view.latitude) &&
    Number.isFinite(view.zoom) &&
    view.latitude >= -90 &&
    view.latitude <= 90 &&
    view.longitude >= -180 &&
    view.longitude <= 180 &&
    view.zoom >= DEFAULT_MAP_VIEW_MIN_ZOOM &&
    view.zoom <= DEFAULT_MAP_VIEW_MAX_ZOOM
  )
}

function parseName(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function parseMarkerId(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return undefined
  return value
}

/**
 * Parse the KV payload for `maps.defaultView`. Accepts a JSON string or an
 * already-decoded object. Returns null for anything that isn't a complete,
 * in-range location — same defensive stance as the per-browser last-view.
 */
export function parseStoredDefaultMapView(raw: unknown): StoredDefaultMapView | null {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  if (!isValidMapView(record)) return null

  const name = parseName(record.name)
  const markerId = parseMarkerId(record.markerId)
  if (name === undefined || markerId === undefined) return null

  return {
    name,
    longitude: record.longitude,
    latitude: record.latitude,
    zoom: record.zoom,
    markerId,
  }
}

/**
 * Resolve a stored default against the current pin (if any).
 * - marker still exists → live name/coords + stored zoom
 * - marker was deleted → snapshot coords (`marker-fallback`)
 * - no markerId → custom coords as stored
 */
export function resolveDefaultMapView(
  stored: StoredDefaultMapView,
  marker: DefaultMapViewMarkerLookup
): ResolvedDefaultMapView {
  if (stored.markerId != null) {
    if (marker && marker.id === stored.markerId) {
      return {
        name: marker.name,
        longitude: marker.longitude,
        latitude: marker.latitude,
        zoom: stored.zoom,
        markerId: stored.markerId,
        source: 'marker',
      }
    }
    return { ...stored, source: 'marker-fallback' }
  }
  return { ...stored, source: 'custom' }
}
