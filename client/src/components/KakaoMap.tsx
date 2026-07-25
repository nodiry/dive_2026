import { type LucideIcon, MapPin } from 'lucide-react';
import { createElement, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useTranslation } from 'react-i18next';
import { KAKAO_KEY, loadKakaoSdk } from '@utils/kakaoSdk';

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
  icon?: LucideIcon;
  /** The nearest match in its category — the one actually animated. Others render as plain smaller anchors. */
  highlighted?: boolean;
}

export type MapMarker = HousingMarker | PoiMarker;

export interface TrailPoint {
  lat: number;
  lng: number;
}

export interface MapTrail {
  id: string;
  /** Ordered points from the housing project to the matched POI. */
  path: TrailPoint[];
  distanceMeters?: number;
  durationMinutes?: number;
  /** Ties the line + dot + tag to the destination's category color (e.g. from poiColorForCategoryName). */
  color?: string;
  /** 'subtle' renders a faint static connector (tier-2 anchors); default is the animated primary trail. */
  emphasis?: 'primary' | 'subtle';
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

/** Imperative handle for external map buttons (zoom cluster, geolocate, district focus). */
export interface MapControls {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Smooth-pan to a point at the current zoom (e.g. the user's location). */
  panTo: (lat: number, lng: number) => void;
  /** Jump to a district-scale view of a point (e.g. a selected 구). */
  focusRegion: (lat: number, lng: number) => void;
  /** Frame every current marker — for recovering from a pan that left the results behind. */
  fitToResults: () => void;
}

export interface DensityRegion {
  emdName: string;
  densityPerKm2: number;
  areaKm2: number;
  centroidLat: number;
  centroidLng: number;
}

export interface DistrictBoundary {
  sggCode: string;
  rings: number[][][];
}

// Heat ramp (cool lavender -> violet -> hot gold), sampled into a 256-entry
// lookup for colorizing the grayscale heat accumulation.
const HEAT_STOPS: [number, string][] = [
  [0.0, 'rgba(138, 118, 201, 0)'],
  [0.25, 'rgba(138, 118, 201, 0.32)'],
  [0.55, 'rgba(109, 74, 255, 0.5)'],
  [0.8, 'rgba(217, 164, 65, 0.62)'],
  [1.0, 'rgba(201, 138, 31, 0.75)'],
];

/**
 * Density is long-tailed: with the 선도소프트 grid interpolated onto 법정동 the
 * median is ~8k/km² against a ~50k max, so anchoring the ramp on the maximum
 * normalizes the whole city into the cool band and the gold end is
 * unreachable. Anchor on a high percentile and clamp instead, so the top
 * decile actually reads hot.
 */
const HEAT_REFERENCE_PERCENTILE = 0.95;
const HEAT_CURVE = 0.6;

function heatReference(regions: DensityRegion[]): number {
  const sorted = regions.map((r) => r.densityPerKm2).sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * HEAT_REFERENCE_PERCENTILE);
  return sorted[index] || 1;
}

let heatLutCache: Uint8ClampedArray | null = null;

function heatLut(): Uint8ClampedArray {
  if (heatLutCache) return heatLutCache;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [stop, color] of HEAT_STOPS) gradient.addColorStop(stop, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);
  heatLutCache = ctx.getImageData(0, 0, 256, 1).data;
  return heatLutCache;
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
  /** The clicked cluster's member ids — its bubble renders highlighted while the list is filtered to it. */
  activeClusterIds?: number[] | null;
  /** Fired after every pan/zoom settles, with the visible bounds. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Population-density choropleth polygons, drawn beneath all pins. */
  densityRegions?: DensityRegion[] | null;
  /** Selected 구/군 focus overlay, hidden when no district filter is active. */
  districtBoundary?: DistrictBoundary | null;
  /** Bump this (e.g. on a fresh submit) to refit the viewport to `markers`. Hover-only changes should NOT bump it. */
  fitKey?: string | number;
  /**
   * Render the map even with zero markers, centered on INITIAL_CENTER — for
   * fullscreen/background usage (the Explore screen). Detail-page-style
   * single-marker usage should leave this unset, so a not-yet-geocoded
   * housing project still shows the honest "no coordinates" placeholder.
   */
  background?: boolean;
  /** Background maps skip their first fit-to-markers (Explore opens on Suyeong); set this for bounded background maps that SHOULD fit their results immediately (e.g. the AI chat's map widget). */
  fitOnLoad?: boolean;
  /** Free to drag/zoom, but clamped to Busan and zoom-capped like the background map — for inline result maps that shouldn't wander off to Seoul. */
  bounded?: boolean;
  /** Populated with the imperative MapControls handle once the map is ready. */
  controlsRef?: React.RefObject<MapControls | null>;
  /** The visitor's own geolocated position — rendered as a pulsing "you are here" dot, independent of the markers array. */
  userLocation?: { lat: number; lng: number } | null;
  /** Locator mode: no dragging, no zooming — just centered on its marker. */
  staticView?: boolean;
  className?: string;
}

