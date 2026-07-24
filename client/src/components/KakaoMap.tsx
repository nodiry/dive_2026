import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    // Kakao doesn't publish official types; scoped `any` here, nowhere else.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

// The initial view opens on Suyeong-gu (the sample data's heart) at a
// neighborhood-scale zoom, rather than fitting all of Busan.
const INITIAL_CENTER = { lat: 35.1454, lng: 129.1134 };
const INITIAL_LEVEL = 6;

// Busan-only service: the fullscreen map clamps panning to this box (the
// city proper plus a small margin, Gadeokdo to Gijang) and caps zoom-out so
// the whole-country view is unreachable. Kakao's SDK has no native
// maxBounds option — clamping on center/zoom changes is the standard way.
const BUSAN_BOUNDS = { minLat: 34.95, maxLat: 35.44, minLng: 128.7, maxLng: 129.38 };
const MAX_ZOOM_OUT_LEVEL = 10;

// Housing pins closer than this (in screen pixels) merge into a cluster
// bubble; clicking the cluster filters the list to its members.
const CLUSTER_PIXEL_RADIUS = 64;

let kakaoLoadPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (kakaoLoadPromise) return kakaoLoadPromise;
  kakaoLoadPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error('Kakao Maps SDK failed to load'));
    document.head.appendChild(script);
  });
  return kakaoLoadPromise;
}

export interface HousingMarker {
  kind: 'housing';
  id: number;
  lat: number;
  lng: number;
  label?: string;
  /** Shown inside the price-bubble pin (e.g. "4,260만원"). */
  priceLabel?: string;
  /** Top-3 ranking badge on the pin (preference mode). */
  rank?: number;
  selected?: boolean;
}

export interface PoiMarker {
  kind: 'poi';
  id: string;
  lat: number;
  lng: number;
  label?: string;
  categoryName: string;
  /** Hex color, e.g. from constants/poi.ts — data-driven, so this can't be a static Tailwind class. */
  color?: string;
}

export type MapMarker = HousingMarker | PoiMarker;

export interface MapTrail {
  id: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

export interface MapCircle {
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface MapFocus {
  lat: number;
  lng: number;
  /** Changing this triggers a pan — same coordinates with the same key won't re-pan. */
  key: number | string;
}

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

interface KakaoMapProps {
  markers: MapMarker[];
  trails?: MapTrail[];
  /** Search-radius visualization around the selected result. */
  circle?: MapCircle | null;
  /** Pan (smooth) to this point when `key` changes — e.g. selecting a result card. */
  focus?: MapFocus | null;
  onMarkerClick?: (marker: MapMarker) => void;
  /** Fired for clicks on the map base (not on a marker) — e.g. to clear selection. */
  onMapClick?: () => void;
  /** Fired when a cluster bubble is clicked, with its member housing ids. */
  onClusterClick?: (ids: number[]) => void;
  /** Fired after every pan/zoom settles, with the visible bounds. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Bump this (e.g. on a fresh submit) to refit the viewport to `markers`. Hover-only changes should NOT bump it. */
  fitKey?: string | number;
  /**
   * Render the map even with zero markers, centered on INITIAL_CENTER — for
   * fullscreen/background usage (the Explore screen). Detail-page-style
   * single-marker usage should leave this unset, so a not-yet-geocoded
   * housing project still shows the honest "no coordinates" placeholder.
   */
  background?: boolean;
  /** Locator mode: no dragging, no zooming — just centered on its marker. */
  staticView?: boolean;
  className?: string;
}

function isValidLatLng(m: { lat: number; lng: number }): boolean {
  return Number.isFinite(m.lat) && Number.isFinite(m.lng);
}

const TRAIL_DURATION_MS = 1800;

interface Cluster {
  members: HousingMarker[];
  lat: number;
  lng: number;
}

/**
 * Every empty state here is deliberate, not a blank box: no key, no
 * geocoded coordinates, and load failure each get their own message.
 *
 * The map instance mounts once and is never torn down for marker/trail
 * changes (only for a hard SDK load failure).
 */
export function KakaoMap({
  markers,
  trails = [],
  circle = null,
  focus = null,
  onMarkerClick,
  onMapClick,
  onClusterClick,
  onBoundsChange,
  fitKey,
  background = false,
  staticView = false,
  className = '',
}: KakaoMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kakao doesn't publish official types.
  const mapObjRef = useRef<any>(null);
  const cleanupFnsRef = useRef<(() => void)[]>([]);
  const markersRef = useRef(markers);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  const onClusterClickRef = useRef(onClusterClick);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Bumped after every pan/zoom settles so clusters recompute for the new scale.
  const [viewVersion, setViewVersion] = useState(0);
  const skippedInitialFitRef = useRef(false);

  useEffect(() => {
    markersRef.current = markers;
    onMarkerClickRef.current = onMarkerClick;
    onMapClickRef.current = onMapClick;
    onClusterClickRef.current = onClusterClick;
    onBoundsChangeRef.current = onBoundsChange;
  });

  const validMarkers = markers.filter(isValidLatLng);
  const showEmptyPlaceholder = !background && validMarkers.length === 0;
  const drawKey = JSON.stringify({ markers, trails, circle });

  // Mount the map instance once. Never re-run for data changes.
  useEffect(() => {
    if (!KAKAO_KEY) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current || mapObjRef.current) return;
        const { kakao } = window;
        const first = markersRef.current.find(isValidLatLng);
        const center = background
          ? new kakao.maps.LatLng(INITIAL_CENTER.lat, INITIAL_CENTER.lng)
          : first
            ? new kakao.maps.LatLng(first.lat, first.lng)
            : new kakao.maps.LatLng(INITIAL_CENTER.lat, INITIAL_CENTER.lng);
        const map = new kakao.maps.Map(containerRef.current, {
          center,
          level: background ? INITIAL_LEVEL : 5,
        });
        mapObjRef.current = map;

        if (staticView) {
          map.setDraggable(false);
          map.setZoomable(false);
        }

        kakao.maps.event.addListener(map, 'click', () => {
          onMapClickRef.current?.();
        });

        const emitView = () => {
          setViewVersion((v) => v + 1);
          const b = map.getBounds();
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          onBoundsChangeRef.current?.({
            swLat: sw.getLat(),
            swLng: sw.getLng(),
            neLat: ne.getLat(),
            neLng: ne.getLng(),
          });
        };
        kakao.maps.event.addListener(map, 'idle', emitView);
        emitView();

        if (background) {
          kakao.maps.event.addListener(map, 'center_changed', () => {
            const c = map.getCenter();
            const lat = Math.min(Math.max(c.getLat(), BUSAN_BOUNDS.minLat), BUSAN_BOUNDS.maxLat);
            const lng = Math.min(Math.max(c.getLng(), BUSAN_BOUNDS.minLng), BUSAN_BOUNDS.maxLng);
            if (lat !== c.getLat() || lng !== c.getLng()) {
              map.setCenter(new kakao.maps.LatLng(lat, lng));
            }
          });
          if (typeof map.setMaxLevel === 'function') {
            map.setMaxLevel(MAX_ZOOM_OUT_LEVEL);
          } else {
            kakao.maps.event.addListener(map, 'zoom_changed', () => {
              if (map.getLevel() > MAX_ZOOM_OUT_LEVEL) map.setLevel(MAX_ZOOM_OUT_LEVEL);
            });
          }
        }

        setStatus('ready');
      })
      .catch(() => setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [background, staticView]);

