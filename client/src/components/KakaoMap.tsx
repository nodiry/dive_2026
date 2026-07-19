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

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
}

interface KakaoMapProps {
  markers: MapMarker[];
  className?: string;
}

/**
 * Every empty state here is deliberate, not a blank box: no key, no
 * geocoded coordinates, and load failure each get their own message, because
 * right now (pre-geocoding) the "no coordinates yet" case is the common one,
 * not the exception.
 */
export function KakaoMap({ markers, className = "" }: KakaoMapProps) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const validMarkers = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  const markersKey = JSON.stringify(validMarkers);

  useEffect(() => {
    if (!KAKAO_KEY || validMarkers.length === 0) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const { kakao } = window;
        const center = new kakao.maps.LatLng(validMarkers[0].lat, validMarkers[0].lng);
        const map = new kakao.maps.Map(containerRef.current, { center, level: 5 });
        for (const marker of validMarkers) {
          new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(marker.lat, marker.lng) });
        }
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markersKey is the stable serialized form of validMarkers
  }, [markersKey]);

  const placeholder = (message: string, detail: string) => (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-light/50 bg-mist-dim p-8 text-center ${className}`}
    >
      <p className="font-medium text-marine">{message}</p>
      <p className="text-sm text-slate">{detail}</p>
    </div>
  );

  if (!KAKAO_KEY) return placeholder(t.map.noKeyTitle, t.map.noKeyDetail);
  if (validMarkers.length === 0) return placeholder(t.map.noCoordsTitle, t.map.noCoordsDetail);
  if (status === "error") return placeholder(t.map.errorTitle, t.map.errorDetail);

  return <div ref={containerRef} className={`rounded-2xl ${className}`} />;
}
