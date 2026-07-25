import { DEFAULT_CAMERA } from '@/constants/districts';
import { Colors } from '@/constants/theme';

export const KAKAO_KEY = process.env.EXPO_PUBLIC_KAKAO_MAP_KEY ?? '';

export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export const WEBVIEW_BASE_URL = 'http://localhost:5173';

export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  priceLabel: string;
  label: string;
  rank?: number;
}

export interface MapPoi {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
  icon: string;
  highlighted?: boolean;
  tooltip?: string;
}

export interface MapTrail {
  id: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  color: string;
  subtle?: boolean;
}

export interface MapCircle {
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface MapDensityRegion {
  centroidLat: number;
  centroidLng: number;
  areaKm2: number;
  densityPerKm2: number;
}

export interface MapState {
  pins: MapPin[];
  pois: MapPoi[];
  trails: MapTrail[];
  circle: MapCircle | null;
  selectedId: number | null;
  clusterIds: number[] | null;
  density: MapDensityRegion[] | null;
  userLocation: { lat: number; lng: number } | null;
}

export const EMPTY_MAP_STATE: MapState = {
  pins: [],
  pois: [],
  trails: [],
  circle: null,
  selectedId: null,
  clusterIds: null,
  density: null,
  userLocation: null,
};

const GLYPHS: Record<string, string> = {
  cafe: '<path d="M5 8h10v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z"/><path d="M15 9h2a2 2 0 1 1 0 4h-2"/><path d="M4 21h13"/>',
  food: '<path d="M7 3v18"/><path d="M4 3v5a3 3 0 0 0 6 0V3"/><path d="M17 3a4 4 0 0 1 0 8v10"/>',
  convenienceStore:
    '<path d="M4 9h16v11H4z"/><path d="M4 9l2-5h12l2 5"/><path d="M9 20v-6h6v6"/>',
  gym: '<path d="M6 8v8M4 10v4M18 8v8M20 10v4M6 12h12"/>',
  pharmacy: '<path d="M12 6v12M6 12h12"/>',
  gasStation:
    '<path d="M6 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15"/><path d="M6 12h9"/><path d="M17 8l3 3v6a1.5 1.5 0 0 1-3 0"/>',
  fallback: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
};

export function buildKakaoMapHtml(options: {
  state?: Partial<MapState>;
  center?: { latitude: number; longitude: number };
  level?: number;
  interactive?: boolean;
  fitOnLoad?: boolean;
}): string {
  const {
    state = {},
    center = DEFAULT_CAMERA,
    level = 7,
    interactive = true,
    fitOnLoad = false,
  } = options;
  const initial: MapState = { ...EMPTY_MAP_STATE, ...state };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body, #map { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:${Colors.lilacDim}; }
  * { -webkit-tap-highlight-color:transparent; }
  .pin { display:flex; flex-direction:column; align-items:center; cursor:pointer; }
  .bubble {
    display:flex; align-items:center; gap:5px; white-space:nowrap;
    padding:6px 12px; border-radius:999px; border:2px solid rgba(148,141,166,0.45);
    background:#fff; color:${Colors.plum};
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:12.5px; font-weight:700; box-shadow:0 4px 14px rgba(38,28,59,0.2);
  }
  .tail { width:9px; height:9px; margin-top:-5px; transform:rotate(45deg);
    background:#fff; border-right:2px solid rgba(148,141,166,0.45); border-bottom:2px solid rgba(148,141,166,0.45); }
  .pin.selected .bubble { background:${Colors.violet}; color:#fff; border-color:${Colors.violet}; }
  .pin.selected .tail { background:${Colors.violet}; border-right-color:${Colors.violet}; border-bottom-color:${Colors.violet}; }
  .badge { display:flex; align-items:center; justify-content:center; width:17px; height:17px;
    border-radius:999px; background:${Colors.plum}; color:#fff; font-size:10px; }
  .badge.gold { background:${Colors.gold}; color:${Colors.plum}; }
  .pin.selected .badge { background:rgba(255,255,255,0.28); color:#fff; }
  .cluster {
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    width:44px; height:44px; border-radius:999px;
    background:${Colors.plum}; color:${Colors.lilac};
    border:2px solid #fff; box-shadow:0 4px 14px rgba(38,28,59,0.3);
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:14px; font-weight:700;
  }
  .cluster.on { background:${Colors.violet}; }
  .cluster.active { background:${Colors.violet}; box-shadow:0 0 0 6px rgba(109,74,255,0.25); }
  .poi { display:flex; flex-direction:column; align-items:center; position:relative; }
  .poi-dot { display:flex; align-items:center; justify-content:center; border-radius:999px;
    border:2px solid #fff; box-shadow:0 3px 10px rgba(38,28,59,0.28); }
  .poi.hero .poi-dot { border-color:${Colors.violet}; }
  .poi-tail { width:7px; height:7px; margin-top:-4px; transform:rotate(45deg); border-right:2px solid #fff; border-bottom:2px solid #fff; }
  .poi-tip { position:absolute; bottom:100%; left:50%; transform:translateX(-50%); margin-bottom:6px;
    display:none; padding:4px 9px; border-radius:999px; background:${Colors.plum}; color:${Colors.lilac};
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:10.5px; white-space:nowrap;
    box-shadow:0 4px 12px rgba(38,28,59,0.3); }
  .poi.hero .poi-tip { display:block; }
  .me { width:16px; height:16px; border-radius:999px; background:${Colors.violet};
    border:3px solid #fff; box-shadow:0 0 0 6px rgba(109,74,255,0.18); }
  #heat { display:block; pointer-events:none; opacity:0; transition:opacity .3s; }
</style>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false"></script>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  var BOUNDS = { minLat: 34.95, maxLat: 35.44, minLng: 128.7, maxLng: 129.38 };
  var MAX_LEVEL = 10;
  var CLUSTER_PX = 74;
  var GLYPHS = ${safeJson(GLYPHS)};
  // Density is long-tailed (median ~8k/km² against a ~50k max), so the ramp is
  // anchored on the 95th percentile and clamped; anchoring on the max leaves
  // the whole city cool and never reaches gold.
  var HEAT_STOPS = [
    [0.0, 'rgba(138,118,201,0)'],
    [0.25, 'rgba(138,118,201,0.32)'],
    [0.55, 'rgba(109,74,255,0.5)'],
    [0.8, 'rgba(217,164,65,0.62)'],
    [1.0, 'rgba(201,138,31,0.75)']
  ];
  var HEAT_PERCENTILE = 0.95;
  var HEAT_CURVE = 0.6;
  var state = ${safeJson(initial)};
  var map = null;
  var overlays = [];
  var shapes = [];
  var heatCanvas = null;
  var heatOverlay = null;
  var heatLut = null;
  var rafs = [];

  function post(payload) {
    var msg = JSON.stringify(payload);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
    else if (window.parent !== window) window.parent.postMessage(msg, '*');
  }

  function stopPointer(el) {
    ['mousedown','mouseup','click','touchstart','touchend'].forEach(function (type) {
      el.addEventListener(type, function (e) { e.stopPropagation(); });
    });
  }

  function svg(icon, size) {
    var body = GLYPHS[icon] || GLYPHS.fallback;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  function addOverlay(lat, lng, el, yAnchor, zIndex) {
    var overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(lat, lng),
      content: el, xAnchor: 0.5, yAnchor: yAnchor, zIndex: zIndex
    });
    overlay.setMap(map);
    overlays.push(overlay);
  }

  function clearDrawn() {
    overlays.forEach(function (o) { o.setMap(null); });
    overlays = [];
    shapes.forEach(function (s) { s.setMap(null); });
    shapes = [];
    rafs.forEach(function (id) { cancelAnimationFrame(id); });
    rafs = [];
  }

  function clusterize(pins) {
    var proj = map.getProjection();
    var points = pins.map(function (p) {
      return { pin: p, pt: proj.containerPointFromCoords(new kakao.maps.LatLng(p.lat, p.lng)) };
    });
    var used = {};
    var groups = [];
    for (var i = 0; i < points.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      var members = [points[i].pin];
      for (var j = i + 1; j < points.length; j++) {
        if (used[j]) continue;
        var dx = points[i].pt.x - points[j].pt.x;
        var dy = points[i].pt.y - points[j].pt.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_PX) { used[j] = 1; members.push(points[j].pin); }
      }
      var lat = 0, lng = 0;
      members.forEach(function (m) { lat += m.lat; lng += m.lng; });
      groups.push({ members: members, lat: lat / members.length, lng: lng / members.length });
    }
    return groups;
  }

  function sameIds(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return a.every(function (id) { return b.indexOf(id) !== -1; });
  }

  function drawPins() {
    var pins = (state.pins || []).filter(function (p) {
      return typeof p.lat === 'number' && typeof p.lng === 'number';
    });
    if (!pins.length) return;

    clusterize(pins).forEach(function (group, index) {
      if (group.members.length === 1) {
        var pin = group.members[0];
        var selected = pin.id === state.selectedId;
        var el = document.createElement('div');
        el.className = 'pin' + (selected ? ' selected' : '');
        var badge = pin.rank && pin.rank <= 3
          ? '<span class="badge' + (pin.rank === 1 ? ' gold' : '') + '">' + pin.rank + '</span>'
          : '';
        el.innerHTML = '<div class="bubble">' + badge + '<span>' + pin.priceLabel + '</span></div><div class="tail"></div>';
        stopPointer(el);
        el.addEventListener('click', function () { post({ type: 'markerClick', id: pin.id }); });
        addOverlay(pin.lat, pin.lng, el, 1, selected ? 40 : 30);
        return;
      }
      var ids = group.members.map(function (m) { return m.id; });
      var hasSelected = ids.indexOf(state.selectedId) !== -1;
      var isActive = sameIds(ids, state.clusterIds);
      var cluster = document.createElement('div');
      cluster.className = 'cluster' + (isActive ? ' active' : hasSelected ? ' on' : '');
      cluster.textContent = String(group.members.length);
      stopPointer(cluster);
      cluster.addEventListener('click', function () { post({ type: 'clusterClick', ids: ids }); });
      addOverlay(group.lat, group.lng, cluster, 0.5, 35);
    });
  }

  function drawPois() {
    (state.pois || []).forEach(function (poi) {
      var size = poi.highlighted ? 30 : 22;
      var wrap = document.createElement('div');
      wrap.className = 'poi' + (poi.highlighted ? ' hero' : '');
      var tip = poi.tooltip ? '<div class="poi-tip">' + poi.tooltip + '</div>' : '';
      wrap.innerHTML = tip +
        '<div class="poi-dot" style="width:' + size + 'px;height:' + size + 'px;background:' + poi.color + '">' +
        svg(poi.icon, poi.highlighted ? 15 : 12) + '</div>' +
        '<div class="poi-tail" style="background:' + poi.color + '"></div>';
      stopPointer(wrap);
      addOverlay(poi.lat, poi.lng, wrap, 1, poi.highlighted ? 25 : 20);
    });
  }

  function drawTrails() {
    (state.trails || []).forEach(function (trail) {
      var path = [
        new kakao.maps.LatLng(trail.fromLat, trail.fromLng),
        new kakao.maps.LatLng(trail.toLat, trail.toLng)
      ];
      var line = new kakao.maps.Polyline({
        path: path,
        strokeWeight: trail.subtle ? 2 : 3,
        strokeColor: trail.color,
        strokeOpacity: trail.subtle ? 0.45 : 0.85,
        strokeStyle: trail.subtle ? 'shortdot' : 'shortdash'
      });
      line.setMap(map);
      shapes.push(line);
    });
  }

  function drawCircle() {
    if (!state.circle) return;
    var circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(state.circle.lat, state.circle.lng),
      radius: state.circle.radiusMeters,
      strokeWeight: 2,
      strokeColor: '${Colors.violet}',
      strokeOpacity: 0.7,
      fillColor: '${Colors.violet}',
      fillOpacity: 0.06
    });
    circle.setMap(map);
    shapes.push(circle);
  }

  function drawUser() {
    if (!state.userLocation) return;
    var dot = document.createElement('div');
    dot.className = 'me';
    addOverlay(state.userLocation.lat, state.userLocation.lng, dot, 0.5, 15);
  }

  function lut() {
    if (heatLut) return heatLut;
    var canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 1;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 256, 0);
    HEAT_STOPS.forEach(function (stop) { gradient.addColorStop(stop[0], stop[1]); });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);
    heatLut = ctx.getImageData(0, 0, 256, 1).data;
    return heatLut;
  }

  function drawHeat() {
    var container = document.getElementById('map');
    if (!map || !container) return;
    if (!heatCanvas) {
      heatCanvas = document.createElement('canvas');
      heatCanvas.id = 'heat';
      heatOverlay = new kakao.maps.CustomOverlay({
        position: map.getCenter(), content: heatCanvas,
        xAnchor: 0.5, yAnchor: 0.5, zIndex: 5, clickable: false
      });
    }
    var regions = state.density;
    if (!regions || !regions.length) {
      heatCanvas.style.opacity = '0';
      heatOverlay.setMap(null);
      return;
    }
    var ctx = heatCanvas.getContext('2d', { willReadFrequently: true });
    var width = container.clientWidth;
    var height = container.clientHeight;
    if (!width || !height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    heatCanvas.width = Math.round(width * dpr);
    heatCanvas.height = Math.round(height * dpr);
    heatCanvas.style.width = width + 'px';
    heatCanvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    heatOverlay.setPosition(map.getCenter());
    heatOverlay.setMap(map);

    var proj = map.getProjection();
    var center = map.getCenter();
    var centerPt = proj.containerPointFromCoords(center);
    var shifted = proj.containerPointFromCoords(new kakao.maps.LatLng(center.getLat(), center.getLng() + 0.01));
    var metersPerPx = (0.01 * 111320 * Math.cos(center.getLat() * Math.PI / 180)) /
      Math.max(Math.abs(shifted.x - centerPt.x), 1);
    var densities = regions.map(function (r) { return r.densityPerKm2; })
      .sort(function (a, b) { return a - b; });
    var reference = densities[Math.floor((densities.length - 1) * HEAT_PERCENTILE)] || 1;

    regions.forEach(function (region) {
      var pt = proj.containerPointFromCoords(new kakao.maps.LatLng(region.centroidLat, region.centroidLng));
      var radiusMeters = Math.sqrt(region.areaKm2 / Math.PI) * 1000 * 1.5;
      var radiusPx = Math.min(Math.max(radiusMeters / metersPerPx, 20), 420);
      if (pt.x < -radiusPx || pt.y < -radiusPx || pt.x > width + radiusPx || pt.y > height + radiusPx) return;
      var intensity = Math.pow(Math.min(1, region.densityPerKm2 / reference), HEAT_CURVE);
      var gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radiusPx);
      gradient.addColorStop(0, 'rgba(0,0,0,' + intensity + ')');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(pt.x - radiusPx, pt.y - radiusPx, radiusPx * 2, radiusPx * 2);
    });

    var ramp = lut();
    var image = ctx.getImageData(0, 0, heatCanvas.width, heatCanvas.height);
    var data = image.data;
    for (var i = 0; i < data.length; i += 4) {
      var alpha = data[i + 3];
      if (alpha === 0) continue;
      var j = alpha * 4;
      data[i] = ramp[j]; data[i + 1] = ramp[j + 1]; data[i + 2] = ramp[j + 2]; data[i + 3] = ramp[j + 3];
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(image, 0, 0);
    heatCanvas.style.opacity = '1';
  }

  function draw() {
    if (!map) return;
    clearDrawn();
    drawCircle();
    drawTrails();
    drawUser();
    drawPois();
    drawPins();
    drawHeat();
  }

  function hideScaleBar() {
    var nodes = document.querySelectorAll('#map div, #map span');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children.length) continue;
      var text = (el.textContent || '').trim();
      if (!/^[0-9]+(\\.[0-9]+)?\\s*(m|km)$/.test(text)) continue;
      var box = el.closest('#map > div > div') || el.parentElement || el;
      box.style.display = 'none';
    }
  }

  function fitToPins() {
    if (!map || !state.pins || !state.pins.length) return;
    if (state.pins.length === 1) {
      map.setCenter(new kakao.maps.LatLng(state.pins[0].lat, state.pins[0].lng));
      return;
    }
    var bounds = new kakao.maps.LatLngBounds();
    state.pins.forEach(function (pin) { bounds.extend(new kakao.maps.LatLng(pin.lat, pin.lng)); });
    map.setBounds(bounds, 48, 48, 48, 48);
  }

  function reportBounds() {
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    post({ type: 'bounds', swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() });
  }

  kakao.maps.load(function () {
    map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${center.latitude}, ${center.longitude}),
      level: ${level},
      draggable: ${interactive},
      zoomable: ${interactive}
    });
    if (map.setMaxLevel) map.setMaxLevel(MAX_LEVEL);