  // Redraw markers/clusters/trails whenever data or the viewport scale changes.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== 'ready') return;
    const { kakao } = window;

    for (const cleanup of cleanupFnsRef.current) cleanup();
    cleanupFnsRef.current = [];

    const addOverlay = (lat: number, lng: number, el: HTMLElement, yAnchor = 0.5) => {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(lat, lng),
        content: el,
        xAnchor: 0.5,
        yAnchor,
      });
      overlay.setMap(map);
      cleanupFnsRef.current.push(() => overlay.setMap(null));
    };

    const housing = markers.filter(
      (m): m is HousingMarker => m.kind === 'housing' && isValidLatLng(m),
    );
    const pois = markers.filter((m): m is PoiMarker => m.kind === 'poi' && isValidLatLng(m));

    // Screen-space greedy clustering — recomputed per zoom level (viewVersion).
    const proj = map.getProjection();
    const points = housing.map((m) => ({
      m,
      pt: proj.containerPointFromCoords(new kakao.maps.LatLng(m.lat, m.lng)),
    }));
    const used = new Set<number>();
    const clusters: Cluster[] = [];
    for (let i = 0; i < points.length; i++) {
      if (used.has(i)) continue;
      used.add(i);
      const members = [points[i].m];
      for (let j = i + 1; j < points.length; j++) {
        if (used.has(j)) continue;
        const dx = points[i].pt.x - points[j].pt.x;
        const dy = points[i].pt.y - points[j].pt.y;
        if (Math.hypot(dx, dy) < CLUSTER_PIXEL_RADIUS) {
          used.add(j);
          members.push(points[j].m);
        }
      }
      clusters.push({
        members,
        lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
        lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
      });
    }

    for (const cluster of clusters) {
      if (cluster.members.length === 1) {
        const m = cluster.members[0];
        const el = document.createElement('div');
        el.className = `flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs font-bold whitespace-nowrap shadow-md transition-colors ${
          m.selected
            ? 'border-terracotta bg-terracotta text-white'
            : 'border-slate-light/40 bg-white text-marine hover:border-terracotta/60'
        }`;
        if (m.rank !== undefined && m.rank <= 3) {
          const badge = document.createElement('span');
          badge.className = `flex size-4 items-center justify-center rounded-full text-[10px] text-white ${
            m.rank === 1 ? 'bg-gold' : m.selected ? 'bg-white/30' : 'bg-marine'
          }`;
          badge.textContent = String(m.rank);
          el.appendChild(badge);
        }
        const text = document.createElement('span');
        text.textContent = m.priceLabel ?? m.label ?? '';
        el.appendChild(text);
        if (m.label) el.title = m.label;
        el.addEventListener('click', () => onMarkerClickRef.current?.(m));
        addOverlay(m.lat, m.lng, el, 1);
      } else {
        const memberIds = cluster.members.map((m) => m.id);
        const containsSelected = cluster.members.some((m) => m.selected);
        const el = document.createElement('div');
        el.className = `flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-white font-mono text-xs font-bold shadow-lg transition-transform hover:scale-110 ${
          containsSelected ? 'bg-terracotta text-white' : 'bg-marine text-mist'
        }`;
        el.textContent = String(cluster.members.length);
        el.title = cluster.members.map((m) => m.label).join(', ');
        el.addEventListener('click', () => onClusterClickRef.current?.(memberIds));
        addOverlay(cluster.lat, cluster.lng, el);
      }
    }

    for (const m of pois) {
      const el = document.createElement('div');
      el.className = 'h-2.5 w-2.5 rounded-full border border-white shadow';
      el.style.backgroundColor = m.color ?? '#8a969a';
      if (m.label) el.title = m.label;
      addOverlay(m.lat, m.lng, el);
    }

    if (circle && isValidLatLng(circle)) {
      const radiusCircle = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(circle.lat, circle.lng),
        radius: circle.radiusMeters,
        strokeWeight: 2,
        strokeColor: '#e2592e',
        strokeOpacity: 0.7,
        strokeStyle: 'solid',
        fillColor: '#e2592e',
        fillOpacity: 0.06,
      });
      radiusCircle.setMap(map);
      cleanupFnsRef.current.push(() => radiusCircle.setMap(null));
    }

    for (const trail of trails) {
      const path = [
        new kakao.maps.LatLng(trail.fromLat, trail.fromLng),
        new kakao.maps.LatLng(trail.toLat, trail.toLng),
      ];
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: 2,
        strokeColor: '#c04824',
        strokeOpacity: 0.6,
        strokeStyle: 'shortdash',
      });
      polyline.setMap(map);

      const dot = document.createElement('div');
      dot.className = 'h-2 w-2 rounded-full bg-terracotta shadow';
      const dotOverlay = new kakao.maps.CustomOverlay({
        position: path[0],
        content: dot,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });
      dotOverlay.setMap(map);

      const start = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const progress = ((now - start) % TRAIL_DURATION_MS) / TRAIL_DURATION_MS;
        const lat = trail.fromLat + (trail.toLat - trail.fromLat) * progress;
        const lng = trail.fromLng + (trail.toLng - trail.fromLng) * progress;
        dotOverlay.setPosition(new kakao.maps.LatLng(lat, lng));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanupFnsRef.current.push(() => {
        cancelAnimationFrame(raf);
        polyline.setMap(null);
        dotOverlay.setMap(null);
      });
    }

    return () => {
      for (const cleanup of cleanupFnsRef.current) cleanup();
      cleanupFnsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawKey is the stable serialized form of markers+trails+circle
  }, [status, drawKey, viewVersion]);

  // Smooth-pan to the focused result when its key changes (card click / marker click).
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== 'ready' || !focus || !isValidLatLng(focus)) return;
    const { kakao } = window;
    map.panTo(new kakao.maps.LatLng(focus.lat, focus.lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus.key is the intentional trigger
  }, [status, focus?.key]);

  // Refit the viewport only when fitKey changes (or on first ready) — never on hover-only changes.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== 'ready') return;
    const { kakao } = window;
    const valid = markersRef.current.filter(isValidLatLng);
    if (valid.length === 0) return;
    // The background map opens on Suyeong-gu — don't override that with a
    // fit-all on the first data arrival; only refit on later set changes.
    if (background && !skippedInitialFitRef.current) {
      skippedInitialFitRef.current = true;
      return;
    }
    if (valid.length === 1) {
      map.setCenter(new kakao.maps.LatLng(valid[0].lat, valid[0].lng));
      return;
    }
    const bounds = new kakao.maps.LatLngBounds();
    for (const m of valid) bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
    if (background) {
      // Padding (top, right, bottom, left) keeps pins clear of the header,
      // the right list panel, and the floating filter button.
      map.setBounds(bounds, 48, 396, 48, 48);
    } else {
      map.setBounds(bounds);
    }
  }, [status, fitKey, background]);

  const placeholder = (message: string, detail: string) => (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-light/50 bg-mist-dim p-8 text-center ${className}`}
    >
      <p className='font-medium text-marine'>{message}</p>
      <p className='text-sm text-slate'>{detail}</p>
    </div>
  );

  if (!KAKAO_KEY) return placeholder(t('map.noKeyTitle'), t('map.noKeyDetail'));
  if (status === 'error') return placeholder(t('map.errorTitle'), t('map.errorDetail'));
  if (showEmptyPlaceholder) return placeholder(t('map.noCoordsTitle'), t('map.noCoordsDetail'));

  return (
    <div
      ref={containerRef}
      className={className}
    />
  );
}
