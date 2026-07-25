import type { ReactNode } from 'react';
import {
  type DensityRegion,
  KakaoMap,
  type MapBounds,
  type MapCircle,
  type MapControls,
  type MapFocus,
  type MapMarker,
  type MapTrail,
} from '@components/KakaoMap';

interface MapShellProps {
  markers: MapMarker[];
  trails?: MapTrail[];
  circle?: MapCircle | null;
  focus?: MapFocus | null;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: () => void;
  onClusterClick?: (ids: number[]) => void;
  activeClusterIds?: number[] | null;
  onBoundsChange?: (bounds: MapBounds) => void;
  densityRegions?: DensityRegion[] | null;
  controlsRef?: React.RefObject<MapControls | null>;
  /** The visitor's own geolocated position — rendered as a pulsing "you are here" dot. */
  userLocation?: { lat: number; lng: number } | null;
  fitKey?: string | number;
  children?: ReactNode;
}

/**
 * The map fills the entire viewport as the background layer; everything
 * else (navbar, panels) floats on top via an overlay wrapper. The overlay
 * wrapper itself is pointer-events-none so clicks/drags reach the map in
 * the gaps between floating panels — each floating panel opts back into
 * pointer-events-auto individually.
 */
export function MapShell({
  markers,
  trails,
  circle,
  focus,
  onMarkerClick,
  onMapClick,
  onClusterClick,
  activeClusterIds,
  onBoundsChange,
  densityRegions,
  controlsRef,
  userLocation,
  fitKey,
  children,
}: MapShellProps) {
  return (
    <div className='fixed inset-0'>
      <KakaoMap
        background
        className='h-full w-full'
        markers={markers}
        trails={trails}
        circle={circle}
        focus={focus}
        onMarkerClick={onMarkerClick}
        onMapClick={onMapClick}
        onClusterClick={onClusterClick}
        activeClusterIds={activeClusterIds}
        onBoundsChange={onBoundsChange}
        densityRegions={densityRegions}
        controlsRef={controlsRef}
        userLocation={userLocation}
        fitKey={fitKey}
      />
      <div className='pointer-events-none absolute inset-0 z-10 flex flex-col'>{children}</div>
    </div>
  );
}
