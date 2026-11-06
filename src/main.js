import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 loads its worker from a separate file; let Vite bundle it and hand over the URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'nouislider/dist/nouislider.css';
import './style.css';
import { MAP, VECTOR_LAYERS } from './config.js';
import { addFires } from './fires.js';
import { addFloods } from './floods.js';
import { addWeather } from './weather.js';
import { addActiveFires, addHotspots } from './live.js';
import { addFunding, fundingYears, loadFunding } from './funding.js';
import { loadGeoJSON, notice } from './util.js';
import { highwayControls } from './highways.js';

maplibregl.setWorkerUrl(workerUrl);

// Keep the province clear of the side panel on wide screens.
function fitPadding() {
  const wide = window.innerWidth > 600;
  return { top: wide ? 20 : 70, bottom: 20, right: 50, left: wide ? 340 : 20 };
}

const map = new maplibregl.Map({
  container: 'map',
  style: MAP.basemap,
  bounds: MAP.bounds,
  fitBoundsOptions: { padding: fitPadding() },
  maxBounds: MAP.maxBounds,
});
map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

function propsTable(props, titleField) {
  const rows = Object.entries(props).filter(([k, v]) => k !== titleField && !k.startsWith('_') && v != null && v !== '');
  const title = titleField && props[titleField] ? `<strong>${props[titleField]}</strong>` : '';
  return `${title}<table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
}

async function addVectorLayer(def) {
  const data = await loadGeoJSON(def.url);
  if (!data) {
    notice(`${def.label}: no data at <code>public/${def.url}</code> yet.`);
    return null;
  }
  def.data = data;
  map.addSource(def.id, { type: 'geojson', data });
  map.addLayer({ id: def.id, type: def.type, source: def.id, paint: def.paint });
  if (def.labelField) {
    const left = ['in', ['get', def.labelField], ['literal', def.labelLeft ?? []]];
    map.addLayer({
      id: `${def.id}-label`,
      type: 'symbol',
      source: def.id,
      ...(def.labelAlways ? {} : { minzoom: 6 }),
      layout: def.labelAlways
        ? {
            'text-field': ['get', def.labelField],
            'text-font': ['Noto Sans Bold'],
            'text-size': 13,
            'text-anchor': ['case', left, 'right', 'left'],
            'text-offset': ['case', left, ['literal', [-1.1, 0]], ['literal', [1.1, 0]]],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          }
        : { 'text-field': ['get', def.labelField], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top' },
      paint: { 'text-color': '#1d2430', 'text-halo-color': '#fff', 'text-halo-width': def.labelAlways ? 2 : 1.5 },
    });
  }
  if (def.popup !== false) {
    map.on('click', def.id, (e) => {
      new maplibregl.Popup().setLngLat(e.lngLat).setHTML(propsTable(e.features[0].properties, def.labelField)).addTo(map);
    });
    map.on('mouseenter', def.id, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', def.id, () => (map.getCanvas().style.cursor = ''));
  }
  return def;
}

function legendItem(item) {
  const label = item.label ? `<span>${item.label}</span>` : '';
  switch (item.type) {
    case 'image':
      return `<li><img src="${item.src}" alt="" onerror="this.closest('li').remove()"></li>`;
    case 'line':
      return `<li><i class="swatch-line" style="border-top:${item.width ?? 1}px solid ${item.color}"></i>${label}</li>`;
    case 'fill':
      return `<li><i class="swatch-fill" style="background:${item.color};border:1px solid ${item.stroke ?? item.color}"></i>${label}</li>`;
    case 'funding':
      return `<li><i class="swatch-funding" style="--c:${item.color}">$</i>${label}</li>`;
    default: {
      const size = item.radius * 2;
      const border = item.stroke ? `border:1.5px solid ${item.stroke};` : '';
      return `<li><i class="swatch-circle" style="background:${item.color};width:${size}px;height:${size}px;opacity:${item.opacity ?? 1};${border}"></i>${label}</li>`;
    }
  }
}

function addToggle(def) {
  const id = `toggle-${def.id}`;
  const wrap = document.createElement('div');
  wrap.className = 'toggle';
  wrap.innerHTML = `<input type="checkbox" id="${id}" checked><label for="${id}" class="layer-title">${def.label}</label>`;
  if (def.note) wrap.innerHTML += `<p class="hint legend">${def.note}</p>`;
  if (def.legend) wrap.innerHTML += `<ul class="legend">${def.legend.map(legendItem).join('')}</ul>`;
  wrap.querySelector('input').addEventListener('change', (e) => {
    const vis = e.target.checked ? 'visible' : 'none';
    for (const layerId of def.layers ?? [def.id, `${def.id}-label`]) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', vis);
    }
    if (def.after) document.getElementById(def.after).hidden = !e.target.checked;
  });
  document.getElementById(`layers-${def.group ?? 'reference'}`).append(wrap);
  // Controls that belong to a layer (e.g. the fire size slider) sit under its toggle.
  if (def.after) wrap.append(document.getElementById(def.after));
  if (def.controls) {
    wrap.append(def.controls);
    wrap.querySelector('input').addEventListener('change', (e) => (def.controls.hidden = !e.target.checked));
  }
}

map.on('load', async () => {
  // Highways and the border go under fires; Friendship Centres stay on top so they are always clickable.
  const [centres, ...others] = VECTOR_LAYERS;
  const added = [];
  for (const def of others) added.push(await addVectorLayer(def));
  const highways = added.find((d) => d?.id === 'highways');
  if (highways) highways.controls = highwayControls(map, 'highways');
  const funding = await loadFunding();
  // Floods sit above highways and the border but under the fire circles.
  added.push(await addFloods(map, maplibregl));
  added.push(await addFires(map, maplibregl, funding ? fundingYears(funding) : []));
  const centresDef = await addVectorLayer(centres);
  added.push(centresDef);
  if (centresDef) added.push(addFunding(map, maplibregl, funding, centresDef.data));
  addWeather(map, map.getLayer('highways') ? 'highways' : undefined);
  added.push(addHotspots(map, map.getLayer('fires') ? 'fires' : undefined));
  added.push(await addActiveFires(map, maplibregl));
  // Panel order: most important first within each group.
  const order = ['active-fires', 'hotspots', 'fires', 'floods', 'funding', 'friendship-centres', 'border', 'highways'];
  const defs = added.filter(Boolean).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  for (const def of defs) addToggle(def);
  // Allow a little zoom-out past the province, but not to the whole continent.
  map.setMinZoom(map.getZoom() - 0.5);
});

const toggleBtn = document.getElementById('panel-toggle');
toggleBtn.addEventListener('click', () => {
  const open = document.getElementById('panel').classList.toggle('collapsed') === false;
  toggleBtn.textContent = open ? 'Hide' : 'Filters';
  toggleBtn.setAttribute('aria-expanded', String(open));
});
