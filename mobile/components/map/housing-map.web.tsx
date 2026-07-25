import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  EMPTY_MAP_STATE,
  KAKAO_KEY,
  buildKakaoMapHtml,
  buildRoadviewHtml,
  safeJson,
  type MapState,
} from '@/components/map/kakao-map-html';
import { Txt } from '@/components/ui/txt';
import { Colors, Spacing } from '@/constants/theme';

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface MapHandle {
  moveTo: (coords: { lat: number; lng: number }, level?: number) => void;
  zoom: (delta: number) => void;
  fit: () => void;
}

interface HousingMapProps {
  state?: Partial<MapState>;
  interactive?: boolean;
  level?: number;
  fitOnLoad?: boolean;
  /** Initial camera target; without it the document opens on the Busan default. */
  center?: { lat: number; lng: number };
  onMarkerPress?: (id: number) => void;
  onClusterPress?: (ids: number[]) => void;
  onMapPress?: () => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  style?: StyleProp<ViewStyle>;
}

type MapWindow = Window & {
  __setState?: (patch: Partial<MapState>) => void;
  __setCamera?: (lat: number, lng: number, level?: number) => void;
  __zoom?: (delta: number) => void;
  __fit?: () => void;
};

export const HousingMap = forwardRef<MapHandle, HousingMapProps>(function HousingMap(
  {
    state = EMPTY_MAP_STATE,
    interactive = true,
    level = 7,
    fitOnLoad = false,
    center,
    onMarkerPress,
    onClusterPress,
    onMapPress,
    onBoundsChange,
    style,
  },
  ref,
) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Built once. Later data goes through the bridge instead, since rebuilding
  // the document would reload the Kakao SDK and drop the user's viewport.
  const html = useMemo(
    () =>
      buildKakaoMapHtml({
        state,
        level,
        interactive,
        fitOnLoad,
        center: center ? { latitude: center.lat, longitude: center.lng } : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useImperativeHandle(ref, () => ({
    moveTo: (coords, nextLevel) => {
      const win = frameRef.current?.contentWindow as MapWindow | undefined;
      win?.__setCamera?.(coords.lat, coords.lng, nextLevel);
    },
    zoom: (delta) => {
      const win = frameRef.current?.contentWindow as MapWindow | undefined;
      win?.__zoom?.(delta);
    },
    fit: () => {
      const win = frameRef.current?.contentWindow as MapWindow | undefined;
      win?.__fit?.();
    },
  }));

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      try {
        const payload = JSON.parse(String(event.data)) as {
          type: string;
          id?: number;
          ids?: number[];
        } & MapBounds;
        if (payload.type === 'markerClick' && payload.id != null) onMarkerPress?.(payload.id);
        else if (payload.type === 'clusterClick' && payload.ids) onClusterPress?.(payload.ids);
        else if (payload.type === 'mapClick') onMapPress?.();
        else if (payload.type === 'bounds') {
          onBoundsChange?.({
            swLat: payload.swLat,
            swLng: payload.swLng,
            neLat: payload.neLat,
            neLng: payload.neLng,
          });
        }
      } catch {
        return;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMarkerPress, onClusterPress, onMapPress, onBoundsChange]);

  const stateJson = safeJson(state);
  useEffect(() => {
    const win = frameRef.current?.contentWindow as MapWindow | undefined;
    win?.__setState?.(JSON.parse(stateJson));
  }, [stateJson]);

  if (!KAKAO_KEY) {
    return (
      <View style={[styles.fallback, style]}>
        <Txt variant="body" color="slate" style={styles.fallbackText}>
          {t('map.noKey')}
        </Txt>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={frameRef}
        srcDoc={html}
        style={{ border: 'none', width: '100%', height: '100%' }}
        title="map"
      />
    </View>
  );
});

export function RoadviewPanel({
  lat,
  lng,
  style,
}: {
  lat: number;
  lng: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const html = useMemo(() => buildRoadviewHtml(lat, lng, t('map.noRoadview')), [lat, lng, t]);

  if (!KAKAO_KEY) {
    return (
      <View style={[styles.fallback, style]}>
        <Txt variant="body" color="slate" style={styles.fallbackText}>
          {t('map.noKey')}
        </Txt>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <iframe
        srcDoc={html}
        style={{ border: 'none', width: '100%', height: '100%' }}
        title="roadview"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: Colors.lilacDim },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lilacDim,
    padding: Spacing.xl,
  },
  fallbackText: { textAlign: 'center' },
});