    kakao.maps.event.addListener(map, 'center_changed', function () {
      var c = map.getCenter();
      var lat = Math.min(Math.max(c.getLat(), BOUNDS.minLat), BOUNDS.maxLat);
      var lng = Math.min(Math.max(c.getLng(), BOUNDS.minLng), BOUNDS.maxLng);
      if (lat !== c.getLat() || lng !== c.getLng()) map.setCenter(new kakao.maps.LatLng(lat, lng));
    });
    kakao.maps.event.addListener(map, 'zoom_start', function () {
      if (heatCanvas) heatCanvas.style.opacity = '0';
    });
    kakao.maps.event.addListener(map, 'idle', function () {
      draw();
      hideScaleBar();
      reportBounds();
    });
    kakao.maps.event.addListener(map, 'click', function () { post({ type: 'mapClick' }); });

    if (${fitOnLoad}) fitToPins();
    draw();
    hideScaleBar();
    reportBounds();
    post({ type: 'ready' });
  });

  window.__setState = function (patch) {
    Object.keys(patch).forEach(function (key) { state[key] = patch[key]; });
    draw();
  };
  window.__setCamera = function (lat, lng, level) {
    if (!map) return;
    if (typeof level === 'number') map.setLevel(level, { animate: true });
    map.panTo(new kakao.maps.LatLng(lat, lng));
  };
  window.__zoom = function (delta) {
    if (!map) return;
    map.setLevel(Math.max(1, Math.min(MAX_LEVEL, map.getLevel() + delta)), { animate: true });
  };
  window.__fit = fitToPins;
})();
</script>
</body>
</html>`;
}

export function buildRoadviewHtml(lat: number, lng: number, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body, #rv { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:${Colors.lilacDim}; }
  #empty { display:none; height:100%; align-items:center; justify-content:center; padding:0 24px;
    font-family:-apple-system,system-ui,sans-serif; font-size:13px; color:${Colors.slate}; text-align:center; }
</style>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services"></script>
</head>
<body>
<div id="rv"></div>
<div id="empty">${message}</div>
<script>
kakao.maps.load(function () {
  var position = new kakao.maps.LatLng(${lat}, ${lng});
  var client = new kakao.maps.RoadviewClient();
  var container = document.getElementById('rv');
  var roadview = new kakao.maps.Roadview(container);
  client.getNearestPanoId(position, 80, function (panoId) {
    if (!panoId) {
      container.style.display = 'none';
      document.getElementById('empty').style.display = 'flex';
      return;
    }
    roadview.setPanoId(panoId, position);
  });
});
</script>
</body>
</html>`;
}
