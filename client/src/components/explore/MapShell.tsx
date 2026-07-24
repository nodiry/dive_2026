import type { ReactNode } from 'react';
import {
  KakaoMap,
  type MapBounds,
  type MapCircle,
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
  onBoundsChange?: (bounds: MapBounds) => void;
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
  onBoundsChange,
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
        onBoundsChange={onBoundsChange}
        fitKey={fitKey}
      />
      <div className='pointer-events-none absolute inset-0 z-10 flex flex-col'>{children}</div>
    </div>
  );
}
