import { FLOODS } from './config.js';
import { loadGeoJSON, notice } from './util.js';
import { onYears } from './years.js';

const fmtDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// Several satellite images often cover the same flood a few days apart, so one click can hit
// overlapping polygons: list them all, newest first.
function popupHtml(features) {
  const seen = new Set();
  const items = features
    .map((f) => f.properties)
    .filter((p) => !seen.has(p.package) && seen.add(p.package))
    .sort((a, b) => b.date.localeCompare(a.date));
  const title = items.length > 1 ? `<strong>Flooding mapped by satellite (${items.length} images)</strong>` : '<strong>Flooding mapped by satellite</strong>';
  const rows = items.map((p) => {
    const cells = [
      ['Date', fmtDate(p.date)],
      ['Location', p.place],
      ['Flooded in Sask.', `${p.km2.toLocaleString()} km²`],
      ['Type', p.types],
      ['Satellite', p.sensor],
      ['Confidence', p.confidence],
      ['Notes', p.notes],
      ['Note', p.all_water ? 'Older map: includes permanent lakes and rivers as well as flood water.' : null],
    ].filter(([, v]) => v != null && v !== '');
    const link = p.package ? `<tr><td colspan="2"><a href="${p.package}" target="_blank" rel="noopener">NRCan map package (zip)</a></td></tr>` : '';
    return `<table>${cells.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}${link}</table>`;
  });
  return `${title}<div class="popup-scroll">${rows.join('<hr>')}</div>`;
}

export async function addFloods(map, maplibregl, beforeId) {
  const data = await loadGeoJSON(FLOODS.url);
  if (!data) {
    notice(`Floods: no data at <code>public/${FLOODS.url}</code> yet. Run <code>npm run floods</code>.`);
    return null;
  }
  map.addSource('floods', { type: 'geojson', data });
  map.addLayer({ id: 'floods', type: 'fill', source: 'floods', paint: { 'fill-color': FLOODS.color, 'fill-opacity': 0.45 } }, beforeId);
  map.addLayer({ id: 'floods-outline', type: 'line', source: 'floods', paint: { 'line-color': FLOODS.outline, 'line-width': 0.8 } }, beforeId);

  // Flooded areas are often thin strips along rivers, so clicks and hovers count anything within a few pixels.
  const near = ({ x, y }) => [[x - 5, y - 5], [x + 5, y + 5]];
  const hits = (point) => (map.getLayoutProperty('floods', 'visibility') === 'none' ? [] : map.queryRenderedFeatures(near(point), { layers: ['floods', 'floods-outline'] }));
  const onTop = ['fires', 'friendship-centres', 'active-fires'];
  map.on('click', (e) => {
    const features = hits(e.point);
    if (!features.length) return;
    // Fires, centres and active fires sit on top and have their own pop-ups.
    if (map.queryRenderedFeatures(e.point, { layers: onTop.filter((id) => map.getLayer(id)) }).length) return;
    new maplibregl.Popup({ maxWidth: '300px', focusAfterOpen: false }).setLngLat(e.lngLat).setHTML(popupHtml(features)).addTo(map);
  });
  let hovering = false;
  map.on('mousemove', (e) => {
    const over = hits(e.point).length > 0;
    if (over === hovering) return;
    hovering = over;
    if (over) map.getCanvas().style.cursor = 'pointer';
    else if (map.getCanvas().style.cursor === 'pointer') map.getCanvas().style.cursor = '';
  });

  const count = document.createElement('p');
  count.className = 'count';
  onYears((y0, y1) => {
    const filter = ['all', ['>=', ['get', 'year'], y0], ['<=', ['get', 'year'], y1]];
    map.setFilter('floods', filter);
    map.setFilter('floods-outline', filter);
    const shown = data.features.filter((f) => f.properties.year >= y0 && f.properties.year <= y1);
    const years = [...new Set(shown.map((f) => f.properties.year))];
    count.textContent = shown.length
      ? `${shown.length} satellite flood map${shown.length === 1 ? '' : 's'} (${years.join(', ')})`
      : 'No floods mapped in these years';
  });

  return {
    id: 'floods',
    label: 'Historical floods (satellite-mapped)',
    group: 'historical',
    layers: ['floods', 'floods-outline'],
    note: 'Only floods Natural Resources Canada mapped by satellite for emergency response, so many smaller or local floods are not included. The 2011 maps also show permanent lakes and rivers.',
    legend: [{ type: 'fill', color: FLOODS.color, stroke: FLOODS.outline, label: 'Flooded area' }],
    controls: count,
  };
}
