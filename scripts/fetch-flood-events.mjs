// Downloads Saskatchewan entries from Natural Resources Canada's Historical Flood Events (HFE)
// database and writes public/data/flood_events.geojson.  Run with: npm run floods
//
// Each HFE event is a multipoint (one point per affected community). We keep the points inside
// Saskatchewan, one feature each, and drop water-main breaks, which are not natural floods.
import { readFile, writeFile } from 'node:fs/promises';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';

const SERVICE = 'https://maps-cartes.services.geo.ca/server_serveur/rest/services/NRCan/historical_flood_event_en/MapServer/0';
const FROM_YEAR = 2006; // the app's year slider trims this further
const SKIP_CAUSES = ['municipal water main break'];
const CAUSES = { freshet: 'Spring snowmelt', 'heavy rain': 'Heavy rain', 'ice jam': 'Ice jam' };

const border = JSON.parse(await readFile(new URL('../public/data/saskatchewan.geojson', import.meta.url))).features[0];

const body = new URLSearchParams({
  where: `province_territory LIKE '%SK%' AND year >= ${FROM_YEAR}`,
  outFields: 'event_id,year,start_date,end_date,season,evacuation,death,flood_cause,event_summary,source,precipitation_analysis_url',
  returnGeometry: 'true',
  outSR: '4326',
  f: 'json',
});
const res = await fetch(`${SERVICE}/query`, { method: 'POST', body });
const json = await res.json();
if (!res.ok || json.error) throw new Error(JSON.stringify(json.error ?? res.status));
if (json.exceededTransferLimit) throw new Error('More events than one request returns; add paging.');

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '');
const yesNo = (s) => (s === 'yes' ? 'Yes' : s === 'no' ? 'No' : null);
const features = [];
for (const { attributes: a, geometry } of json.features) {
  if (SKIP_CAUSES.includes(a.flood_cause)) continue;
  const points = (geometry?.points ?? []).filter((pt) => booleanPointInPolygon(pt, border));
  for (const pt of points) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: pt.map((c) => Math.round(c * 1e4) / 1e4) },
      properties: {
        id: a.event_id,
        year: a.year,
        start: isDate(a.start_date) ? a.start_date : null,
        end: isDate(a.end_date) ? a.end_date : null,
        cause: CAUSES[a.flood_cause] ?? a.flood_cause,
        evacuation: yesNo(a.evacuation),
        deaths: yesNo(a.death),
        // Summaries start with "This event happened in N location(s); ".
        summary: (a.event_summary ?? '').replace(/^This event happened in \d+ location\(s\);\s*/, '').replace(/\.(?=[A-Z])/g, '. '),
        source: a.source,
        rain_map: a.precipitation_analysis_url?.startsWith('http') ? a.precipitation_analysis_url : null,
      },
    });
  }
}
features.sort((x, y) => x.properties.year - y.properties.year);
await writeFile(new URL('../public/data/flood_events.geojson', import.meta.url), JSON.stringify({ type: 'FeatureCollection', features }));
const events = new Set(features.map((f) => f.properties.id)).size;
console.log(`flood_events.geojson: ${events} events at ${features.length} places in Saskatchewan`);
