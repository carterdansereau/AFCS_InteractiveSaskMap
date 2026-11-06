// Downloads Saskatchewan flood extents from Natural Resources Canada's "Floods in Canada - Archive"
// map service and writes public/data/floods.geojson.  Run with: npm run floods
//
// The service has one row per flood class per satellite image. We keep the flooded classes
// (open water, flooded vegetation, urban, and "unclassified" flood from the older products),
// drop permanent water / river ice / unknown state, clip each polygon to the Saskatchewan border
// (some Manitoba and Alberta products reach into the province), and merge the rows of one image
// into a single feature so a click shows one pop-up per satellite image.
import { readFile, writeFile } from 'node:fs/promises';
import { area } from '@turf/area';
import { intersect } from '@turf/intersect';
import { featureCollection } from '@turf/helpers';
import { rewind } from '@turf/rewind';

const SERVICE = 'https://maps-cartes.services.geo.ca/egs_sgu/rest/services/Flood_Inondation/EGS_Flood_Product_Archive_en/MapServer/2';
const YEARS = [2006, 2100]; // trimmed to the wildfire years in the app itself
const FLOOD_CLASSES = { 0: 'Flood', 2: 'Open water flood', 3: 'Flooded vegetation', 4: 'Urban flood' };
const MIN_KM2 = 1; // drop slivers where a neighbouring province's flood map just touches the border
const PAGE = 500; // well under the service's 2,000 record cap
const AOI_NAMES = { QuAppelle: "Qu'Appelle" };

const border = JSON.parse(await readFile(new URL('../public/data/saskatchewan.geojson', import.meta.url))).features[0];

async function query(params) {
  const body = new URLSearchParams({ f: 'geojson', outSR: '4326', ...params });
  const res = await fetch(`${SERVICE}/query`, { method: 'POST', body });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json;
}

const rows = [];
for (let offset = 0; ; offset += PAGE) {
  const page = await query({
    where: `class IN (${Object.keys(FLOOD_CLASSES).join(',')}) AND date_utc >= DATE '${YEARS[0]}-01-01'`,
    geometry: '-110.01,48.99,-101.36,60.01',
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'OBJECTID,product_file_name,aoi_code,datetime_utc_str,sensor_name,confidence_level,subdivision_code_client,class,package_url,product_notes',
    orderByFields: 'OBJECTID',
    maxAllowableOffset: '0.001', // ~100 m; keeps the file small, still sharp at town scale
    geometryPrecision: '4',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
  });
  rows.push(...page.features);
  if (page.features.length < PAGE && !page.exceededTransferLimit) break;
}

// Group rows by satellite image (product file).
const products = new Map();
for (const row of rows) {
  if (!row.geometry) continue;
  const clipped = intersect(featureCollection([row, border]));
  if (!clipped) continue; // outside Saskatchewan
  const p = row.properties;
  const key = p.product_file_name;
  const entry = products.get(key) ?? { props: p, parts: [], classes: new Set() };
  entry.parts.push(clipped.geometry);
  entry.classes.add(FLOOD_CLASSES[p.class]);
  products.set(key, entry);
}

const features = [];
for (const { props: p, parts, classes } of products.values()) {
  const coords = parts.flatMap((g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates));
  const geometry = rewind({ type: 'MultiPolygon', coordinates: coords });
  const km2 = area({ type: 'Feature', geometry, properties: {} }) / 1e6;
  if (km2 < MIN_KM2) continue;
  const date = p.datetime_utc_str.slice(0, 10);
  features.push({
    type: 'Feature',
    geometry,
    properties: {
      date,
      year: Number(date.slice(0, 4)),
      // NRCan's area-of-interest name, e.g. "QuAppelle" -> "Qu'Appelle", "OldWivesLake" -> "Old Wives Lake".
      place: AOI_NAMES[p.aoi_code] ?? p.aoi_code.replace(/([a-z])([A-Z])/g, '$1 $2'),
      km2: Math.round(km2 * 10) / 10,
      types: [...classes].join(', '),
      sensor: p.sensor_name,
      confidence: p.confidence_level,
      province: p.subdivision_code_client,
      // Products from before ~2015 have one "Flood" class that also covers permanent lakes and rivers.
      all_water: classes.has('Flood') ? 1 : 0,
      notes: p.product_notes,
      package: p.package_url,
    },
  });
}
features.sort((a, b) => a.properties.date.localeCompare(b.properties.date));

await writeFile(new URL('../public/data/floods.geojson', import.meta.url), JSON.stringify({ type: 'FeatureCollection', features }));
const byYear = {};
for (const f of features) byYear[f.properties.year] = (byYear[f.properties.year] ?? 0) + 1;
console.log(`floods.geojson: ${features.length} satellite flood maps in Saskatchewan`, byYear);
