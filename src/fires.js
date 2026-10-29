import noUiSlider from 'nouislider';
import { FIRES } from './config.js';
import { loadGeoJSON, notice } from './util.js';

const DAY = 86_400_000;
const f = FIRES.fields;

function parseDay(value) {
  if (value == null || value === '') return null;
  // QGIS writes dates as "2019-05-12" or "2019/05/12 00:00:00".
  const ms = Date.parse(String(value).replace(/\//g, '-').slice(0, 10));
  return Number.isNaN(ms) ? null : Math.floor(ms / DAY);
}

// Add _start/_end (days since 1970) so the map can filter on "active during"
// without re-parsing dates every time a slider moves.
function prepare(geojson) {
  let minYear = Infinity;
  let maxYear = -Infinity;
  for (const feat of geojson.features) {
    const p = feat.properties;
    const year = Number(p[f.year]) || new Date((parseDay(p[f.reported]) ?? 0) * DAY).getUTCFullYear();
    const start = parseDay(p[f.reported]) ?? Math.floor(Date.UTC(year, 0, 1) / DAY);
    const end = parseDay(p[f.out]) ?? (parseDay(p[f.reported]) ? start : Math.floor(Date.UTC(year, 11, 31) / DAY));
    p._start = start;
    p._end = Math.max(start, end);
    p._size = Number(p[f.size]) || 0;
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);
  }
  return { minYear, maxYear };
}

function sizeStep(prop) {
  const expr = ['step', ['get', '_size'], prop(FIRES.sizeClasses[0])];
  for (const c of FIRES.sizeClasses.slice(1)) expr.push(c.min, prop(c));
  return expr;
}

function popupHtml(p) {
  const rows = [
    ['Fire', p[f.name] || p[f.id]],
    ['Reported', p[f.reported]],
    ['Out', p[f.out]],
    ['Size', p._size ? `${p._size.toLocaleString()} ha` : null],
    ['Cause', p[f.cause]],
  ].filter(([, v]) => v != null && v !== '');
  return `<table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${String(v).slice(0, 10)}</td></tr>`).join('')}</table>`;
}

export async function addFires(map, maplibregl) {
  const data = await loadGeoJSON(FIRES.url);
  if (!data) {
    notice(`No wildfire data yet. Export your fire layer from QGIS to <code>public/${FIRES.url}</code>.`);
    document.getElementById('fire-filters').hidden = true;
    return null;
  }
  const { minYear, maxYear } = prepare(data);

  map.addSource('fires', { type: 'geojson', data });
  map.addLayer({
    id: 'fires',
    type: 'circle',
    source: 'fires',
    paint: {
      'circle-color': sizeStep((c) => c.color),
      'circle-radius': sizeStep((c) => c.radius),
      'circle-opacity': 0.8,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 0.5,
    },
  });
  map.on('click', 'fires', (e) => {
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(e.features[0].properties)).addTo(map);
  });
  map.on('mouseenter', 'fires', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'fires', () => (map.getCanvas().style.cursor = ''));

  // --- Filters ---
  const yearEl = document.getElementById('year-slider');
  const sizeEl = document.getElementById('size-slider');
  noUiSlider.create(yearEl, {
    start: [Math.max(minYear, maxYear - 9), maxYear],
    connect: true,
    step: 1,
    range: { min: minYear, max: maxYear },
    format: { to: (v) => Math.round(v), from: Number },
  });
  // Fire sizes span 0.01 ha to 1,000,000+ ha, so the size slider is non-linear.
  noUiSlider.create(sizeEl, {
    start: 0,
    connect: [false, true],
    range: { min: 0, '25%': 10, '50%': 200, '75%': 10000, max: 500000 },
    format: { to: (v) => Math.round(v), from: Number },
  });

  const update = () => {
    const [y0, y1] = yearEl.noUiSlider.get().map(Number);
    const minSize = Number(sizeEl.noUiSlider.get());
    const from = Math.floor(Date.UTC(y0, 0, 1) / DAY);
    const to = Math.floor(Date.UTC(y1, 11, 31) / DAY);
    map.setFilter('fires', ['all', ['<=', ['get', '_start'], to], ['>=', ['get', '_end'], from], ['>=', ['get', '_size'], minSize]]);
    document.getElementById('year-label').value = y0 === y1 ? `in ${y0}` : `between ${y0} and ${y1}`;
    document.getElementById('size-label').value = `${minSize.toLocaleString()} ha`;
    const shown = data.features.filter((ft) => ft.properties._start <= to && ft.properties._end >= from && ft.properties._size >= minSize).length;
    document.getElementById('fire-count').value = shown.toLocaleString();
  };
  yearEl.noUiSlider.on('update', update);
  sizeEl.noUiSlider.on('update', update);

  // Play steps a one-year window from the slider's start to the latest year.
  const playBtn = document.getElementById('play');
  let timer = null;
  const stop = () => {
    clearInterval(timer);
    timer = null;
    playBtn.textContent = '▶ Play';
  };
  playBtn.addEventListener('click', () => {
    if (timer) return stop();
    let year = Number(yearEl.noUiSlider.get()[0]);
    playBtn.textContent = '❚❚ Pause';
    timer = setInterval(() => {
      yearEl.noUiSlider.set([year, year]);
      if (++year > maxYear) stop();
    }, 900);
  });

  return { id: 'fires', label: 'Historical wildfires', legend: FIRES.sizeClasses };
}
