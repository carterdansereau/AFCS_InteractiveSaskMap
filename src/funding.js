import { FUNDING } from './config.js';
import { onYears } from './years.js';
import { notice } from './util.js';

const norm = (s) => String(s).trim().toLowerCase().replace(/[’‘`]/g, "'");

export async function loadFunding() {
  try {
    const res = await fetch(FUNDING.url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export function fundingYears(records) {
  const years = records.map((r) => r.year);
  return years.length ? [Math.min(...years), Math.max(...years)] : [];
}

export function formatMoney(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

// Funding by centre: { "la loche": { 2023: 12000, 2024: 15000 } }.
function byCentre(records) {
  const out = {};
  for (const { centre, year, amount } of records) {
    const c = (out[norm(centre)] ??= {});
    c[year] = (c[year] ?? 0) + amount;
  }
  return out;
}

const sumYears = (years, y0, y1) => Object.entries(years ?? {}).reduce((t, [y, v]) => (y >= y0 && y <= y1 ? t + v : t), 0);

export function addFunding(map, maplibregl, records, centres) {
  const funding = byCentre(records ?? []);
  const nameField = FUNDING.centreField;
  const known = new Set(centres.features.map((f) => norm(f.properties[nameField])));
  const unknown = [...new Set((records ?? []).map((r) => r.centre).filter((c) => !known.has(norm(c))))];
  if (unknown.length) notice(`Funding sheet names not matching any Friendship Centre: <b>${unknown.join(', ')}</b>. Check the spelling in funding.xlsx.`);

  // One fixed scale for every year range, so circles stay comparable while the slider moves:
  // the centre with the most funding across all years gets the largest circle.
  const scaleMax = Math.max(1, ...Object.values(funding).map((y) => sumYears(y, -Infinity, Infinity)));
  let range = [-Infinity, Infinity];

  // Centre pop-ups live here so they can show funding for the selected years.
  map.on('click', 'friendship-centres', (e) => {
    const p = e.features[0].properties;
    const years = funding[norm(p[nameField])] ?? {};
    const rows = Object.entries(years).filter(([y]) => y >= range[0] && y <= range[1]).sort(([a], [b]) => b - a);
    const total = rows.reduce((t, [, v]) => t + v, 0);
    const span = range[0] === range[1] ? `${range[0]}` : `${range[0]}–${range[1]}`;
    const table = rows.length
      ? `<table>${rows.map(([y, v]) => `<tr><th>${y}</th><td>$${v.toLocaleString()}</td></tr>`).join('')}${rows.length > 1 ? `<tr><th>Total</th><td><b>$${total.toLocaleString()}</b></td></tr>` : ''}</table>`
      : `<p class="hint">No funding recorded for ${span}.</p>`;
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<strong>${p[nameField]} Friendship Centre</strong>${records?.length ? `<div class="hint">Funding, ${span}</div>${table}` : ''}`).addTo(map);
  });
  map.on('mouseenter', 'friendship-centres', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'friendship-centres', () => (map.getCanvas().style.cursor = ''));

  if (!records?.length) return null;

  map.addSource('funding', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer(
    {
      id: 'funding',
      type: 'circle',
      source: 'funding',
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': FUNDING.color,
        'circle-opacity': 0.22,
        'circle-stroke-color': FUNDING.color,
        'circle-stroke-width': 1.5,
      },
    },
    'friendship-centres',
  );
  map.addLayer(
    {
      id: 'funding-label',
      type: 'symbol',
      source: 'funding',
      minzoom: 5, // amounts hide when zoomed out; centre names stay
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
        'text-anchor': 'bottom',
        'text-offset': [0, -1.3],
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#13493f', 'text-halo-color': '#fff', 'text-halo-width': 1.2 },
    },
    'friendship-centres',
  );

  onYears((y0, y1) => {
    range = [y0, y1];
    const features = [];
    for (const f of centres.features) {
      const total = sumYears(funding[norm(f.properties[nameField])], y0, y1);
      if (!total) continue;
      const radius = Math.max(FUNDING.minRadius, FUNDING.maxRadius * Math.sqrt(total / scaleMax));
      features.push({ type: 'Feature', geometry: f.geometry, properties: { radius, label: formatMoney(total) } });
    }
    map.getSource('funding').setData({ type: 'FeatureCollection', features });
  });

  return {
    id: 'funding',
    label: 'Funding to Friendship Centres',
    group: 'historical',
    note: 'Circle area shows total funding for the selected years.',
    legend: [{ type: 'funding', color: FUNDING.color, label: 'Funding, e.g. $250K' }],
  };
}
