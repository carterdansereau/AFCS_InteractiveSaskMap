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

function eventPopupHtml(features) {
  const seen = new Set();
  const items = features
    .map((f) => f.properties)
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => b.year - a.year);
  const rows = items.map((p) => {
    const when = p.when ? p.when : p.start ? fmtDate(p.start) + (p.end && p.end !== p.start ? ` to ${fmtDate(p.end)}` : '') : String(p.year);
    const cells = [
      ['When', when],
      ['Cause', p.cause],
      ['Evacuations', p.evacuation],
      ['Deaths', p.deaths],
    ].filter(([, v]) => v != null && v !== '');
    const rain = p.rain_map ? `<a href="${p.rain_map}" target="_blank" rel="noopener">Rainfall map (NRCan)</a>` : '';
    // MapLibre hands nested properties back as JSON text.
    const sources = typeof p.sources === 'string' ? JSON.parse(p.sources) : (p.sources ?? []);
    const links = sources.length ? `<div class="hint">Sources:</div><ul class="popup-sources">${sources.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></li>`).join('')}</ul>` : '';
    const place = p.place ? `<div class="hint">${p.place}</div>` : '';
    return `${place}<table>${cells.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table><p class="popup-text">${p.summary}</p>${rain}${links}`;
  });
  const title = `<strong>Flood event${items.length > 1 ? `s (${items.length})` : ''}</strong>`;
  return `${title}<div class="popup-scroll">${rows.join('<hr>')}</div>`;
}

export async function addFloods(map, maplibregl, beforeId) {
  const [data, events, north] = await Promise.all([loadGeoJSON(FLOODS.url), loadGeoJSON(FLOODS.eventsUrl), loadGeoJSON(FLOODS.northUrl)]);
  if (!data || !events) {
    notice(`Floods: missing <code>public/${FLOODS.url}</code> or <code>public/${FLOODS.eventsUrl}</code>. Run <code>npm run floods</code>.`);
    return null;
  }
  map.addSource('floods', { type: 'geojson', data });
  // Northern high-water events (hand-maintained, with sources) share the event layer.
  if (north) events.features.push(...north.features);
  map.addSource('flood-events', { type: 'geojson', data: events });
  map.addLayer({ id: 'floods', type: 'fill', source: 'floods', paint: { 'fill-color': FLOODS.color, 'fill-opacity': 0.45 } }, beforeId);
  map.addLayer({ id: 'floods-outline', type: 'line', source: 'floods', paint: { 'line-color': FLOODS.outline, 'line-width': 0.8 } }, beforeId);
  // Reported flood events: one point per affected community.
  map.addLayer(
    {
      id: 'flood-events',
      type: 'circle',
      source: 'flood-events',
      // An open ring: it doesn't look like a Friendship Centre, and it circles the centre's dot when a flood hit that town.
      paint: { 'circle-radius': 10, 'circle-opacity': 0, 'circle-stroke-color': FLOODS.eventColor, 'circle-stroke-width': 3 },
    },
    beforeId,
  );

  // Flooded areas are often thin strips along rivers, so clicks and hovers count anything within a few pixels.
  const near = ({ x, y }) => [[x - 5, y - 5], [x + 5, y + 5]];
  const visible = () => map.getLayoutProperty('floods', 'visibility') !== 'none';
  const eventHits = (point) => (visible() ? map.queryRenderedFeatures(near(point), { layers: ['flood-events'] }) : []);
  const hits = (point) => (visible() ? map.queryRenderedFeatures(near(point), { layers: ['flood-events', 'floods', 'floods-outline'] }) : []);
  const onTop = ['fires', 'friendship-centres', 'active-fires'];
  map.on('click', (e) => {
    // Fires, centres and active fires sit on top and have their own pop-ups.
    if (map.queryRenderedFeatures(e.point, { layers: onTop.filter((id) => map.getLayer(id)) }).length) return;
    const points = eventHits(e.point);
    const areas = points.length ? [] : hits(e.point);
    if (!points.length && !areas.length) return;
    const html = points.length ? eventPopupHtml(points) : popupHtml(areas);
    new maplibregl.Popup({ maxWidth: '300px', focusAfterOpen: false }).setLngLat(e.lngLat).setHTML(html).addTo(map);
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
    map.setFilter('flood-events', filter);
    const inRange = (f) => f.properties.year >= y0 && f.properties.year <= y1;
    const nEvents = new Set(events.features.filter(inRange).map((f) => f.properties.id)).size;
    const nMaps = data.features.filter(inRange).length;
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    count.textContent = nEvents || nMaps ? `${plural(nEvents, 'flood event')}, ${plural(nMaps, 'satellite flood map')}` : 'No floods recorded in these years';
  });

  return {
    id: 'floods',
    label: 'Historical floods',
    group: 'historical',
    layers: ['floods', 'floods-outline', 'flood-events'],
    note: 'Major floods recorded by Natural Resources Canada, plus northern high-water events from news and Water Security Agency reports. Smaller or local floods are not included. The 2011 satellite maps also show permanent lakes and rivers.',
    legend: [
      { type: 'circle', color: 'transparent', radius: 7, stroke: FLOODS.eventColor, label: 'Reported flood event (click for details)' },
      { type: 'fill', color: FLOODS.color, stroke: FLOODS.outline, label: 'Flooded area seen by satellite' },
    ],
    controls: count,
  };
}
