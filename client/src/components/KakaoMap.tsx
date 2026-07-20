import { useEffect, useRef, useState } from "react";
import { useLocale } from "../lib/i18n/localeContext";

declare global {
  interface Window {
    // Kakao doesn't publish official types; scoped `any` here, nowhere else.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;

// Roughly central to the sample data (Suyeong-gu/Gijang-gun) — used as the
// initial view when the map has to render before any results exist yet.
const BUSAN_CENTER = { lat: 35.1796, lng: 129.0756 };

let kakaoLoadPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (kakaoLoadPromise) return kakaoLoadPromise;
  kakaoLoadPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error("Kakao Maps SDK failed to load"));
    document.head.appendChild(script);
  });
  return kakaoLoadPromise;
}

export interface HousingMarker {
  kind: "housing";
  id: number;
  lat: number;
  lng: number;
  label?: string;
  selected?: boolean;
}

export interface PoiMarker {
  kind: "poi";
  id: string;
  lat: number;
  lng: number;
  label?: string;
  categoryName: string;
  /** Hex color, e.g. from lib/poiIcons.ts — data-driven, so this can't be a static Tailwind class. */
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

interface KakaoMapProps {
  markers: MapMarker[];
  trails?: MapTrail[];
  onMarkerClick?: (marker: MapMarker) => void;
  /** Bump this (e.g. on a fresh submit) to refit the viewport to `markers`. Hover-only changes should NOT bump it. */
  fitKey?: string | number;
  /**
   * Render the map even with zero markers, centered on BUSAN_CENTER — for
   * fullscreen/background usage (the Explore screen). Detail-page-style
   * single-marker usage should leave this unset, so a not-yet-geocoded
   * housing project still shows the honest "no coordinates" placeholder.
   */
  background?: boolean;
  className?: string;
}

function isValidLatLng(m: { lat: number; lng: number }): boolean {
  return Number.isFinite(m.lat) && Number.isFinite(m.lng);
}

const TRAIL_DURATION_MS = 1800;

/**
 * Every empty state here is deliberate, not a blank box: no key, no
 * geocoded coordinates, and load failure each get their own message.
 *
 * The map instance mounts once and is never torn down for marker/trail
 * changes (only for a hard SDK load failure) — earlier versions rebuilt the
 * whole map on every `markers` change, which would flicker the entire
 * viewport on something as small as hovering a result card.
 */
export function KakaoMap({ markers, trails = [], onMarkerClick, fitKey, background = false, className = "" }: KakaoMapProps) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kakao doesn't publish official types.
  const mapObjRef = useRef<any>(null);
  const cleanupFnsRef = useRef<(() => void)[]>([]);
  const markersRef = useRef(markers);
  const onMarkerClickRef = useRef(onMarkerClick);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    markersRef.current = markers;
    onMarkerClickRef.current = onMarkerClick;
  });

  const validMarkers = markers.filter(isValidLatLng);
  const showEmptyPlaceholder = !background && validMarkers.length === 0;
  const drawKey = JSON.stringify({ markers, trails });

  // Mount the map instance once. Never re-run for data changes.
  useEffect(() => {
    if (!KAKAO_KEY) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current || mapObjRef.current) return;
        const { kakao } = window;
        const first = markersRef.current.find(isValidLatLng);
        const center = first
          ? new kakao.maps.LatLng(first.lat, first.lng)
          : new kakao.maps.LatLng(BUSAN_CENTER.lat, BUSAN_CENTER.lng);
        mapObjRef.current = new kakao.maps.Map(containerRef.current, { center, level: 5 });
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Redraw markers/trails whenever the data changes, without touching the map/viewport.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== "ready") return;
    const { kakao } = window;

    for (const cleanup of cleanupFnsRef.current) cleanup();
    cleanupFnsRef.current = [];

    for (const m of markers) {
      if (!isValidLatLng(m)) continue;
      const el = document.createElement("div");
      if (m.kind === "housing") {
        el.className = `h-4 w-4 rounded-full border-2 border-white shadow-md ${m.selected ? "bg-terracotta" : "bg-marine"}`;
      } else {
        el.className = "h-2.5 w-2.5 rounded-full border border-white shadow";
        el.style.backgroundColor = m.color ?? "#8a969a";
      }
      if (m.label) el.title = m.label;
      if (onMarkerClickRef.current) {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => onMarkerClickRef.current?.(m));
      }
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(m.lat, m.lng),
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });
      overlay.setMap(map);
      cleanupFnsRef.current.push(() => overlay.setMap(null));
    }

    for (const trail of trails) {
      const path = [
        new kakao.maps.LatLng(trail.fromLat, trail.fromLng),
        new kakao.maps.LatLng(trail.toLat, trail.toLng),
      ];
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: 2,
        strokeColor: "#c04824",
        strokeOpacity: 0.6,
        strokeStyle: "shortdash",
      });
      polyline.setMap(map);

      const dot = document.createElement("div");
      dot.className = "h-2 w-2 rounded-full bg-terracotta shadow";
      const dotOverlay = new kakao.maps.CustomOverlay({ position: path[0], content: dot, xAnchor: 0.5, yAnchor: 0.5 });
      dotOverlay.setMap(map);

      const start = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const t = ((now - start) % TRAIL_DURATION_MS) / TRAIL_DURATION_MS;
        const lat = trail.fromLat + (trail.toLat - trail.fromLat) * t;
        const lng = trail.fromLng + (trail.toLng - trail.fromLng) * t;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawKey is the stable serialized form of markers+trails
  }, [status, drawKey]);

  // Refit the viewport only when fitKey changes (or on first ready) — never on hover-only changes.
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || status !== "ready") return;
    const { kakao } = window;
    const valid = markersRef.current.filter(isValidLatLng);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setCenter(new kakao.maps.LatLng(valid[0].lat, valid[0].lng));
      return;
    }
    const bounds = new kakao.maps.LatLngBounds();
    for (const m of valid) bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
    map.setBounds(bounds);
  }, [status, fitKey]);

  const placeholder = (message: string, detail: string) => (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-light/50 bg-mist-dim p-8 text-center ${className}`}
    >
      <p className="font-medium text-marine">{message}</p>
      <p className="text-sm text-slate">{detail}</p>
    </div>
  );

  if (!KAKAO_KEY) return placeholder(t.map.noKeyTitle, t.map.noKeyDetail);
  if (status === "error") return placeholder(t.map.errorTitle, t.map.errorDetail);
  if (showEmptyPlaceholder) return placeholder(t.map.noCoordsTitle, t.map.noCoordsDetail);

  return <div ref={containerRef} className={className} />;
}
