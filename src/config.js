// Everything that depends on the data lives here, so swapping a QGIS export
// or a CWFIS layer name should not require touching the rest of the app.

export const MAP = {
  // Saskatchewan's extent; the map opens fitted to it and can't zoom out much further.
  bounds: [[-110, 49], [-101.36, 60]],
  // Loose limit on panning, wide enough that the whole province fits on any screen shape.
  maxBounds: [[-130, 41], [-80, 64]],
  // OpenFreeMap: free vector basemap, no API key.
  basemap: 'https://tiles.openfreemap.org/styles/positron',
};

// Field names match the cleaned fires.geojson (see scripts/clean_exports.py).
// If your QGIS export renamed fields, change them here.
export const FIRES = {
  url: 'data/fires.geojson',
  fields: {
    year: 'year',
    reported: 'rep_date',
    out: 'out_date',
    size: 'size_ha',
    name: 'firename',
    cause: 'cause',
    id: 'fire_id',
  },
  causes: { N: 'Natural', H: 'Human', U: 'Unknown' },
  // Breaks (hectares) used for both circle size and colour. The data only has fires of 200 ha or more.
  sizeClasses: [
    { min: 0, label: '< 1,000 ha', color: '#fdd49e', radius: 3.5 },
    { min: 1000, label: '1,000–5,000 ha', color: '#fc8d59', radius: 5 },
    { min: 5000, label: '5,000–20,000 ha', color: '#ef6548', radius: 7 },
    { min: 20000, label: '20,000–100,000 ha', color: '#d7301f', radius: 9.5 },
    { min: 100000, label: '≥ 100,000 ha', color: '#7f0000', radius: 13 },
  ],

};

// Flood extents from Natural Resources Canada's "Floods in Canada - Archive" (satellite flood maps made
// for emergency response), clipped to Saskatchewan by scripts/fetch-floods.mjs. Follows the year slider.
export const FLOODS = {
  url: 'data/floods.geojson',
  color: '#2b7bba',
  outline: '#08306b',
};

export const VECTOR_LAYERS = [
  {
    id: 'friendship-centres',
    label: 'Friendship Centres',
    url: 'data/friendship_centres.geojson',
    // Bright blue circle; the name is always shown (see addVectorLayer()).
    type: 'circle',
    paint: {
      'circle-radius': 7,
      'circle-color': '#0a84ff',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
    labelField: 'FC',
    labelAlways: true,
    // Names are drawn to the right of the circle; these go to the left so crowded centres don't cover each other.
    labelLeft: ['Ile-a-la-Crosse'],
    group: 'reference',
    legend: [{ type: 'circle', color: '#0a84ff', radius: 6, stroke: '#ffffff', label: 'Friendship Centre (click for funding)' }],
    // Pop-ups for centres are built in funding.js so they can include funding.
    popup: false,
    visible: true,
  },
  {
    id: 'highways',
    label: 'Provincial highways',
    url: 'data/highways.geojson',
    type: 'line',
    paint: {
      // Main (1–99), northern (100-series, 900-series) roads are near-black; 200/300-series are dark grey.
      'line-color': ['case', ['any', ['<', ['get', 'hwy'], 200], ['>=', ['get', 'hwy'], 900]], '#14161a', '#4b5059'],
      'line-width': ['case', ['<', ['get', 'hwy'], 100], 1.8, ['any', ['<', ['get', 'hwy'], 200], ['>=', ['get', 'hwy'], 900]], 1.3, 0.9],
    },
    group: 'reference',
    legend: [
      { type: 'line', color: '#14161a', width: 2, label: 'Main and northern highways' },
      { type: 'line', color: '#4b5059', width: 1, label: 'Other numbered highways' },
    ],
    popup: false,
    visible: true,
  },
  {
    // Statistics Canada provincial boundary (via geoBoundaries), full detail.
    id: 'border',
    label: 'Saskatchewan border',
    url: 'data/saskatchewan.geojson',
    type: 'line',
    paint: { 'line-color': '#37404d', 'line-width': 2 },
    popup: false,
    group: 'reference',
    legend: [{ type: 'line', color: '#37404d', width: 2, label: 'Provincial border' }],
  },
  // Planned: Indigenous population by census subdivision (choropleth).
];

// Which provincial highways to draw. `hwy` is the highway number; `cls` is the road class from
// the provincial dataset, where 1 and 2 are the main roadway and 13 is unposted northern road.
// The other classes are short pieces (interchange ramps, turning lanes, access segments).
export const HIGHWAYS = {
  series: [
    { label: 'Highways 1–99 (main routes)', min: 0, max: 99, on: true },
    { label: '100-series (northern)', min: 100, max: 199, on: true },
    { label: '200-series (park & lake access)', min: 200, max: 299, on: false },
    { label: '300-series (secondary)', min: 300, max: 399, on: false },
    { label: '900-series (northern roads)', min: 900, max: 999, on: true },
  ],
  mainClasses: [1, 2, 13],
};

// Funding per centre per year, converted from public/data/funding.xlsx at build time
// (scripts/funding-to-json.mjs). Circle area is proportional to dollars.
export const FUNDING = {
  url: 'data/funding.json',
  centreField: 'FC',
  color: '#2a9d8f',
  minRadius: 16,
  maxRadius: 44,
};

// CWFIS GeoServer WMS. Checked 2026-10-29: the legacy server still serves the
// public:fwi / public:fdr layers with a daily TIME dimension. NRCan is moving
// layers to geoserver.cwfif.nrcan.gc.ca, so this is the one place to update.
export const WEATHER = {
  wmsUrl: 'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms',
  layers: [
    { id: 'none', label: 'Off' },
    { id: 'public:fdr', label: 'Fire Danger' },
    { id: 'public:fwi', label: 'Fire Weather Index (FWI)' },
    { id: 'public:bui', label: 'Buildup Index' },
    { id: 'public:dc', label: 'Drought Code' },
  ],
  defaultLayer: 'public:fdr',
  opacity: 0.6,
};

// Live fires reported by agencies (CWFIS "cwfif_national_activefires" layer, new CWFIF server).
// The layer keeps every past status update as its own row; rows still in effect have a record_end in the future.
export const ACTIVE_FIRES = {
  wfsUrl: 'https://geoserver.cwfif.nrcan.gc.ca/geoserver/wfs',
  typeName: 'public:cwfif_national_activefires',
  agency: 'SK',
  refreshMinutes: 10,
  stages: {
    OC: { label: 'Out of control', color: '#d7191c' },
    BH: { label: 'Being held', color: '#fd8d3c' },
    UC: { label: 'Under control', color: '#fed976' },
  },
  otherStageColor: '#9aa0a6',
};

// Satellite hotspots from the last 24 hours (legacy CWFIS server, drawn as a WMS image like the fire weather layer).
export const HOTSPOTS = {
  wmsUrl: 'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms',
  layer: 'public:hotspots_24h',
};
