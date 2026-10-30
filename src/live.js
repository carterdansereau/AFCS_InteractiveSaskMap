import { ACTIVE_FIRES, HOTSPOTS } from './config.js';

const status = (text) => (document.getElementById('live-status').textContent = text);

function wfsUrl() {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: ACTIVE_FIRES.typeName,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    // Rows still in effect, for this province, excluding prescribed burns.
    cql_filter: `agency_code='${ACTIVE_FIRES.agency}' AND fire_was_prescribed=0 AND record_end>'${new Date().toISOString()}'`,
  });
  return `${ACTIVE_FIRES.wfsUrl}?${params}`;
}

// Keep one row per fire: the most recent status update.
function latestPerFire(features) {
  const byId = new Map();
  for (const feat of features) {
    const id = feat.properties.national_fire_id;
    const prev = byId.get(id);
    if (!prev || feat.properties.status_date > prev.properties.status_date) byId.set(id, feat);
  }
  return [...byId.values()];
}

function colorExpr() {
  const expr = ['match', ['get', 'stage_of_control_status']];
  for (const [code, s] of Object.entries(ACTIVE_FIRES.stages)) expr.push(code, s.color);
  expr.push(ACTIVE_FIRES.otherStageColor);
  return expr;
}

function popupHtml(p) {
  const stage = ACTIVE_FIRES.stages[p.stage_of_control_status]?.label ?? p.stage_of_control_status;
  const rows = [
    ['Fire', p.agency_fire_id],
    ['Status', stage],
    ['Size', p.fire_size >= 0 ? `${Number(p.fire_size).toLocaleString()} ha` : null],
    ['Contained', p.percent_contained >= 0 ? `${p.percent_contained}%` : null],
    ['Updated', p.status_date ? new Date(p.status_date).toLocaleString() : null],
  ].filter(([, v]) => v != null && v !== '');
  return `<strong>Active fire</strong><table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
}

export async function addActiveFires(map, maplibregl) {
  map.addSource('active-fires', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'active-fires',
    type: 'circle',
    source: 'active-fires',
    paint: {
      'circle-color': colorExpr(),
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'fire_size'], 0], 0, 6, 1000, 9, 50000, 14],
      'circle-stroke-color': '#000',
      'circle-stroke-width': 1.5,
    },
  });
  map.on('click', 'active-fires', (e) => {
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(e.features[0].properties)).addTo(map);
  });
  map.on('mouseenter', 'active-fires', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'active-fires', () => (map.getCanvas().style.cursor = ''));

  async function refresh() {
    try {
      const res = await fetch(wfsUrl());
      if (!res.ok) throw new Error(res.status);
      const fires = latestPerFire((await res.json()).features);
      map.getSource('active-fires').setData({ type: 'FeatureCollection', features: fires });
      const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      status(fires.length ? `${fires.length} active fire${fires.length === 1 ? '' : 's'} reported in Saskatchewan (checked ${time}).` : `No active fires reported in Saskatchewan right now (checked ${time}).`);
    } catch {
      status('Could not load active fires from CWFIS. The service may be down or blocking this site.');
    }
  }
  refresh();
  setInterval(refresh, ACTIVE_FIRES.refreshMinutes * 60_000);

  return {
    id: 'active-fires',
    label: 'Active fires (agency reported)',
    legend: [
      ...Object.values(ACTIVE_FIRES.stages).map((s) => ({ color: s.color, radius: 6, label: s.label })),
    ],
  };
}

export function addHotspots(map, beforeId) {
  const params = new URLSearchParams({
    service: 'WMS', version: '1.1.1', request: 'GetMap', layers: HOTSPOTS.layer, styles: '',
    format: 'image/png', transparent: 'true', srs: 'EPSG:3857', width: '256', height: '256',
  });
  map.addSource('hotspots', { type: 'raster', tiles: [`${HOTSPOTS.wmsUrl}?${params}&bbox={bbox-epsg-3857}`], tileSize: 256 });
  map.addLayer({ id: 'hotspots', type: 'raster', source: 'hotspots' }, beforeId);
  return { id: 'hotspots', label: 'Satellite hotspots (last 24 h)' };
}
