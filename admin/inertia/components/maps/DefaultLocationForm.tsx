import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Input from '~/components/inputs/Input'
import Select from '~/components/inputs/Select'
import StyledButton from '~/components/StyledButton'
import StyledSectionHeader from '~/components/StyledSectionHeader'
import api from '~/lib/api'
import { useNotifications } from '~/context/NotificationContext'
import {
  DEFAULT_MAP_HOME_PIN_ZOOM,
  DEFAULT_MAP_VIEW_MAX_ZOOM,
  DEFAULT_MAP_VIEW_MIN_ZOOM,
  type ResolvedDefaultMapView,
} from '../../../types/maps'

const NONE = ''

function formatCoord(n: number): string {
  return Number.isFinite(n) ? String(n) : ''
}

function describeSaved(view: ResolvedDefaultMapView): string {
  const coords = `${view.latitude.toFixed(4)}, ${view.longitude.toFixed(4)} · zoom ${view.zoom}`
  if (view.source === 'marker') {
    return `Using saved pin “${view.name ?? 'Untitled'}” (${coords})`
  }
  if (view.source === 'marker-fallback') {
    return `Saved pin is gone — using last known coordinates (${coords})`
  }
  return `${view.name ?? 'Custom location'} (${coords})`
}

export default function DefaultLocationForm({
  defaultView,
}: {
  defaultView: ResolvedDefaultMapView | null
}) {
  const { addNotification } = useNotifications()
  const [saved, setSaved] = useState<ResolvedDefaultMapView | null>(defaultView)
  const [name, setName] = useState(defaultView?.name ?? '')
  const [latitude, setLatitude] = useState(defaultView ? formatCoord(defaultView.latitude) : '')
  const [longitude, setLongitude] = useState(defaultView ? formatCoord(defaultView.longitude) : '')
  const [zoom, setZoom] = useState(defaultView ? formatCoord(defaultView.zoom) : '')
  const [markerId, setMarkerId] = useState<string>(
    defaultView?.source === 'marker' && defaultView.markerId != null
      ? String(defaultView.markerId)
      : NONE
  )
  const [error, setError] = useState<string | null>(null)

  const { data: markers = [] } = useQuery({
    queryKey: ['map-markers'],
    queryFn: async () => (await api.listMapMarkers()) ?? [],
    refetchOnWindowFocus: false,
  })

  const pinOptions = useMemo(
    () => [
      { value: NONE, label: 'Custom location' },
      ...markers.map((m) => ({ value: String(m.id), label: m.name })),
    ],
    [markers]
  )

  function applyPin(id: string) {
    const wasCustom = markerId === NONE
    setMarkerId(id)
    setError(null)
    if (id === NONE) return
    const marker = markers.find((m) => String(m.id) === id)
    if (!marker) return
    setName(marker.name)
    setLatitude(formatCoord(marker.latitude))
    setLongitude(formatCoord(marker.longitude))
    if (wasCustom || zoom.trim() === '') {
      setZoom(String(DEFAULT_MAP_HOME_PIN_ZOOM))
    }
  }

  function handleCoordChange(field: 'latitude' | 'longitude', value: string) {
    if (field === 'latitude') setLatitude(value)
    else setLongitude(value)
    setMarkerId(NONE)
    setError(null)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (markerId !== NONE) {
        const zoomNum = zoom.trim() === '' ? DEFAULT_MAP_HOME_PIN_ZOOM : Number(zoom)
        if (
          !Number.isFinite(zoomNum) ||
          zoomNum < DEFAULT_MAP_VIEW_MIN_ZOOM ||
          zoomNum > DEFAULT_MAP_VIEW_MAX_ZOOM
        ) {
          throw new Error(`Zoom must be between ${DEFAULT_MAP_VIEW_MIN_ZOOM} and ${DEFAULT_MAP_VIEW_MAX_ZOOM}.`)
        }
        const result = await api.setMapDefaultView({
          markerId: Number(markerId),
          zoom: zoomNum,
          name: name.trim() || null,
        })
        if (!result) throw new Error('Failed to save default location.')
        return result.defaultView
      }

      const lat = Number(latitude)
      const lng = Number(longitude)
      const z = Number(zoom)
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(z)) {
        throw new Error('Enter a latitude, longitude, and zoom, or pick a saved pin.')
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Latitude must be between -90 and 90, longitude between -180 and 180.')
      }
      if (z < DEFAULT_MAP_VIEW_MIN_ZOOM || z > DEFAULT_MAP_VIEW_MAX_ZOOM) {
        throw new Error(`Zoom must be between ${DEFAULT_MAP_VIEW_MIN_ZOOM} and ${DEFAULT_MAP_VIEW_MAX_ZOOM}.`)
      }
      const result = await api.setMapDefaultView({
        name: name.trim() || null,
        latitude: lat,
        longitude: lng,
        zoom: z,
      })
      if (!result) throw new Error('Failed to save default location.')
      return result.defaultView
    },
    onSuccess: (view) => {
      setSaved(view)
      setName(view.name ?? '')
      setLatitude(formatCoord(view.latitude))
      setLongitude(formatCoord(view.longitude))
      setZoom(formatCoord(view.zoom))
      setMarkerId(view.source === 'marker' && view.markerId != null ? String(view.markerId) : NONE)
      setError(null)
      addNotification({ type: 'success', message: 'Default map location saved.' })
    },
    onError: (err: Error) => {
      setError(err.message)
      addNotification({ type: 'error', message: err.message })
    },
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      const result = await api.clearMapDefaultView()
      if (!result) throw new Error('Failed to clear default location.')
    },
    onSuccess: () => {
      setSaved(null)
      setName('')
      setLatitude('')
      setLongitude('')
      setZoom('')
      setMarkerId(NONE)
      setError(null)
      addNotification({ type: 'success', message: 'Default map location cleared.' })
    },
    onError: (err: Error) => {
      setError(err.message)
      addNotification({ type: 'error', message: err.message })
    },
  })

  const busy = saveMutation.isPending || clearMutation.isPending

  return (
    <div className="mt-12">
      <StyledSectionHeader title="Default map location" />
      <div className="bg-surface-primary rounded-lg border-2 border-border-subtle p-6">
        <p className="text-sm text-text-secondary mb-4">
          First visit in a browser uses this location. After that, this browser remembers where you
          left off.
        </p>
        <p className="text-sm text-text-muted mb-4">
          {saved
            ? describeSaved(saved)
            : 'Not set — the map opens over the United States until a browser has a last-view of its own.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            name="home-pin"
            label="Use a saved pin"
            value={markerId}
            onChange={applyPin}
            options={pinOptions}
            placeholder="Custom location"
          />
          <Input
            name="home-name"
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder="Home"
          />
          <Input
            name="home-latitude"
            label="Latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={(e) => handleCoordChange('latitude', e.target.value)}
            placeholder="52.52"
          />
          <Input
            name="home-longitude"
            label="Longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(e) => handleCoordChange('longitude', e.target.value)}
            placeholder="13.405"
          />
          <Input
            name="home-zoom"
            label="Zoom"
            type="number"
            step="any"
            min={DEFAULT_MAP_VIEW_MIN_ZOOM}
            max={DEFAULT_MAP_VIEW_MAX_ZOOM}
            value={zoom}
            onChange={(e) => {
              setZoom(e.target.value)
              setError(null)
            }}
            placeholder={String(DEFAULT_MAP_HOME_PIN_ZOOM)}
            helpText={`0 (world) to ${DEFAULT_MAP_VIEW_MAX_ZOOM} (street). Pins default to ${DEFAULT_MAP_HOME_PIN_ZOOM}.`}
          />
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          <StyledButton
            variant="primary"
            icon="IconHome"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={busy}
          >
            Save location
          </StyledButton>
          <StyledButton
            variant="secondary"
            onClick={() => clearMutation.mutate()}
            loading={clearMutation.isPending}
            disabled={busy || !saved}
          >
            Clear
          </StyledButton>
        </div>
      </div>
    </div>
  )
}
