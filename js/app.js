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
  const geojsonInput = document.getElementById('geojson-input');
  const geojsonClear = document.getElementById('geojson-clear');
  const geojsonInfo = document.getElementById('geojson-info');

  let cameraData = null;
  let terrainEnabled = false;

  const PRECISE_POSITION_TYPES = ['landmark', 'camera', 'structure', 'published_plus_code'];
  const REGISTERED_CAMERA_TOTAL = 76;
  const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] };

  const SOURCE_URLS = {
    hakone: 'https://www.cbr.mlit.go.jp/numazu/bousai/livecamera/hakone/',
    r138: 'https://www.cbr.mlit.go.jp/numazu/bousai/livecamera/246-138/',
    r246: 'https://www.cbr.mlit.go.jp/numazu/bousai/livecamera/246-138/',
    amagi: 'https://www.cbr.mlit.go.jp/numazu/bousai/livecamera/amagikita/'
  };

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

  function positionLabel(precision) {
    if (PRECISE_POSITION_TYPES.includes(precision)) return '〇 座標位置';
    if (precision === 'link_area') return '□ 近傍（リンク地点）';
    return '□ 近傍';
  }

  function popupHtml(properties) {
    const p = properties || {};
    const targetUrl = safeUrl(p.camera_url);
    const sourceUrl = safeUrl(p.source_url);
    const elevation = p.elevation_m != null ? `${escapeHtml(p.elevation_m)} m` : '未登録';
    const isImage = p.display_type === 'direct_image' && targetUrl !== '#';
    const isExternalLink = p.display_type === 'external_link';
    const image = isImage
      ? `<img src="${targetUrl}?t=${Date.now()}" alt="${escapeHtml(p.camera_name)}のライブカメラ画像" referrerpolicy="no-referrer">`
      : '';
    const primaryLabel = isExternalLink
      ? 'iHighwayを開く'
      : p.display_type === 'group_page'
        ? 'カメラ一覧を開く'
        : 'カメラを開く';
    const locationNote = p.location_note
      ? `<div class="position-note">${escapeHtml(p.location_note)}</div>`
      : '';

    return `
      <div class="camera-popup">
        <h3>${escapeHtml(p.camera_name)}</h3>
        <div class="meta">${escapeHtml(p.route_name)} ${p.route_no ? `(${escapeHtml(p.route_no)})` : ''}</div>
        <div class="meta">${escapeHtml(p.provider)} / ${escapeHtml(p.office)}</div>
        <div class="meta">${escapeHtml(p.municipality)}・${escapeHtml(p.area)}</div>
        <div class="meta">標高: ${elevation}</div>
        <div class="meta">位置: ${escapeHtml(positionLabel(p.coordinate_precision))}</div>
        ${locationNote}
        ${image}
        <div class="links">
          ${targetUrl !== '#' ? `<a href="${targetUrl}" target="_blank" rel="noopener">${primaryLabel}</a>` : ''}
          ${sourceUrl !== '#' ? `<a href="${sourceUrl}" target="_blank" rel="noopener">公式情報</a>` : ''}
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

  function statusText(features) {
    const links = features.filter(f => f.properties?.feature_kind === 'link').length;
    const cameras = features.length - links;
    return `${features.length}マーカーを表示中（カメラ ${cameras} / NEXCOリンク ${links} / 登録カメラ ${REGISTERED_CAMERA_TOTAL}）`;
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
        const haystack = [p.camera_name, p.route_name, p.route_no, p.area, p.municipality, p.office, p.provider]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    map.getSource('cameras').setData({ type: 'FeatureCollection', features: filtered });
    mappedCountEl.textContent = String(filtered.length);
    STATUS.textContent = statusText(filtered);
  }

  function setBaseLayer(base) {
    const layerMap = { pale: 'base-pale', std: 'base-std', photo: 'base-photo' };
    Object.entries(layerMap).forEach(([key, layerId]) => {
      map.setLayoutProperty(layerId, 'visibility', key === base ? 'visible' : 'none');
    });
  }

  function makeSquareImage(hex) {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 1, 22, 22);
    ctx.fillStyle = hex;
    ctx.fillRect(4, 4, 16, 16);
    return ctx.getImageData(0, 0, 24, 24);
  }

  function addApproximateMarkerImages() {
    const images = {
      'square-prefecture': '#e07b39',
      'square-mlit': '#2f6db2',
      'square-nexco': '#2f8f5b',
      'square-default': '#6b7280'
    };
    Object.entries(images).forEach(([id, color]) => {
      if (!map.hasImage(id)) map.addImage(id, makeSquareImage(color));
    });
  }

  function recordToFeature(record) {
    const isPublishedCoordinate = record.p === 'published_plus_code';
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: record.c },
      properties: {
        camera_id: record.id,
        provider: '国土交通省',
        office: '中部地方整備局 沼津河川国道事務所',
        route_no: record.r,
        route_name: record.rn,
        camera_name: record.n,
        area: record.a,
        municipality: record.m,
        elevation_m: record.e ?? null,
        camera_url: record.img,
        source_url: SOURCE_URLS[record.g] || 'https://www.cbr.mlit.go.jp/numazu/ifmob/livecam-road.html',
        display_type: 'direct_image',
        coordinate_precision: record.p || 'nearby_route',
        coordinate_source: record.src || '距離標・地名・道路線形から置いた近傍位置（要精査）',
        plus_code: record.pc || null,
        location_note: isPublishedCoordinate
          ? `〇 公開Plus Code（${record.pc}）を座標化した位置。`
          : '□ 近傍位置。距離標・地名・道路線形から配置した代表位置で、カメラ支柱の正確な座標ではありません。'
      }
    };
  }

  function openPopup(event) {
    const feature = event.features?.[0];
    if (!feature) return;
    new maplibregl.Popup({ maxWidth: '330px' })
      .setLngLat(feature.geometry.coordinates.slice())
      .setHTML(popupHtml(feature.properties))
      .addTo(map);
  }

  function normalizeGeoJSON(value) {
    if (!value || typeof value !== 'object') {
      throw new Error('GeoJSONオブジェクトではありません。');
    }
    if (value.type === 'FeatureCollection' && Array.isArray(value.features)) return value;
    if (value.type === 'Feature' && value.geometry) {
      return { type: 'FeatureCollection', features: [value] };
    }
    const geometryTypes = new Set([
      'Point', 'MultiPoint', 'LineString', 'MultiLineString',
      'Polygon', 'MultiPolygon', 'GeometryCollection'
    ]);
    if (geometryTypes.has(value.type)) {
      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: value }]
      };
    }
    throw new Error('FeatureCollection / Feature / Geometry形式のGeoJSONを選択してください。');
  }

  function extendBoundsFromGeometry(geometry, bounds) {
    if (!geometry) return;
    if (geometry.type === 'GeometryCollection') {
      (geometry.geometries || []).forEach(item => extendBoundsFromGeometry(item, bounds));
      return;
    }

    const visit = coordinates => {
      if (!Array.isArray(coordinates)) return;
      if (
        coordinates.length >= 2 &&
        typeof coordinates[0] === 'number' &&
        typeof coordinates[1] === 'number' &&
        Number.isFinite(coordinates[0]) &&
        Number.isFinite(coordinates[1])
      ) {
        bounds.extend([coordinates[0], coordinates[1]]);
        return;
      }
      coordinates.forEach(visit);
    };

    visit(geometry.coordinates);
  }

  function fitToImportedGeoJSON(data) {
    const bounds = new maplibregl.LngLatBounds();
    data.features.forEach(feature => extendBoundsFromGeometry(feature.geometry, bounds));
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
    }
  }

  function importedPopupHtml(properties) {
    const entries = Object.entries(properties || {}).slice(0, 20);
    const rows = entries.length
      ? entries.map(([key, value]) =>
          `<div class="geojson-property"><strong>${escapeHtml(key)}</strong>: ${escapeHtml(
            typeof value === 'object' ? JSON.stringify(value) : value
          )}</div>`
        ).join('')
      : '<div class="meta">属性なし</div>';

    return `<div class="camera-popup"><h3>インポートGeoJSON</h3>${rows}</div>`;
  }

  function setupGeoJSONImportLayers() {
    map.addSource('user-geojson', {
      type: 'geojson',
      data: EMPTY_FEATURE_COLLECTION
    });

    map.addLayer({
      id: 'user-geojson-fill',
      type: 'fill',
      source: 'user-geojson',
      filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
      paint: {
        'fill-color': '#8b5cf6',
        'fill-opacity': 0.15,
        'fill-outline-color': '#7c3aed'
      }
    });

    map.addLayer({
      id: 'user-geojson-line',
      type: 'line',
      source: 'user-geojson',
      filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]],
      paint: {
        'line-color': '#7c3aed',
        'line-width': 3,
        'line-opacity': 0.9
      }
    });

    map.addLayer({
      id: 'user-geojson-point',
      type: 'circle',
      source: 'user-geojson',
      filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]],
      paint: {
        'circle-radius': 6,
        'circle-color': '#8b5cf6',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });

    ['user-geojson-fill', 'user-geojson-line', 'user-geojson-point'].forEach(layerId => {
      map.on('click', layerId, event => {
        const feature = event.features?.[0];
        if (!feature) return;
        new maplibregl.Popup({ maxWidth: '340px' })
          .setLngLat(event.lngLat)
          .setHTML(importedPopupHtml(feature.properties))
          .addTo(map);
      });
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
    });
  }

  async function loadImportedGeoJSON(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = normalizeGeoJSON(parsed);
      map.getSource('user-geojson').setData(data);
      fitToImportedGeoJSON(data);
      geojsonClear.disabled = false;
      geojsonInfo.textContent = `${file.name}：${data.features.length} feature`;
    } catch (error) {
      console.error(error);
      geojsonInfo.textContent = `読み込み失敗：${error.message}`;
      geojsonInput.value = '';
    }
  }

  function clearImportedGeoJSON() {
    const source = map.getSource('user-geojson');
    if (source) source.setData(EMPTY_FEATURE_COLLECTION);
    geojsonInput.value = '';
    geojsonClear.disabled = true;
    geojsonInfo.textContent = '未読込';
  }

  async function loadCameras() {
    const [baseResponse, extraResponse] = await Promise.all([
      fetch('data/cameras.geojson', { cache: 'no-store' }),
      fetch('data/cameras_additional.json', { cache: 'no-store' })
    ]);

    if (!baseResponse.ok) throw new Error(`GeoJSONの取得に失敗: ${baseResponse.status}`);
    if (!extraResponse.ok) throw new Error(`追加カメラデータの取得に失敗: ${extraResponse.status}`);

    const baseData = await baseResponse.json();
    const extraData = await extraResponse.json();
    const extraFeatures = (extraData.records || []).map(recordToFeature);

    cameraData = {
      type: 'FeatureCollection',
      metadata: {
        ...(baseData.metadata || {}),
        inventory_total: REGISTERED_CAMERA_TOTAL,
        mapped_count: baseData.features.length + extraFeatures.length,
        additional_count: extraFeatures.length,
        checked_at: extraData.checked_at || baseData.metadata?.checked_at
      },
      features: [...baseData.features, ...extraFeatures]
    };

    inventoryCountEl.textContent = String(REGISTERED_CAMERA_TOTAL);
    mappedCountEl.textContent = String(cameraData.features.length);
    populateAreas(cameraData.features);

    map.addSource('cameras', { type: 'geojson', data: cameraData });
    addApproximateMarkerImages();

    const preciseFilter = ['in', ['get', 'coordinate_precision'], ['literal', PRECISE_POSITION_TYPES]];
    const approximateFilter = ['!', preciseFilter];

    map.addLayer({
      id: 'camera-points-precise',
      type: 'circle',
      source: 'cameras',
      filter: preciseFilter,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5, 12, 9],
        'circle-color': [
          'match', ['get', 'provider'],
          '国土交通省', '#2f6db2',
          '静岡県', '#e07b39',
          'NEXCO中日本', '#2f8f5b',
          '#6b7280'
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.95
      }
    });

    map.addLayer({
      id: 'camera-points-approximate',
      type: 'symbol',
      source: 'cameras',
      filter: approximateFilter,
      layout: {
        'icon-image': [
          'match', ['get', 'provider'],
          '静岡県', 'square-prefecture',
          '国土交通省', 'square-mlit',
          'NEXCO中日本', 'square-nexco',
          'square-default'
        ],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.75, 12, 1.0],
        'icon-allow-overlap': true
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
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#172033',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
      }
    });

    ['camera-points-precise', 'camera-points-approximate'].forEach(layerId => {
      map.on('click', layerId, openPopup);
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
    });

    setupGeoJSONImportLayers();
    STATUS.textContent = statusText(cameraData.features);
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
  geojsonInput.addEventListener('change', () => loadImportedGeoJSON(geojsonInput.files?.[0]));
  geojsonClear.addEventListener('click', clearImportedGeoJSON);

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
