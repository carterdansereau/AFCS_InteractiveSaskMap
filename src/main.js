import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 loads its worker from a separate file; let Vite bundle it and hand over the URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'nouislider/dist/nouislider.css';
import './style.css';
import { MAP, VECTOR_LAYERS } from './config.js';
import { addFires } from './fires.js';
import { addWeather } from './weather.js';
import { loadGeoJSON, notice } from './util.js';

maplibregl.setWorkerUrl(workerUrl);

const map = new maplibregl.Map({
  container: 'map',
  style: MAP.basemap,
  center: MAP.center,
  zoom: MAP.zoom,
  maxBounds: MAP.maxBounds,
});
map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

function propsTable(props) {
  const rows = Object.entries(props).filter(([k, v]) => !k.startsWith('_') && v != null && v !== '');
  return `<table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
}

async function addVectorLayer(def) {
  const data = await loadGeoJSON(def.url);
  if (!data) {
    notice(`${def.label}: no data at <code>public/${def.url}</code> yet.`);
    return null;
  }
  map.addSource(def.id, { type: 'geojson', data });
  map.addLayer({ id: def.id, type: def.type, source: def.id, paint: def.paint });
  if (def.labelField) {
    map.addLayer({
      id: `${def.id}-label`,
      type: 'symbol',
      source: def.id,
      minzoom: 6,
      layout: { 'text-field': ['get', def.labelField], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top' },
      paint: { 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
    });
  }
  map.on('click', def.id, (e) => {
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(propsTable(e.features[0].properties)).addTo(map);
  });
  return def;
}

function addToggle(def) {
  const id = `toggle-${def.id}`;
  const wrap = document.createElement('div');
  wrap.className = 'toggle';
  wrap.innerHTML = `<input type="checkbox" id="${id}" checked><label for="${id}">${def.label}</label>`;
  if (def.legend) {
    wrap.innerHTML += `<ul class="legend">${def.legend
      .map((c) => `<li><span style="background:${c.color};width:${c.radius * 2}px;height:${c.radius * 2}px"></span>${c.label}</li>`)
      .join('')}</ul>`;
  }
  wrap.querySelector('input').addEventListener('change', (e) => {
    const vis = e.target.checked ? 'visible' : 'none';
    for (const layerId of [def.id, `${def.id}-label`]) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', vis);
    }
  });
  document.getElementById('layer-toggles').append(wrap);
}

map.on('load', async () => {
  // Highways go under fires; Friendship Centres stay on top so they are always clickable.
  const [centres, ...others] = VECTOR_LAYERS;
  const added = [];
  for (const def of others) added.push(await addVectorLayer(def));
  added.push(await addFires(map, maplibregl));
  added.push(await addVectorLayer(centres));
  addWeather(map, map.getLayer('highways') ? 'highways' : undefined);
  for (const def of added.filter(Boolean).reverse()) addToggle(def);
});

const toggleBtn = document.getElementById('panel-toggle');
toggleBtn.addEventListener('click', () => {
  const open = document.getElementById('panel').classList.toggle('collapsed') === false;
  toggleBtn.textContent = open ? 'Hide' : 'Filters';
  toggleBtn.setAttribute('aria-expanded', String(open));
});
