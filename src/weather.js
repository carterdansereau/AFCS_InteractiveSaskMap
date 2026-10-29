import { WEATHER } from './config.js';
import { notice } from './util.js';

const today = () => new Date().toISOString().slice(0, 10);

function tileUrl(layer, date) {
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: layer,
    styles: '',
    format: 'image/png',
    transparent: 'true',
    srs: 'EPSG:3857',
    width: '256',
    height: '256',
    time: date,
  });
  // MapLibre fills in {bbox-epsg-3857}; it must not be URL-encoded.
  return `${WEATHER.wmsUrl}?${params}&bbox={bbox-epsg-3857}`;
}

function legendUrl(layer) {
  const params = new URLSearchParams({ service: 'WMS', version: '1.1.1', request: 'GetLegendGraphic', layer, format: 'image/png' });
  return `${WEATHER.wmsUrl}?${params}`;
}

export function addWeather(map, beforeId) {
  const select = document.getElementById('weather-layer');
  const dateInput = document.getElementById('weather-date');
  const legend = document.getElementById('weather-legend');
  legend.addEventListener('error', () => (legend.hidden = true));
  select.innerHTML = WEATHER.layers.map((l) => `<option value="${l.id}">${l.label}</option>`).join('');
  select.value = WEATHER.defaultLayer;
  dateInput.value = today();
  dateInput.max = today();

  map.addSource('weather', { type: 'raster', tiles: [tileUrl(WEATHER.defaultLayer, today())], tileSize: 256 });
  map.addLayer({ id: 'weather', type: 'raster', source: 'weather', paint: { 'raster-opacity': WEATHER.opacity } }, beforeId);

  let warned = false;
  map.on('error', (e) => {
    if (warned || e.sourceId !== 'weather') return;
    warned = true;
    notice('The CWFIS fire weather service did not respond. It may be down or have moved; see <code>WEATHER</code> in <code>src/config.js</code>.');
  });

  const update = () => {
    const layer = select.value;
    const visible = layer !== 'none';
    map.setLayoutProperty('weather', 'visibility', visible ? 'visible' : 'none');
    legend.hidden = !visible;
    if (!visible) return;
    map.getSource('weather').setTiles([tileUrl(layer, dateInput.value || today())]);
    legend.src = legendUrl(layer);
  };
  select.addEventListener('change', update);
  dateInput.addEventListener('change', update);
  update();
}
