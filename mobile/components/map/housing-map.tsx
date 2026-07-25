import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  EMPTY_MAP_STATE,
  KAKAO_KEY,
  WEBVIEW_BASE_URL,
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
  const webRef = useRef<WebView>(null);

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
      webRef.current?.injectJavaScript(
        `window.__setCamera && window.__setCamera(${coords.lat}, ${coords.lng}, ${nextLevel ?? 'undefined'}); true;`,
      );
    },
    zoom: (delta) => {
      webRef.current?.injectJavaScript(`window.__zoom && window.__zoom(${delta}); true;`);
    },
    fit: () => {
      webRef.current?.injectJavaScript('window.__fit && window.__fit(); true;');
    },
  }));

  const stateJson = safeJson(state);
  useEffect(() => {
    webRef.current?.injectJavaScript(`window.__setState && window.__setState(${stateJson}); true;`);
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
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html, baseUrl: WEBVIEW_BASE_URL }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
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
        }}
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
      <WebView
        style={styles.web}
        originWhitelist={['*']}
        source={{ html, baseUrl: WEBVIEW_BASE_URL }}
        javaScriptEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: Colors.lilacDim },
  web: { flex: 1, backgroundColor: 'transparent' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lilacDim,
    padding: Spacing.xl,
  },
  fallbackText: { textAlign: 'center' },
});