function isValidLatLng(m: { lat: number; lng: number }): boolean {
  return Number.isFinite(m.lat) && Number.isFinite(m.lng);
}

// The animated dot travels the route at a roughly constant real-world pace,
// clamped so a short hop still reads as motion and a long one doesn't crawl.
const TRAIL_MIN_DURATION_MS = 1400;
const TRAIL_MAX_DURATION_MS = 5000;
const TRAIL_METERS_PER_MS = 0.12;

interface Cluster {
  members: HousingMarker[];
  lat: number;
  lng: number;
}

// Kakao zoom levels run low (close) to high (far) — shrink housing tags as
// the map zooms out so a city-wide view doesn't drown in oversized pills,
// and grow them on zoom-in so a single block reads clearly at a glance.
function housingTagScale(level: number): number {
  const clamped = Math.min(Math.max(level, 1), 10);
  return Math.max(0.55, 1.25 - (clamped - 3) * 0.09);
}

function formatTrailDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

function latLngDistanceMeters(
  a: { getLat: () => number; getLng: () => number },
  b: { getLat: () => number; getLng: () => number },
): number {
  const meanLat = ((a.getLat() + b.getLat()) / 2) * (Math.PI / 180);
  const dLat = (b.getLat() - a.getLat()) * 111320;
  const dLng = (b.getLng() - a.getLng()) * 111320 * Math.cos(meanLat);
  return Math.hypot(dLat, dLng);
}

// Kakao derives the map 'click' from the mousedown/mouseup pair on the
// container, so EVERY clickable overlay must stop the whole pointer
// sequence — otherwise the synthesized map click also fires and clears the
// selection/cluster state the overlay's own handler just set.
function stopPointerSequence(el: HTMLElement) {
  for (const eventName of ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend']) {
    el.addEventListener(eventName, (e) => e.stopPropagation());
  }
}

/** Cumulative arc-length (meters) at each point of a path — equirectangular approx, fine at neighborhood scale. */
function arcLengths(points: TrailPoint[]): { cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = (b.lat - a.lat) * 111320;
    const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
    cum.push(cum[i - 1] + Math.hypot(dLat, dLng));
  }
  return { cum, total: cum[cum.length - 1] };
}

