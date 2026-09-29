import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs';

(() => {
  'use strict';

  const INITIAL_BOUNDS = [[138.58, 34.72], [139.10, 35.46]];
  const STATUS = document.getElementById('status');
  const mappedCountEl = document.getElementById('mapped-count');
  const inventoryCountEl = document.getElementById('inventory-count');
  const baseSelect = document.getElementById('base-select');
  const providerSelect = document.getElementById('provider-select');
  const areaSelect = document.getElementById('area-select');
  const searchInput = document.getElementById('search-input');
  const terrainToggle = document.getElementById('terrain-toggle');
  const resetView = document.getElementById('reset-view');

  let cameraData = null;
  let terrainEnabled = false;

  const style = {
    version: 8,
    sources: {
      'gsi-pale': {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 18,
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>'
      },
      'gsi-std': {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 18,
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>'
      },
      'gsi-photo': {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        maxzoom: 18,
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>'
      },
      terrain: {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        attribution: '<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>'
      }
    },
    layers: [
      { id: 'base-pale', type: 'raster', source: 'gsi-pale', layout: { visibility: 'visible' } },
      { id: 'base-std', type: 'raster', source: 'gsi-std', layout: { visibility: 'none' } },
      { id: 'base-photo', type: 'raster', source: 'gsi-photo', layout: { visibility: 'none' } },
      {
        id: 'terrain-hillshade',
        type: 'hillshade',
        source: 'terrain',
        layout: { visibility: 'none' },
        paint: { 'hillshade-exaggeration': 0.28 }
      }
    ]
  };

  const map = new maplibregl.Map({
    container: 'map',
    style,
    center: [138.90, 35.10],
    zoom: 8.4,
    pitch: 0,
    bearing: 0,
    maxPitch: 80,
    hash: true
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch {
      return '#';
    }
  }

  function popupHtml(properties) {
    const p = properties || {};
    const imageUrl = safeUrl(p.camera_url);
    const sourceUrl = safeUrl(p.source_url);
    const elevation = p.elevation_m ? `${escapeHtml(p.elevation_m)} m` : '未登録';
    const precision = p.coordinate_precision ? escapeHtml(p.coordinate_precision) : '未登録';
    const isImage = p.display_type === 'direct_image' && imageUrl !== '#';
    const image = isImage
      ? `<img src="${imageUrl}?t=${Date.now()}" alt="${escapeHtml(p.camera_name)}のライブカメラ画像" referrerpolicy="no-referrer">`
      : '';

    return `
      <div class="camera-popup">
        <h3>${escapeHtml(p.camera_name)}</h3>
        <div class="meta">${escapeHtml(p.route_name)} ${p.route_no ? `(${escapeHtml(p.route_no)}号)` : ''}</div>
        <div class="meta">${escapeHtml(p.provider)} / ${escapeHtml(p.office)}</div>
        <div class="meta">${escapeHtml(p.municipality)}・${escapeHtml(p.area)}</div>
        <div class="meta">標高: ${elevation} / 座標精度: ${precision}</div>
        ${image}
        <div class="links">
          ${imageUrl !== '#' ? `<a href="${imageUrl}" target="_blank" rel="noopener">カメラを開く</a>` : ''}
          ${sourceUrl !== '#' ? `<a href="${sourceUrl}" target="_blank" rel="noopener">公式一覧</a>` : ''}
        </div>
      </div>`;
  }

  function populateAreas(features) {
    const areas = [...new Set(features.map(f => f.properties.area).filter(Boolean))].sort();
    for (const area of areas) {
      const option = document.createElement('option');
      option.value = area;
      option.textContent = area;
      areaSelect.appendChild(option);
    }
  }

  function applyFilters() {
    if (!cameraData || !map.getSource('cameras')) return;

    const provider = providerSelect.value;
    const area = areaSelect.value;
    const query = searchInput.value.trim().toLowerCase();

    const filtered = cameraData.features.filter(feature => {
      const p = feature.properties || {};
      if (provider !== 'all' && p.provider !== provider) return false;
      if (area !== 'all' && p.area !== area) return false;
      if (query) {
        const haystack = [p.camera_name, p.route_name, p.route_no, p.area, p.municipality, p.office]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    map.getSource('cameras').setData({ type: 'FeatureCollection', features: filtered });
    mappedCountEl.textContent = String(filtered.length);
    STATUS.textContent = `${filtered.length}地点を表示中（台帳総数 ${cameraData.metadata?.inventory_total ?? 68}）`;
  }

  function setBaseLayer(base) {
    const layerMap = { pale: 'base-pale', std: 'base-std', photo: 'base-photo' };
    Object.entries(layerMap).forEach(([key, layerId]) => {
      map.setLayoutProperty(layerId, 'visibility', key === base ? 'visible' : 'none');
    });
  }

  async function loadCameras() {
    const response = await fetch('data/cameras.geojson', { cache: 'no-store' });
    if (!response.ok) throw new Error(`GeoJSONの取得に失敗: ${response.status}`);
    cameraData = await response.json();

    inventoryCountEl.textContent = String(cameraData.metadata?.inventory_total ?? 68);
    mappedCountEl.textContent = String(cameraData.features.length);
    populateAreas(cameraData.features);

    map.addSource('cameras', { type: 'geojson', data: cameraData });
    map.addLayer({
      id: 'camera-points',
      type: 'circle',
      source: 'cameras',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5, 12, 9],
        'circle-color': [
          'match', ['get', 'provider'],
          '国土交通省', '#2f6db2',
          '静岡県', '#e07b39',
          '#6b7280'
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.95
      }
    });

    map.addLayer({
      id: 'camera-labels',
      type: 'symbol',
      source: 'cameras',
      minzoom: 10,
      layout: {
        'text-field': ['get', 'camera_name'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#172033',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
      }
    });

    map.on('click', 'camera-points', event => {
      const feature = event.features?.[0];
      if (!feature) return;
      const coordinates = feature.geometry.coordinates.slice();
      new maplibregl.Popup({ maxWidth: '320px' })
        .setLngLat(coordinates)
        .setHTML(popupHtml(feature.properties))
        .addTo(map);
    });

    map.on('mouseenter', 'camera-points', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'camera-points', () => { map.getCanvas().style.cursor = ''; });

    STATUS.textContent = `${cameraData.features.length}地点を表示。座標未確定地点は台帳に保持しています。`;
  }

  map.on('load', async () => {
    try {
      await loadCameras();
      map.fitBounds(INITIAL_BOUNDS, { padding: 36, duration: 0 });
    } catch (error) {
      console.error(error);
      STATUS.textContent = 'カメラデータを読み込めません。python3 -m http.server 8200 などHTTPサーバー経由で開いてください。';
    }
  });

  baseSelect.addEventListener('change', () => setBaseLayer(baseSelect.value));
  providerSelect.addEventListener('change', applyFilters);
  areaSelect.addEventListener('change', applyFilters);
  searchInput.addEventListener('input', applyFilters);

  terrainToggle.addEventListener('click', () => {
    terrainEnabled = !terrainEnabled;
    if (terrainEnabled) {
      map.setTerrain({ source: 'terrain', exaggeration: 1.2 });
      map.setLayoutProperty('terrain-hillshade', 'visibility', 'visible');
      map.easeTo({ pitch: 58, bearing: -18, duration: 700 });
      terrainToggle.textContent = '3D地形 OFF';
    } else {
      map.setTerrain(null);
      map.setLayoutProperty('terrain-hillshade', 'visibility', 'none');
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      terrainToggle.textContent = '3D地形 ON';
    }
    terrainToggle.setAttribute('aria-pressed', String(terrainEnabled));
  });

  resetView.addEventListener('click', () => {
    map.fitBounds(INITIAL_BOUNDS, { padding: 36, duration: 700 });
  });
})();
