export type BaseStylesFile = {
  version: number
  sources: {
    [key: string]: MapSource
  }
  layers: MapLayer[]
  sprite: string
  glyphs: string
}

export type MapSource = {
  type: 'vector' | 'raster' | 'raster-dem' | 'geojson' | 'image' | 'video'
  attribution?: string
  url: string
}

export type MapLayer = {
  'id': string
  'type': string
  'source'?: string
  'source-layer'?: string
  [key: string]: any
}

/** ISO 3166-1 alpha-2 country code (e.g. "DE", "FR", "US"). */
export type CountryCode = string

export type Country = {
  code: CountryCode
  code3: string
  name: string
  continent: string
  subregion: string
  population: number
}

export type CountryGroup = {
  id: string
  name: string
  description: string
  countries: CountryCode[]
}

export type MapExtractRequest = {
  countries: CountryCode[]
  maxzoom?: number
}

export type MapExtractPreflight = {
  tiles: number
  bytes: number
  source: {
    url: string
    date: string
    key: string
  }
}

/** Zoom used when a saved pin is chosen as the default map location. Same as pin fly-to. */
export const DEFAULT_MAP_HOME_PIN_ZOOM = 12
export const DEFAULT_MAP_VIEW_MIN_ZOOM = 0
export const DEFAULT_MAP_VIEW_MAX_ZOOM = 22

/** Persisted device-wide default map location (KV `maps.defaultView`). */
export type StoredDefaultMapView = {
  name: string | null
  longitude: number
  latitude: number
  zoom: number
  markerId: number | null
}

export type DefaultMapViewSource = 'custom' | 'marker' | 'marker-fallback'

/** Default location after resolving a live pin (or falling back to the snapshot). */
export type ResolvedDefaultMapView = StoredDefaultMapView & {
  source: DefaultMapViewSource
}

export type SetDefaultMapViewInput = {
  name?: string | null
  longitude?: number
  latitude?: number
  zoom?: number
  markerId?: number
}

export type DefaultMapViewMarkerLookup = {
  id: number
  name: string
  longitude: number
  latitude: number
} | null