/** The point along `points` at `fraction` (0..1) of its total arc length. */
function pointAtFraction(
  points: TrailPoint[],
  cum: number[],
  total: number,
  fraction: number,
): TrailPoint {
  if (total === 0) return points[0];
  const targetDist = fraction * total;
  let i = 1;
  while (i < cum.length && cum[i] < targetDist) i++;
  i = Math.min(i, points.length - 1);
  const segStart = cum[i - 1];
  const segLen = cum[i] - segStart || 1;
  const t = (targetDist - segStart) / segLen;
  const a = points[i - 1];
  const b = points[i];
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

/**
 * Frame every valid marker. Shared by the fitKey effect and the explicit
 * fitToResults control so both pad the viewport identically (the background
 * map has to clear the header, the right list panel, and the filter button).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kakao doesn't publish official types.
function fitMapToMarkers(map: any, candidates: MapMarker[], background: boolean): void {
  const { kakao } = window;
  const valid = candidates.filter(isValidLatLng);
  if (valid.length === 0) return;
  if (valid.length === 1) {
    map.setCenter(new kakao.maps.LatLng(valid[0].lat, valid[0].lng));
    return;
  }
  const bounds = new kakao.maps.LatLngBounds();
  for (const m of valid) bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
  if (background) map.setBounds(bounds, 48, 396, 48, 48);
  else map.setBounds(bounds);
}

const BUBBLE_BASE =
  'flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 font-mono text-sm font-bold whitespace-nowrap shadow-lg transition-colors ';
const TAIL_BASE = '-mt-1.5 size-3 rotate-45 border-r-2 border-b-2 ';
const BADGE_BASE = 'flex size-5 items-center justify-center rounded-full text-[11px] text-white ';
const CLUSTER_BASE =
  'flex size-11 cursor-pointer items-center justify-center rounded-full border-2 border-white font-mono text-sm font-bold select-none shadow-lg transition-transform hover:scale-110 ';

/**
 * A drawn housing overlay and the nodes whose colors depend on selection.
 * Kept so hover/selection can recolor in place instead of forcing the
 * geometry pass (clustering + ~350 overlay rebuilds) to run again.
 */
type MarkerHandle =
  | {
      kind: 'single';
      id: number;
      bubble: HTMLElement;
      tail: HTMLElement;
      badge: HTMLElement | null;
      rank?: number;
    }
  | { kind: 'cluster'; ids: number[]; el: HTMLElement; active: boolean };

function paintSelection(handles: MarkerHandle[], activeIds: Set<number>): void {
  for (const handle of handles) {
    if (handle.kind === 'single') {
      const on = activeIds.has(handle.id);
      handle.bubble.className =
        BUBBLE_BASE +
        (on
          ? 'border-violet bg-violet text-white'
          : 'border-slate-light/40 bg-white text-plum hover:border-violet/60');
      handle.tail.className =
        TAIL_BASE + (on ? 'border-violet bg-violet' : 'border-slate-light/40 bg-white');
      if (handle.badge) {
        handle.badge.className =
          BADGE_BASE + (handle.rank === 1 ? 'bg-gold' : on ? 'bg-white/30' : 'bg-plum');
      }
      continue;
    }
    const containsSelected = handle.ids.some((id) => activeIds.has(id));
    handle.el.className =
      CLUSTER_BASE +
      (handle.active
        ? 'bg-violet text-white ring-4 ring-violet/30'
        : containsSelected
          ? 'bg-violet text-white'
          : 'bg-plum text-lilac');
  }
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
  densityRegions = null,
  districtBoundary = null,
  activeClusterIds = null,
  fitKey,
  background = false,
  fitOnLoad = false,
  bounded = false,
  controlsRef,
  userLocation = null,
  staticView = false,
  className = '',
}: KakaoMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kakao doesn't publish official types.
  const mapObjRef = useRef<any>(null);
  const cleanupFnsRef = useRef<(() => void)[]>([]);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kakao doesn't publish official types.
  const heatOverlayRef = useRef<any>(null);
  const markersRef = useRef(markers);
  const markerHandlesRef = useRef<MarkerHandle[]>([]);
  const activeIdsRef = useRef<Set<number>>(new Set());
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  const onClusterClickRef = useRef(onClusterClick);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Bumped after every pan/zoom settles so clusters recompute for the new scale.
  const [viewVersion, setViewVersion] = useState(0);
  const skippedInitialFitRef = useRef(false);
  // Set by an explicit controlsRef.panTo/focusRegion call — the debounced
  // search results that land moments later would otherwise re-trigger the
  // fit-to-markers effect below and immediately undo that manual pan (e.g.
  // clearing a district filter snapping back out to all of Busan right
  // after landing on Seomyeon). Consumed once, then normal auto-fit resumes.
  const suppressNextFitRef = useRef(false);

  useEffect(() => {
    markersRef.current = markers;
    onMarkerClickRef.current = onMarkerClick;
    onMapClickRef.current = onMapClick;
    onClusterClickRef.current = onClusterClick;
    onBoundsChangeRef.current = onBoundsChange;
  });

  const validMarkers = markers.filter(isValidLatLng);
  const showEmptyPlaceholder = !background && validMarkers.length === 0;

  // Two keys, deliberately. `geometryKey` covers everything that changes what
  // gets DRAWN; `selectedKey` covers what only changes an existing node's
  // color. Folding selection into one key made every list hover re-cluster
  // and rebuild ~350 overlays. Built by concatenation rather than
  // JSON.stringify: the old serialized form was 46KB per render.
  const geometryParts: string[] = [];
  for (const m of markers) {
    geometryParts.push(
      m.kind === 'housing'
        ? `h${m.id}:${m.lat}:${m.lng}:${m.priceLabel ?? m.label ?? ''}:${m.rank ?? ''}`
        : `p${m.id}:${m.lat}:${m.lng}:${m.highlighted ? 1 : 0}:${m.color ?? ''}`,
    );
  }
  for (const trail of trails) {
    geometryParts.push(
      `t${trail.id}:${trail.emphasis ?? ''}:${trail.path.length}:${trail.color ?? ''}`,
    );
  }
  if (circle) geometryParts.push(`c${circle.lat}:${circle.lng}:${circle.radiusMeters}`);
  if (activeClusterIds) geometryParts.push(`a${activeClusterIds.join('.')}`);
  const geometryKey = geometryParts.join('|');

  const selectedKey = markers
    .filter((m): m is HousingMarker => m.kind === 'housing' && Boolean(m.selected))
    .map((m) => m.id)
    .join(',');

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

        kakao.maps.event.addListener(map, 'zoom_start', () => {
          if (heatCanvasRef.current) heatCanvasRef.current.style.opacity = '0';
        });

        if (background || bounded) {
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

        if (controlsRef) {
          controlsRef.current = {
            zoomIn: () => map.setLevel(map.getLevel() - 1, { animate: true }),
            zoomOut: () => map.setLevel(map.getLevel() + 1, { animate: true }),
            panTo: (lat: number, lng: number) => {
              suppressNextFitRef.current = true;
              map.panTo(new kakao.maps.LatLng(lat, lng));
            },
            focusRegion: (lat: number, lng: number) => {
              suppressNextFitRef.current = true;
              const target = new kakao.maps.LatLng(lat, lng);
              map.setCenter(target);
              map.setLevel(7, { animate: true });
            },
            fitToResults: () => {
              suppressNextFitRef.current = true;
              fitMapToMarkers(map, markersRef.current, background);
            },
          };
        }

        setStatus('ready');
      })
      .catch(() => setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [background, bounded, staticView]);

  // Redraw markers/clusters/trails whenever data or the viewport scale changes.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== 'ready') return;
    const { kakao } = window;

    for (const cleanup of cleanupFnsRef.current) cleanup();
    cleanupFnsRef.current = [];
    markerHandlesRef.current = [];

    const addOverlay = (lat: number, lng: number, el: HTMLElement, yAnchor = 0.5, zIndex = 20) => {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(lat, lng),
        content: el,
        xAnchor: 0.5,
        yAnchor,
        zIndex,
      });
      overlay.setMap(map);
      cleanupFnsRef.current.push(() => overlay.setMap(null));
    };

    const housing = markers.filter(
      (m): m is HousingMarker => m.kind === 'housing' && isValidLatLng(m),
    );
    const pois = markers.filter((m): m is PoiMarker => m.kind === 'poi' && isValidLatLng(m));
    // Nothing to click on a locator map, or on any map whose owner passed no
    // marker handler.
    const interactivePins = !staticView && Boolean(onMarkerClickRef.current);

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

    // Housing tags scale with zoom (bigger on zoom-in, smaller on zoom-out) —
    // applied on an outer wrapper so it composes with, rather than fights,
    // the cluster bubble's own hover:scale-110 on the inner element.
    const tagScale = housingTagScale(map.getLevel());

    for (const cluster of clusters) {
      if (cluster.members.length === 1) {
        const m = cluster.members[0];
        const wrap = document.createElement('div');
        // A locator map (Detail, the Life Match rows) has nothing to click, so
        // its pin must not offer a pointer, a hover border, or a text selection
        // the user can drag across.
        wrap.className = `flex flex-col items-center select-none ${
          interactivePins ? 'cursor-pointer' : 'pointer-events-none cursor-default'
        }`;
        wrap.style.transform = `scale(${tagScale})`;
        wrap.style.transformOrigin = 'bottom center';

        const bubble = document.createElement('div');
        let badge: HTMLElement | null = null;
        if (m.rank !== undefined && m.rank <= 3) {
          badge = document.createElement('span');
          badge.textContent = String(m.rank);
          bubble.appendChild(badge);
        }
        const text = document.createElement('span');
        text.textContent = m.priceLabel ?? m.label ?? '';
        bubble.appendChild(text);

        // A rotated square, half-clipped by the bubble, reads as a pointer
        // tip anchored to the exact coordinate — the classic map-pin tail.
        const tail = document.createElement('div');

        // Colors come from the repaint pass, so hover never re-enters here.
        markerHandlesRef.current.push({
          kind: 'single',
          id: m.id,
          bubble,
          tail,
          badge,
          rank: m.rank,
        });

        wrap.appendChild(bubble);
        wrap.appendChild(tail);
        if (m.label) wrap.title = m.label;
        if (interactivePins) {
          stopPointerSequence(wrap);
          wrap.addEventListener('click', () => onMarkerClickRef.current?.(m));
        }
        addOverlay(m.lat, m.lng, wrap, 1, 30);
      } else {
        const memberIds = cluster.members.map((m) => m.id);
        const isActive =
          activeClusterIds != null &&
          memberIds.length === activeClusterIds.length &&
          memberIds.every((id) => activeClusterIds.includes(id));
        const wrap = document.createElement('div');
        wrap.style.transform = `scale(${tagScale})`;
        wrap.style.transformOrigin = 'center';

        const el = document.createElement('div');
        el.textContent = String(cluster.members.length);
        markerHandlesRef.current.push({
          kind: 'cluster',
          ids: memberIds,
          el,
          active: isActive,
        });
        el.title = cluster.members.map((m) => m.label).join(', ');
        stopPointerSequence(wrap);
        el.addEventListener('click', () => onClusterClickRef.current?.(memberIds));

        wrap.appendChild(el);
        addOverlay(cluster.lat, cluster.lng, wrap, 0.5, 30);
      }
    }

    // The nearest-match pins carry their trail's distance/walk-time as a
    // hover tooltip — matched by the trail's destination coordinates, so
    // the Explore data flow doesn't need to thread trail info into markers.
    const trailEnds = trails
      .filter((trail) => trail.path.length > 0)
      .map((trail) => ({ trail, end: trail.path[trail.path.length - 1] }));

    for (const m of pois) {
      const color = m.color ?? '#948da6';
      const size = m.highlighted ? 30 : 22;

      const wrap = document.createElement('div');
      wrap.className = 'flex select-none flex-col items-center';

      // A colored anchor with its category icon reads against the map's own
      // clutter far better than a flat dot; the highlighted (nearest) match
      // gets a solid violet ring and the animated trail, so it stands
      // out from the plain same-category anchors around it.
      const pin = document.createElement('div');
      pin.className = `flex items-center justify-center rounded-full shadow-lg border-2 ${
        m.highlighted ? 'border-violet' : 'border-white'
      }`;
      pin.style.width = `${size}px`;
      pin.style.height = `${size}px`;
      pin.style.backgroundColor = color;
      pin.innerHTML = renderToStaticMarkup(
        createElement(m.icon ?? MapPin, {
          size: m.highlighted ? 15 : 12,
          color: '#fff',
          strokeWidth: 2.5,
        }),
      );

      const tail = document.createElement('div');
      tail.className = `-mt-1 size-2 rotate-45 border-r-2 border-b-2 border-white`;
      tail.style.backgroundColor = color;

      const matchedTrail = m.highlighted
        ? trailEnds.find(
            ({ end }) => Math.abs(end.lat - m.lat) < 1e-7 && Math.abs(end.lng - m.lng) < 1e-7,
          )?.trail
        : undefined;

      if (matchedTrail?.distanceMeters != null && matchedTrail.durationMinutes != null) {
        // Absolutely positioned so showing it never changes the wrapper's
        // size — an in-flow tooltip inflates the overlay and visibly
        // shifts the anchored pin.
        wrap.style.position = 'relative';
        const tooltip = document.createElement('div');
        tooltip.className =
          'absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-plum px-2.5 py-1 font-mono text-xs whitespace-nowrap text-lilac shadow-lg';
        const name = m.label ? `${m.label} · ` : '';
        tooltip.textContent = `${name}${formatTrailDistance(matchedTrail.distanceMeters)} · ${t('units.walkMinutes', { minutes: matchedTrail.durationMinutes })}`;
        wrap.appendChild(tooltip);
        wrap.addEventListener('mouseenter', () => {
          tooltip.classList.remove('hidden');
          tooltip.classList.add('flex');
        });
        wrap.addEventListener('mouseleave', () => {
          tooltip.classList.add('hidden');
          tooltip.classList.remove('flex');
        });
      } else if (m.label) {
        wrap.title = m.label;
      }

      stopPointerSequence(wrap);

      wrap.appendChild(pin);
      wrap.appendChild(tail);
      addOverlay(m.lat, m.lng, wrap, 1);
    }

    if (circle && isValidLatLng(circle)) {
      const radiusCircle = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(circle.lat, circle.lng),
        radius: circle.radiusMeters,
        strokeWeight: 2,
        strokeColor: '#6d4aff',
        strokeOpacity: 0.7,
        strokeStyle: 'solid',
        fillColor: '#6d4aff',
        fillOpacity: 0.06,
      });
      radiusCircle.setMap(map);
      cleanupFnsRef.current.push(() => radiusCircle.setMap(null));
    }

    for (const trail of trails) {
      if (trail.path.length < 2) continue;
      const kakaoPath = trail.path.map((p) => new kakao.maps.LatLng(p.lat, p.lng));
      const lineColor = trail.color ?? '#5636d6';
      const subtle = trail.emphasis === 'subtle';

      const polyline = new kakao.maps.Polyline({
        path: kakaoPath,
        strokeWeight: subtle ? 2 : 3,
        strokeColor: lineColor,
        strokeOpacity: subtle ? 0.5 : 0.85,
        strokeStyle: subtle ? 'shortdot' : 'shortdash',
      });
      polyline.setMap(map);

      if (subtle) {
        cleanupFnsRef.current.push(() => polyline.setMap(null));
        continue;
      }

      const dot = document.createElement('div');
      dot.className = 'pointer-events-none size-2.5 rounded-full shadow';
      dot.style.backgroundColor = lineColor;
      const dotOverlay = new kakao.maps.CustomOverlay({
        position: kakaoPath[0],
        content: dot,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 10,
      });
      dotOverlay.setMap(map);

      const { cum, total } = arcLengths(trail.path);

      const durationMs = Math.min(
        TRAIL_MAX_DURATION_MS,
        Math.max(TRAIL_MIN_DURATION_MS, total / TRAIL_METERS_PER_MS),
      );
      const start = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const progress = ((now - start) % durationMs) / durationMs;
        const p = pointAtFraction(trail.path, cum, total, progress);
        dotOverlay.setPosition(new kakao.maps.LatLng(p.lat, p.lng));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanupFnsRef.current.push(() => {
        cancelAnimationFrame(raf);
        polyline.setMap(null);
        dotOverlay.setMap(null);
      });
    }

    paintSelection(markerHandlesRef.current, activeIdsRef.current);

    return () => {
      for (const cleanup of cleanupFnsRef.current) cleanup();
      cleanupFnsRef.current = [];
      markerHandlesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geometryKey is the stable serialized form of markers+trails+circle
  }, [status, geometryKey, viewVersion]);

  // Selection and hover only recolor nodes the pass above already created, so
  // moving the mouse down the result list costs a couple of className writes
  // instead of a full re-cluster and rebuild. Declared after the draw effect
  // so a rebuild paints with the current selection.
  useEffect(() => {
    activeIdsRef.current = new Set(
      selectedKey ? selectedKey.split(',').map((id) => Number(id)) : [],
    );
    paintSelection(markerHandlesRef.current, activeIdsRef.current);
  }, [selectedKey]);

  // Population heat layer: grayscale radial gradients accumulated per 동
  // (weighted by density, sized by area), colorized through the heat ramp.
  // The canvas lives inside a CustomOverlay anchored at map center so it
  // paints above the tile panes but below the pins (zIndex 5 < dot 10 <
  // poi 20 < housing 30) and pans along with the map; each idle re-centers
  // and redraws it. Hidden during zoom, where the scale would be wrong.
  useEffect(() => {
    const map = mapObjRef.current;
    const container = containerRef.current;
    if (!map || !container || status !== 'ready') return;
    const { kakao } = window;

    const draw = () => {
      if (!heatCanvasRef.current) {
        const el = document.createElement('canvas');
        el.className = 'pointer-events-none opacity-0 transition-opacity duration-300';
        el.setAttribute('aria-hidden', 'true');
        heatCanvasRef.current = el;
        heatOverlayRef.current = new kakao.maps.CustomOverlay({
          position: map.getCenter(),
          content: el,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 5,
          clickable: false,
        });
      }
      const canvas = heatCanvasRef.current;
      const overlay = heatOverlayRef.current;

      if (!densityRegions || densityRegions.length === 0) {
        canvas.style.opacity = '0';
        overlay.setMap(null);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      // Deliberately 1, not devicePixelRatio: this layer is a blurred density
      // field with no edges to alias, and every extra device pixel is another
      // iteration of the colorize pass below. At 1.5 a 1440x900 map costs 2.9M
      // pixels per repaint for no visible gain.
      const dpr = 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      overlay.setPosition(map.getCenter());
      overlay.setMap(map);

      const proj = map.getProjection();
      const center = map.getCenter();
      const centerPt = proj.containerPointFromCoords(center);
      const shifted = proj.containerPointFromCoords(
        new kakao.maps.LatLng(center.getLat(), center.getLng() + 0.01),
      );
      const metersPerPx =
        (0.01 * 111320 * Math.cos((center.getLat() * Math.PI) / 180)) /
        Math.max(Math.abs(shifted.x - centerPt.x), 1);

      const reference = heatReference(densityRegions);

      // The colorize pass only has to visit pixels a gradient actually touched,
      // so track the union of the drawn rects. Zoomed into one 동 that is a
      // couple of hundred pixels square instead of the whole viewport.
      let dirtyMinX = Infinity;
      let dirtyMinY = Infinity;
      let dirtyMaxX = -Infinity;
      let dirtyMaxY = -Infinity;

      for (const region of densityRegions) {
        const pt = proj.containerPointFromCoords(
          new kakao.maps.LatLng(region.centroidLat, region.centroidLng),
        );
        const radiusMeters = Math.sqrt(region.areaKm2 / Math.PI) * 1000 * 1.5;
        const radiusPx = Math.min(Math.max(radiusMeters / metersPerPx, 20), 420);
        if (
          pt.x < -radiusPx ||
          pt.y < -radiusPx ||
          pt.x > width + radiusPx ||
          pt.y > height + radiusPx
        ) {
          continue;
        }
        const intensity = Math.pow(Math.min(1, region.densityPerKm2 / reference), HEAT_CURVE);
        const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radiusPx);
        gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(pt.x - radiusPx, pt.y - radiusPx, radiusPx * 2, radiusPx * 2);
        dirtyMinX = Math.min(dirtyMinX, pt.x - radiusPx);
        dirtyMinY = Math.min(dirtyMinY, pt.y - radiusPx);
        dirtyMaxX = Math.max(dirtyMaxX, pt.x + radiusPx);
        dirtyMaxY = Math.max(dirtyMaxY, pt.y + radiusPx);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Every region was off-screen: nothing was painted, so there is nothing
      // to colorize and reading back a blank rect would be wasted work.
      if (dirtyMaxX < dirtyMinX) {
        canvas.style.opacity = '1';
        return;
      }

      const clampX = (v: number) => Math.min(Math.max(Math.floor(v * dpr), 0), canvas.width);
      const clampY = (v: number) => Math.min(Math.max(Math.floor(v * dpr), 0), canvas.height);
      const x = clampX(dirtyMinX);
      const y = clampY(dirtyMinY);
      const w = clampX(Math.ceil(dirtyMaxX)) - x;
      const h = clampY(Math.ceil(dirtyMaxY)) - y;
      if (w <= 0 || h <= 0) {
        canvas.style.opacity = '1';
        return;
      }

      const lut = heatLut();
      const image = ctx.getImageData(x, y, w, h);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha === 0) continue;
        const j = alpha * 4;
        data[i] = lut[j];
        data[i + 1] = lut[j + 1];
        data[i + 2] = lut[j + 2];
        data[i + 3] = lut[j + 3];
      }
      ctx.putImageData(image, x, y);
      canvas.style.opacity = '1';
    };

    // Coalesce into one frame: a zoom that settles into a pan can fire this
    // effect twice before paint, and the repaint is the expensive part.
    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [status, densityRegions, viewVersion]);

  // Selected 구/군 focus overlay. The translucent fill separates the chosen
  // area from its neighbors, while a white casing keeps the violet outline
  // legible over road labels and the optional density heat layer. Fitting
  // the actual GIS bounds avoids fixed-center/fixed-zoom misses on large or
  // fragmented districts such as Gangseo-gu and Gijang-gun.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== 'ready' || !districtBoundary) return;
    const { kakao } = window;
    const overlays: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any -- Kakao doesn't publish official types.
    const bounds = new kakao.maps.LatLngBounds();
    let pointCount = 0;

    for (const ring of districtBoundary.rings) {
      const path = ring
        .filter(
          (point) => point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]),
        )
        .map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
      if (path.length < 3) continue;

      for (const point of path) {
        bounds.extend(point);
        pointCount += 1;
      }

      const fill = new kakao.maps.Polygon({
        path,
        strokeWeight: 0,
        fillColor: '#6d4aff',
        fillOpacity: 0.12,
      });
      const casing = new kakao.maps.Polyline({
        path,
        strokeWeight: 8,
        strokeColor: '#ffffff',
        strokeOpacity: 0.88,
        strokeStyle: 'solid',
      });
      const outline = new kakao.maps.Polyline({
        path,
        strokeWeight: 4,
        strokeColor: '#6d4aff',
        strokeOpacity: 1,
        strokeStyle: 'solid',
      });
      fill.setMap(map);
      casing.setMap(map);
      outline.setMap(map);
      fill.setZIndex?.(6);
      casing.setZIndex?.(7);
      outline.setZIndex?.(8);
      overlays.push(fill, casing, outline);
    }

    if (pointCount > 0) {
      const rightPadding = background && window.innerWidth >= 640 ? 408 : 36;
      const previousCenter = map.getCenter();
      const previousLevel = map.getLevel();
      map.setBounds(bounds, 88, rightPadding, 72, 36);
      const targetCenter = map.getCenter();
      const targetLevel = map.getLevel();
      const nearby =
        latLngDistanceMeters(previousCenter, targetCenter) <= 18000 &&
        Math.abs(targetLevel - previousLevel) <= 3;

      // setBounds is exact but instantaneous. For a nearby district, read
      // the target it calculated, restore the previous view synchronously,
      // then animate to that exact center/zoom. Far transitions remain
      // immediate so the map does not sweep across the whole city.
      if (nearby && typeof map.jump === 'function') {
        map.jump(previousCenter, previousLevel);
        map.jump(targetCenter, targetLevel, { animate: { duration: 450 } });
      }
    }

    return () => {
      for (const overlay of overlays) overlay.setMap(null);
    };
  }, [background, status, districtBoundary]);

  // "You are here" indicator — its own effect (not folded into the
  // marker/cluster redraw) so a geolocation ping doesn't force clusters to
  // recompute. Non-interactive: it's a location readout, not a pin to click.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== 'ready' || !userLocation || !isValidLatLng(userLocation)) return;
    const { kakao } = window;

    const el = document.createElement('div');
    el.className = 'pointer-events-none relative flex size-4 items-center justify-center';
    el.innerHTML =
      '<span class="absolute inline-flex size-full animate-ping rounded-full bg-violet/50"></span>' +
      '<span class="relative inline-flex size-3.5 rounded-full border-2 border-white bg-violet shadow-lg"></span>';

    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: el,
      zIndex: 25,
    });
    overlay.setMap(map);

    return () => overlay.setMap(null);
  }, [status, userLocation]);

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
    // While a district is selected, its GIS boundary owns the viewport.
    // Debounced result updates must not immediately refit to the marker set.
    if (districtBoundary) return;
    const valid = markersRef.current.filter(isValidLatLng);
    if (valid.length === 0) return;
    // The background map opens on Suyeong-gu — don't override that with a
    // fit-all on the first data arrival; only refit on later set changes.
    if (background && !fitOnLoad && !skippedInitialFitRef.current) {
      skippedInitialFitRef.current = true;
      return;
    }
    if (suppressNextFitRef.current) {
      suppressNextFitRef.current = false;
      return;
    }
    fitMapToMarkers(map, valid, background);
  }, [status, fitKey, background, districtBoundary]);

  const placeholder = (message: string, detail: string) => (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-light/50 bg-lilac-dim p-8 text-center ${className}`}
    >
      <p className='font-medium text-plum'>{message}</p>
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
