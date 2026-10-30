// Everything that depends on the data lives here, so swapping a QGIS export
// or a CWFIS layer name should not require touching the rest of the app.

export const MAP = {
  center: [-105.9, 54.5],
  zoom: 4.6,
  // Roughly the Saskatchewan border, with some padding.
  maxBounds: [[-116, 47], [-95, 61.5]],
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

export const VECTOR_LAYERS = [
  {
    id: 'friendship-centres',
    label: 'Friendship Centres',
    url: 'data/friendship_centres.geojson',
    type: 'circle',
    paint: {
      'circle-radius': 7,
      'circle-color': '#1f5fa8',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
    labelField: 'FC',
    visible: true,
  },
  {
    id: 'highways',
    label: 'Highways',
    url: 'data/highways.geojson',
    type: 'line',
    paint: { 'line-color': '#8a8f98', 'line-width': 0.8 },
    // The road attributes are internal codes, so there is nothing useful to show in a pop-up.
    popup: false,
    visible: true,
  },
  // Planned: Indigenous population by census subdivision (choropleth).
];

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
