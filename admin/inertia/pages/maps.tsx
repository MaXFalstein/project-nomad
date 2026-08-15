import { useRef, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { IconArrowLeft } from '@tabler/icons-react'

import MapsLayout from '~/layouts/MapsLayout'
import MapComponent from '~/components/maps/MapComponent'
import type { MapViewActions } from '~/components/maps/MapComponent'
import StyledButton from '~/components/StyledButton'
import Alert from '~/components/Alert'
import api from '~/lib/api'
import { useNotifications } from '~/context/NotificationContext'

import { FileEntry } from '../../types/files'
import type { ResolvedDefaultMapView } from '../../types/maps'

export default function Maps(props: {
  maps: { baseAssetsExist: boolean; worldBasemapExists: boolean; regionFiles: FileEntry[] }
  defaultView: ResolvedDefaultMapView | null
}) {
  const { addNotification } = useNotifications()
  const [isHoveringUI, setIsHoveringUI] = useState(false)
  const [showMapCoordinates, setShowMapCoordinates] = useState(true)
  const [defaultView, setDefaultView] = useState<ResolvedDefaultMapView | null>(
    props.defaultView ?? null
  )
  const mapActionsRef = useRef<MapViewActions | null>(null)
  const [savingHome, setSavingHome] = useState(false)

  async function handleSetAsHome() {
    const view = mapActionsRef.current?.getCurrentView()
    if (!view) {
      addNotification({ type: 'error', message: 'The map is not ready yet.' })
      return
    }
    setSavingHome(true)
    try {
      const result = await api.setMapDefaultView({
        ...view,
        name: defaultView?.name || 'Home',
      })
      if (result?.defaultView) {
        setDefaultView(result.defaultView)
        addNotification({
          type: 'success',
          message: 'This view is now the default map location.',
        })
      }
    } finally {
      setSavingHome(false)
    }
  }

  const alertMessage = !props.maps.baseAssetsExist
    ? 'The base map assets have not been installed. Please download them first to enable map functionality.'
    : !props.maps.worldBasemapExists
    ? 'The world base map has not been downloaded yet, so the map may appear blank outside downloaded regions. Connect this NOMAD to the internet and download it (~15 MB) from Map Settings.'
    : props.maps.regionFiles.length === 0
    ? 'No map regions have been downloaded yet. Please download some regions to enable map functionality.'
    : null

  return (
    <MapsLayout>
      <Head title="Maps" />

      <div className="relative w-full h-screen overflow-hidden">
        {/* Navbar */}
        <div
          className="absolute top-0 left-0 right-0 z-50 flex justify-between p-4 bg-surface-secondary backdrop-blur-sm shadow-sm"
          onMouseEnter={() => setIsHoveringUI(true)}
          onMouseLeave={() => setIsHoveringUI(false)}
        >
          <Link href="/home" className="flex items-center">
            <IconArrowLeft className="mr-2" size={24} />
            <p className="text-lg text-text-secondary">Back to Home</p>
          </Link>

          <div className="flex items-center gap-3 mr-4">
            <button
              type="button"
              onClick={() => setShowMapCoordinates((prev) => !prev)}
              className="rounded px-3 py-2 text-sm bg-surface-primary text-text-secondary hover:opacity-80 transition"
            >
              {showMapCoordinates ? 'Hide Coordinates' : 'Show Coordinates'}
            </button>

            <StyledButton
              variant="secondary"
              icon="IconHome"
              onClick={handleSetAsHome}
              disabled={savingHome}
              loading={savingHome}
            >
              Set as home
            </StyledButton>

            <Link href="/settings/maps">
              <StyledButton variant="primary" icon="IconSettings">
                Manage Map Regions
              </StyledButton>
            </Link>
          </div>
        </div>

        {/* Alert */}
        {alertMessage && (
          <div
            className="absolute top-20 left-4 right-4 z-50"
            onMouseEnter={() => setIsHoveringUI(true)}
            onMouseLeave={() => setIsHoveringUI(false)}
          >
            <Alert
              title={alertMessage}
              type="warning"
              variant="solid"
              className="w-full"
              buttonProps={{
                variant: 'secondary',
                children: 'Go to Map Settings',
                icon: 'IconSettings',
                onClick: () => router.visit('/settings/maps'),
              }}
            />
          </div>
        )}

        {/* Map */}
        <div className="absolute inset-0">
          <MapComponent
            isHoveringUI={isHoveringUI}
            showCoordinatesEnabled={showMapCoordinates}
            defaultView={defaultView}
            onHomeChange={setDefaultView}
            actionsRef={mapActionsRef}
          />
        </div>
      </div>
    </MapsLayout>
  )
}
