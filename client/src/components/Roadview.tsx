import { Building2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadKakaoSdk } from '@utils/kakaoSdk';
import { cn } from '@utils/cn';

interface RoadviewProps {
  lat: number;
  lng: number;
  /** Interactive lets the user pan and walk the street (Detail page); the default is a frozen preview image. */
  interactive?: boolean;
  className?: string;
}

const PANO_SEARCH_RADIUS_M = 80;

/**
 * Kakao Roadview aimed at the building. Mounts lazily (IntersectionObserver)
 * so a long listing doesn't spin up dozens of panorama viewers at once, and
 * falls back to a quiet placeholder when no panorama exists nearby.
 */
export function Roadview({ lat, lng, interactive = false, className }: RoadviewProps) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const noCoords = !Number.isFinite(lat) || !Number.isFinite(lng);
  const [status, setStatus] = useState<'loading' | 'ready' | 'none'>(noCoords ? 'none' : 'loading');

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || noCoords) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !viewerRef.current) return;
        const { kakao } = window;
        const position = new kakao.maps.LatLng(lat, lng);
        const client = new kakao.maps.RoadviewClient();
        client.getNearestPanoId(position, PANO_SEARCH_RADIUS_M, (panoId: number | null) => {
          if (cancelled || !viewerRef.current) return;
          if (panoId == null) {
            setStatus('none');
            return;
          }
          const roadview = new kakao.maps.Roadview(viewerRef.current);
          kakao.maps.event.addListener(roadview, 'init', () => {
            if (cancelled) return;
            // Aim the camera at the building instead of straight down the street.
            const viewpoint = roadview.getProjection().viewpointFromCoords(position, 0);
            roadview.setViewpoint(viewpoint);
            setStatus('ready');
          });
          roadview.setPanoId(panoId, position);
        });
      })
      .catch(() => setStatus('none'));
    return () => {
      cancelled = true;
    };
  }, [visible, noCoords, lat, lng]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative overflow-hidden bg-lilac-dim', className)}
    >
      {/* Non-interactive previews oversize the viewer and crop it, so Kakao's
          edge-anchored UI (zoom buttons, compass) falls outside the frame and
          only the imagery shows. */}
      <div
        ref={viewerRef}
        className={cn(
          'absolute transition-opacity duration-300',
          interactive ? 'inset-0' : '-inset-14 pointer-events-none',
          status === 'ready' ? 'opacity-100' : 'opacity-0',
        )}
      />
      {status !== 'ready' && (
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-light'>
          <Building2 className={cn('size-5', status === 'loading' && 'animate-pulse')} />
          {interactive && status === 'none' && (
            <p className='px-4 text-center text-sm text-slate'>{t('map.noRoadview')}</p>
          )}
        </div>
      )}
    </div>
  );
}
